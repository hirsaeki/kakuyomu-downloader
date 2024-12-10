import JSZip from 'jszip';
import { TextProcessor } from '@/lib/typography/core/processor';
import { ValidationError } from '@/lib/errors/validation';
import { GenerationError } from '@/lib/errors/generation';
import { InputChapter } from '../types';
import EPUB_CONFIG from '@/config/epub';

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
    this.textProcessor = TextProcessor.getInstance();
  }

  /**
   * チャプターコンテンツを生成する
   */
  async generateChapters(
    zip: JSZip,
    chapters: InputChapter[],
    aborted: boolean = false
  ): Promise<GeneratedChapter[]> {
    const oebps = zip.folder('OEBPS');
    if (!oebps) {
      throw new GenerationError('OEBPSフォルダが見つかりません');
    }

    const generatedChapters: GeneratedChapter[] = [];

    for (let i = 0; i < chapters.length; i++) {
      if (aborted) {
        throw new GenerationError('EPUB生成がタイムアウトしました');
      }

      const chapter = chapters[i];
      const chapterNum = (i + 1).toString().padStart(3, '0');

      try {
        await this.validateChapter(chapter, i);
        const generated = await this.generateChapter(chapter, chapterNum, oebps);
        generatedChapters.push(generated);
      } catch (error) {
        throw new GenerationError(
          `Chapter ${i + 1} "${chapter.title}" の生成に失敗: ${
            error instanceof Error ? error.message : '不明なエラー'
          }`
        );
      }
    }

    if (generatedChapters.length === 0) {
      throw new ValidationError('有効なチャプターがありません');
    }

    return generatedChapters;
  }

  /**
   * 個別のチャプターを生成する
   */
  private async generateChapter(
    chapter: InputChapter,
    chapterNum: string,
    oebps: JSZip
  ): Promise<GeneratedChapter> {
    const filename = `${EPUB_CONFIG.FILE_STRUCTURE.CHAPTER_PREFIX}${chapterNum}.xhtml`;
    const convertedContent = await this.textProcessor.convertToXhtml(
      chapter.data,
      chapter.title
    );

    oebps.file(filename, convertedContent);

    return {
      filename,
      title: chapter.title
    };
  }

  /**
   * チャプターのバリデーションを行う
   */
  private validateChapter(chapter: InputChapter, index: number): void {
    if (!chapter.title?.trim()) {
      throw new ValidationError(
        `Chapter ${index + 1}: タイトルが設定されていません`,
      );
    }
    if (!chapter.data?.trim()) {
      throw new ValidationError(
        `Chapter ${index + 1}: コンテンツが空です`,
      );
    }
  }
}

export default ContentGenerator;