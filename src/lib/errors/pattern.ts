import { AppError } from './base';

export class PatternError extends AppError {
  constructor(
    message: string,
    public readonly file?: string,
  ) {
    super(message, 'PATTERN_ERROR');
    this.name = 'PatternError';
  }
}