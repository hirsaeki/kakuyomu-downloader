import JSZip from 'jszip';
import { ContentGenerator } from './content';
import { StructureGenerator } from './structure';
import { EPUBMetadata, InputChapter } from '../types';
import { generateUUID } from '../../utils/file';
import { GenerationError } from '@/lib/errors';
import { createContextLogger } from '@/lib/logger';
import EPUB_CONFIG from '@/config/epub';

const epubLogger = createContextLogger('epub');

/**
 * EPUBファイルを生成するためのジェネレータークラス
 * EPUB 3.0仕様に準拠したファイルを生成します
 */
export class EPUBGenerator {
  private readonly contentGenerator: ContentGenerator;
  private readonly structureGenerator: StructureGenerator;

  constructor() {
    this.contentGenerator = new ContentGenerator();
    this.structureGenerator = new StructureGenerator();
    epubLogger.debug('EPUBジェネレーターを初期化');
  }

  /**
   * EPUBファイルを生成します
   * @param chapters 小説の章データ
   * @param metadata EPUBのメタデータ
   * @param options 生成オプション
   * @returns 生成されたEPUBファイルのBlob
   * @throws GenerationError EPUB生成中にエラーが発生した場合
   */
  async generateEPUB(
    chapters: InputChapter[],
    metadata: EPUBMetadata,
    options: {
      uuid?: string;
      aborted?: boolean;
      useGroupTitles?: boolean;
    } = {}
  ): Promise<Blob> {
    const uuid = options.uuid ?? generateUUID();
    epubLogger.info('EPUB生成を開始', {
      title: metadata.title,
      chaptersCount: chapters.length,
      uuid
    });

    try {
      const zip = new JSZip();

      // mimetypeファイルを最初に追加（非圧縮、フォルダなし）
      epubLogger.debug('mimetypeファイルを作成');
      zip.file(
        EPUB_CONFIG.FILE_STRUCTURE.MIMETYPE,
        'application/epub+zip',
        {
          compression: 'STORE',
          createFolders: false
        }
      );

      // チャプター生成
      epubLogger.debug('チャプター生成開始');
      const generatedChapters = await this.contentGenerator.generateChapters(
        zip,
        chapters,
        options.aborted,
        {
          useGroupTitles: options?.useGroupTitles ?? false
        }
      );
      epubLogger.debug('チャプター生成完了', {
        generatedCount: generatedChapters.length
      });

      // EPUB構造生成（META-INF, OEBPS）
      epubLogger.debug('EPUB構造生成開始');
      await this.structureGenerator.generateStructure(
        zip,
        metadata,
        generatedChapters,
        uuid
      );
      epubLogger.debug('EPUB構造生成完了');

      // Blob生成時の圧縮設定
      epubLogger.debug('最終Blobの生成開始');
      const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/epub+zip',
        compression: EPUB_CONFIG.COMPRESSION.TYPE,
        compressionOptions: {
          level: EPUB_CONFIG.COMPRESSION.LEVEL
        },
        platform: 'UNIX'
      });

      const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
      epubLogger.info('EPUB生成完了', {
        title: metadata.title,
        size: `${sizeMB}MB`,
        uuid
      });

      return blob;

    } catch (error) {
      // 生成中断の場合
      if (options.aborted) {
        epubLogger.warn('EPUB生成が中断されました', {
          title: metadata.title,
          uuid
        });
        throw new GenerationError('EPUB生成が中断されました');
      }

      // エラーの場合
      const errorInfo = error instanceof Error
        ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
        : 'Unknown error';

      epubLogger.error('EPUB生成エラー', {
        error: errorInfo,
        metadata: {
          title: metadata.title,
          chaptersCount: chapters.length,
          uuid
        }
      });

      throw new GenerationError(
        `EPUB生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      );
    }
  }

  /**
   * 生成されたEPUBファイルの妥当性を検証します
   * @param blob 生成されたEPUBファイルのBlob
   * @returns 検証結果
   */
  async validateEPUB(blob: Blob): Promise<boolean> {
    try {
      const zip = await JSZip.loadAsync(blob);
      
      // mimetypeファイルのチェック
      const mimetype = await zip.file(EPUB_CONFIG.FILE_STRUCTURE.MIMETYPE)?.async('string');
      if (!mimetype || mimetype !== 'application/epub+zip') {
        epubLogger.error('mimetypeファイルが不正です');
        return false;
      }

      // META-INF/container.xmlのチェック
      const container = await zip.file(EPUB_CONFIG.FILE_STRUCTURE.CONTAINER)?.async('string');
      if (!container) {
        epubLogger.error('container.xmlが見つかりません');
        return false;
      }

      // OPFファイルのチェック
      const content = await zip.file(EPUB_CONFIG.FILE_STRUCTURE.CONTENT)?.async('string');
      if (!content) {
        epubLogger.error('content.opfが見つかりません');
        return false;
      }

      epubLogger.info('EPUB構造の検証が完了しました');
      return true;

    } catch (error) {
      epubLogger.error('EPUB検証エラー', { error });
      return false;
    }
  }
}