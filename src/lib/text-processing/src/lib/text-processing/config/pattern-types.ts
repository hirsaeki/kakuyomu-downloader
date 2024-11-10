import { ProcessingPriorityType } from '../constants/priorities';

export type TransformAction = 
  | 'convertWidth'
  | 'splitBy'
  | 'convertEach'
  | 'join'
  | 'convertGroups'
  | 'replace'
  | 'wrap';

export type WidthTarget = 'numbers' | 'alphabet' | 'symbols';
export type WidthDirection = 'fullwidth' | 'halfwidth';

export interface TransformStep {
  action: TransformAction;
  // convertWidth用のプロパティ
  target?: WidthTarget;
  direction?: WidthDirection;
  // その他のアクション用プロパティ
  separator?: string | string[];
  rules?: Array<{
    type: string;
    group?: number;
  }>;
  template?: string;
  with?: string;
  from?: string;
  to?: string;
  prefix?: string;
  suffix?: string;
}

export interface TransformConfig {
  type: 'text' | 'tcy';
  steps: TransformStep[];
  ensureSpace?: {
    after?: boolean;
    before?: boolean;
  };
}

export interface PatternDefinition {
  name: string;
  description?: string;
  priority: ProcessingPriorityType;
  pattern: {
    source: string;
    flags?: string;
    lookbehind?: string;
    lookahead?: string;
  };
  transform: TransformConfig;
}

export interface PatternGroup {
  patterns: PatternDefinition[];
}

export interface PatternConfig {
  patterns: PatternDefinition[];
}
