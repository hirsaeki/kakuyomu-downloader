import { JSDOM } from 'jsdom';
import { Episode } from '@/types';
import { ParserError } from '@/lib/errors';
import {
  ParsedEpisodeList,
  ParsedEpisodeContent,
  ParsedWorkElements,
  ParsedEpisodeElements,
  ValidWorkElements,
  ValidEpisodeElements
} from '../types';

export class KakuyomuParser {
  // 静的なセレクター（省略...以前と同じ）
  private static readonly SELECTORS = {
    TITLE: 'h1',
    AUTHOR: '.partialGiftWidgetActivityName',
    EPISODE_CONTENT: '.widget-episodeBody',
    CONTENT_TITLE: '.widget-episodeTitle'
  } as const;

  // クラス名プレフィックス（省略...以前と同じ）
  private static readonly CLASS_PREFIX = {
    GROUP: 'NewBox_padding',
    EPISODE_LINK: 'WorkTocSection_link',
    EPISODE_TITLE: 'WorkTocSection_title'
  } as const;

  /**
   * DOM要素が有効かどうかを検証
   */
  private static validateWorkElements(elements: ParsedWorkElements): elements is ValidWorkElements {
    if (!elements.titleElement?.textContent?.trim()) {
      throw new ParserError('作品タイトルが見つかりません', {
        selector: this.SELECTORS.TITLE,
        element: 'title'
      });
    }

    if (!elements.authorElement?.textContent?.trim()) {
      throw new ParserError('作者名が見つかりません', {
        selector: this.SELECTORS.AUTHOR,
        element: 'author'
      });
    }

    return true;
  }

  /**
   * エピソード要素が有効かどうかを検証
   */
  private static validateEpisodeElements(elements: ParsedEpisodeElements): elements is ValidEpisodeElements {
    if (!elements.href) {
      throw new ParserError('エピソードリンクが不正です', {
        element: 'link',
        context: 'href attribute missing'
      });
    }

    if (!elements.titleElement?.textContent?.trim()) {
      throw new ParserError('エピソードタイトルが不正です', {
        element: 'title',
        context: `class prefix: ${this.CLASS_PREFIX.EPISODE_TITLE}`
      });
    }

    if (!elements.dateElement?.getAttribute('datetime')) {
      throw new ParserError('エピソード日時が不正です', {
        element: 'time',
        context: 'datetime attribute missing'
      });
    }

    return true;
  }

  /**
   * 作品情報の要素から安全にテキストを抽出
   */
  private static extractWorkInfo(elements: ValidWorkElements) {
    return {
      workTitle: elements.titleElement.textContent?.trim() ?? '',
      author: elements.authorElement.textContent?.trim() ?? ''
    };
  }

  /**
   * エピソード要素から安全にデータを抽出
   */
  private static extractEpisodeInfo(elements: ValidEpisodeElements, groupTitle?: string): Episode {
    const episodeId = elements.href.split('/').pop() ?? 'unknown';
    const episodeUrl = `https://kakuyomu.jp${elements.href}`;
    const episodeTitle = elements.titleElement.textContent?.trim() ?? '';
    const datetime = elements.dateElement.getAttribute('datetime') ?? '';

    return {
      id: episodeId,
      title: episodeTitle,
      groupTitle,
      url: episodeUrl,
      date: datetime,
      selected: false
    };
  }

  /**
   * エピソード本文要素から安全にデータを抽出
   */
  private static extractEpisodeContent(
    titleElement: Element,
    contentElement: Element
  ): ParsedEpisodeContent {
    return {
      title: titleElement.textContent?.trim() ?? '',
      content: contentElement.innerHTML.trim()
    };
  }

