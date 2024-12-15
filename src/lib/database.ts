import Dexie from 'dexie';
import { CACHE_CONFIG } from '@/config/constants';
import {
  Work,
  WorkRecord,
  EpisodeRecord,
  ContentRecord,
  INovelDatabase,
  EpisodeStatus
} from '@/types';
import {
  DatabaseError,
  ValidationError
} from '@/lib/errors'
import { createContextLogger } from '@/lib/logger';

const dbLogger = createContextLogger('database');

class NovelDatabase extends Dexie implements INovelDatabase {
  works!: Dexie.Table<WorkRecord>;
  episodes!: Dexie.Table<EpisodeRecord>;
  contents!: Dexie.Table<ContentRecord>;

  constructor() {
    super(CACHE_CONFIG.DATABASE.NAME);

    // バージョンアップはCONFIG.DATABASE.VERSIONを使用して定数管理
    this.version(CACHE_CONFIG.DATABASE.VERSION + 1).stores({
      works: '&url, workTitle, author, lastAccessed, lastModified',
      episodes: '[workUrl+id], workUrl, lastAccessed, lastModified',
      contents: '&episodeUrl, lastAccessed, lastModified'
    }).upgrade(tx => {
      // 既存のエピソードにstatusを追加
      return tx.table('episodes').toCollection().modify(episode => {
        if (!episode.status) {
          episode.status = { status: 'pending', error: null };
        }
      });
    });
  }

  async saveWork(url: string, workTitle: string, author: string): Promise<Work> {
    try {
      const now = new Date();
      const workData: WorkRecord = {
        url,
        workTitle,
        author,
        lastAccessed: now,
        lastModified: now
      };

      await this.transaction('rw', this.works, async () => {
        await this.works.put(workData);
      });

      return {
        url,
        workTitle,
        author,
        lastAccessed: now
      };
    } catch (error) {
      dbLogger.error('作品保存エラー:', error);
      throw new DatabaseError('作品情報の保存に失敗しました');
    }
  }

