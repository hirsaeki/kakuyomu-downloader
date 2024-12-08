import { BaseTransformStep } from '../base/transform-step';
import type { 
  TransformContext, 
  TransformResult, 
  WidthTarget, 
  WidthDirection 
} from '../base/types';
import { TransformError } from '../base/types';

export class ConvertWidthStep extends BaseTransformStep {
  private static readonly SYMBOL_MAP: Record<string, string> = {
    '!': '！', '"': '”', '#': '＃', '$': '＄', '%': '％', '&': '＆',
    '\'': '’', '(': '（', ')': '）', '*': '＊', '+': '＋', ',': '，',
    '-': '－', '.': '．', '/': '／', ':': '：', ';': '；', '<': '＜',
    '=': '＝', '>': '＞', '?': '？', '@': '＠', '[': '［', '\\': '＼',
    ']': '］', '^': '＾', '_': '＿', '`': '｀', '{': '｛', '|': '｜',
    '}': '｝', '~': '～', ' ': '　'
  };

  private static readonly REVERSE_SYMBOL_MAP: Record<string, string> = 
    Object.fromEntries(
      Object.entries(ConvertWidthStep.SYMBOL_MAP).map(([k, v]) => [v, k])
    );

  constructor(
    private direction: WidthDirection,
    private target: WidthTarget
  ) {
    super();
  }

  override isApplicable({ text }: TransformContext): boolean {
    if (!super.isApplicable({ text })) return false;
    // 対象の文字種が含まれているかチェック
    switch (this.target) {
      case 'numbers':
        return /[0-9０-９]/.test(text);
      case 'alphabet':
        return /[a-zA-Zａ-ｚＡ-Ｚ]/.test(text);
      case 'symbols':
        const symbols = this.direction === 'fullwidth' ? 
          Object.keys(ConvertWidthStep.SYMBOL_MAP) :
          Object.keys(ConvertWidthStep.REVERSE_SYMBOL_MAP);
        return symbols.some(s => text.includes(s));
      default:
        return false;
    }
  }

  async execute({ text }: TransformContext): Promise<TransformResult> {
    if (!this.isApplicable({ text })) {
      throw new TransformError('Invalid text content for ConvertWidthStep');
    }

    const converted = this.convertWidth(text, this.target, this.direction);
    return this.createResult(converted);
  }

  private convertWidth(
    text: string, 
    target: WidthTarget, 
    direction: WidthDirection
  ): string {
    switch (target) {
      case 'numbers':
        return this.convertCharWidth(text, '0-9', '０-９', direction);
      case 'alphabet':
        return this.convertCharWidth(text, 'A-Za-z', 'Ａ-Ｚａ-ｚ', direction);
      case 'symbols':
        return direction === 'fullwidth' ? 
          this.toFullWidth(text) : 
          this.toHalfWidth(text);
      default:
        return text;
    }
  }

  private convertCharWidth(
    text: string, 
    halfRange: string, 
    fullRange: string, 
    direction: WidthDirection
  ): string {
    const pattern = new RegExp(
      `[${direction === 'fullwidth' ? halfRange : fullRange}]`,
      'g'
    );
    const offset = direction === 'fullwidth' ? 0xFEE0 : -0xFEE0;
    
    return text.replace(pattern, char => 
      String.fromCharCode(char.charCodeAt(0) + offset)
    );
  }

  private toFullWidth(text: string): string {
    return text.split('').map(char => 
      ConvertWidthStep.SYMBOL_MAP[char] || char
    ).join('');
  }

  private toHalfWidth(text: string): string {
    return text.split('').map(char =>
      ConvertWidthStep.REVERSE_SYMBOL_MAP[char] || char
    ).join('');
  }

  toString(): string {
    return `ConvertWidthStep(target: ${this.target}, direction: ${this.direction})`;
  }
}