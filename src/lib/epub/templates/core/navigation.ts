import type { OutputChapter } from './types';
import { escapeXml } from '../../utils';
import EPUB_CONFIG from '@/config/epub';

export function generateNavigationXml(
  lang: string,
  tocTitle: string,
  chapters: OutputChapter[]
): string {
  return `<?xml version="${EPUB_CONFIG.METADATA.XML_VERSION}" encoding="${EPUB_CONFIG.METADATA.XML_ENCODING}"?>
<!DOCTYPE html>
<html xmlns="${EPUB_CONFIG.METADATA.NAMESPACE.XHTML}" xmlns:epub="${EPUB_CONFIG.METADATA.NAMESPACE.EPUB}" xml:lang="${lang}">
<head>
  <title>${escapeXml(tocTitle)}</title>
  <meta charset="${EPUB_CONFIG.METADATA.XML_ENCODING}" />
  <link rel="stylesheet" type="text/css" href="${EPUB_CONFIG.FILE_STRUCTURE.STYLE}" />
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${escapeXml(tocTitle)}</h1>
    <ol>
      ${chapters
      .filter(chapter => !chapter.hidden)
      .map(chapter => `
          <li><a href="${chapter.filename}">${escapeXml(chapter.title)}</a></li>
        `).join('')}
    </ol>
  </nav>
  <nav epub:type="landmarks" hidden="hidden">
    <h2>Guide</h2>
    <ol>
      ${chapters
      .filter(chapter => chapter.landmark)
      .map(chapter => `
          <li><a epub:type="${chapter.landmark}" href="${chapter.filename}">${escapeXml(chapter.title)}</a></li>
        `).join('')}
    </ol>
  </nav>
</body>
</html>`;
}