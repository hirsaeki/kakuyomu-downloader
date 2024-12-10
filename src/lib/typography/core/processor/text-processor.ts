import type { PatternConfig, TransformContext } from '../transform/base/types';
import { ProcessorError } from '@/lib/errors';
import { EpubTransformer } from '../transform/epub';
import EPUB_CONFIG from '@/config/epub';

export interface TextProcessorOptions {
  /**
   * パターンの設定配列（オプション）
   * 指定がない場合はデフォルトのパターンを使用
   */
  patterns?: PatternConfig[];

  /**
   * 変換オプション（オプション）
   */
  options?: {
    enableRuby?: boolean;  // ルビ処理の有効化
    enableTcy?: boolean;   // 縦中横処理の有効化
  };
}

/**
 * テキスト処理を行うクラス
 * Singletonパターンで実装
 */
export class TextProcessor {
  private static instance: TextProcessor;
  private transformer: EpubTransformer;

  private constructor() {
    // デフォルトのパターンとオプションで初期化
    this.transformer = new EpubTransformer(
      [],  // TODO: デフォルトパターンの実装
      {
        enableRuby: false,
        enableTcy: true
      }
    );
  }

  /**
   * インスタンスを取得
   */
  public static getInstance(): TextProcessor {
    if (!TextProcessor.instance) {
      TextProcessor.instance = new TextProcessor();
    }
    return TextProcessor.instance;
  }

  /**
   * テキストをXHTML形式に変換
   */
  public async convertToXhtml(
    text: string,
    title: string
  ): Promise<string> {
    try {
      // テキストの変換を実行
      const context: TransformContext = {
        text,
        processedRanges: []
      };

      const result = await this.transformer.execute(context);

      // XHTMLテンプレートの生成
      return this.wrapInXhtml(result.content, title);
    } catch (error) {
      throw new ProcessorError(
        `テキスト変換に失敗: ${error instanceof Error ? error.message : 'XHTML変換エラー'}`
      );
    }
  }

  /**
   * テキストをXHTMLで包む
   */
  private wrapInXhtml(content: string, title: string): string {
    const { XML_VERSION, XML_ENCODING, NAMESPACE } = EPUB_CONFIG.METADATA;
    
    return `<?xml version="${XML_VERSION}" encoding="${XML_ENCODING}"?>
<!DOCTYPE html>
<html xmlns="${NAMESPACE.XHTML}" xmlns:epub="${NAMESPACE.EPUB}" xml:lang="${EPUB_CONFIG.DEFAULTS.LANG}">
<head>
  <meta charset="${XML_ENCODING}" />
  <title>${title}</title>
  <link rel="stylesheet" type="text/css" href="../style.css" />
</head>
<body>
  <h1>${title}</h1>
  ${content}
</body>
</html>`;
  }
}