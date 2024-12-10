import JSZip from 'jszip';
import { GenerationError } from '@/lib/errors';
import { generateXmlTemplates } from '../../templates';
import { generateDefaultStyles } from '../../styles';
import EPUB_CONFIG from '@/config/epub';
import type { GeneratedChapter } from './content';
import type { EPUBMetadata } from '../types';

export class StructureGenerator {
  /**
   * EPUBファイルの基本構造を生成
   */
  async generateStructure(
    zip: JSZip,
    metadata: EPUBMetadata,
    chapters: GeneratedChapter[],
    uuid: string
  ): Promise<void> {
    // MIMETYPEファイル (非圧縮)
    zip.file(
      EPUB_CONFIG.FILE_STRUCTURE.MIMETYPE,
      'application/epub+zip',
      { compression: EPUB_CONFIG.COMPRESSION.MIMETYPE_COMPRESSION }
    );

    // META-INF/container.xml
    await this.createMetaInf(zip);

    // OEBPS directory
    await this.createOEBPS(zip, metadata, chapters, uuid);
  }

  /**
   * META-INFディレクトリとcontainer.xmlを生成
   */
  private async createMetaInf(zip: JSZip): Promise<void> {
    const metaInf = zip.folder('META-INF');
    if (!metaInf) {
      throw new GenerationError('フォルダの作成に失敗しました');
    }

    const { containerXml } = generateXmlTemplates();
    metaInf.file('container.xml', containerXml);
  }

  /**
   * OEBPSディレクトリと必要なファイルを生成
   */
  private async createOEBPS(
    zip: JSZip,
    metadata: EPUBMetadata,
    chapters: GeneratedChapter[],
    uuid: string
  ): Promise<void> {
    const oebps = zip.folder('OEBPS');
    if (!oebps) {
      throw new GenerationError('フォルダの作成に失敗しました');
    }

    // テンプレートの生成
    const { navXhtml, contentOpf } = generateXmlTemplates(
      metadata.lang,
      metadata ,
      chapters,
      uuid
    );

    // Nav文書とスタイルシートの生成
    if (navXhtml) {
      oebps.file(EPUB_CONFIG.FILE_STRUCTURE.NAV, navXhtml);
    }
    oebps.file(EPUB_CONFIG.FILE_STRUCTURE.STYLE, generateDefaultStyles());

    // OPFファイルの生成
    if (contentOpf) {
      oebps.file(EPUB_CONFIG.FILE_STRUCTURE.CONTENT, contentOpf);
    }
  }
}

export default StructureGenerator;