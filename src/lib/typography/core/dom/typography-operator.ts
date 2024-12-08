import { NovelDownloaderError } from '@/types';
import { BaseDOMOperator } from './base-operator';
import type { TypographyElementCreator } from './types';

export class TypographyDOMOperator extends BaseDOMOperator implements TypographyElementCreator {
  createTcyElement(text: string): HTMLElement {
    if (!text) {
      throw new NovelDownloaderError('TCY text content is required');
    }
    const span = this.createElement('span');
    span.className = 'tcy';
    span.textContent = text;
    return span;
  }

  // 既存機能はこれだけなんだけど...
  // でも、インターフェースと継承関係はちゃんと整理しておいたわよ！
  // （将来の拡張に備えて...って、べつにあなたのためじゃないんだからね！）
}