declare module 'virtual:pattern-config' {
  type WidthTarget = 'numbers' | 'alphabet' | 'symbols';
  type WidthDirection = 'fullwidth' | 'halfwidth';
  type ConversionRuleType = 'toKanji' | 'toFullwidth';

  interface ConversionRule {
    type: ConversionRuleType;
    params?: Record<string, unknown>;
  }

  export interface GeneratedPattern {
    name: string;
    pattern: {
      source: string;
      flags?: string;
      lookbehind?: string;
      lookahead?: string;
    };
    transform: {
      type: 'text' | 'tcy';
      steps: Array<{
        action: 'wrap' | 'convertWidth' | 'replace' | 'processGroup' | 'splitBy' | 'convertEach' | 'convertGroups' | 'join';
        prefix?: string;
        suffix?: string;
        target?: WidthTarget;
        direction?: WidthDirection;
        from?: string;
        to?: string;
        group?: number;
        rules?: Array<ConversionRule>;
        separator?: string | string[];
        with?: string;
        template?: string;
      }>;
      ensureSpace?: {
        before?: boolean;
        after?: boolean;
      };
    };
    priority?: number;
  }

  export const patterns: Record<string, GeneratedPattern>;
}