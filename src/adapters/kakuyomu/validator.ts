import { ValidationError } from '@/lib/errors';

export class KakuyomuValidator {
  // URLパターン定義。これは変更なしで大丈夫。
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
      // 詳細な情報を付加してエラーを投げる
      throw new ValidationError('URLが指定されていません', {
        url: ['URLは必須です']
      });
    }

    try {
      const normalized = this.normalizeUrl(url);

      if (!this.isValidWorkUrl(normalized)) {
        throw new ValidationError('カクヨムの作品URLではありません', {
          url: ['URLの形式が不正です', 'カクヨムの作品URLのフォーマット（https://kakuyomu.jp/works/数字）に従っていません']
        });
      }

      return normalized;
    } catch (error) {
      // エラーの種類に応じて適切なメッセージとdetailsを設定
      if (error instanceof ValidationError) throw error;
      if (error instanceof TypeError) {
        throw new ValidationError('無効なURLです', {
          url: ['URLの形式が不正です', 'URLとして解析できません']
        });
      }
      throw new ValidationError('無効なURLです', {
        url: ['不明なエラーが発生しました']
      });
    }
  }

  /**
   * エピソードURLの正規化
   */
  static normalizeEpisodeUrl(url: string): string {
    if (!url) {
      throw new ValidationError('URLが指定されていません', {
        url: ['URLは必須です']
      });
    }

    try {
      const normalized = this.normalizeUrl(url);

      if (!this.isValidEpisodeUrl(normalized)) {
        throw new ValidationError('カクヨムのエピソードURLではありません', {
          url: ['URLの形式が不正です', 'カクヨムのエピソードURLのフォーマット（https://kakuyomu.jp/works/数字/episodes/数字）に従っていません']
        });
      }

      return normalized;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      if (error instanceof TypeError) {
        throw new ValidationError('無効なURLです', {
          url: ['URLの形式が不正です', 'URLとして解析できません']
        });
      }
      throw new ValidationError('無効なURLです', {
        url: ['不明なエラーが発生しました']
      });
    }
  }

  /**
   * URLの基本部分を抽出（内部使用）
   * @throws {TypeError} URLとして解析できない場合
   */
  private static normalizeUrl(url: string): string {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  }
}