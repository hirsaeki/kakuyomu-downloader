import JSZip from 'jszip';
import { ValidationError } from '@/lib/errors/validation';
import { GenerationError } from '@/lib/errors/generation';
import { TypographyProcessor } from '@/lib/typography/core/processor';
import { XHTMLDocumentBuilder } from './document-builder';
import { InputChapter } from '../types';
import EPUB_CONFIG from '@/config/epub';
import { createContextLogger } from '@/lib/logger';
import { patterns } from 'virtual:pattern-config';
import { TcyConverter, RubyProcessor, LineBreakProcessor, EmphasisProcessor } from '@/lib/html';

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
  private readonly emphasisProcessor: EmphasisProcessor;
  private readonly tcyConverter: TcyConverter;
  private readonly lineBreakProcessor: LineBreakProcessor;
  private readonly domParser: DOMParser;

  constructor() {
    contentLogger.debug('ContentGeneratorを初期化');
    this.domParser = new DOMParser();
    this.typographyProcessor = TypographyProcessor.getInstance(
      Object.values(patterns)
    );
    this.documentBuilder = new XHTMLDocumentBuilder(EPUB_CONFIG);
    this.rubyProcessor = new RubyProcessor();
    this.emphasisProcessor = new EmphasisProcessor();
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
      // コンテンツの準備
      const cleanTitle = this.sanitizeContent(displayTitle ?? chapter.title);
      const cleanContent = this.sanitizeContent(chapter.data);
      const contentWithTitle = `<h1>${cleanTitle}</h1>\n${cleanContent}`;

      contentLogger.debug('コンテンツ準備完了', {
        contentLength: contentWithTitle.length,
        firstChars: contentWithTitle.substring(0, 100)
      });

      // Typography処理
      const typographyProcessed = await this.processTypography(contentWithTitle);

      // DOM操作による変換処理
      const doc = this.domParser.parseFromString(typographyProcessed, 'text/html');
      this.rubyProcessor.fromAozoraRuby(doc.body);
      this.emphasisProcessor.fromEmphasisNotation(doc.body);
      this.lineBreakProcessor.insertLineBreaks(doc.body);

      // TCY処理
      const processed = doc.body.innerHTML;
      const tcyConverted = this.tcyConverter.process(processed);

      // XMLとして正規化
      const tempDoc = this.domParser.parseFromString(tcyConverted, 'text/html');
      const normalized = new XMLSerializer().serializeToString(tempDoc.body);

      contentLogger.debug('HTML処理完了', {
        processedLength: normalized.length,
        sampleProcessed: normalized.substring(0, 100)
      });

      // 最終的なドキュメントの作成
      const finalDoc = this.documentBuilder.createDocument(chapter.title, normalized);

      // バリデーション
      const contentDiv = finalDoc.querySelector('.content');
      contentLogger.debug('ドキュメント生成後の状態', {
        hasContentDiv: !!contentDiv,
        hasContent: contentDiv?.hasChildNodes(),
        contentLength: contentDiv?.textContent?.length,
        firstChars: contentDiv?.textContent?.substring(0, 100)
      });

      if (!contentDiv?.hasChildNodes()) {
        throw new Error('Generated document has no content');
      }

      // シリアライズしてZIPに追加
      const serialized = new XMLSerializer().serializeToString(finalDoc);
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

  /**
   * Typography処理のみを行う
   */
  private async processTypography(content: string): Promise<string> {
    contentLogger.debug('Typography処理を開始', {
      contentLength: content.length,
      firstChars: content.substring(0, 100),
      hasRuby: content.includes('《'),
      hasTcy: /[0-9０-９]{2}(?![0-9０-９])/.test(content)
    });

    try {
      // DOMパースしてbody内のHTMLを取得（これにより最外のタグは除外される）
      const doc = this.domParser.parseFromString(content, 'text/html');
      const bodyContent = doc.body.innerHTML;

      // Typography処理を実行
      const processed = await this.typographyProcessor.process(bodyContent);

      contentLogger.debug('Typography処理完了', {
        processedLength: processed.length,
        sampleProcessed: processed.substring(0, 100),
        rubyCount: (processed.match(/<ruby>/g) || []).length,
        tcyCount: (processed.match(/<span class="tcy">/g) || []).length
      });

      return processed;

    } catch (error) {
      contentLogger.error('Typography処理でエラー発生', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      });
      throw error;
    }
  }
}