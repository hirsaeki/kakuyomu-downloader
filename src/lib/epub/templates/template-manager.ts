import type { OutputChapter, TemplateResult } from './core/types';
import type { EPUBMetadata } from '../core/types';
import { generateContainerXml, generateNavigationXml, generateContentOpf } from './core';
import EPUB_CONFIG from '@/config/epub'

export function generateXmlTemplates(
  lang?: string,
  options?: EPUBMetadata,
  chapters?: OutputChapter[],
  uuid?: string
): TemplateResult {
  const containerXml = generateContainerXml();

  if (!options || !chapters || !uuid) {
    return { containerXml };
  }

  const navXhtml = generateNavigationXml(lang ?? options.lang ?? EPUB_CONFIG.DEFAULTS.LANG, options.tocTitle ?? EPUB_CONFIG.DEFAULTS.TOC_TITLE, chapters);
  const contentOpf = generateContentOpf(options, chapters, uuid);

  return { containerXml, navXhtml, contentOpf };
}
