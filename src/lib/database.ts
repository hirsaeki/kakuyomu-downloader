import Dexie, { Table } from 'dexie';
import { CACHE_CONFIG } from '@/config/constants';
import {
  Work,
  WorkRecord,
  EpisodeRecord,
  ContentRecord,
  NovelDownloaderError,
  ValidationError
} from '@/types';
import { createContextLogger } from '@/lib/logger';

const dbLogger = createContextLogger('database');
class NovelDatabase extends Dexie {
  works!: Table<WorkRecord>;
  episodes!: Table<EpisodeRecord>;
  contents!: Table<ContentRecord>;

  constructor() {
    super(CACHE_CONFIG.DATABASE.NAME);

    this.version(CACHE_CONFIG.DATABASE.VERSION).stores({
      works: '&url, workTitle, author, lastAccessed, lastModified',
      episodes: '[workUrl+id], workUrl, lastAccessed, lastModified',
      contents: '&episodeUrl, lastAccessed, lastModified'
    });
  }

  async saveWork(url: string, workTitle: string, author: string): Promise<Work> {
    try {
      await this.transaction('rw', this.works, async () => {
        const now = new Date();
        await this.works.put({
          url,
          workTitle,
          author,
          lastAccessed: now,
          lastModified: now
        });
      });

      // Work インターフェースを直接使用して返す
      return {
        url,
        workTitle,
        author,
        lastAccessed: new Date()
      };
    } catch (error) {
      // console.error('作品保存エラー:', error);
      dbLogger.error('作品保存エラー:', error);
      throw new NovelDownloaderError('作品情報の保存に失敗しました');
    }
  }

