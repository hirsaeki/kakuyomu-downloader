import JSZip from 'jszip';
import { TextProcessor } from '../text-processing';
import {
  Episode,
  DownloadedEpisode,
  EPUBGeneratorResult,
  TextProcessorOptions,
  NovelDownloaderError,
  ValidationError
} from '@/types';
import { generateXmlTemplates } from './templates';
import { generateStyles } from './styles';
import { generateUUID, sanitizeFilename, formatDate } from './utils';
import { getDisplayTitle } from '@/lib/display/utils';
import { EPUB_CONFIG, NETWORK_CONFIG } from '@/config/constants';

class EPUBGenerator {
  private readonly textProcessor: TextProcessor;
  private readonly options: Required<TextProcessorOptions>;
  private aborted: boolean = false;

  constructor(options: TextProcessorOptions) {
    if (!options.title?.trim()) {
      throw new ValidationError('タイトルは必須です');
    }
    if (!options.author?.trim()) {
      throw new ValidationError('著者名は必須です');
    }
    if (!Array.isArray(options.content) || options.content.length === 0) {
      throw new ValidationError('コンテンツは必須です');
    }

    this.options = {
      title: options.title,
      author: options.author,
      publisher: options.publisher || EPUB_CONFIG.DEFAULTS.PUBLISHER,
      tocTitle: options.tocTitle || EPUB_CONFIG.DEFAULTS.TOC_TITLE,
      lang: options.lang || EPUB_CONFIG.DEFAULTS.LANG,
      content: options.content
    };

    this.textProcessor = TextProcessor.getInstance();
  }

  async generate(): Promise<EPUBGeneratorResult> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        this.aborted = true;
        reject(new NovelDownloaderError('EPUB生成がタイムアウトしました'));
      }, NETWORK_CONFIG.TIMEOUTS.EPUB_GEN);
    });

    try {
      const generatePromise = this.generateEpub();
      const result = await Promise.race([generatePromise, timeoutPromise]);
      return result;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NovelDownloaderError) {
        return { success: false, error: error.message };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'EPUB生成中に不明なエラーが発生しました'
      };
    }
  }

  private async generateEpub(): Promise<EPUBGeneratorResult> {
    const zip = new JSZip();

    try {
      if (this.aborted) {
        throw new NovelDownloaderError('EPUB生成がキャンセルされました');
      }

      // MIMETYPEファイル (非圧縮)
      zip.file(
        EPUB_CONFIG.FILE_STRUCTURE.MIMETYPE,
        'application/epub+zip',
        { compression: 'STORE' }
      );

      const uuid = generateUUID();
      const now = formatDate(new Date());

      // META-INF/container.xml
      const metaInf = zip.folder('META-INF');
      if (!metaInf) {
        throw new NovelDownloaderError('フォルダの作成に失敗しました');
      }

      // コンテンツの生成
      const chapters = await this.generateChapters(zip);

      // テンプレートの生成
      const { containerXml, navXhtml, contentOpf } = generateXmlTemplates(
        this.options.lang,
        {
          ...this.options,
          modifiedDate: now
        },
        chapters,
        uuid
      );

      metaInf.file('container.xml', containerXml);

      // OEBPSフォルダの作成と必要なファイルの追加
      const oebps = zip.folder('OEBPS');
      if (!oebps) {
        throw new NovelDownloaderError('フォルダの作成に失敗しました');
      }

      // Nav文書とスタイルシートの生成
      if (navXhtml) {
        oebps.file(EPUB_CONFIG.FILE_STRUCTURE.NAV, navXhtml);
      }
      oebps.file(EPUB_CONFIG.FILE_STRUCTURE.STYLE, generateStyles());

      // OPFファイルの生成
      if (contentOpf) {
        oebps.file(EPUB_CONFIG.FILE_STRUCTURE.CONTENT, contentOpf);
      }

      // EPUBの生成
      const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/epub+zip',
        compression: EPUB_CONFIG.COMPRESSION.TYPE,
        compressionOptions: {
          level: EPUB_CONFIG.COMPRESSION.LEVEL
        }
      });

      return { success: true, blob };

    } catch (error) {
      if (error instanceof ValidationError || error instanceof NovelDownloaderError) {
        return { success: false, error: error.message };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'EPUB生成中に不明なエラーが発生しました'
      };
    }
  }

  private async generateChapters(zip: JSZip): Promise<Array<{ filename: string; title: string; }>> {
    const oebps = zip.folder('OEBPS');
    if (!oebps) {
      throw new NovelDownloaderError('OEBPSフォルダが見つかりません');
    }

    const chapters: Array<{ filename: string; title: string }> = [];

    for (let i = 0; i < this.options.content.length; i++) {
      if (this.aborted) {
        throw new NovelDownloaderError('EPUB生成がタイムアウトしました');
      }

      const chapter = this.options.content[i];
      const chapterNum = (i + 1).toString().padStart(3, '0');

      try {
        if (!chapter.title?.trim()) {
          throw new ValidationError(`Chapter ${i + 1}: タイトルが設定されていません`);
        }
        if (!chapter.data?.trim()) {
          throw new ValidationError(`Chapter ${i + 1}: コンテンツが空です`);
        }

        const filename = `${EPUB_CONFIG.FILE_STRUCTURE.CHAPTER_PREFIX}${chapterNum}.xhtml`;
        const convertedContent = this.textProcessor.convertToXhtml(
          chapter.data,
          chapter.title
        );

        oebps.file(filename, convertedContent);
        chapters.push({
          filename,
          title: chapter.title
        });
      } catch (error) {
        throw new NovelDownloaderError(
          `Chapter ${i + 1} "${chapter.title}" の生成に失敗: ${
            error instanceof Error ? error.message : '不明なエラー'
          }`
        );
      }
    }

    if (chapters.length === 0) {
      throw new ValidationError('有効なチャプターがありません');
    }

    return chapters;
  }
}

