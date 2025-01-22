import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TypographyProcessor } from '@/lib/typography/core/processor/typography-processor';

vi.mock('@/lib/logger', () => ({
  createContextLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('TypographyProcessor', () => {
  describe('Basic text processing', () => {
    const patterns = {
      'test-fullwidth': {
        name: 'test-fullwidth',
        pattern: {
          source: '([0-9])',
          flags: 'g',
        },
        transform: {
          type: 'text' as const,
          steps: [{
            action: 'convertWidth' as const,
            target: 'numbers' as const,
            direction: 'fullwidth' as const,
          }],
        },
        priority: 1,
      },
    };

    let processor: TypographyProcessor;

    beforeEach(() => {
      processor = TypographyProcessor.getInstance(Object.values(patterns));
    });

    it('should convert single digits to fullwidth', async () => {
      const input = '<p>This is 1 test.</p>';
      const expected = '<p>This is １ test.</p>';
      const result = await processor.process(input);
      expect(result).toBe(expected);
    });

    it('should handle empty content', async () => {
      await expect(processor.process('')).rejects.toThrow('HTML content is empty');
    });

    it('should sanitize content', async () => {
      const input = '<p>Test</p><script>alert("xss")</script>';
      const result = await processor.process(input);
      expect(result).toBe('<p>Test</p>');
    });
  });

  describe('Priority handling', () => {
    const patterns = {
      'low-priority': {
        name: 'low-priority',
        pattern: {
          source: 'test',
          flags: 'g',
        },
        transform: {
          type: 'text' as const,
          steps: [{
            action: 'replace' as const,
            with: 'TEST_LOW',
          }],
        },
        priority: 2,
      },
      'high-priority': {
        name: 'high-priority',
        pattern: {
          source: 'test',
          flags: 'g',
        },
        transform: {
          type: 'text' as const,
          steps: [{
            action: 'replace' as const,
            with: 'TEST_HIGH',
          }],
        },
        priority: 1,
      },
    };

    let processor: TypographyProcessor;

    beforeEach(() => {
      processor = TypographyProcessor.getInstance(Object.values(patterns));
    });

    it('should apply patterns in priority order', async () => {
      const input = '<p>test</p>';
      const result = await processor.process(input);
      // 優先度が高い（数値が小さい）パターンが先に適用される
      expect(result).toBe('<p>TEST_HIGH</p>');
    });
  });

  describe('TCY processing', () => {
    const patterns = {
      'test-tcy': {
        name: 'test-tcy',
        pattern: {
          source: '([0-9]{2})',
          flags: 'g',
        },
        transform: {
          type: 'tcy' as const,
          steps: [{
            action: 'convertWidth' as const,
            target: 'numbers' as const,
            direction: 'halfwidth' as const,
          }],
        },
        priority: 1,
      },
    };

    let processor: TypographyProcessor;

    beforeEach(() => {
      processor = TypographyProcessor.getInstance(Object.values(patterns));
    });

    it('should wrap two-digit numbers with TCY markers', async () => {
      const input = '<p>これは42です</p>';
      const expected = '<p>これは†42‡です</p>';
      const result = await processor.process(input);
      expect(result).toBe(expected);
    });
  });
});