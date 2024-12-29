import type { EPUBConfig } from '@/config/epub';
import { createContextLogger } from '@/lib/logger';

const documentLogger = createContextLogger('epub-document-builder');

interface ElementInfo {
  tagName: string;
  attributes: string[];
  textContent?: string;
}

/**
 * XHTML document builder with improved content handling
 */
export class XHTMLDocumentBuilder {
  constructor(private readonly config: EPUBConfig) {}

  /**
   * Creates an XHTML document with the given title and content
   * @param title The chapter title
   * @param content Content as either DocumentFragment or string
   * @returns Document object
   */
  createDocument(title: string, content: DocumentFragment | string): Document {
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
      const getAllElementInfo = (node: Node): ElementInfo[] => {
        const result: ElementInfo[] = [];
        if (node instanceof Element) {
          result.push({
            tagName: node.tagName,
            attributes: Array.from(node.attributes).map(a => `${a.name}="${a.value}"`),
            textContent: node.textContent?.substring(0, 20)
          });
        }
        if (node.hasChildNodes()) {
          Array.from(node.childNodes).forEach(child => {
            result.push(...getAllElementInfo(child));
          });
        }
        return result;
      };

      if (typeof content === 'string') {
        contentDiv.innerHTML = content;
      } else {
        documentLogger.debug('DocumentFragmentをインポート前の状態', {
          fragmentInfo: {
            hasChildNodes: content.hasChildNodes(),
            childNodes: content.childNodes.length,
            allElements: getAllElementInfo(content)
          }
        });
        
        const imported = doc.importNode(content, true);
        
        documentLogger.debug('DocumentFragmentをインポート後の状態', {
          importedInfo: {
            hasChildNodes: imported.hasChildNodes(),
            childNodes: imported.childNodes.length,
            allElements: getAllElementInfo(imported)
          }
        });
        
        contentDiv.appendChild(imported);
      }

      // Validate imported content
      if (!contentDiv.hasChildNodes()) {
        documentLogger.error('インポートされたコンテンツが空です');
        throw new Error('Imported content is empty');
      }
    } catch (error) {
      documentLogger.error('コンテンツのインポートに失敗:', error);
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