  /**
   * エピソード一覧ページをパース
   */
  static parseEpisodeList(html: string): ParsedEpisodeList {
    if (!html) {
      throw new ParserError('HTMLコンテンツが空です', {
        context: 'Empty HTML content'
      });
    }

    const dom = new JSDOM(html);
    const document = dom.window.document;

    // 作品情報の要素を取得と検証
    const workElements: ParsedWorkElements = {
      titleElement: document.querySelector(this.SELECTORS.TITLE),
      authorElement: document.querySelector(this.SELECTORS.AUTHOR)
    };

    // 型の保証を維持したまま処理
    if (this.validateWorkElements(workElements)) {
      const validWorkElements: ValidWorkElements = workElements;
      const { workTitle, author } = this.extractWorkInfo(validWorkElements);

      // エピソード一覧を取得
      const episodeMap = new Map<string, Episode>();

      // グループコンテナを検出
      const episodeGroups = Array.from(document.getElementsByTagName('div'))
        .filter(el => Array.from(el.classList)
          .some(className => className.startsWith(this.CLASS_PREFIX.GROUP)));

      if (episodeGroups.length === 0) {
        throw new ParserError('エピソードグループが見つかりません', {
          context: `class prefix: ${this.CLASS_PREFIX.GROUP}`,
          element: 'div'
        });
      }

      // 各グループを処理
      episodeGroups.forEach(group => {
        const groupTitleElement = group.querySelector('h3, h4');
        const groupTitle = groupTitleElement?.textContent?.trim();

        const episodeLinks = Array.from(group.getElementsByTagName('a'))
          .filter(el => Array.from(el.classList)
            .some(className => className.startsWith(this.CLASS_PREFIX.EPISODE_LINK)));

        episodeLinks.forEach(node => {
          try {
            const elements: ParsedEpisodeElements = {
              href: node.getAttribute('href'),
              titleElement: Array.from(node.getElementsByTagName('*'))
                .find(el => Array.from(el.classList)
                  .some(className => className.startsWith(this.CLASS_PREFIX.EPISODE_TITLE))),
              dateElement: node.querySelector('time')
            };

            // 型の保証を維持したまま処理
            if (this.validateEpisodeElements(elements)) {
              const validEpisodeElements: ValidEpisodeElements = elements;
              const episode = this.extractEpisodeInfo(validEpisodeElements, groupTitle);

              // 既存のエピソードをチェック（groupTitleがある場合のみ上書き）
              const existingEpisode = episodeMap.get(episode.url);
              if (!existingEpisode || (existingEpisode && !existingEpisode.groupTitle && groupTitle)) {
                episodeMap.set(episode.url, episode);
              }
            }
          } catch (error) {
            // 個別のエピソードの解析エラーは記録して続行
            console.warn('エピソードの解析に失敗:', error);
          }
        });
      });

      const episodes = Array.from(episodeMap.values());
      if (episodes.length === 0) {
        throw new ParserError('有効なエピソードが見つかりませんでした', {
          context: 'No valid episodes found after parsing'
        });
      }

      return {
        workTitle,
        author,
        episodes
      };
    }

    // validateWorkElementsでエラーが投げられなかった場合（ありえないけど型のため）
    throw new ParserError('作品情報の検証に失敗', {
      context: 'Validation failed without throwing error'
    });
  }

  /**
   * エピソード本文ページをパース
   */
  static parseEpisodeContent(html: string | null | undefined): ParsedEpisodeContent {
    if (!html?.trim()) {
      throw new ParserError('HTMLコンテンツが空です', {
        context: 'Empty or whitespace only content'
      });
    }

    const dom = new JSDOM(html);
    const document = dom.window.document;

    const titleElement = document.querySelector(this.SELECTORS.CONTENT_TITLE);
    const contentElement = document.querySelector(this.SELECTORS.EPISODE_CONTENT);

    if (!titleElement?.textContent?.trim()) {
      throw new ParserError('エピソードタイトルが見つかりません', {
        selector: this.SELECTORS.CONTENT_TITLE,
        element: 'title'
      });
    }

    if (!contentElement) {
      throw new ParserError('本文が見つかりません', {
        selector: this.SELECTORS.EPISODE_CONTENT,
        element: 'content'
      });
    }

    return this.extractEpisodeContent(titleElement, contentElement);
  }
}