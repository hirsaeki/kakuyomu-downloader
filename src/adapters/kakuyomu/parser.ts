import { JSDOM } from 'jsdom';
import { Episode, ValidationError } from '@/types';

export interface ParsedEpisodeList {
  workTitle: string;
  author: string;
  episodes: Episode[];
}

export class KakuyomuParser {
  // 静的なセレクター
  private static readonly SELECTORS = {
    TITLE: 'h1',
    AUTHOR: '.partialGiftWidgetActivityName',
    EPISODE_CONTENT: '.widget-episodeBody',
    CONTENT_TITLE: '.widget-episodeTitle'
  } as const;

  // クラス名プレフィックス
  private static readonly CLASS_PREFIX = {
    GROUP: 'NewBox_padding',
    EPISODE_LINK: 'WorkTocSection_link',
    EPISODE_TITLE: 'WorkTocSection_title'
  } as const;

  /**
   * エピソード一覧ページをパース
   * @throws {ValidationError} 必須要素が見つからない場合
   */
  static parseEpisodeList(html: string): ParsedEpisodeList {
    if (!html) {
      throw new ValidationError('HTMLコンテンツが空です');
    }

    const dom = new JSDOM(html);
    const document = dom.window.document;

    // 作品タイトルを取得
    const titleElement = document.querySelector(this.SELECTORS.TITLE);
    if (!titleElement?.textContent) {
      throw new ValidationError('作品タイトルが見つかりません');
    }
    const workTitle = titleElement.textContent.trim();

    // 作者名を取得
    const authorElement = document.querySelector(this.SELECTORS.AUTHOR);
    if (!authorElement?.textContent) {
      throw new ValidationError('作者名が見つかりません');
    }
    const author = authorElement.textContent.trim();

    // エピソード一覧を取得
    const episodeMap = new Map<string, Episode>();

    // グループコンテナを検出（ハッシュ付きクラス名対応）
    const episodeGroups = Array.from(document.getElementsByTagName('div'))
      .filter(el => Array.from(el.classList)
        .some(className => className.startsWith(this.CLASS_PREFIX.GROUP)));

    if (episodeGroups.length === 0) {
      throw new ValidationError('エピソードリストが見つかりません');
    }

    // 各グループを処理
    episodeGroups.forEach(group => {
      const groupTitleElement = group.querySelector('h3, h4');
      const groupTitle = groupTitleElement?.textContent?.trim();

      const episodeLinks = Array.from(group.getElementsByTagName('a'))
        .filter(el => Array.from(el.classList)
          .some(className => className.startsWith(this.CLASS_PREFIX.EPISODE_LINK)));

      episodeLinks.forEach(node => {
        const titleElement = Array.from(node.getElementsByTagName('*'))
          .find(el => Array.from(el.classList)
            .some(className => className.startsWith(this.CLASS_PREFIX.EPISODE_TITLE)));

        const dateElement = node.querySelector('time');
        const href = node.getAttribute('href');

        if (!href) return;

        const episodeId = href.split('/').pop() || 'unknown';
        const episodeUrl = `https://kakuyomu.jp${href}`;
        const episodeTitle = titleElement?.textContent?.trim();
        const datetime = dateElement?.getAttribute('datetime');

        if (!episodeTitle || !datetime) return;

        const episode: Episode = {
          id: episodeId,
          title: episodeTitle,
          groupTitle,
          url: episodeUrl,
          date: datetime,
          selected: false
        };

        // 既存のエピソードをチェック
        // groupTitleがある場合のみ上書き
        const existingEpisode = episodeMap.get(episodeUrl);
        if (!existingEpisode || (existingEpisode && !existingEpisode.groupTitle && groupTitle)) {
          episodeMap.set(episodeUrl, episode);
        }
      });
    });

    const episodes = Array.from(episodeMap.values());
    if (episodes.length === 0) {
      throw new ValidationError('有効なエピソードが見つかりませんでした');
    }

    return {
      workTitle,
      author,
      episodes
    };
  }

  /**
   * エピソード本文ページをパース
   * @throws {ValidationError} 必須要素が見つからない場合
   */
  static parseEpisodeContent(html: string | null | undefined): { title: string; content: string } {
    if (!html || !html.trim()) {
      throw new ValidationError('HTMLコンテンツが空です');
    }

    const dom = new JSDOM(html);
    const document = dom.window.document;

    const titleElement = document.querySelector(this.SELECTORS.CONTENT_TITLE);
    if (!titleElement?.textContent) {
      throw new ValidationError('エピソードタイトルが見つかりません');
    }

    const contentElement = document.querySelector(this.SELECTORS.EPISODE_CONTENT);
    if (!contentElement) {
      throw new ValidationError('本文が見つかりません');
    }

    return {
      title: titleElement.textContent.trim(),
      content: contentElement.innerHTML.trim()
    };
  }
}
