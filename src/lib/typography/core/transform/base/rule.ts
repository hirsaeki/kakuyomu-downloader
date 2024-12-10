import { TextTransformRule } from '../../processor/types';

export abstract class BaseTransformRule implements TextTransformRule {
  constructor(protected readonly priority: number = 100) {}

  getPriority(): number {
    return this.priority;
  }

  abstract transform(text: string): string;

  protected escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}