import { DOMError } from '@/lib/errors';
import { BaseDOMOperator } from './base-operator';
import type { TypographyElementCreator } from './types';
import { createContextLogger } from '@/lib/logger';

const operatorLogger = createContextLogger('typography-operator');

export class TypographyDOMOperator extends BaseDOMOperator implements TypographyElementCreator {
  private readonly FULLWIDTH_SPACE = '　';
  private readonly HALFWIDTH_SPACE = ' ';

  createTcyElement(text: string): HTMLElement {
    operatorLogger.debug('Creating TCY element', {
      text,
      hasClass: true
    });
    
    if (!text) {
      const error = new DOMError('TCY text content is required');
      operatorLogger.error('TCY element creation failed', { error: error.message });
      throw error;
    }

    const span = this.createElement('span');
    span.setAttribute('class','tcy');
    span.textContent = text;
    return span;
  }

  private hasLeadingFullwidthSpace(text: string): boolean {
    return text.startsWith(this.FULLWIDTH_SPACE);
  }

  private hasLeadingHalfwidthSpace(text: string): boolean {
    return text.startsWith(this.HALFWIDTH_SPACE);
  }

  private convertHalfToFullwidthSpace(text: string): string {
    return text.replace(new RegExp(`^${this.HALFWIDTH_SPACE}+`), this.FULLWIDTH_SPACE);
  }

  ensureSpaceBefore(node: Node): void {
    if (!node.parentNode) {
      operatorLogger.warn('Node has no parent, skipping space insertion');
      return;
    }

    operatorLogger.debug('Checking space before node');

    if (node.previousSibling instanceof Text) {
      const prevText = node.previousSibling.textContent || '';
      
      if (!this.hasLeadingFullwidthSpace(prevText)) {
        if (this.hasLeadingHalfwidthSpace(prevText)) {
          operatorLogger.debug('Converting preceding halfwidth space to fullwidth');
          node.previousSibling.textContent = this.convertHalfToFullwidthSpace(prevText);
        } else {
          operatorLogger.debug('Inserting fullwidth space before node');
          const spaceNode = this.createTextNode(this.FULLWIDTH_SPACE);
          node.parentNode.insertBefore(spaceNode, node);
        }
      }
    } else if (node.previousSibling || node.parentNode.firstChild !== node) {
      operatorLogger.debug('Inserting fullwidth space before non-text node');
      const spaceNode = this.createTextNode(this.FULLWIDTH_SPACE);
      node.parentNode.insertBefore(spaceNode, node);
    }
  }

  ensureSpaceAfter(node: Node): void {
    if (!node.parentNode) {
      operatorLogger.warn('Node has no parent, skipping space insertion');
      return;
    }

    operatorLogger.debug('Checking space after node');

    if (node.nextSibling instanceof Text) {
      const nextText = node.nextSibling.textContent || '';
      
      if (!this.hasLeadingFullwidthSpace(nextText)) {
        if (this.hasLeadingHalfwidthSpace(nextText)) {
          operatorLogger.debug('Converting following halfwidth space to fullwidth');
          node.nextSibling.textContent = this.convertHalfToFullwidthSpace(nextText);
        } else {
          operatorLogger.debug('Inserting fullwidth space after node');
          const spaceNode = this.createTextNode(this.FULLWIDTH_SPACE);
          node.parentNode.insertBefore(spaceNode, node.nextSibling);
        }
      }
    } else {
      operatorLogger.debug('Inserting fullwidth space after node');
      const spaceNode = this.createTextNode(this.FULLWIDTH_SPACE);
      if (node.nextSibling) {
        node.parentNode.insertBefore(spaceNode, node.nextSibling);
      } else {
        node.parentNode.appendChild(spaceNode);
      }
    }
  }
}