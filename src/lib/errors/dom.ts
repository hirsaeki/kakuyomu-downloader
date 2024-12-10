import { AppError } from './base';

/**
 * DOM操作に関するエラー
 */
export class DOMError extends AppError {
  constructor(
    message: string,
    retriable: boolean = true
  ) {
    super(message, 'DOM_ERROR', retriable);
    Object.setPrototypeOf(this, DOMError.prototype);
  }
}