import JSZip from 'jszip';
import { GenerationError } from '@/lib/errors';
import { generateXmlTemplates } from '../../templates';
import { OutputChapter } from '../../templates/core/types';
import { generateDefaultStyles } from '../../styles';
import EPUB_CONFIG from '@/config/epub';
import type { GeneratedChapter } from './content';
import type { EPUBMetadata } from '../types';
import { createContextLogger } from '@/lib/logger';

const structureLogger = createContextLogger('epub-structure');

/**
 * EPUB内部の構造（META-INF、OEBPSなど）を生成するジェネレーター
 */
export class StructureGenerator {
  constructor() {
    structureLogger.debug('StructureGeneratorを初期化');
  }

  /**
   * EPUBの構造を生成します
   * @param zip JSZipインスタンス
   * @param metadata EPUBのメタデータ
   * @param chapters 生成済みのチャプター情報
   * @param uuid 一意識別子
   */
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
      // META-INF/container.xml
      structureLogger.debug('META-INF生成開始');
      await this.createMetaInf(zip);
      structureLogger.debug('META-INF生成完了');

      // OEBPS directory
      structureLogger.debug('OEBPS生成開始');
      await this.createOEBPS(zip, metadata, chapters, uuid);
      structureLogger.debug('OEBPS生成完了');

      // 生成された構造の検証
      await this.validateStructure(zip);

