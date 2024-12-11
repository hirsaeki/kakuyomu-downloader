import JSZip from 'jszip';
import { GenerationError } from '@/lib/errors';
import { generateXmlTemplates } from '../../templates';
import { generateDefaultStyles } from '../../styles';
import EPUB_CONFIG from '@/config/epub';
import type { GeneratedChapter } from './content';
import type { EPUBMetadata } from '../types';
import { createContextLogger } from '@/lib/logger';

const structureLogger = createContextLogger('epub-structure');

export class StructureGenerator {
  constructor() {
    structureLogger.debug('StructureGeneratorを初期化');
  }

  async generateStructure(
    zip: JSZip,
    metadata: EPUBMetadata,
    chapters: GeneratedChapter[],
    uuid: string
  ): Promise<void> {
    structureLogger.info('EPUB構造の生成開始', {
      title: metadata.title,
      chaptersCount: chapters.length,
      uuid
    });

    try {
      // MIMETYPEファイル (非圧縮)
      structureLogger.debug('mimetypeファイルを作成');
      zip.file(
        EPUB_CONFIG.FILE_STRUCTURE.MIMETYPE,
        'application/epub+zip',
        { compression: EPUB_CONFIG.COMPRESSION.MIMETYPE_COMPRESSION }
      );

      // META-INF/container.xml
      structureLogger.debug('META-INF生成開始');
      await this.createMetaInf(zip);
      structureLogger.debug('META-INF生成完了');

      // OEBPS directory
      structureLogger.debug('OEBPS生成開始');
      await this.createOEBPS(zip, metadata, chapters, uuid);
      structureLogger.debug('OEBPS生成完了');

      structureLogger.info('EPUB構造の生成完了', { uuid });

    } catch (error) {
      structureLogger.error('EPUB構造生成エラー', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error',
        metadata: {
          title: metadata.title,
          uuid
        }
      });
      throw error;
    }
  }

  private async createMetaInf(zip: JSZip): Promise<void> {
    try {
      const metaInf = zip.folder('META-INF');
      if (!metaInf) {
        structureLogger.error('META-INFフォルダの作成に失敗');
        throw new GenerationError('フォルダの作成に失敗しました');
      }

      const { containerXml } = generateXmlTemplates();
      metaInf.file('container.xml', containerXml);
      structureLogger.debug('container.xmlを生成');

    } catch (error) {
      structureLogger.error('META-INF生成エラー', { error });
      throw new GenerationError('META-INF生成に失敗しました');
    }
  }

  private async createOEBPS(
    zip: JSZip,
    metadata: EPUBMetadata,
    chapters: GeneratedChapter[],
    uuid: string
  ): Promise<void> {
    try {
      const oebps = zip.folder('OEBPS');
      if (!oebps) {
        structureLogger.error('OEBPSフォルダの作成に失敗');
        throw new GenerationError('フォルダの作成に失敗しました');
      }

      // テンプレートの生成
      structureLogger.debug('XMLテンプレート生成開始');
      const { navXhtml, contentOpf } = generateXmlTemplates(
        metadata.lang,
        metadata,
        chapters,
        uuid
      );

      // Nav文書とスタイルシートの生成
      if (navXhtml) {
        structureLogger.debug('Navigation Documentを生成');
        oebps.file(EPUB_CONFIG.FILE_STRUCTURE.NAV, navXhtml);
      }

      structureLogger.debug('スタイルシートを生成');
      oebps.file(EPUB_CONFIG.FILE_STRUCTURE.STYLE, generateDefaultStyles());

      // OPFファイルの生成
      if (contentOpf) {
        structureLogger.debug('OPFファイルを生成');
        oebps.file(EPUB_CONFIG.FILE_STRUCTURE.CONTENT, contentOpf);
      }

      structureLogger.debug('OEBPS生成完了');

    } catch (error) {
      structureLogger.error('OEBPS生成エラー', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error',
        metadata: {
          title: metadata.title,
          uuid
        }
      });
      throw new GenerationError('OEBPS生成に失敗しました');
    }
  }
}