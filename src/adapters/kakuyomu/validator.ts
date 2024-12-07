import { ValidationError } from '@/types';

export class KakuyomuValidator {
  // URLパターン
  static readonly WORK_URL_PATTERN = /^https?:\/\/kakuyomu\.jp\/works\/\d+$/;
  static readonly EPISODE_URL_PATTERN = /^https?:\/\/kakuyomu\.jp\/works\/\d+\/episodes\/\d+$/;

  /**
   * 作品URLの検証
   */
  static isValidWorkUrl(url: string): boolean {
    if (!url) return false;

    try {
      const normalized = this.normalizeUrl(url);
      return this.WORK_URL_PATTERN.test(normalized);
    } catch {
      return false;
    }
  }

  /**
   * エピソードURLの検証
   */
  static isValidEpisodeUrl(url: string): boolean {
    if (!url) return false;

    try {
      const normalized = this.normalizeUrl(url);
      return this.EPISODE_URL_PATTERN.test(normalized);
    } catch {
      return false;
    }
  }

  /**
   * 作品URLの正規化
   */
  static normalizeWorkUrl(url: string): string {
    if (!url) {
      throw new ValidationError('URLが指定されていません');
    }

    try {
      const normalized = this.normalizeUrl(url);

      if (!this.isValidWorkUrl(normalized)) {
        throw new ValidationError('カクヨムの作品URLではありません');
      }

      return normalized;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ValidationError('無効なURLです');
    }
  }

  /**
   * エピソードURLの正規化
   */
  static normalizeEpisodeUrl(url: string): string {
    if (!url) {
      throw new ValidationError('URLが指定されていません');
    }

    try {
      const normalized = this.normalizeUrl(url);

      if (!this.isValidEpisodeUrl(normalized)) {
        throw new ValidationError('カクヨムのエピソードURLではありません');
      }

      return normalized;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ValidationError('無効なURLです');
    }
  }

  /**
   * URLの基本部分を抽出（内部使用）
   */
  private static normalizeUrl(url: string): string {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  }
}