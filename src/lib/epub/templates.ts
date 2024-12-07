import { TextProcessorOptions } from '@/types';
import { escapeXml } from './utils';
import { EPUB_CONFIG } from '@/config/constants';

interface Chapter {
  filename: string;
  title: string;
  landmark?: string;
  hidden?: boolean;
}

interface MetadataOptions extends TextProcessorOptions {
  modifiedDate?: string;
  published?: string;
  rights?: string;
  description?: string;
  keywords?: string[];
  series?: {
    name: string;
    position: number;
  };
}

export function generateXmlTemplates(
  lang: string,
  options?: MetadataOptions,
  chapters?: Chapter[],
  uuid?: string
) {
  const containerXml = `<?xml version="${EPUB_CONFIG.METADATA.XML_VERSION}" encoding="${EPUB_CONFIG.METADATA.XML_ENCODING}"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="${EPUB_CONFIG.FILE_STRUCTURE.CONTENT}" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  if (!options || !chapters || !uuid) {
    return { containerXml };
  }

  const navXhtml = `<?xml version="${EPUB_CONFIG.METADATA.XML_VERSION}" encoding="${EPUB_CONFIG.METADATA.XML_ENCODING}"?>
<!DOCTYPE html>
<html xmlns="${EPUB_CONFIG.METADATA.NAMESPACE.XHTML}" xmlns:epub="${EPUB_CONFIG.METADATA.NAMESPACE.EPUB}" xml:lang="${lang}">
<head>
  <title>${escapeXml(options.tocTitle)}</title>
  <meta charset="${EPUB_CONFIG.METADATA.XML_ENCODING}" />
  <link rel="stylesheet" type="text/css" href="${EPUB_CONFIG.FILE_STRUCTURE.STYLE}" />
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${escapeXml(options.tocTitle)}</h1>
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

  const contentOpf = `<?xml version="${EPUB_CONFIG.METADATA.XML_VERSION}" encoding="${EPUB_CONFIG.METADATA.XML_ENCODING}"?>
<package xmlns="${EPUB_CONFIG.METADATA.NAMESPACE.EPUB}" version="${EPUB_CONFIG.METADATA.EPUB_VERSION}" unique-identifier="BookID" xml:lang="${lang}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="BookID">urn:uuid:${uuid}</dc:identifier>
    <dc:title id="title">${escapeXml(options.title)}</dc:title>
    <dc:language>${lang}</dc:language>
    <dc:creator id="creator">${escapeXml(options.author)}</dc:creator>
    <dc:publisher>${escapeXml(options.publisher)}</dc:publisher>
    ${options.description ? `<dc:description>${escapeXml(options.description)}</dc:description>` : ''}
    ${options.rights ? `<dc:rights>${escapeXml(options.rights)}</dc:rights>` : ''}
    ${options.published ? `<dc:date>${options.published}</dc:date>` : ''}
    ${options.keywords ? options.keywords.map(keyword =>
      `<dc:subject>${escapeXml(keyword)}</dc:subject>`
    ).join('\n    ') : ''}
    ${options.series ? `
    <meta property="belongs-to-collection" id="series">${escapeXml(options.series.name)}</meta>
    <meta property="group-position" refines="#series">${options.series.position}</meta>
    <meta property="collection-type" refines="#series">series</meta>
    ` : ''}
    <meta property="dcterms:modified">${options.modifiedDate}</meta>
    <meta property="dcterms:type">Text</meta>
    <meta property="rendition:layout">pre-paginated</meta>
    <meta property="rendition:orientation">auto</meta>
    <meta property="rendition:spread">none</meta>
    <meta property="ibooks:specified-fonts">true</meta>
  </metadata>

  <manifest>
    <item id="nav" href="${EPUB_CONFIG.FILE_STRUCTURE.NAV}" media-type="application/xhtml+xml" properties="nav"/>
    <item id="style" href="${EPUB_CONFIG.FILE_STRUCTURE.STYLE}" media-type="text/css"/>
    ${chapters.map((chapter, index) => `
      <item id="chapter${index + 1}" href="${chapter.filename}" media-type="application/xhtml+xml" ${chapter.landmark ? `properties="${chapter.landmark}"` : ''}/>
    `).join('')}
  </manifest>

  <spine page-progression-direction="rtl">
    ${chapters.map((chapter, index) => `
      <itemref idref="chapter${index + 1}" ${chapter.hidden ? 'linear="no"' : ''}/>
    `).join('')}
  </spine>

  <guide>
    ${chapters
      .filter(chapter => chapter.landmark)
      .map(chapter => `
        <reference type="${chapter.landmark}" title="${escapeXml(chapter.title)}" href="${chapter.filename}"/>
      `).join('')}
  </guide>
</package>`;

  return { containerXml, navXhtml, contentOpf };
}
