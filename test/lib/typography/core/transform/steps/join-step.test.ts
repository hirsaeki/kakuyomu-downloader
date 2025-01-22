import { JoinStep } from '@/lib/typography/core/transform/steps/join-step';
import type { TransformContext } from '@/lib/typography/core/transform/types';
import { TransformError } from '@/lib/errors';

describe('JoinStep', () => {
  const createContext = (text: string): TransformContext => ({ text });

  describe('initialization', () => {
    it('should initialize with default settings', () => {
      expect(() => new JoinStep()).not.toThrow();
    });

    it('should initialize with custom template', () => {
      expect(() => new JoinStep('prefix {1} {2} suffix')).not.toThrow();
    });

    it('should initialize with custom separator', () => {
      expect(() => new JoinStep(undefined, ', ')).not.toThrow();
    });

    it('should warn but not throw on invalid template', () => {
      // テンプレートにプレースホルダーがない場合は警告のみ
      expect(() => new JoinStep('invalid template')).not.toThrow();
    });
  });

  describe('isApplicable', () => {
    it('should return true for multi-line text', () => {
      const step = new JoinStep();
      expect(step.isApplicable(createContext('line1\nline2'))).toBe(true);
    });

    it('should return false for single-line text without template', () => {
      const step = new JoinStep();
      expect(step.isApplicable(createContext('single line'))).toBe(false);
    });

    it('should return true for any text with template', () => {
      const step = new JoinStep('{1} and {2}');
      expect(step.isApplicable(createContext('single line'))).toBe(true);
    });

    it('should handle invalid input gracefully', () => {
      const step = new JoinStep();
      // @ts-expect-error: Testing invalid input
      expect(step.isApplicable(null)).toBe(false);
      // @ts-expect-error: Testing invalid input
      expect(step.isApplicable({})).toBe(false);
      expect(step.isApplicable({ text: null })).toBe(false);
    });
  });

  describe('execute', () => {
    describe('separator mode', () => {
      it('should join lines with empty separator by default', async () => {
        const step = new JoinStep();
        const result = await step.execute(createContext('line1\nline2\nline3'));
        expect(result.textContent).toBe('line1line2line3');
      });

      it('should join lines with custom separator', async () => {
        const step = new JoinStep(undefined, ', ');
        const result = await step.execute(createContext('line1\nline2\nline3'));
        expect(result.textContent).toBe('line1, line2, line3');
      });

      it('should trim whitespace from lines', async () => {
        const step = new JoinStep(undefined, ',');
        const result = await step.execute(createContext(' line1 \n line2 \n line3 '));
        expect(result.textContent).toBe('line1,line2,line3');
      });
    });

    describe('template mode', () => {
      it('should apply template correctly', async () => {
        const step = new JoinStep('{1} and {2}');
        const result = await step.execute(createContext('first\nsecond'));
        expect(result.textContent).toBe('first and second');
      });

      it('should handle missing values in template', async () => {
        const step = new JoinStep('{1}, {2}, and {3}');
        const result = await step.execute(createContext('first\nsecond'));
        expect(result.textContent).toBe('first, second, and ');
      });

      it('should ignore extra values', async () => {
        const step = new JoinStep('{1} and {2}');
        const result = await step.execute(createContext('first\nsecond\nthird'));
        expect(result.textContent).toBe('first and second');
      });

      it('should treat invalid placeholders as literal text', async () => {
        const step = new JoinStep('{a} and {b}');
        const result = await step.execute(createContext('first\nsecond'));
        expect(result.textContent).toBe('{a} and {b}');
      });
    });

    it('should throw TransformError for non-applicable text', async () => {
      const step = new JoinStep();
      await expect(
        step.execute(createContext('single line'))
      ).rejects.toThrow(TransformError);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', async () => {
      const step = new JoinStep();
      await expect(
        step.execute(createContext(''))
      ).rejects.toThrow(TransformError);
    });

    it('should handle whitespace-only string', async () => {
      const step = new JoinStep();
      await expect(
        step.execute(createContext('   \n   \n   '))
      ).resolves.toEqual({ textContent: '' });
    });

    it('should handle long text efficiently', async () => {
      const step = new JoinStep(undefined, ',');
      const input = 'line\n'.repeat(1000) + 'last';
      const expected = 'line,'.repeat(1000) + 'last';
      const result = await step.execute(createContext(input));
      expect(result.textContent).toBe(expected);
    });

    it('should handle various line endings', async () => {
      const step = new JoinStep(undefined, ',');
      const result = await step.execute(createContext('line1\r\nline2\rline3\nline4'));
      expect(result.textContent).toBe('line1,line2,line3,line4');
    });

    it('should handle unicode text', async () => {
      const step = new JoinStep('{1}は{2}です');
      const result = await step.execute(createContext('これ\nテスト'));
      expect(result.textContent).toBe('これはテストです');
    });
  });
});