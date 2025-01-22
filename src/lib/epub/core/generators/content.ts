import JSZip from 'jszip';
import { ValidationError } from '@/lib/errors/validation';
import { GenerationError } from '@/lib/errors/generation';
import { TypographyProcessor } from '@/lib/typography/core/processor';
import { XHTMLDocumentBuilder } from './document-builder';
import { InputChapter } from '../types';
import EPUB_CONFIG from '@/config/epub';
import { createContextLogger } from '@/lib/logger';
import { patterns } from 'virtual:pattern-config';
import { TcyConverter, RubyProcessor, LineBreakProcessor } from '@/lib/html';

interface ContentGeneratorOptions {
  useGroupTitles?: boolean;
}

const contentLogger = createContextLogger('epub-content');

/**
 * 生成処理の過程で使用する中間チャプター情報
 */
export interface GeneratedChapter {
  filename: string;
  title: string;
}

/**
 * Enhanced content generator with improved error handling and content validation
 */
export class ContentGenerator {
  private readonly typographyProcessor: TypographyProcessor;
  private readonly documentBuilder: XHTMLDocumentBuilder;
  private readonly rubyProcessor: RubyProcessor;
  private readonly tcyConverter: TcyConverter;
  private readonly lineBreakProcessor: LineBreakProcessor;

  constructor() {
    contentLogger.debug('ContentGeneratorを初期化');
    this.typographyProcessor = TypographyProcessor.getInstance(
      Object.values(patterns)
    );
    this.documentBuilder = new XHTMLDocumentBuilder(EPUB_CONFIG);
    this.rubyProcessor = new RubyProcessor();
    this.tcyConverter = new TcyConverter();
    this.lineBreakProcessor = new LineBreakProcessor();
  }

  /**
   * Generates EPUB chapters
   */
  async generateChapters(
    zip: JSZip,
    chapters: InputChapter[],
    aborted: boolean = false,
    options?: ContentGeneratorOptions
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
        throw new GenerationError('チャプター生成が中断されました');
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
        const displayTitle = options?.useGroupTitles && chapter.metadata?.groupTitle
          ? `${chapter.metadata.groupTitle} ${chapter.title}`
          : chapter.title;
        const generated = await this.generateChapter(chapter, i, oebps, displayTitle);

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
            title: chapter.title,
            dataLength: chapter.data.length
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

  /**
   * Generates a single chapter
   */
  private async generateChapter(
    chapter: InputChapter,
    index: number,
    oebps: JSZip,
    displayTitle?: string
  ): Promise<GeneratedChapter> {
    const chapterNum = (index + 1).toString().padStart(3, '0');
    const filename = `${EPUB_CONFIG.FILE_STRUCTURE.CHAPTER_PREFIX}${chapterNum}.xhtml`;

    contentLogger.debug('チャプター変換開始', {
      title: chapter.title,
      chapterNum,
      dataLength: chapter.data.length
    });

    try {
      // Prepare content with title
      const cleanTitle = this.sanitizeContent(displayTitle ?? chapter.title);
      const cleanContent = this.sanitizeContent(chapter.data);
      const contentWithTitle = `<h1>${cleanTitle}</h1>\n${cleanContent}`;

      contentLogger.debug('コンテンツ準備完了', {
        contentLength: contentWithTitle.length,
        firstChars: contentWithTitle.substring(0, 100)
      });

      // Process typography
      const typographyProcessed = await this.typographyProcessor.process(contentWithTitle);

      contentLogger.debug('Typography処理完了', {
        type: typeof typographyProcessed,
        length: typographyProcessed.length,
        firstChars: typographyProcessed.substring(0, 100)
      });

      // 後処理
      const rubyConverted = this.rubyProcessor.fromAozoraRuby(typographyProcessed);
      const tcyConverted = this.tcyConverter.process(rubyConverted);
      const lineBreakProcessed = this.lineBreakProcessor.process(tcyConverted);

      contentLogger.debug('後処理完了', {
        textLength: lineBreakProcessed.length,
        firstChars: lineBreakProcessed.substring(0, 100)
      });

      // Create and validate document
      const doc = this.documentBuilder.createDocument(chapter.title, lineBreakProcessed);
      
      // Additional debug information
      const contentDiv = doc.querySelector('.content');
      contentLogger.debug('ドキュメント生成後の状態', {
        hasContentDiv: !!contentDiv,
        hasContent: contentDiv?.hasChildNodes(),
        contentLength: contentDiv?.textContent?.length,
        firstChars: contentDiv?.textContent?.substring(0, 100)
      });

      if (!contentDiv?.hasChildNodes()) {
        throw new Error('Generated document has no content');
      }
      
      // Serialize and add to ZIP
      const serialized = new XMLSerializer().serializeToString(doc);
      if (!serialized || serialized.indexOf('<div class="content"></div>') !== -1) {
        throw new Error('Content serialization failed - empty result');
      }
      
      oebps.file(filename, serialized);

      contentLogger.debug('チャプター変換完了', {
        title: chapter.title,
        filename,
        serializedLength: serialized.length,
        firstChars: serialized.substring(0, 100)
      });

      return {
        filename,
        title: chapter.title
      };

    } catch (error) {
      contentLogger.error('チャプター変換エラー', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error',
        title: chapter.title,
        dataLength: chapter.data.length
      });
      throw error;
    }
  }

  /**
   * Validates chapter data
   */
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

    contentLogger.debug('チャプターバリデーション完了', {
      index: index + 1,
      title: chapter.title,
      dataLength: chapter.data.length
    });
  }

  /**
   * Sanitizes content strings
   */
  private sanitizeContent(content: string): string {
    const sanitized = content
      .trim()
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '') // Remove invalid XML characters
      .replace(/\r\n|\r/g, '\n'); // Normalize line endings

    if (!sanitized) {
      throw new Error('Content sanitization resulted in empty string');
    }

    return sanitized;
  }
}