import { DOMError } from '@/lib/errors';
import { BaseDOMOperator } from './base-operator';
import type { TypographyElementCreator } from './types';

export class TypographyDOMOperator extends BaseDOMOperator implements TypographyElementCreator {
  createTcyElement(text: string): HTMLElement {
    if (!text) {
      throw new DOMError('TCY text content is required');
    }
    const span = this.createElement('span');
    span.className = 'tcy';
    span.textContent = text;
    return span;
  }
}