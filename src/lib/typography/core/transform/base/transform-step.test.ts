import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { TransformContext } from '../types';
import { BaseTransformStep } from './transform-step';
import { TransformError } from '@/lib/errors';

// Mock implementation of BaseTransformStep for testing
class TestTransformStep extends BaseTransformStep {
  protected async processTransform(context: TransformContext) {
    return this.createResult(context.text.toUpperCase());
  }
}

describe('BaseTransformStep', () => {
  let transformStep: TestTransformStep;
  const mockLogger = {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  };

  beforeEach(() => {
    transformStep = new TestTransformStep();
    vi.clearAllMocks();
  });

  describe('isApplicable', () => {
    test('正常なコンテキストを受け入れる', () => {
      const context: TransformContext = { text: 'test' };
      expect(transformStep.isApplicable(context)).toBe(true);
    });

    test('nullコンテキストでエラーを投げる', () => {
      // @ts-expect-error: nullをテストのために意図的に渡す
      expect(() => transformStep.isApplicable(null)).toThrow(TransformError);
      expect(() => transformStep.isApplicable(null)).toThrow('変換コンテキストが指定されていません');
    });

    test('テキストプロパティがない場合エラーを投げる', () => {
      // @ts-expect-error: 不完全なコンテキストをテストのために意図的に渡す
      const context: Partial<TransformContext> = {};
      expect(() => transformStep.isApplicable(context as TransformContext)).toThrow(TransformError);
      expect(() => transformStep.isApplicable(context as TransformContext)).toThrow('コンテキストにtextプロパティがありません');
    });

    test('テキストが文字列でない場合エラーを投げる', () => {
      const context = { text: 123 } as unknown as TransformContext;
      expect(() => transformStep.isApplicable(context)).toThrow(TransformError);
      expect(() => transformStep.isApplicable(context)).toThrow('テキストが文字列ではありません');
    });

    test('空文字列の場合falseを返す', () => {
      const context: TransformContext = { text: '' };
      expect(transformStep.isApplicable(context)).toBe(false);
    });

    test('matchプロパティが正しい場合は受け入れる', () => {
      const context: TransformContext = {
        text: 'test',
        match: ['test', 'group1']
      };
      expect(transformStep.isApplicable(context)).toBe(true);
    });

    test('matchプロパティが配列でない場合エラーを投げる', () => {
      const context = {
        text: 'test',
        match: 'not an array'
      } as unknown as TransformContext;
      expect(() => transformStep.isApplicable(context)).toThrow(TransformError);
      expect(() => transformStep.isApplicable(context)).toThrow('matchプロパティが配列ではありません');
    });
  });

  describe('execute', () => {
    test('正常なコンテキストで変換を実行する', async () => {
      const context: TransformContext = { text: 'test' };
      const result = await transformStep.execute(context);
      expect(result).toEqual({
        textContent: 'TEST',
        metadata: { modified: true }
      });
    });

    test('無効なコンテキストでエラーを投げる', async () => {
      const context = { text: null } as unknown as TransformContext;
      await expect(transformStep.execute(context)).rejects.toThrow(TransformError);
    });

    test('空文字列のコンテキストでエラーを投げる', async () => {
      const context: TransformContext = { text: '' };
      await expect(transformStep.execute(context)).rejects.toThrow(TransformError);
    });

    test('メタデータを含む結果を返す', async () => {
      const context: TransformContext = { text: 'test' };
      const result = await transformStep.execute(context);
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('modified', true);
    });

    test('matchとparamsを含むコンテキストを処理できる', async () => {
      const context: TransformContext = {
        text: 'test',
        match: ['test', 'group1'],
        params: { key: 'value' }
      };
      const result = await transformStep.execute(context);
      expect(result).toEqual({
        textContent: 'TEST',
        metadata: { modified: true }
      });
    });
  });
});