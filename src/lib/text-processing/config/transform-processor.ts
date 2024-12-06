import { DOMOperator } from '../core/dom-operator';
import { TextProcessingError } from '../core/processing-error';
import { TransformConfig, TransformStep } from '../types';

/**
 * テキスト変換プロセッサー
 * 日本語テキストの組版処理や文字変換を行う
 */
export class TransformProcessor {
  /*
   * Static Constants
   */
  // 半角から全角への変換マップ
  private static readonly SYMBOL_MAP: Record<string, string> = {
    '!': '！', '"': '”', '#': '＃', '$': '＄', '%': '％', '&': '＆',
    '\'': '’', '(': '（', ')': '）', '*': '＊', '+': '＋', ',': '，',
    '-': '－', '.': '．', '/': '／', ':': '：', ';': '；', '<': '＜',
    '=': '＝', '>': '＞', '?': '？', '@': '＠', '[': '［', '\\': '＼',
    ']': '］', '^': '＾', '_': '＿', '`': '｀', '{': '｛', '|': '｜',
    '}': '｝', '~': '～', ' ': '　'  // スペースも追加
  };

  // 全角から半角への変換マップ（SYMBOL_MAPの逆変換）
  private static readonly REVERSE_SYMBOL_MAP: Record<string, string> = Object.fromEntries(
    Object.entries(TransformProcessor.SYMBOL_MAP).map(([k, v]) => [v, k])
  );

  /*
   * Constructor
   */
  constructor(private domOperator: DOMOperator) {
    if (!domOperator) {
      throw new TextProcessingError('DOMOperator is required');
    }
  }

