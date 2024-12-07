import { TextProcessingError } from './processing-error';

export interface ConversionPatternConfig {
  name: string;
  priority: number;
  pattern: RegExp;
  process: (match: RegExpExecArray, reprocess?: (text: string) => Node[]) => Node | Node[];
  description?: string;
  disabled?: boolean;
}

export class ConversionPattern {
  readonly name: string;
  readonly priority: number;
  readonly description: string;
  private disabled: boolean;
  private readonly _pattern: RegExp;

  constructor({
    name,
    priority,
    pattern,
    process,
    description = '',
    disabled = false
  }: ConversionPatternConfig) {
    if (!name || typeof name !== 'string') {
      throw new TextProcessingError(`Invalid pattern name: ${name}`);
    }

    if (typeof priority !== 'number') {
      throw new TextProcessingError(`Priority must be a number for pattern: ${name}`);
    }

    if (!this.isValidPattern(pattern)) {
      throw new TextProcessingError(`Invalid pattern configuration for pattern: ${name}`);
    }

    if (typeof process !== 'function') {
      throw new TextProcessingError(`Process must be a function for pattern: ${name}`);
    }

    this.name = name;
    this.priority = priority;
    this._pattern = new RegExp(pattern.source, pattern.flags);
    this._process = process;
    this.description = description;
    this.disabled = disabled;
  }

  private readonly _process: (match: RegExpExecArray, reprocess?: (text: string) => Node[]) => Node | Node[];

  get pattern(): RegExp {
    return new RegExp(this._pattern.source, this._pattern.flags);
  }

  get process(): (match: RegExpExecArray, reprocess?: (text: string) => Node[]) => Node | Node[] {
    return this._process;
  }

  private isValidPattern(pattern: RegExp): boolean {
    try {
      if (!(pattern instanceof RegExp)) {
        return false;
      }
      if (!pattern.global) {
        return false;
      }
      new RegExp(pattern.source, pattern.flags);
      return true;
    } catch {
      return false;
    }
  }

  setEnabled(enabled: boolean): void {
    this.disabled = !enabled;
  }

  isEnabled(): boolean {
    return !this.disabled;
  }

  clone(): ConversionPattern {
    return new ConversionPattern({
      name: this.name,
      priority: this.priority,
      pattern: this.pattern,
      process: this._process,
      description: this.description,
      disabled: this.disabled
    });
  }

  toString(): string {
    return `ConversionPattern(${this.name}): ${this._pattern.source} [priority: ${this.priority}, enabled: ${!this.disabled}]`;
  }
}