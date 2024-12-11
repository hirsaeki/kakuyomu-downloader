export class BuildError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'BuildError';
  }
}

export class ValidationError extends BuildError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class PatternError extends BuildError {
  constructor(message: string, public readonly pattern?: string) {
    super(message);
    this.name = 'PatternError';
  }
}