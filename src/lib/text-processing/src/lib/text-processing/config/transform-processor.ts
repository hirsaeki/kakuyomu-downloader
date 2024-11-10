import { DOMOperator } from '../core/dom-operator';
import { 
  TransformStep, 
  WidthTarget, 
  WidthDirection, 
  TransformConfig 
} from './pattern-types';
import { TextProcessingError } from '../core/processing-error';

export class TransformProcessor {
  constructor(private domOperator: DOMOperator) {}

  processTransform(
    type: 'text' | 'tcy',
    steps: TransformStep[],
    match: RegExpExecArray,
    config: TransformConfig
  ): Node | Node[] {
    let result = this.processSteps(steps, match);
    let node: Node;

    switch (type) {
      case 'text':
        node = this.domOperator.createTextNode(result);
        break;
      case 'tcy':
        node = this.domOperator.createTcyElement(result);
        break;
      default:
        throw new TextProcessingError(`Unsupported transform type: ${type}`);
    }

    // 設定に基づいて空白を処理
    if (config.ensureSpace?.after && match.input) {
      const afterMatch = match.input.slice(match.index + match[0].length);
      if (afterMatch && !afterMatch.startsWith('　') && !afterMatch.startsWith(' ')) {
        return this.domOperator.createFragment([
          node,
          this.domOperator.createTextNode('　')
        ]);
      }
    }

    return node;
  }

  private processSteps(steps: TransformStep[], match: RegExpExecArray): string {
    let current: string | string[] = match[0];
    const groups = Array.from(match);

    for (const step of steps) {
      switch (step.action) {
        case 'convertWidth':
          if (typeof current !== 'string') {
            throw new TextProcessingError('Cannot convert width of non-string value');
          }
          current = this.convertWidth(
            current,
            step.target || 'numbers',
            step.direction
          );
          break;

        case 'splitBy':
          if (typeof current !== 'string') {
            throw new TextProcessingError('Cannot split non-string value');
          }
          const separators = Array.isArray(step.separator)
            ? step.separator
            : [step.separator || ''];
          const pattern = new RegExp(`[${separators.join('')}]`);
          current = current.split(pattern).map(s => s.trim()).filter(Boolean);
          break;

        case 'convertEach':
          if (!step.rules) break;
          if (Array.isArray(current)) {
            current = current.map(item => 
              this.applyConversionRules(item, step.rules!)
            );
          } else {
            current = this.applyConversionRules(current, step.rules);
          }
          break;

        case 'convertGroups':
          if (!step.rules) break;
          current = step.rules.map(rule => 
            rule.group !== undefined
              ? this.applyConversionRules(groups[rule.group], [{ type: rule.type }])
              : ''
          );
          break;

        case 'join':
          if (!Array.isArray(current)) {
            continue;
          }
          if (step.template) {
            current = this.joinWithTemplate(current, step.template);
          } else {
            current = current.join(step.with || '');
          }
          break;

        case 'replace':
          if (typeof current !== 'string') {
            throw new TextProcessingError('Cannot replace in non-string value');
          }
          if (step.from && step.to) {
            current = current.replace(new RegExp(step.from, 'g'), step.to);
          }
          break;

        case 'wrap':
          if (typeof current !== 'string') {
            throw new TextProcessingError('Cannot wrap non-string value');
          }
          current = `${step.prefix || ''}${current}${step.suffix || ''}`;
          break;
      }
    }

    return typeof current === 'string' ? current : current.join('');
  }

  private convertWidth(
    text: string, 
    target: WidthTarget,
    direction: WidthDirection = 'halfwidth'
  ): string {
    const converter = direction === 'fullwidth' ? 
      this.toFullWidth : 
      this.toHalfWidth;

    switch (target) {
      case 'numbers':
        return converter(text, '0-9', '０-９');
      case 'alphabet':
        return converter(text, 'A-Za-z', 'Ａ-Ｚａ-ｚ');
      case 'symbols':
        return converter(text, '!-~', '！-～');
      default:
        return text;
    }
  }

  private toHalfWidth(text: string, halfRange: string, fullRange: string): string {
    const pattern = new RegExp(`[${fullRange}]`, 'g');
    return text.replace(pattern, 
      ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
    );
  }

  private toFullWidth(text: string, halfRange: string, fullRange: string): string {
    const pattern = new RegExp(`[${halfRange}]`, 'g');
    return text.replace(pattern, 
      ch => String.fromCharCode(ch.charCodeAt(0) + 0xFEE0)
    );
  }

  private joinWithTemplate(values: string[], template: string): string {
    return template.replace(
      /\{(\d+)\}/g,
      (_, index) => values[parseInt(index) - 1] || ''
    );
  }

  private convertToKanji(num: number): string {
    const kanji = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    return num.toString()
      .split('')
      .map(digit => kanji[parseInt(digit)])
      .join('');
  }

  private applyConversionRules(
    text: string,
    rules: Array<{ type: string }>
  ): string {
    let result = text;
    for (const rule of rules) {
      switch (rule.type) {
        case 'toKanji':
          result = this.convertToKanji(parseInt(result));
          break;
      }
    }
    return result;
  }
}
