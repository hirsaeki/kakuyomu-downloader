import { JSDOM } from 'jsdom';

/**
 * テスト用のDOM操作ユーティリティ
 */
export function createTestElement(content: string): HTMLElement {
  const element = new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document.createElement('div');
  element.textContent = content;
  return element;
}

/**
 * テスト用の文字列取得ユーティリティ
 */
export function getNodeContent(node: HTMLElement): string {
  return node.innerHTML;
}

/**
 * テスト用DOMParserの設定
 * 既存のグローバルDOMParserを上書きします
 */
export function setupTestDOMParser(): void {
  (global as any).DOMParser = class DOMParser {
    parseFromString(string: string, _: string) {
      return new JSDOM(string).window.document;
    }
  };
}