  async saveEpisodes(workUrl: string, episodes: EpisodeRecord[]): Promise<void> {
    try {
      await this.transaction('rw', [this.works, this.episodes], async () => {
        const work = await this.works.get(workUrl);
        if (!work) {
          throw new ValidationError('作品が見つかりません');
        }

        const now = new Date();
        const episodesToSave = episodes.map(episode => ({
          ...episode,
          workUrl,
          lastAccessed: now,
          lastModified: now
        }));

        // バッチ処理での保存
        await this.episodes.where('workUrl').equals(workUrl).delete();
        await this.episodes.bulkPut(episodesToSave);
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      // console.error('エピソード保存エラー:', error);
      dbLogger.error('エピソード保存エラー:', error);
      throw new NovelDownloaderError('エピソード情報の保存に失敗しました');
    }
  }

  async saveContent(episodeUrl: string, title: string, content: string): Promise<void> {
    try {
      await this.transaction('rw', this.contents, async () => {
        const now = new Date();
        const contentHash = await this.calculateContentHash(content);
        const existingContent = await this.contents.get(episodeUrl);

        // コンテンツが同じ場合は最終アクセス日時のみ更新
        if (existingContent && contentHash === await this.calculateContentHash(existingContent.content)) {
          await this.contents.update(episodeUrl, { lastAccessed: now });
          return;
        }

        // 新規保存または更新
        await this.contents.put({
          episodeUrl,
          title,
          content,
          lastAccessed: now,
          lastModified: now
        });
      });
    } catch (error) {
      // console.error('コンテンツ保存エラー:', error);
      dbLogger.error('コンテンツ保存エラー:', error);
      throw new NovelDownloaderError('コンテンツの保存に失敗しました');
    }
  }

  async getWork(url: string): Promise<WorkRecord | undefined> {
    try {
      const work = await this.works.get(url);
      if (work) {
        await this.works.update(url, { lastAccessed: new Date() });
      }
      return work;
    } catch (error) {
      // console.error('作品取得エラー:', error);
      dbLogger.error('作品取得エラー:', error);
      throw new NovelDownloaderError('作品情報の取得に失敗しました');
    }
  }

  async getEpisodes(workUrl: string): Promise<EpisodeRecord[]> {
    try {
      const work = await this.works.get(workUrl);
      if (!work) return [];

      const episodes = await this.episodes
        .where('workUrl')
        .equals(workUrl)
        .toArray();

      if (episodes.length > 0) {
        const now = new Date();
        // バッチ処理での最終アクセス日時更新
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

      return episodes;
    } catch (error) {
      // console.error('エピソード取得エラー:', error);
      dbLogger.error('エピソード取得エラー:', error);
      throw new NovelDownloaderError('エピソード情報の取得に失敗しました');
    }
  }

  async getContent(episodeUrl: string): Promise<ContentRecord | undefined> {
    try {
      const content = await this.contents.get(episodeUrl);
      if (content) {
        await this.contents.update(episodeUrl, { lastAccessed: new Date() });
      }
      return content;
    } catch (error) {
      // console.error('コンテンツ取得エラー:', error);
      dbLogger.error('コンテンツ取得エラー:', error);
      throw new NovelDownloaderError('コンテンツの取得に失敗しました');
    }
  }

  async clearWorkCache(workUrl: string): Promise<void> {
    try {
      await this.transaction('rw', [this.works, this.episodes, this.contents], async () => {
        const episodes = await this.episodes
          .where('workUrl')
          .equals(workUrl)
          .toArray();

        const episodeUrls = episodes.map(e => e.url).filter(Boolean) as string[];

        await Promise.all([
          this.contents.where('episodeUrl').anyOf(episodeUrls).delete(),
          this.episodes.where('workUrl').equals(workUrl).delete(),
          this.works.delete(workUrl)
        ]);
      });
    } catch (error) {
      // console.error('キャッシュ削除エラー:', error);
      dbLogger.error('キャッシュ削除エラー:', error);
      throw new NovelDownloaderError('キャッシュのクリアに失敗しました');
    }
  }

  async cleanOldCache(maxAgeInDays: number = CACHE_CONFIG.MAX_AGE_DAYS): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - maxAgeInDays * 24 * 60 * 60 * 1000);

      await this.transaction('rw', [this.works, this.episodes, this.contents], async () => {
        const oldWorks = await this.works
          .where('lastAccessed')
          .below(cutoffDate)
          .toArray();

        if (oldWorks.length === 0) return;

        const workUrls = oldWorks.map(w => w.url);
        const oldEpisodes = await this.episodes
          .where('workUrl')
          .anyOf(workUrls)
          .toArray();

        const episodeUrls = oldEpisodes.map(e => e.url).filter(Boolean) as string[];

        // キャッシュサイズの確認と管理
        const totalSize = await this.calculateCacheSize();
        if (totalSize > CACHE_CONFIG.MAX_CACHE_SIZE * 1024 * 1024) {
          // console.info(`キャッシュサイズが上限(${CACHE_CONFIG.MAX_CACHE_SIZE}MB)を超えています`);
          dbLogger.info(`キャッシュサイズが上限(${CACHE_CONFIG.MAX_CACHE_SIZE}MB)を超えています`);
        }

        await Promise.all([
          this.contents.where('episodeUrl').anyOf(episodeUrls).delete(),
          this.episodes.where('workUrl').anyOf(workUrls).delete(),
          this.works.where('lastAccessed').below(cutoffDate).delete()
        ]);
      });
    } catch (error) {
      // console.error('古いキャッシュの削除エラー:', error);
      dbLogger.error('古いキャッシュの削除エラー:', error);
      // キャッシュクリーンアップの失敗は致命的エラーとして扱わない
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
      const contents = await this.contents.toArray();
      return contents.reduce((total, record) => {
        return total + new Blob([record.content]).size;
      }, 0);
    } catch (error) {
      // console.warn('キャッシュサイズの計算エラー:', error);
      dbLogger.warn('キャッシュサイズの計算エラー:', error);
      return 0;
    }
  }
}

const db = new NovelDatabase();

// 起動時の処理
db.cleanOldCache().catch((error: unknown) => {
  dbLogger.error('キャッシュのクリーンアップに失敗しました', error);
});

export default db;