      structureLogger.info('EPUB構造の生成完了', {
        uuid,
        contentSize: await this.getContentSize(zip)
      });

    } catch (error) {
      const errorInfo = error instanceof Error
        ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
        : 'Unknown error';

      structureLogger.error('EPUB構造生成エラー', {
        error: errorInfo,
        metadata: {
          title: metadata.title,
          uuid
        }
      });
      throw new GenerationError(
        `EPUB構造生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      );
    }
  }

  /**
   * META-INFディレクトリとcontainer.xmlを生成します
   * @param zip JSZipインスタンス
   */
  private async createMetaInf(zip: JSZip): Promise<void> {
    try {
      const metaInf = zip.folder('META-INF');
      if (!metaInf) {
        structureLogger.error('META-INFフォルダの作成に失敗');
        throw new GenerationError('フォルダの作成に失敗しました');
      }

      // container.xmlの生成
      const { containerXml } = generateXmlTemplates();
      if (!containerXml) {
        throw new GenerationError('container.xmlの生成に失敗しました');
      }

      // container.xmlの保存
      metaInf.file('container.xml', containerXml, {
        compression: EPUB_CONFIG.COMPRESSION.TYPE,
        compressionOptions: {
          level: EPUB_CONFIG.COMPRESSION.LEVEL
        }
      });

      structureLogger.debug('container.xmlを生成', {
        size: containerXml.length
      });

    } catch (error) {
      structureLogger.error('META-INF生成エラー', { error });
      throw new GenerationError('META-INF生成に失敗しました');
    }
  }

  /**
   * OEBPSディレクトリとその内容を生成します
   * @param zip JSZipインスタンス
   * @param metadata EPUBのメタデータ
   * @param chapters 生成済みのチャプター情報
   * @param uuid 一意識別子
   */
  private async createOEBPS(
    zip: JSZip,
    metadata: EPUBMetadata,
    chapters: GeneratedChapter[],
    uuid: string
  ): Promise<void> {
    try {
      // OEBPSフォルダの作成
      const oebps = zip.folder('OEBPS');
      if (!oebps) {
        throw new GenerationError('OEBPSフォルダの作成に失敗');
      }

      // テンプレート生成
      const { navXhtml, contentOpf } = generateXmlTemplates(
        metadata.lang,
        metadata,
        chapters.map((chapter, index) => this.convertToOutputChapter(chapter, index)),
        uuid
      );

      // Navigation Document (nav.xhtml)
      try {
        structureLogger.debug(`Navigation Documentを生成: ${EPUB_CONFIG.FILE_STRUCTURE.NAV}`);
        
        if (!navXhtml) {
          throw new GenerationError('Navigation Documentのテンプレート生成に失敗');
        }
  
        oebps.file(EPUB_CONFIG.FILE_STRUCTURE.NAV, navXhtml, {
          compression: EPUB_CONFIG.COMPRESSION.TYPE,
          compressionOptions: { level: EPUB_CONFIG.COMPRESSION.LEVEL }
        });
      } catch (error) {
        structureLogger.error('Navigation Document生成エラー', { error });
        throw new GenerationError(`Navigation Document生成に失敗: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
  
      // スタイルシート (style.css)
      try {
        const styles = generateDefaultStyles();
        structureLogger.debug(`スタイルシートを生成: ${EPUB_CONFIG.FILE_STRUCTURE.STYLE}`);
        
        oebps.file(EPUB_CONFIG.FILE_STRUCTURE.STYLE, styles, {
          compression: EPUB_CONFIG.COMPRESSION.TYPE,
          compressionOptions: { level: EPUB_CONFIG.COMPRESSION.LEVEL }
        });
      } catch (error) {
        structureLogger.error('スタイルシート生成エラー', { error });
        throw new GenerationError(`スタイルシート生成に失敗: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
  
      // Package Document (content.opf)
      try {
        structureLogger.debug(`OPFファイルを生成: ${EPUB_CONFIG.FILE_STRUCTURE.CONTENT}`);
        
        if (!contentOpf) {
          throw new GenerationError('Package Documentのテンプレート生成に失敗');
        }
  
        oebps.file(EPUB_CONFIG.FILE_STRUCTURE.CONTENT, contentOpf, {
          compression: EPUB_CONFIG.COMPRESSION.TYPE,
          compressionOptions: { level: EPUB_CONFIG.COMPRESSION.LEVEL }
        });
      } catch (error) {
        structureLogger.error('Package Document生成エラー', { error });
        throw new GenerationError(`Package Document生成に失敗: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
  
      // 成功ログ
      structureLogger.debug('OEBPS生成完了', {
        navSize: navXhtml?.length ?? 0,
        opfSize: contentOpf?.length ?? 0,
        styleSize: generateDefaultStyles().length
      });
  
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
      throw error; // 個別のエラーをそのまま上げる
    }
  }

  /**
   * 生成された構造を検証します
   * @param zip JSZipインスタンス
   */
  private async validateStructure(zip: JSZip): Promise<void> {
    const requiredFiles = [
      EPUB_CONFIG.FILE_STRUCTURE.CONTAINER,
      `OEBPS/${EPUB_CONFIG.FILE_STRUCTURE.CONTENT}`,
      `OEBPS/${EPUB_CONFIG.FILE_STRUCTURE.NAV}`,
      `OEBPS/${EPUB_CONFIG.FILE_STRUCTURE.STYLE}`
    ];

    for (const file of requiredFiles) {
      if (!zip.file(file)) {
        structureLogger.error(`必須ファイル ${file} が見つかりません`);
        throw new GenerationError(`必須ファイル ${file} が見つかりません`);
      }
    }
  }

  /**
   * 生成されたコンテンツのサイズを計算します
   * @param zip JSZipインスタンス
   * @returns サイズ情報
   */
  private async getContentSize(zip: JSZip): Promise<{
    total: number;
    byFile: Record<string, number>;
  }> {
    const sizes: Record<string, number> = {};
    let total = 0;

    for (const [path, file] of Object.entries(zip.files)) {
      if (!file.dir) {
        const content = await file.async('string');
        sizes[path] = content.length;
        total += content.length;
      }
    }

    return { total, byFile: sizes };
  }

  /**
   * チャプター情報を出力用の形式に変換
   */
  private convertToOutputChapter(chapter: GeneratedChapter, index: number): OutputChapter {
    return {
      title: chapter.title,
      filename: chapter.filename,  // すでにGeneratedChapterに正しいファイル名が含まれている
      hidden: false,
      landmark: index === 0 ? 'bodymatter' : undefined  // 最初のチャプターを本文として設定
    };
  }
}