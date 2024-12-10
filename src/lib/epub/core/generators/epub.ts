import JSZip from 'jszip';
import { ContentGenerator } from './content';
import { StructureGenerator } from './structure';
import { EPUBMetadata, InputChapter } from '../types';
import { generateUUID } from '../../utils/file';
import { GenerationError } from '@/lib/errors';

export class EPUBGenerator {
  private readonly contentGenerator: ContentGenerator;
  private readonly structureGenerator: StructureGenerator;

  constructor() {
    this.contentGenerator = new ContentGenerator();
    this.structureGenerator = new StructureGenerator();
  }

  /**
   * EPUBのBlobを生成します
   */
  async generateEPUB(
    chapters: InputChapter[],
    metadata: EPUBMetadata,
    options: {
      uuid?: string;
      aborted?: boolean;
    } = {}
  ): Promise<Blob> {
    try {
      const zip = new JSZip();
      const uuid = options.uuid ?? generateUUID();

      // チャプターの生成
      const generatedChapters = await this.contentGenerator.generateChapters(
        zip,
        chapters,
        options.aborted
      );

      // EPUB構造の生成
      await this.structureGenerator.generateStructure(
        zip,
        metadata,
        generatedChapters,
        uuid
      );

      // ZIPの生成とBlobへの変換
      return await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/epub+zip',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 9
        }
      });
    } catch (error) {
      throw new GenerationError(
        `EPUB生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      );
    }
  }
}

export default EPUBGenerator;