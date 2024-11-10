import DOMPurify from 'dompurify';
import { PatternLoader } from './config/pattern-loader';
import { DOMOperator } from './core/dom-operator';
import { ConversionPattern } from './core/conversion-pattern';
import { TextProcessingError } from './core/processing-error';
import { PatternConfig } from './config/pattern-types';

// パターン設定のインポート
import numericPatterns from './config/patterns/numeric.yml';
import structurePatterns from './config/patterns/structure.yml';
import symbolPatterns from './config/patterns/symbol.yml';
import englishPatterns from './config/patterns/english.yml';
import compoundPatterns from './config/patterns/compound.yml';

export class TextProcessor {
  private patterns: ConversionPattern[] = [];
  private parser: DOMParser;
  private serializer: XMLSerializer;
  private domOperator: DOMOperator;
  private patternLoader: PatternLoader;

  constructor() {
    this.parser = new DOMParser();
    this.serializer = new XMLSerializer();
    this.domOperator = new DOMOperator(document);
    this.patternLoader = new PatternLoader(this.domOperator);
    this.initializePatterns();
  }

  private initializePatterns(): void {
    const allConfigs: PatternConfig[] = [
      structurePatterns,  // (実際の処理順はプライオリティで管理(次のソート処理)
      compoundPatterns,
      numericPatterns,
      symbolPatterns,
      englishPatterns
    ];

    this.patterns = allConfigs
      .flatMap(config => this.patternLoader.loadPatterns(config))
      .sort((a, b) => a.priority - b.priority);
  }

  public convertToXhtml(html: string, title: string = 'Chapter'): string {
    try {
      const cleanHtml = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'ruby', 'rt', 'rp', 'span', 'div', 'h1'],
        ALLOWED_ATTR: ['class']
      });

      const xhtmlTemplate = this.createXhtmlTemplate(title);
      const doc = this.parser.parseFromString(xhtmlTemplate, 'application/xhtml+xml');
      const contentDoc = this.parser.parseFromString(cleanHtml, 'text/html');

      this.addTitle(contentDoc, title);
      this.processNode(contentDoc.body);
      this.moveContent(contentDoc.body, doc.body);

      this.validateDocument(doc);

      return this.serializer.serializeToString(doc)
        .replace(/<\?xml[^>]*\?>/, '<?xml version="1.0" encoding="UTF-8"?>');

    } catch (error) {
      throw new TextProcessingError(
        `XHTML conversion error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private createXhtmlTemplate(title: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ja">
  <head>
    <title>${this.escapeXml(title)}</title>
    <meta charset="UTF-8" />
    <link rel="stylesheet" type="text/css" href="style.css" />
  </head>
  <body>
  </body>
</html>`;
  }

  private addTitle(doc: Document, title: string): void {
    const titleElement = doc.createElement('h1');
    titleElement.textContent = title;

    const breakParagraph = doc.createElement('p');
    breakParagraph.innerHTML = '&nbsp;';

    doc.body.insertBefore(breakParagraph, doc.body.firstChild);
    doc.body.insertBefore(titleElement, doc.body.firstChild);
  }

  private processNode(node: Node): void {
    try {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        this.processTextNode(node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (element.tagName.toLowerCase() === 'p') {
          this.ensureLeadingSpace(element);
        }
        Array.from(node.childNodes).forEach(child => this.processNode(child));
      }
    } catch (error) {
      throw new TextProcessingError(
        `Failed to process node: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private processTextNode(node: Node): void {
    if (!node.textContent) return;

    const fragments = this.createFragmentsFromText(node.textContent);
    if (fragments.length === 1 && fragments[0].nodeType === Node.TEXT_NODE) {
      node.textContent = fragments[0].textContent;
    } else {
      const parent = node.parentNode;
      if (parent) {
        fragments.forEach(fragment => {
          parent.insertBefore(fragment, node);
        });
        parent.removeChild(node);
      }
    }
  }

  private createFragmentsFromText(text: string): Node[] {
    const fragments: Node[] = [];
    let currentPosition = 0;
    let lastIndex = 0;

    while (currentPosition < text.length) {
      let bestMatch: RegExpExecArray | null = null;
      let bestPattern: ConversionPattern | null = null;

      for (const pattern of this.patterns) {
        pattern.pattern.lastIndex = currentPosition;
        const match = pattern.pattern.exec(text);
        if (match && match.index === currentPosition) {
          if (!bestMatch || pattern.priority < (bestPattern?.priority ?? Infinity)) {
            bestMatch = match;
            bestPattern = pattern;
          }
        }
      }

      if (bestMatch && bestPattern) {
        if (bestMatch.index > lastIndex) {
          fragments.push(
            this.domOperator.createTextNode(
              text.substring(lastIndex, bestMatch.index)
            )
          );
        }

        try {
          const processed = bestPattern.process(bestMatch);
          if (processed instanceof DocumentFragment) {
            Array.from(processed.childNodes).forEach(node => fragments.push(node));
          } else {
            fragments.push(processed);
          }
        } catch (error) {
          console.error(`Error processing pattern ${bestPattern.name}:`, error);
          fragments.push(this.domOperator.createTextNode(bestMatch[0]));
        }

        currentPosition = bestMatch.index + bestMatch[0].length;
        lastIndex = currentPosition;
      } else {
        currentPosition++;
      }
    }

    if (lastIndex < text.length) {
      fragments.push(
        this.domOperator.createTextNode(
          text.substring(lastIndex)
        )
      );
    }

    return fragments.length > 0 ? fragments : [
      this.domOperator.createTextNode(text)
    ];
  }

  private moveContent(source: Node, target: Node): void {
    Array.from(source.childNodes).forEach(node => {
      target.appendChild(target.ownerDocument.importNode(node, true));
    });
  }

  private validateDocument(doc: Document): void {
    if (doc.getElementsByTagName('parsererror').length > 0) {
      throw new TextProcessingError('Invalid XHTML generated');
    }
  }

  private ensureLeadingSpace(element: Element): void {
    const firstChild = element.firstChild;
    if (firstChild?.nodeType === Node.TEXT_NODE && firstChild.textContent &&
        !firstChild.textContent.startsWith('　')) {
      firstChild.textContent = '　' + firstChild.textContent;
    }
  }

  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
}
