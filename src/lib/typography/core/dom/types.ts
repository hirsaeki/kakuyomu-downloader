export interface DOMElementCreator {
  createElement(tagName: string): HTMLElement;
  createTextNode(text: string): Text;
  createFragment(nodes: Node[]): DocumentFragment;
}

export interface TypographyElementCreator {
  createTcyElement(text: string): HTMLElement;
  // 将来のために用意。必要になったら実装する（YAGNIの原則！）
  createRubyElement?(base: string, text: string): HTMLElement;
}