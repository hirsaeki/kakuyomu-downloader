import type { EPUBConfig } from '@/config/epub';
import { createContextLogger } from '@/lib/logger';

const documentLogger = createContextLogger('epub-document-builder');

export class XHTMLDocumentBuilder {
  constructor(private readonly config: EPUBConfig) {}

  /**
   * XHTML文書を生成
   */
  createDocument(title: string, content: DocumentFragment): Document {
    documentLogger.debug('XHTML文書の生成開始', { title });

    const { XML_VERSION, XML_ENCODING, NAMESPACE } = this.config.METADATA;
    const xhtml = `<?xml version="${XML_VERSION}" encoding="${XML_ENCODING}"?>
<!DOCTYPE html>
<html xmlns="${NAMESPACE.XHTML}" xmlns:epub="${NAMESPACE.EPUB}" xml:lang="${this.config.DEFAULTS.LANG}">
  <head>
    <title>${this.escapeXml(title)}</title>
    <meta charset="${XML_ENCODING}" />
    <link rel="stylesheet" type="text/css" href="${this.config.FILE_STRUCTURE.STYLE}" />
  </head>
  <body></body>
</html>`;

    const doc = new DOMParser().parseFromString(xhtml, 'application/xhtml+xml');
    const contentDiv = doc.createElement('div');
    contentDiv.className = 'content';
    
    // 処理済みのコンテンツを追加
    contentDiv.appendChild(doc.importNode(content, true));
    doc.body.appendChild(contentDiv);

    if (doc.getElementsByTagName('parsererror').length > 0) {
      documentLogger.error('不正なXHTML生成');
      throw new Error('Invalid XHTML generated');
    }

    documentLogger.debug('XHTML文書の生成完了');
    return doc;
  }

  /**
   * XML特殊文字をエスケープ
   */
  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, char => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '\'': '&apos;',
      '"': '&quot;'
    }[char] || char));
  }
}