import { NovelDownloaderError } from '@/types';
import type { DOMElementCreator } from './types';

export class BaseDOMOperator implements DOMElementCreator {
  constructor(protected doc: Document) {
    if (!doc) {
      throw new NovelDownloaderError('Document object is required');
    }
  }

  createElement(tagName: string): HTMLElement {
    if (!tagName) {
      throw new NovelDownloaderError('Tag name is required');
    }
    try {
      return this.doc.createElement(tagName);
    } catch {
      throw new NovelDownloaderError(`Failed to create element: ${tagName}`);
    }
  }

  createTextNode(text: string): Text {
    if (text === null || text === undefined) {
      throw new NovelDownloaderError('Text content cannot be null or undefined');
    }
    return this.doc.createTextNode(text);
  }

  createFragment(nodes: Node[]): DocumentFragment {
    if (!Array.isArray(nodes)) {
      throw new NovelDownloaderError('Nodes must be an array');
    }
    const fragment = this.doc.createDocumentFragment();
    try {
      nodes.forEach(node => {
        if (!(node instanceof Node)) {
          throw new NovelDownloaderError('Invalid node type');
        }
        fragment.appendChild(node);
      });
      return fragment;
    } catch (error) {
      throw new NovelDownloaderError(
        error instanceof Error ? error.message : 'Failed to create fragment'
      );
    }
  }
}