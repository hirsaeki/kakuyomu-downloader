import { TextProcessor, TextTransformRule, TextProcessorOptions } from './types';

export class BaseTextProcessor implements TextProcessor {
  private rules: TextTransformRule[];

  constructor(options?: TextProcessorOptions) {
    this.rules = options?.rules?.slice() || [];
    // 優先度順にソート
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  convertToXhtml(text: string, title: string): string {
    // 基本的なXHTMLテンプレート
    const xhtmlTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ja">
<head>
  <meta charset="UTF-8" />
  <title>${this.escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <h1>${this.escapeXml(title)}</h1>
  ${this.processText(text)}
</body>
</html>`;

    return xhtmlTemplate;
  }

  protected processText(text: string): string {
    // 全てのルールを順番に適用
    return this.rules.reduce(
      (processedText, rule) => rule.transform(processedText),
      text
    );
  }

  protected escapeXml(text: string): string {
    if (!text) return '';
    return text.replace(/[<>&'"]/g, char => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      "'": '&apos;',
      '"': '&quot;'
    }[char] || char));
  }
}