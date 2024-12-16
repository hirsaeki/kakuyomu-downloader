import type { OutputChapter } from './types';
import type { EPUBMetadata } from '../../core/types';
import { escapeXml } from '../../utils';
import EPUB_CONFIG from '@/config/epub';

export function generateContentOpf(
  options: EPUBMetadata,
  chapters: OutputChapter[],
  uuid: string
): string {
  const {
    title,
    author,
    publisher = '',
    lang,
    description = '',
    rights = '',
    published = '',
    keywords = [],
    series,
    modifiedDate
  } = options;

  // 日付を正しい形式に整形（CCYY-MM-DDThh:mm:ssZ）
  const formattedDate = new Date(modifiedDate).toISOString();

  return `<?xml version="${EPUB_CONFIG.METADATA.XML_VERSION}" encoding="${EPUB_CONFIG.METADATA.XML_ENCODING}"?>
<package xmlns="${EPUB_CONFIG.METADATA.NAMESPACE.OPF}" 
  xmlns:dc="${EPUB_CONFIG.METADATA.NAMESPACE.DC}"
  xmlns:opf="${EPUB_CONFIG.METADATA.NAMESPACE.OPF}"
  version="${EPUB_CONFIG.METADATA.EPUB_VERSION}" 
  unique-identifier="BookID" 
  xml:lang="${lang}">
  <metadata>
    <dc:identifier id="BookID">urn:uuid:${uuid}</dc:identifier>
    <dc:title id="title">${escapeXml(title)}</dc:title>
    <dc:language>${lang}</dc:language>
    <dc:creator id="creator">${escapeXml(author)}</dc:creator>
    <dc:publisher>${escapeXml(publisher)}</dc:publisher>
    ${description ? `<dc:description>${escapeXml(description)}</dc:description>` : ''}
    ${rights ? `<dc:rights>${escapeXml(rights)}</dc:rights>` : ''}
    ${published ? `<dc:date>${published}</dc:date>` : ''}
    ${keywords ? keywords.map(keyword =>
    `<dc:subject>${escapeXml(keyword)}</dc:subject>`
  ).join('\n    ') : ''}
    ${series ? `
    <meta property="belongs-to-collection" id="series">${escapeXml(series.name)}</meta>
    <meta property="group-position" refines="#series">${series.position}</meta>
    <meta property="collection-type" refines="#series">series</meta>
    ` : ''}
    <meta property="dcterms:modified">${formattedDate}</meta>
    <meta property="dcterms:type">Text</meta>
    <meta property="rendition:layout">reflowable</meta>
    <meta property="rendition:orientation">auto</meta>
    <meta property="rendition:spread">none</meta>
  </metadata>

  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="style" href="style.css" media-type="text/css"/>
    ${chapters.map((chapter, index) => `
      <item id="chapter${index + 1}" href="${chapter.filename}" media-type="application/xhtml+xml"/>
    `).join('')}
  </manifest>

  <spine page-progression-direction="rtl">
    ${chapters.map((chapter, index) => `
      <itemref idref="chapter${index + 1}" ${chapter.hidden ? 'linear="no"' : ''}/>
    `).join('')}
  </spine>
</package>`;
}