import { WrapStep } from '@/lib/typography/core/transform/steps/wrap-step';
import type { TransformContext } from '@/lib/typography/core/transform/types';
import { TransformError } from '@/lib/errors';

describe('WrapStep', () => {
  const createContext = (text: string): TransformContext => ({ text });

  describe('initialization', () => {
    it('should initialize with default settings', () => {
      expect(() => new WrapStep()).not.toThrow();
    });

    it('should initialize with prefix only', () => {
      expect(() => new WrapStep('(')).not.toThrow();
    });

    it('should initialize with suffix only', () => {
      expect(() => new WrapStep('', ')')).not.toThrow();
    });

    it('should initialize with both prefix and suffix', () => {
      expect(() => new WrapStep('(', ')')).not.toThrow();
    });

    it('should throw on excessively long affixes', () => {
      const longString = 'a'.repeat(101);
      expect(() => new WrapStep(longString)).toThrow(TransformError);
      expect(() => new WrapStep('', longString)).toThrow(TransformError);
    });

    it('should throw on control characters in affixes', () => {
      expect(() => new WrapStep('\n')).toThrow(TransformError);
      expect(() => new WrapStep('', '\r')).toThrow(TransformError);
      expect(() => new WrapStep('\t', '\b')).toThrow(TransformError);
    });
  });

  describe('isApplicable', () => {
    it('should always return true for valid input', () => {
      const step = new WrapStep('(', ')');
      expect(step.isApplicable(createContext('test'))).toBe(true);
      expect(step.isApplicable(createContext(''))).toBe(true);
    });

    it('should return false if result would be too long', () => {
      const step = new WrapStep('(', ')');
      const longText = 'a'.repeat(1000000);
      expect(step.isApplicable(createContext(longText))).toBe(false);
    });

    it('should handle invalid input gracefully', () => {
      const step = new WrapStep('(', ')');
      // @ts-expect-error: Testing invalid input
      expect(step.isApplicable(null)).toBe(false);
      // @ts-expect-error: Testing invalid input
      expect(step.isApplicable({})).toBe(false);
      expect(step.isApplicable({ text: null })).toBe(false);
    });
  });

  describe('execute', () => {
    it('should wrap text with default settings', async () => {
      const step = new WrapStep();
      const result = await step.execute(createContext('test'));
      expect(result.textContent).toBe('test');
    });

    it('should wrap text with prefix only', async () => {
      const step = new WrapStep('> ');
      const result = await step.execute(createContext('test'));
      expect(result.textContent).toBe('> test');
    });

    it('should wrap text with suffix only', async () => {
      const step = new WrapStep('', ' <');
      const result = await step.execute(createContext('test'));
      expect(result.textContent).toBe('test <');
    });

    it('should wrap text with both prefix and suffix', async () => {
      const step = new WrapStep('【', '】');
      const result = await step.execute(createContext('test'));
      expect(result.textContent).toBe('【test】');
    });

    it('should maintain whitespace in content', async () => {
      const step = new WrapStep('(', ')');
      const result = await step.execute(createContext(' test '));
      expect(result.textContent).toBe('( test )');
    });

    it('should throw TransformError for non-applicable text', async () => {
      const step = new WrapStep('(', ')');
      const longText = 'a'.repeat(1000000);
      await expect(
        step.execute(createContext(longText))
      ).rejects.toThrow(TransformError);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', async () => {
      const step = new WrapStep('(', ')');
      const result = await step.execute(createContext(''));
      expect(result.textContent).toBe('()');
    });

    it('should handle whitespace string', async () => {
      const step = new WrapStep('(', ')');
      const result = await step.execute(createContext('   '));
      expect(result.textContent).toBe('(   )');
    });

    it('should handle long text efficiently', async () => {
      const step = new WrapStep('(', ')');
      const input = 'a'.repeat(10000);
      const result = await step.execute(createContext(input));
      expect(result.textContent).toBe(`(${input})`);
    });

    it('should handle unicode characters', async () => {
      const step = new WrapStep('「', '」');
      const result = await step.execute(createContext('テスト'));
      expect(result.textContent).toBe('「テスト」');
    });

    it('should preserve special characters in content', async () => {
      const step = new WrapStep('(', ')');
      const result = await step.execute(createContext('test\ntest'));
      expect(result.textContent).toBe('(test\ntest)');
    });
  });
});