import JSZip from 'jszip';
import { ContentGenerator } from './content';
import { StructureGenerator } from './structure';
import { EPUBMetadata, InputChapter } from '../types';
import { generateUUID } from '../../utils/file';
import { GenerationError } from '@/lib/errors';
import { createContextLogger } from '@/lib/logger';

const epubLogger = createContextLogger('epub');

export class EPUBGenerator {
  private readonly contentGenerator: ContentGenerator;
  private readonly structureGenerator: StructureGenerator;

  constructor() {
    this.contentGenerator = new ContentGenerator();
    this.structureGenerator = new StructureGenerator();
    epubLogger.debug('EPUBジェネレーターを初期化');
  }

  async generateEPUB(
    chapters: InputChapter[],
    metadata: EPUBMetadata,
    options: {
      uuid?: string;
      aborted?: boolean;
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

      // チャプター生成
      epubLogger.debug('チャプター生成開始');
      const generatedChapters = await this.contentGenerator.generateChapters(
        zip,
        chapters,
        options.aborted
      );
      epubLogger.debug('チャプター生成完了', {
        generatedCount: generatedChapters.length
      });

      // EPUB構造生成
      epubLogger.debug('EPUB構造生成開始');
      await this.structureGenerator.generateStructure(
        zip,
        metadata,
        generatedChapters,
        uuid
      );
      epubLogger.debug('EPUB構造生成完了');

      // Blob生成
      epubLogger.debug('最終Blobの生成開始');
      const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/epub+zip',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });

      epubLogger.info('EPUB生成完了', {
        title: metadata.title,
        size: blob.size,
        uuid
      });

      return blob;

    } catch (error) {
      if (options.aborted) {
        epubLogger.warn('EPUB生成が中断されました', {
          title: metadata.title,
          uuid
        });
      } else {
        epubLogger.error('EPUB生成エラー', {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Unknown error',
          metadata: {
            title: metadata.title,
            chaptersCount: chapters.length,
            uuid
          }
        });
      }
      throw new GenerationError(
        `EPUB生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      );
    }
  }
}