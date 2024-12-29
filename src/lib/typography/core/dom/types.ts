export interface DOMElementCreator {
  createElement(tagName: string): HTMLElement;
  createTextNode(text: string): Text;
  createFragment(nodes: Node[]): DocumentFragment;
  createDocumentFragment(): DocumentFragment;
  createTreeWalker(root: Node, whatToShow: number, filter: NodeFilter | null): TreeWalker;
  replaceChild(parent: Node, newChild: Node, oldChild: Node): Node;
  appendChild(parent: Node, child: Node): Node;
  createTemplate(): HTMLTemplateElement;
  cloneNode(node: Node, deep?: boolean): Node;
}

export interface TypographyElementCreator extends DOMElementCreator {
  createTcyElement(text: string): HTMLElement;
  ensureSpaceBefore(node: Node): void;
  ensureSpaceAfter(node: Node): void;
  // 将来のために用意。必要になったら実装する（YAGNIの原則！）
  createRubyElement?(base: string, text: string): HTMLElement;
}