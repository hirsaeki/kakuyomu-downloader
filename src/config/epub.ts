/**
 * EPUB生成に関連する設定定数
 */

export const EPUB_CONFIG = {
  // 圧縮設定
  COMPRESSION: {
    TYPE: 'DEFLATE' as const,
    LEVEL: 9,
    MIMETYPE_COMPRESSION: 'STORE' as const
  },

  // デフォルト設定
  DEFAULTS: {
    LANG: 'ja',
    PUBLISHER: 'カクヨムダウンローダー',
    TOC_TITLE: '目次',
    CHAPTER_TITLE: 'Chapter',
    FONT_FAMILIES: [
      'Noto Serif CJK JP',
      'Noto Serif JP',
      'Hiragino Mincho ProN',
      'Hiragino Mincho Pro',
      'Yu Mincho',
      'YuMincho',
      'HG Mincho E',
      'MS Mincho',
      'serif'
    ]
  },

  // ファイル構造
  FILE_STRUCTURE: {
    MIMETYPE: 'mimetype',
    CONTAINER: 'META-INF/container.xml',
    CONTENT: 'OEBPS/content.opf',
    NAV: 'OEBPS/nav.xhtml',
    STYLE: 'OEBPS/style.css',
    CHAPTER_PREFIX: 'chapter_'
  },

  // メタデータ
  METADATA: {
    XML_VERSION: '1.0',
    XML_ENCODING: 'UTF-8',
    EPUB_VERSION: '3.0',
    NAMESPACE: {
      EPUB: 'http://www.idpf.org/2007/ops',
      XHTML: 'http://www.w3.org/1999/xhtml',
      DC: 'http://purl.org/dc/elements/1.1/',
      OPF: 'http://www.idpf.org/2007/opf'
    }
  },

  // スタイル設定
  STYLES: {
    WRITING_MODE: {
      VERTICAL: 'vertical-rl',
      HORIZONTAL: 'horizontal-tb'
    },
    TEXT: {
      INDENT: '1em',
      LINE_HEIGHT: 1.8,
      FONT_SIZE: '1em'
    },
    SPACING: {
      PADDING: '2em 2.5em',
      MARGIN: '0'
    }
  }
} as const;

// 型定義
export type EPUBCompression = typeof EPUB_CONFIG.COMPRESSION;
export type EPUBDefaults = typeof EPUB_CONFIG.DEFAULTS;
export type EPUBFileStructure = typeof EPUB_CONFIG.FILE_STRUCTURE;
export type EPUBMetadata = typeof EPUB_CONFIG.METADATA;
export type EPUBStyles = typeof EPUB_CONFIG.STYLES;
export type EPUBConfig = typeof EPUB_CONFIG;

// 設定全体をデフォルトエクスポート
export default Object.freeze(EPUB_CONFIG);