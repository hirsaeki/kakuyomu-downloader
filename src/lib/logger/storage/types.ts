import type { LogEntry } from '../types';

export interface ILogStorage {
  /**
   * ログエントリを保存
   */
  save(entries: LogEntry[]): Promise<void>;

  /**
   * 保存されたログを読み込み
   */
  load(): Promise<LogEntry[]>;

  /**
   * ログをクリア
   */
  clear(): Promise<void>;

  /**
   * 保存されたログをJSONとしてエクスポート
   */
  export(): Promise<Blob>;
}