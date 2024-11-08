import * as JSZip from 'jszip';
import TextProcessor from './textProcessor';

class EpubGenerator {
  constructor(options) {
    this.options = {
      title: options.title || 'Unknown Title',
      author: options.author || 'Unknown Author',
      publisher: options.publisher || 'Unknown Publisher',
      tocTitle: options.tocTitle || '目次',
      lang: options.lang || 'ja',
      content: options.content || []
    };
    this.textProcessor = new TextProcessor();
  }

  async generate() {
    const zip = new JSZip();
    const uuid = this.generateUUID();

    // MIMETYPEファイル
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // META-INF/container.xml
    zip.folder('META-INF').file('container.xml', this.generateContainerXml());

    // OEBPS フォルダ作成
    const oebps = zip.folder('OEBPS');

    // チャプターファイルの生成
    const chapters = await this.generateChapters(oebps);

    // nav.xhtmlの生成（EPUB3必須）
    oebps.file('nav.xhtml', this.generateNavXhtml(chapters));

    // スタイルシート
    oebps.file('style.css', this.generateStylesheet());

    // OPFファイル
    oebps.file('content.opf', this.generateContentOpf(chapters, uuid));

    try {
      const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/epub+zip',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });

      return { success: true, blob };
    } catch (error) {
      console.error('ZIP生成エラー:', error);
      throw error;
    }
  }

  async generateChapters(oebps) {
    return Promise.all(this.options.content.map(async (chapter, index) => {
      const filename = `chapter_${index + 1}.xhtml`;
      const title = chapter.title || `Chapter ${index + 1}`;

      // タイトルを引数として渡してTextProcessorを使用
      const convertedContent = this.textProcessor.convertToXhtml(
        chapter.data,
        title  // タイトルを渡す
      );

      oebps.file(filename, convertedContent);

      return {
        filename,
        title: title
      };
    }));
  }

  generateContainerXml() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  }

  generateNavXhtml(chapters) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${this.options.lang}">
<head>
  <title>${this.escapeXml(this.options.tocTitle)}</title>
  <meta charset="UTF-8" />
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${this.escapeXml(this.options.tocTitle)}</h1>
    <ol>
      ${chapters.map(chapter => `
        <li><a href="${chapter.filename}">${this.escapeXml(chapter.title)}</a></li>
      `).join('')}
    </ol>
  </nav>
</body>
</html>`;
  }

  generateStylesheet() {
    return `@charset "UTF-8";

html {
  writing-mode: vertical-rl;
  -epub-writing-mode: vertical-rl;
  -webkit-writing-mode: vertical-rl;
}

body {
  writing-mode: vertical-rl;
  -epub-writing-mode: vertical-rl;
  -webkit-writing-mode: vertical-rl;
  text-orientation: mixed;
  -webkit-text-orientation: mixed;
  -epub-text-orientation: mixed;
  line-height: 1.8;
  font-family: "Noto Serif CJK JP", "Noto Serif JP", "Hiragino Mincho ProN", "Hiragino Mincho Pro", "HiraMinProN-W3", "Yu Mincho", "YuMincho", "HG Mincho E", "MS Mincho", serif;
  margin: 0;
  padding: 2em;
  line-break: normal;
  -epub-line-break: normal;
  -webkit-line-break: normal;
}

h1 {
  margin: 0 0 2em 0;
  font-size: 1.5em;
  font-weight: normal;
  text-align: left;
}

p {
  margin: 0;
  padding: 0;
  text-indent: 1em;
}

ruby {
  ruby-align: center;
}

rt {
  text-emphasis: none;
  font-size: 0.5em;
}

/* 縦中横用クラス */
.tcy {
  text-combine-upright: all;
  -webkit-text-combine: horizontal;
  -epub-text-combine: horizontal;
  font-feature-settings: "tnum";
}

/* 英数字用クラス */
.alnum {
  text-orientation: upright;
  -webkit-text-orientation: upright;
  -epub-text-orientation: upright;
  letter-spacing: 0.25em;
}`;
  }

  generateContentOpf(chapters, uuid) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookID" xml:lang="${this.options.lang}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title id="title">${this.escapeXml(this.options.title)}</dc:title>
    <dc:creator id="creator">${this.escapeXml(this.options.author)}</dc:creator>
    <dc:publisher>${this.escapeXml(this.options.publisher)}</dc:publisher>
    <dc:language>${this.options.lang}</dc:language>
    <dc:identifier id="BookID">urn:uuid:${uuid}</dc:identifier>
    <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]}Z</meta>
    <meta property="rendition:layout">reflowable</meta>
    <meta property="rendition:orientation">auto</meta>
    <meta property="rendition:spread">none</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="style" href="style.css" media-type="text/css"/>
    ${chapters.map((chapter, index) => `
      <item id="chapter${index + 1}" href="${chapter.filename}" media-type="application/xhtml+xml"/>
    `).join('')}
  </manifest>
  <spine page-progression-direction="rtl">
    ${chapters.map((_, index) => `
      <itemref idref="chapter${index + 1}"/>
    `).join('')}
  </spine>
</package>`;
  }

  escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export default async function generateEpub(workTitle, episodes) {
  try {
    if (!workTitle || !episodes || episodes.length === 0) {
      throw new Error('無効な入力パラメータです');
    }

    console.log('EPUB生成開始:', {
      workTitle,
      episodeCount: episodes.length
    });

    const processedEpisodes = episodes.map(episode => ({
      title: episode.title,
      data: episode.content
    }));

    const generator = new EpubGenerator({
      title: workTitle,
      author: "カクヨム作品",
      publisher: "カクヨムダウンローダー",
      tocTitle: "目次",
      lang: "ja",
      content: processedEpisodes
    });

    const result = await generator.generate();

    if (!result.success) {
      throw new Error('EPUBの生成に失敗しました');
    }

    // Blobをダウンロード
    const url = window.URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workTitle}.epub`.replace(/[<>:"\/\\|?*]+/g, '_');
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return { success: true };
  } catch (error) {
    console.error('EPUB generation error:', error);
    return { success: false, error: error.message };
  }
}
