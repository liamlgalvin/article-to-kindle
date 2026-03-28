import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface EbookData {
  title: string;
  author: string;
  content: string; // HTML content
  description?: string;
}

function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return c;
    }
  });
}

export async function generateEpub(data: EbookData) {
  const zip = new JSZip();
  
  const title = escapeXml(data.title);
  const author = escapeXml(data.author);
  const description = escapeXml(data.description || '');

  // 1. mimetype
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  zip.folder('META-INF')?.file('container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  // 3. OEBPS/content.opf
  const uuid = `urn:uuid:${crypto.randomUUID()}`;
  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${uuid}</dc:identifier>
    <dc:title>${title}</dc:title>
    <dc:creator>${author}</dc:creator>
    <dc:language>en</dc:language>
    <dc:description>${description}</dc:description>
    <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]}Z</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="chapter1"/>
  </spine>
</package>`;
  zip.folder('OEBPS')?.file('content.opf', opf);

  // 4. OEBPS/toc.ncx
  const ncx = `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${title}</text></docTitle>
  <navMap>
    <navPoint id="navpoint-1" playOrder="1">
      <navLabel><text>${title}</text></navLabel>
      <content src="chapter1.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`;
  zip.folder('OEBPS')?.file('toc.ncx', ncx);

  // 5. OEBPS/nav.xhtml
  const nav = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head><title>Navigation</title></head>
  <body>
    <nav epub:type="toc">
      <h1>Table of Contents</h1>
      <ol>
        <li><a href="chapter1.xhtml">${title}</a></li>
      </ol>
    </nav>
  </body>
</html>`;
  zip.folder('OEBPS')?.file('nav.xhtml', nav);

  // 6. OEBPS/style.css
  const css = `body { font-family: serif; margin: 1em; line-height: 1.5; }
h1 { text-align: center; }
p { margin-bottom: 1em; }`;
  zip.folder('OEBPS')?.file('style.css', css);

  // 7. OEBPS/chapter1.xhtml
  const chapter = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>${title}</title>
    <link rel="stylesheet" type="text/css" href="style.css"/>
  </head>
  <body>
    <h1>${title}</h1>
    <p><em>By ${author}</em></p>
    <hr/>
    ${data.content}
  </body>
</html>`;
  zip.folder('OEBPS')?.file('chapter1.xhtml', chapter);

  const content = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  saveAs(content, `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.epub`);
}
