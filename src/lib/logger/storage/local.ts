import type { LogEntry } from '../types';
import type { ILogStorage } from './types';

export class LocalStorageAdapter implements ILogStorage {
  constructor(
    private readonly storageKey: string,
    private readonly maxStorageSize: number
  ) {}

  async save(entries: LogEntry[]): Promise<void> {
    try {
      const storedLogs = await this.load();
      const updatedLogs = [...storedLogs, ...entries]
        .slice(-this.maxStorageSize);
      localStorage.setItem(this.storageKey, JSON.stringify(updatedLogs));
    } catch (error) {
      console.error('Failed to save logs to storage:', error);
    }
  }

  async load(): Promise<LogEntry[]> {
    try {
      const storedLogs = JSON.parse(
        localStorage.getItem(this.storageKey) || '[]'
      ) as LogEntry[];
      
      const trimmedLogs = storedLogs.slice(-this.maxStorageSize);
      if (trimmedLogs.length < storedLogs.length) {
        localStorage.setItem(this.storageKey, JSON.stringify(trimmedLogs));
      }
      
      return trimmedLogs;
    } catch (error) {
      console.error('Failed to load logs from storage:', error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  async export(): Promise<Blob> {
    try {
      const logs = await this.load();
      const exportData = {
        exportedAt: new Date().toISOString(),
        totalEntries: logs.length,
        logs
      };

      return new Blob(
        [JSON.stringify(exportData, null, 2)],
        { type: 'application/json' }
      );
    } catch (error) {
      console.error('Failed to export logs:', error);
      throw error;
    }
  }
}