import { ProcessingPriorityType } from '../constants/priorities';

export interface ConversionPatternConfig {
  name: string;
  priority: ProcessingPriorityType;
  pattern: RegExp;
  process: (match: RegExpExecArray) => Node | Node[];
  description?: string;
}

export class ConversionPattern {
  readonly name: string;
  readonly priority: ProcessingPriorityType;
  readonly pattern: RegExp;
  readonly process: (match: RegExpExecArray) => Node | Node[];
  readonly description: string;

  constructor({
    name,
    priority,
    pattern,
    process,
    description = ''
  }: ConversionPatternConfig) {
    this.name = name;
    this.priority = priority;
    this.pattern = pattern;
    this.process = process;
    this.description = description;

    if (!pattern.global) {
      throw new Error(`Pattern '${name}' must have global flag`);
    }
  }
}
