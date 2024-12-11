import JSZip from 'jszip';
import { TextProcessor } from '@/lib/typography/core/processor';
import { ValidationError } from '@/lib/errors/validation';
import { GenerationError } from '@/lib/errors/generation';
import { InputChapter } from '../types';
import EPUB_CONFIG from '@/config/epub';
import { createContextLogger } from '@/lib/logger';

const contentLogger = createContextLogger('epub-content');

/**
 * 生成処理の過程で使用する中間チャプター情報
 */
export interface GeneratedChapter {
  filename: string;
  title: string;
}

export class ContentGenerator {
  private readonly textProcessor: TextProcessor;

  constructor() {
    contentLogger.debug('ContentGeneratorを初期化');
    this.textProcessor = TextProcessor.getInstance();
  }

  async generateChapters(
    zip: JSZip,
    chapters: InputChapter[],
    aborted: boolean = false
  ): Promise<GeneratedChapter[]> {
    contentLogger.info('チャプター生成を開始', {
      chaptersCount: chapters.length
    });

    const oebps = zip.folder('OEBPS');
    if (!oebps) {
      contentLogger.error('OEBPSフォルダの作成に失敗');
      throw new GenerationError('OEBPSフォルダが見つかりません');
    }

    const generatedChapters: GeneratedChapter[] = [];
    const batchSize = 10; // 進捗ログの単位
    let lastProgressLog = 0;

    for (let i = 0; i < chapters.length; i++) {
      if (aborted) {
        contentLogger.warn('チャプター生成が中断されました', {
          currentIndex: i,
          totalChapters: chapters.length
        });
        throw new GenerationError('EPUB生成がタイムアウトしました');
      }

      // 進捗ログ（10チャプターごと）
      if (i - lastProgressLog >= batchSize) {
        contentLogger.info(`チャプター生成進捗: ${i}/${chapters.length}`);
        lastProgressLog = i;
      }

      const chapter = chapters[i];
      contentLogger.debug('チャプター処理開始', {
        index: i + 1,
        title: chapter.title
      });

      try {
        await this.validateChapter(chapter, i);
        const generated = await this.generateChapter(chapter, i, oebps);
        generatedChapters.push(generated);

      } catch (error) {
        contentLogger.error('チャプター生成エラー', {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Unknown error',
          chapter: {
            index: i + 1,
            title: chapter.title
          }
        });
        throw new GenerationError(
          `Chapter ${i + 1} "${chapter.title}" の生成に失敗: ${
            error instanceof Error ? error.message : '不明なエラー'
          }`
        );
      }
    }

    if (generatedChapters.length === 0) {
      contentLogger.error('有効なチャプターが存在しません');
      throw new ValidationError('有効なチャプターがありません');
    }

    contentLogger.info('チャプター生成完了', {
      generatedCount: generatedChapters.length
    });

    return generatedChapters;
  }

  private async generateChapter(
    chapter: InputChapter,
    index: number,
    oebps: JSZip
  ): Promise<GeneratedChapter> {
    const chapterNum = (index + 1).toString().padStart(3, '0');
    const filename = `${EPUB_CONFIG.FILE_STRUCTURE.CHAPTER_PREFIX}${chapterNum}.xhtml`;

    contentLogger.debug('チャプター変換開始', {
      title: chapter.title,
      chapterNum
    });

    const convertedContent = await this.textProcessor.convertToXhtml(
      chapter.data,
      chapter.title
    );

    oebps.file(filename, convertedContent);

    contentLogger.debug('チャプター変換完了', {
      title: chapter.title,
      filename
    });

    return {
      filename,
      title: chapter.title
    };
  }

  private validateChapter(chapter: InputChapter, index: number): void {
    if (!chapter.title?.trim()) {
      contentLogger.warn('無効なチャプター: タイトルが空', { index: index + 1 });
      throw new ValidationError(
        `Chapter ${index + 1}: タイトルが設定されていません`,
      );
    }
    if (!chapter.data?.trim()) {
      contentLogger.warn('無効なチャプター: コンテンツが空', {
        index: index + 1,
        title: chapter.title
      });
      throw new ValidationError(
        `Chapter ${index + 1}: コンテンツが空です`,
      );
    }
  }
}