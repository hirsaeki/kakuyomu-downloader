import EPUB_CONFIG from '@/config/epub';

export function generateContainerXml(): string {
  return `<?xml version="${EPUB_CONFIG.METADATA.XML_VERSION}" encoding="${EPUB_CONFIG.METADATA.XML_ENCODING}"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="${EPUB_CONFIG.FILE_STRUCTURE.CONTENT}" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
}
