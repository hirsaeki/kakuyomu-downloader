import { NovelDownloaderError } from '@/types';

export class TextProcessingError extends NovelDownloaderError {
  constructor(message: string) {
    super(message, false, 'general');
    this.name = 'TextProcessingError';
  }
}

export { ValidationError } from '@/types';