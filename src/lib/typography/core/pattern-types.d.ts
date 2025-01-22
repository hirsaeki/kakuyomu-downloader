declare module "virtual:pattern-config" {
  type WidthTarget = "numbers" | "alphabet" | "symbols";
  type WidthDirection = "fullWidth" | "halfWidth";
  type ConversionRuleType = "toKanji" | "toFullwidth";

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
      type: "text" | "tcy";
      steps: Array<{
        action: "convertWidth" | "convertKanji" | "replace";
        target?: WidthTarget;
        direction?: WidthDirection;
        from?: string;
        to?: string;
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
