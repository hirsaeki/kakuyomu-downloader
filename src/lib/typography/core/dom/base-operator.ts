import { DOMError } from '@/lib/errors';
import type { DOMElementCreator } from './types';

export class BaseDOMOperator implements DOMElementCreator {
  constructor(protected doc: Document) {
    if (!doc) {
      throw new DOMError('Document object is required');
    }
  }

  createElement(tagName: string): HTMLElement {
    if (!tagName) {
      throw new DOMError('Tag name is required');
    }
    try {
      return this.doc.createElement(tagName);
    } catch {
      throw new DOMError(`Failed to create element: ${tagName}`);
    }
  }

  createTextNode(text: string): Text {
    if (text === null || text === undefined) {
      throw new DOMError('Text content cannot be null or undefined');
    }
    return this.doc.createTextNode(text);
  }

  createFragment(nodes: Node[]): DocumentFragment {
    if (!Array.isArray(nodes)) {
      throw new DOMError('Nodes must be an array');
    }
    const fragment = this.doc.createDocumentFragment();
    try {
      nodes.forEach(node => {
        if (!(node instanceof Node)) {
          throw new DOMError('Invalid node type');
        }
        fragment.appendChild(node);
      });
      return fragment;
    } catch (error) {
      throw new DOMError(
        error instanceof Error ? error.message : 'Failed to create fragment'
      );
    }
  }

  createDocumentFragment(): DocumentFragment {
    try {
      return this.doc.createDocumentFragment();
    } catch {
      throw new DOMError('Failed to create document fragment');
    }
  }

  createTreeWalker(
    root: Node,
    whatToShow: number,
    filter: NodeFilter | null
  ): TreeWalker {
    try {
      return this.doc.createTreeWalker(root, whatToShow, filter);
    } catch {
      throw new DOMError('Failed to create tree walker');
    }
  }

  replaceChild(parent: Node, newChild: Node, oldChild: Node): Node {
    try {
      return parent.replaceChild(newChild, oldChild);
    } catch {
      throw new DOMError('Failed to replace child node');
    }
  }

  appendChild(parent: Node, child: Node): Node {
    try {
      return parent.appendChild(child);
    } catch {
      throw new DOMError('Failed to append child node');
    }
  }

    createTemplate(): HTMLTemplateElement {
    try {
      return this.doc.createElement('template') as HTMLTemplateElement;
    } catch {
      throw new DOMError('Failed to create template element');
    }
  }

  cloneNode(node: Node, deep = false): Node {
    try {
      return node.cloneNode(deep);
    } catch {
      throw new DOMError('Failed to clone node');
    }
  }
}