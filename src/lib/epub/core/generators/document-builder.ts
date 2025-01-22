import type { EPUBConfig } from '@/config/epub';
import { createContextLogger } from '@/lib/logger';

const documentLogger = createContextLogger('epub-document-builder');

/**
 * XHTML document builder with improved content handling
 */
export class XHTMLDocumentBuilder {
  constructor(private readonly config: EPUBConfig) {}

  /**
   * Creates an XHTML document with the given title and content
   * @param title The chapter title
   * @param content Content as string
   * @returns Document object
   */
  createDocument(title: string, content: string): Document {
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
  <body><div class="content"></div></body>
</html>`;

    // Parse base document
    const doc = new DOMParser().parseFromString(xhtml, 'application/xhtml+xml');
    const contentDiv = doc.querySelector('.content');
    
    if (!contentDiv) {
      documentLogger.error('コンテンツコンテナが見つかりません');
      throw new Error('Failed to find content container');
    }

    try {
      contentDiv.innerHTML = content;

      // Validate imported content
      if (!contentDiv.hasChildNodes()) {
        documentLogger.error('インポートされたコンテンツが空です');
        throw new Error('Imported content is empty');
      }

      documentLogger.debug('コンテンツインポート完了', {
        hasContent: contentDiv.hasChildNodes(),
        contentLength: contentDiv.textContent?.length,
        sampleContent: contentDiv.textContent?.substring(0, 100)
      });
    } catch (error) {
      documentLogger.error('コンテンツのインポートに失敗', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contentLength: content.length,
        sampleContent: content.substring(0, 100)
      });
      throw error;
    }

    // Check for parser errors
    const parserErrors = doc.getElementsByTagName('parsererror');
    if (parserErrors.length > 0) {
      documentLogger.error('不正なXHTML生成', {
        error: parserErrors[0].textContent
      });
      throw new Error('Invalid XHTML generated');
    }

    documentLogger.debug('XHTML文書の生成完了');
    return doc;
  }

  /**
   * Escape XML special characters
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