import { EPUB_CONFIG } from '@/config/epub';

/**
 * デフォルトのスタイルシートを生成します
 */
export function generateDefaultStyles(): string {
  const { STYLES } = EPUB_CONFIG;
  const { FONT_FAMILIES } = EPUB_CONFIG.DEFAULTS;

  return `@charset "UTF-8";

html {
  /* 縦書きの基本設定 */
  writing-mode: ${STYLES.WRITING_MODE.VERTICAL};
  -webkit-writing-mode: ${STYLES.WRITING_MODE.VERTICAL};
  -epub-writing-mode: ${STYLES.WRITING_MODE.VERTICAL};
  -ms-writing-mode: tb-rl;
  
  /* テキストサイズの自動調整を無効化 */
  text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
  -epub-text-size-adjust: 100%;
  
  /* 基本的な余白設定 */
  margin: ${STYLES.SPACING.MARGIN};
  padding: ${STYLES.SPACING.PADDING};
  
  /* フォントレンダリングの最適化 */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  
  /* 基本のフォントサイズ設定 */
  font-size: ${STYLES.TEXT.FONT_SIZE};
}

body {
  /* 縦書き設定の継承と強制 */
  writing-mode: ${STYLES.WRITING_MODE.VERTICAL};
  -webkit-writing-mode: ${STYLES.WRITING_MODE.VERTICAL};
  -epub-writing-mode: ${STYLES.WRITING_MODE.VERTICAL};
  -ms-writing-mode: tb-rl;
  
  /* 文字の向き */
  text-orientation: mixed;
  -webkit-text-orientation: mixed;
  -epub-text-orientation: mixed;
  
  /* 行間設定 */
  line-height: ${STYLES.TEXT.LINE_HEIGHT};
  
  /* フォントファミリー */
  font-family: ${FONT_FAMILIES.join(', ')};
  
  /* 余白設定 */
  margin: ${STYLES.SPACING.MARGIN};
  padding: ${STYLES.SPACING.PADDING};
  
  /* 行分割関連 */
  line-break: strict;
  -webkit-line-break: strict;
  -epub-line-break: strict;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: normal;
  
  /* 約物の配置調整 */
  text-align: justify;
  text-justify: inter-ideograph;
  
  /* 基本カラー設定 */
  color: #000000;
  background-color: #ffffff;
}

/* 見出し設定 */
h1, h2, h3, h4, h5, h6 {
  /* フォントウェイト */
  font-weight: normal;
  
  /* 余白設定 */
  margin: 0 0 1em 0;
  padding: 0;
  
  /* 改ページ制御 */
  break-before: avoid;
  break-after: avoid;
  break-inside: avoid;
  
  /* 縦書き時の見出し位置調整 */
  text-align: left;
}

h1 {
  font-size: 1.5em;
  margin: 0 0 2em 0;
  text-align: center;
  /* 強制改ページ */
  break-before: page;
}

/* 段落設定 */
p {
  margin: ${STYLES.SPACING.MARGIN};
  padding: 0;
  text-indent: ${STYLES.TEXT.INDENT};
  
  /* 段落分割制御 */
  orphans: 2;
  widows: 2;
  break-inside: avoid;
  
  /* 禁則処理 */
  hanging-punctuation: force-end;
}

/* ルビ設定 */
ruby {
  ruby-align: center;
  -webkit-ruby-align: center;
  -epub-ruby-align: center;
  
  /* ルビの位置調整 */
  ruby-position: over;
  -webkit-ruby-position: over;
  -epub-ruby-position: over;
}

rt {
  font-size: 0.5em;
  line-height: 1;
  
  /* ルビ内の文字装飾を無効化 */
  text-emphasis: none;
  -webkit-text-emphasis: none;
  
  /* ルビの余白調整 */
  ruby-position: over;
  -webkit-ruby-position: over;
  -epub-ruby-position: over;
}

/* 縦中横設定 */
.tcy {
  /* 縦中横の基本設定 */
  text-combine-upright: all;
  -webkit-text-combine: horizontal;
  -epub-text-combine: horizontal;
  -ms-text-combine-horizontal: all;
  
  /* 文字の向き調整 */
  text-orientation: mixed;
  -webkit-text-orientation: mixed;
  -epub-text-orientation: mixed;
  
  /* 等幅数字の設定 */
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
  
  /* 文字間隔の調整 */
  letter-spacing: 0;
}

/* 英数字設定 */
.alnum {
  /* 英数字の向き */
  text-orientation: upright;
  -webkit-text-orientation: upright;
  -epub-text-orientation: upright;
  
  /* 文字間隔 */
  letter-spacing: 0.25em;
  
  /* プロポーショナル数字 */
  font-variant-numeric: proportional-nums;
  font-feature-settings: "pnum";
}

/* 引用ブロック設定 */
blockquote {
  margin: 2em 0;
  padding: 0;
  /* 引用内の余白調整 */
  padding-left: 1em;
  border-left: 3px solid #ccc;
  
  /* 引用ブロックの分割制御 */
  break-inside: avoid;
}

/* リンク設定 */
a {
  color: inherit;
  text-decoration: none;
}

/* 画像設定 */
img {
  max-width: 100%;
  height: auto;
  /* 画像の向き制御 */
  image-orientation: from-image;
}

/* 目次用設定 */
nav[epub|type="toc"] {
  /* 目次のリスト装飾除去 */
  list-style-type: none;
  padding: 0;
  margin: 0;
}

nav[epub|type="toc"] ol {
  list-style-type: none;
  padding: 0;
  margin: 1em 0;
}

nav[epub|type="toc"] li {
  margin: 0.5em 0;
  padding: 0;
}

/* 改ページ制御用クラス */
.pagebreak {
  break-before: page;
}

/* 禁則処理補助クラス */
.avoid-wrap {
  display: inline-block;
}

/* 回り込み制御 */
.clearfix::after {
  content: "";
  clear: both;
  display: table;
}`;
}