  /*
   * Public Methods
   */
  // メイン変換処理のエントリーポイント
  processTransform(
    match: RegExpExecArray,
    config: TransformConfig,
    reprocess?: (text: string) => Node[]
  ): Node | Node[] {
    try {
      const result = this.executeSteps(config.steps, match, reprocess);
      return this.createNode(result, config.type);
    } catch (error) {
      throw new TextProcessingError(
        `Transform processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /*
   * Type Guards
   */
  // Node配列かどうかを判定
  private isNodeArray(value: unknown): value is Node[] {
    return Array.isArray(value) && value.length > 0 && value[0] instanceof Node;
  }

  // 文字列かどうかを判定
  private isString(value: unknown): value is string {
    return typeof value === 'string';
  }

  // 文字列配列かどうかを判定
  private isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(item => typeof item === 'string');
  }

  /*
   * Core Transform Logic
   */
  // 変換ステップを順次実行
  private executeSteps(
    steps: TransformStep[],
    match: RegExpExecArray,
    reprocess?: (text: string) => Node[]
  ): string | Node[] {
    let current: unknown = match[0];

    for (const step of steps) {
      try {
        switch (step.action) {
          case 'convertWidth':
            if (this.isString(current)) {
              current = this.convertWidth(
                current,
                step.target || 'numbers',
                step.direction || 'fullwidth'
              );
            }
            break;

          case 'processGroup':
            if (!reprocess) {
              throw new TextProcessingError('Reprocess function is required for processGroup action');
            }
            if (!step.group) {
              throw new TextProcessingError('Group number is required for processGroup action');
            }
            current = reprocess(match[step.group]);
            break;

          case 'convertEach':
            if (this.isNodeArray(current)) {
              throw new TextProcessingError('Cannot apply convertEach to Node array');
            }
            if (this.isString(current)) {
              current = this.applyRules(current, step.rules || []);
            } else if (this.isStringArray(current)) {
              const stringArray = current;
              current = stringArray.map(item => this.applyRules(item, step.rules || []));
            }
            break;

          case 'join':
            if (this.isNodeArray(current)) {
              throw new TextProcessingError('Cannot join Node array');
            }
            if (this.isStringArray(current)) {
              current = this.joinTexts(current, step.template, step.with);
            } else if (this.isString(current)) {
              current = this.joinTexts([current], step.template, step.with);
            }
            break;

          case 'replace':
            if (this.isNodeArray(current)) {
              throw new TextProcessingError('Cannot replace in Node array');
            }
            if (this.isString(current)) {
              if (step.from && step.to) {
                current = current.replace(new RegExp(step.from, 'g'), step.to);
              }
            }
            break;

          case 'wrap':
            if (this.isNodeArray(current)) {
              throw new TextProcessingError('Cannot wrap Node array');
            }
            if (this.isString(current)) {
              current = `${step.prefix || ''}${current}${step.suffix || ''}`;
            }
            break;

          default:
            throw new TextProcessingError(`Unknown transform action: ${step.action}`);
        }
      } catch (error) {
        throw new TextProcessingError(
          `Step processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    if (!this.isString(current) && !this.isNodeArray(current)) {
      throw new TextProcessingError('Invalid transformation result');
    }

    return current;
  }

  /*
   * Character Width Conversion Methods
   */
  // 文字幅変換のメインメソッド
  private convertWidth(text: string, target: 'numbers' | 'alphabet' | 'symbols', direction: 'fullwidth' | 'halfwidth'): string {
    switch (target) {
      case 'numbers':
        return this.convertCharWidth(text, '0-9', '０-９', direction);
      case 'alphabet':
        return this.convertCharWidth(text, 'A-Za-z', 'Ａ-Ｚａ-ｚ', direction);
      case 'symbols':
        return direction === 'fullwidth' ? this.toFullWidth(text) : this.toHalfWidth(text);
      default:
        return text;
    }
  }

  // 指定された文字範囲の幅を変換
  private convertCharWidth(text: string, halfRange: string, fullRange: string, direction: 'fullwidth' | 'halfwidth'): string {
    const pattern = new RegExp(`[${direction === 'fullwidth' ? halfRange : fullRange}]`, 'g');
    const offset = direction === 'fullwidth' ? 0xFEE0 : -0xFEE0;
    return text.replace(pattern, char => String.fromCharCode(char.charCodeAt(0) + offset));
  }

  // 半角から全角に変換
  private toFullWidth(text: string): string {
    return text.split('').map(char =>
      TransformProcessor.SYMBOL_MAP[char] || char
    ).join('');
  }

  // 全角から半角に変換
  private toHalfWidth(text: string): string {
    return text.split('').map(char =>
      TransformProcessor.REVERSE_SYMBOL_MAP[char] || char
    ).join('');
  }

  /*
   * Text Processing Methods
   */
  // ルールに基づいてテキストを変換
  private applyRules(text: string, rules: TransformStep['rules']): string {
    if (!rules) return text;
    return rules.reduce((result, rule) => {
      switch (rule.type) {
        case 'toKanji':
          return this.numberToKanji(parseInt(result));
        default:
          throw new TextProcessingError(`Unknown conversion rule: ${rule.type}`);
      }
    }, text);
  }

  // 数字を漢数字に変換
  private numberToKanji(num: number): string {
    if (isNaN(num)) {
      throw new TextProcessingError('Invalid number for Kanji conversion');
    }
    const kanjiNums = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    return num.toString().split('').map(d => kanjiNums[parseInt(d)]).join('');
  }

  // テキスト配列を結合
  private joinTexts(texts: string[], template?: string, separator: string = ''): string {
    if (template) {
      return template.replace(/\{(\d+)\}/g, (_, index) =>
        texts[parseInt(index) - 1] || ''
      );
    }
    return texts.join(separator);
  }

  // DOM ノードの作成
  private createNode(content: string | Node[] | unknown, type: 'text' | 'tcy'): Node | Node[] {
    if (this.isNodeArray(content)) {
      return content;
    }

    let textContent: string;
    if (this.isString(content)) {
      textContent = content;
    } else if (this.isStringArray(content)) {
      textContent = content.join('');
    } else {
      throw new TextProcessingError('Invalid content type for node creation');
    }
    
    if (type === 'tcy') {
      return this.domOperator.createTcyElement(textContent);
    }

    return this.domOperator.createTextNode(textContent);
  }
}