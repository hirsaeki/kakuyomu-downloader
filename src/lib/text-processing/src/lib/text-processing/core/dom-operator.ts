export class DOMOperator {
  constructor(private doc: Document) {}

  createTextNode(text: string): Text {
    return this.doc.createTextNode(text);
  }

  createElement(tagName: string): HTMLElement {
    return this.doc.createElement(tagName);
  }

  createTcyElement(text: string): HTMLElement {
    const span = this.createElement('span');
    span.className = 'tcy';
    span.textContent = text;
    return span;
  }

  createFragment(nodes: Node[]): DocumentFragment {
    const fragment = this.doc.createDocumentFragment();
    nodes.forEach(node => fragment.appendChild(node));
    return fragment;
  }
}