  async saveEpisodes(workUrl: string, episodes: EpisodeRecord[]): Promise<void> {
    try {
      const now = new Date();
      const episodesToSave = episodes.map(episode => ({
        ...episode,
        workUrl,
        lastAccessed: now,
        lastModified: now,
        status: episode.status || { status: 'pending', error: null }  // デフォルトのstatus
      }));

      await this.transaction('rw', [this.works, this.episodes], async () => {
        const work = await this.works.get(workUrl);
        if (!work) {
          throw new ValidationError('作品が見つかりません');
        }

        await this.episodes.where('workUrl').equals(workUrl).delete();
        await this.episodes.bulkPut(episodesToSave);
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      dbLogger.error('エピソード保存エラー:', error);
      throw new DatabaseError('エピソード情報の保存に失敗しました');
    }
  }

  async updateEpisodeStatus(workUrl: string, episodeId: string, status: EpisodeStatus): Promise<void> {
    try {
      await this.transaction('rw', this.episodes, async () => {
        const episode = await this.episodes
          .where('[workUrl+id]')
          .equals([workUrl, episodeId])
          .first();

        if (!episode) {
          throw new ValidationError('エピソードが見つかりません');
        }

        await this.episodes.update(
          [workUrl, episodeId],
          { 
            status,
            lastModified: new Date()
          }
        );
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      dbLogger.error('エピソード状態更新エラー:', error);
      throw new DatabaseError('エピソード状態の更新に失敗しました');
    }
  }

  async saveContent(episodeUrl: string, title: string, content: string): Promise<void> {
    try {
      const now = new Date();
      // トランザクション外でハッシュ計算
      const contentHash = await this.calculateContentHash(content);

      await this.transaction('rw', this.contents, async () => {
        const existingContent = await this.contents.get(episodeUrl);

        if (existingContent) {
          const existingHash = await this.calculateContentHash(existingContent.content);
          if (contentHash === existingHash) {
            await this.contents.update(episodeUrl, { lastAccessed: now });
            return;
          }
        }

        await this.contents.put({
          episodeUrl,
          title,
          content,
          lastAccessed: now,
          lastModified: now
        });
      });
    } catch (error) {
      dbLogger.error('コンテンツ保存エラー:', error);
      throw new DatabaseError('コンテンツの保存に失敗しました');
    }
  }

  async getWork(url: string): Promise<WorkRecord | undefined> {
    try {
      const now = new Date();
      let work: WorkRecord | undefined;

      await this.transaction('rw', this.works, async () => {
        work = await this.works.get(url);
        if (work) {
          await this.works.update(url, { lastAccessed: now });
        }
      });

      return work;
    } catch (error) {
      dbLogger.error('作品取得エラー:', error);
      throw new DatabaseError('作品情報の取得に失敗しました');
    }
  }

  async getEpisodes(workUrl: string): Promise<EpisodeRecord[]> {
    try {
      const now = new Date();
      let episodes: EpisodeRecord[] = [];

      await this.transaction('rw', [this.works, this.episodes], async () => {
        const work = await this.works.get(workUrl);
        if (!work) return;

        episodes = await this.episodes
          .where('workUrl')
          .equals(workUrl)
          .toArray();

        if (episodes.length > 0) {
          const batchSize = CACHE_CONFIG.CLEANUP.BATCH_SIZE;
          for (let i = 0; i < episodes.length; i += batchSize) {
            const batch = episodes.slice(i, i + batchSize);
            await this.episodes.bulkPut(
              batch.map(ep => ({
                ...ep,
                lastAccessed: now
              }))
            );
          }
        }
      });

      return episodes;
    } catch (error) {
      dbLogger.error('エピソード取得エラー:', error);
      throw new DatabaseError('エピソード情報の取得に失敗しました');
    }
  }

  async getContent(episodeUrl: string): Promise<ContentRecord | undefined> {
    try {
      const now = new Date();
      let content: ContentRecord | undefined;

      await this.transaction('rw', this.contents, async () => {
        content = await this.contents.get(episodeUrl);
        if (content) {
          await this.contents.update(episodeUrl, { lastAccessed: now });
        }
      });

      return content;
    } catch (error) {
      dbLogger.error('コンテンツ取得エラー:', error);
      throw new DatabaseError('コンテンツの取得に失敗しました');
    }
  }

  async clearWorkCache(workUrl: string): Promise<void> {
    try {
      let episodeUrls: string[] = [];

      // トランザクション外でURLを収集
      await this.transaction('r', this.episodes, async () => {
        const episodes = await this.episodes
          .where('workUrl')
          .equals(workUrl)
          .toArray();
        episodeUrls = episodes.map(e => e.url).filter(Boolean) as string[];
      });

      // 別トランザクションで削除を実行
      await this.transaction('rw', [this.works, this.episodes, this.contents], async () => {
        await Promise.all([
          this.contents.where('episodeUrl').anyOf(episodeUrls).delete(),
          this.episodes.where('workUrl').equals(workUrl).delete(),
          this.works.delete(workUrl)
        ]);
      });
    } catch (error) {
      dbLogger.error('キャッシュ削除エラー:', error);
      throw new DatabaseError('キャッシュのクリアに失敗しました');
    }
  }

  async cleanOldCache(maxAgeInDays: number = CACHE_CONFIG.MAX_AGE_DAYS): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - maxAgeInDays * 24 * 60 * 60 * 1000);
      let workUrls: string[] = [];
      let episodeUrls: string[] = [];

      // 削除対象のURL収集
      await this.transaction('r', [this.works, this.episodes], async () => {
        const oldWorks = await this.works
          .where('lastAccessed')
          .below(cutoffDate)
          .toArray();

        if (oldWorks.length === 0) return;

        workUrls = oldWorks.map(w => w.url);
        const oldEpisodes = await this.episodes
          .where('workUrl')
          .anyOf(workUrls)
          .toArray();

        episodeUrls = oldEpisodes.map(e => e.url).filter(Boolean) as string[];
      });

      if (workUrls.length === 0) return;

      // トランザクション外でキャッシュサイズ計算
      const totalSize = await this.calculateCacheSize();
      if (totalSize > CACHE_CONFIG.MAX_CACHE_SIZE * 1024 * 1024) {
        dbLogger.info(`キャッシュサイズが上限(${CACHE_CONFIG.MAX_CACHE_SIZE}MB)を超えています`);
      }

      // 別トランザクションで削除実行
      await this.transaction('rw', [this.works, this.episodes, this.contents], async () => {
        await Promise.all([
          this.contents.where('episodeUrl').anyOf(episodeUrls).delete(),
          this.episodes.where('workUrl').anyOf(workUrls).delete(),
          this.works.where('lastAccessed').below(cutoffDate).delete()
        ]);
      });
    } catch (error) {
      dbLogger.error('古いキャッシュの削除エラー:', error);
    }
  }

  private async calculateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async calculateCacheSize(): Promise<number> {
    try {
      let totalSize = 0;
      // バッチ処理でメモリ使用量を抑制
      await this.transaction('r', this.contents, async () => {
        await this.contents.each(record => {
          totalSize += new Blob([record.content]).size;
        });
      });
      return totalSize;
    } catch (error) {
      dbLogger.warn('キャッシュサイズの計算エラー:', error);
      return 0;
    }
  }
}

const db = new NovelDatabase();

// 初期化時に古いキャッシュをクリーンアップ
db.cleanOldCache().catch((error: unknown) => {
  dbLogger.error('キャッシュのクリーンアップに失敗しました', error);
});

export default db;