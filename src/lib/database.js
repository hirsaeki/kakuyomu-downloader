import Dexie from 'dexie';

class NovelDatabase extends Dexie {
  constructor() {
    super('NovelDatabase');

    // データベーススキーマを定義
    // インデックスを追加する場合、カンマ区切りで複数指定可能
    this.version(1).stores({
      works: 'url, workTitle, lastAccessed',
      episodes: '[workUrl+id], workUrl, title, groupTitle, date, lastAccessed',
      contents: 'episodeUrl, title, content, lastAccessed'
    });
  }

  // 作品情報の保存
  async saveWork(url, workTitle) {
    await this.works.put({
      url,
      workTitle,
      lastAccessed: new Date()
    });
  }

  // エピソード一覧の保存
  async saveEpisodes(workUrl, episodes) {
    await this.transaction('rw', this.episodes, async () => {
      // 既存のエピソードを削除
      await this.episodes.where('workUrl').equals(workUrl).delete();

      // 新しいエピソードを保存
      for (const episode of episodes) {
        await this.episodes.put({
          ...episode,
          workUrl,
          id: `${workUrl}-${episode.id}`,
          lastAccessed: new Date()  // lastAccessedを追加
        });
      }
    });
  }

  // エピソード本文の保存
  async saveContent(episodeUrl, title, content) {
    await this.contents.put({
      episodeUrl,
      title,
      content,
      lastAccessed: new Date()
    });
  }

  // 作品情報の取得
  async getWork(url) {
    const work = await this.works.get(url);
    if (work) {
      await this.works.update(url, { lastAccessed: new Date() });
    }
    return work;
  }

  // エピソード一覧の取得
  async getEpisodes(workUrl) {
    const episodes = await this.episodes.where('workUrl').equals(workUrl).toArray();
    // 一括で lastAccessed を更新
    if (episodes.length > 0) {
      await this.transaction('rw', this.episodes, async () => {
        const now = new Date();
        for (const episode of episodes) {
          await this.episodes.update(episode.id, { lastAccessed: now });
        }
      });
    }
    return episodes;
  }

  // エピソード本文の取得
  async getContent(episodeUrl) {
    const content = await this.contents.get(episodeUrl);
    if (content) {
      await this.contents.update(episodeUrl, { lastAccessed: new Date() });
    }
    return content;
  }

  // 古いキャッシュの削除（30日以上アクセスのないデータ）
  async cleanOldCache() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    await this.transaction('rw', [this.works, this.episodes, this.contents], async () => {
      // 古いデータの削除
      await this.works.where('lastAccessed').below(thirtyDaysAgo).delete();
      await this.episodes.where('lastAccessed').below(thirtyDaysAgo).delete();
      await this.contents.where('lastAccessed').below(thirtyDaysAgo).delete();
    });
  }

  // 特定の作品に関連するキャッシュをすべて削除
  async clearWorkCache(workUrl) {
    await this.transaction('rw', [this.works, this.episodes, this.contents], async () => {
      // 作品情報を削除
      await this.works.where('url').equals(workUrl).delete();
      
      // 作品のエピソード一覧を取得（本文の削除用）
      const episodesToDelete = await this.episodes.where('workUrl').equals(workUrl).toArray();
      
      // エピソード一覧を削除
      await this.episodes.where('workUrl').equals(workUrl).delete();
      
      // 関連する本文を削除
      for (const episode of episodesToDelete) {
        if (episode.url) {
          await this.contents.where('episodeUrl').equals(episode.url).delete();
        }
      }
    });
    
    console.log(`Cleared cache for work: ${workUrl}`);
    return true;
  }

  // データベースの状態確認
  async getDatabaseStats() {
    const worksCount = await this.works.count();
    const episodesCount = await this.episodes.count();
    const contentsCount = await this.contents.count();

    return {
      worksCount,
      episodesCount,
      contentsCount
    };
  }
}

const db = new NovelDatabase();

// 起動時に古いキャッシュを削除
db.cleanOldCache().catch(console.error);

export default db;
