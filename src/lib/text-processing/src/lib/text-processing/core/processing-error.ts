interface ErrorOptions {
  patternName?: string;
  position?: number;
  input?: string;
  cause?: Error;
}

export class TextProcessingError extends Error {
  readonly patternName: string | null;
  readonly position: number | null;

  constructor(message: string, options: ErrorOptions = {}) {
    super(message);
    this.name = 'TextProcessingError';
    this.patternName = options.patternName ?? null;
    this.position = options.position ?? null;
  }
}

export class ValidationError extends TextProcessingError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, { ...options, patternName: 'validation' });
    this.name = 'ValidationError';
  }
}
