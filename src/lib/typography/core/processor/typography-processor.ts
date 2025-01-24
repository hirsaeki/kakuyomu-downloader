import { ProcessorError, ValidationError } from "@/lib/errors";
import { createContextLogger } from "@/lib/logger";
import findAndReplaceDOMText from "findandreplacedomtext";
import sanitizeHtml from "sanitize-html";
import type { GeneratedPattern } from "virtual:pattern-config";
import { TransformExecutor } from "../transform/transform-executor";

const typographyLogger = createContextLogger("typography-processor");

export class TypographyProcessor {
  private static instance: TypographyProcessor | null = null;
  private readonly patterns: GeneratedPattern[];
  private readonly executors: Map<string, TransformExecutor>;
  private readonly targetTags: string[];
  private readonly allowedTags: string[];

  private constructor(
    patterns: GeneratedPattern[],
    targetTags: string[],
    allowedTags: string[]
  ) {
    this.patterns = this.sortPatterns(patterns);
    this.executors = this.initializeExecutors(patterns);
    this.targetTags = targetTags;
    this.allowedTags = allowedTags;
  }

  static getInstance(
    patterns?: GeneratedPattern[],
    targetTags: string[] = ["p", "h1", "h2", "h3"],
    allowedTags: string[] = ["p", "h1", "h2", "h3", "div", "span"]
  ): TypographyProcessor {
    if (!this.instance) {
      if (!patterns) {
        throw new ProcessorError("Required dependencies missing");
      }
      this.instance = new TypographyProcessor(
        patterns,
        targetTags,
        allowedTags
      );
    }
    return this.instance;
  }

  public async process(html: string): Promise<string> {
    if (!html) {
      throw new ValidationError("HTML content is empty");
    }

    const wrapper = document.createElement("div");
    wrapper.innerHTML = this.sanitizeHtml(html);

    const elements = wrapper.querySelectorAll(this.targetTags.join(","));

    for (const element of elements) {
      await this.processElement(element);
    }

    return wrapper.innerHTML;
  }

  private async processElement(element: Element): Promise<void> {
    for (const pattern of this.patterns) {
      const regexp = new RegExp(
        pattern.pattern.source,
        pattern.pattern.flags || "g"
      );
      const matches = this.findUniqueMatches(element.innerHTML, regexp);

      if (matches.size === 0) continue;

      const transformMap = await this.createTransformMap(matches, pattern);
      this.applyTransformations(element, regexp, transformMap);
    }
  }

  private findUniqueMatches(text: string, regexp: RegExp): Set<string> {
    const matches = new Set<string>();
    Array.from(text.matchAll(regexp)).forEach((match) => {
      matches.add(match[0]);
    });
    return matches;
  }

  private async createTransformMap(
    matches: Set<string>,
    pattern: GeneratedPattern
  ): Promise<Map<string, string>> {
    const transformMap = new Map<string, string>();
    for (const match of matches) {
      const transformed = await this.preTransform(pattern, match);
      transformMap.set(match, transformed);
    }
    return transformMap;
  }

  private applyTransformations(
    element: Element,
    regexp: RegExp,
    transformMap: Map<string, string>
  ): void {
    findAndReplaceDOMText(element as HTMLElement, {
      find: regexp,
      replace: (portion) => transformMap.get(portion.text) || portion.text,
      preset: "prose",
    });
  }

  private async preTransform(
    pattern: GeneratedPattern,
    text: string
  ): Promise<string> {
    const executor = this.executors.get(pattern.name);
    if (!executor) return text;

    try {
      const result = await executor.execute({ text, match: [text] }, pattern);
      return result.textContent;
    } catch (error) {
      typographyLogger.error("Transform error", {
        error,
        pattern: pattern.name,
      });
      return text;
    }
  }

  private sanitizeHtml(html: string): string {
    return sanitizeHtml(html, {
      allowedTags: this.allowedTags,
      allowedAttributes: {
        "*": ["class", "id"],
      },
    });
  }

  private sortPatterns(patterns: GeneratedPattern[]): GeneratedPattern[] {
    return [...patterns].sort((a, b) => {
      const priorityA = a.priority ?? 999999;
      const priorityB = b.priority ?? 999999;
      return priorityA - priorityB;
    });
  }

  private initializeExecutors(
    patterns: GeneratedPattern[]
  ): Map<string, TransformExecutor> {
    const executors = new Map<string, TransformExecutor>();
    for (const pattern of patterns) {
      executors.set(pattern.name, TransformExecutor.fromPattern(pattern));
    }
    return executors;
  }
}