export async function generateEpub(
  workTitle: string,
  episodes: Episode[],
  author: string,
  showGroupTitles: boolean
): Promise<EPUBGeneratorResult> {
  try {
    if (!workTitle?.trim()) {
      throw new ValidationError('作品タイトルが設定されていません');
    }

    if (!author?.trim()) {
      throw new ValidationError('著者名が設定されていません');
    }

    if (!Array.isArray(episodes) || episodes.length === 0) {
      throw new ValidationError('エピソードが選択されていません');
    }

    // ダウンロード済みエピソードの型チェックと変換
    const downloadedEpisodes: DownloadedEpisode[] = episodes.map(episode => {
      if (!episode.title?.trim()) {
        throw new ValidationError('エピソードタイトルが設定されていません');
      }
      if (!episode.content?.trim()) {
        throw new ValidationError(`エピソード "${episode.title}" のコンテンツが空です`);
      }

      return episode as DownloadedEpisode;
    });

    // エピソードの処理
    const processedEpisodes = downloadedEpisodes.map(episode => ({
      title: getDisplayTitle(episode, showGroupTitles),
      data: episode.content,
      metadata: {
        groupTitle: episode.groupTitle,
        date: episode.date,
        originalUrl: episode.url
      }
    }));

    // ジェネレーターの初期化と実行
    const generator = new EPUBGenerator({
      title: workTitle,
      author: author,
      publisher: EPUB_CONFIG.DEFAULTS.PUBLISHER,
      tocTitle: EPUB_CONFIG.DEFAULTS.TOC_TITLE,
      lang: EPUB_CONFIG.DEFAULTS.LANG,
      content: processedEpisodes
    });

    const result = await generator.generate();
    if (!result.success || !result.blob) {
      throw new NovelDownloaderError(result.error || 'EPUB生成に失敗しました');
    }

    // Blobの生成とダウンロード
    const url = URL.createObjectURL(result.blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFilename(workTitle)}.epub`;
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Blobの解放
    URL.revokeObjectURL(url);

    return { success: true };

  } catch (error) {
    if (error instanceof ValidationError || error instanceof NovelDownloaderError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'EPUB生成中に不明なエラーが発生しました'
    };
  }
}

export default generateEpub;
