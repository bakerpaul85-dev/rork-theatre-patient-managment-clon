import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';

let jsPDF: any = null;
if (Platform.OS === 'web') {
  jsPDF = require('jspdf').jsPDF;
}

export interface ScanPage {
  base64: string;
  width: number;
  height: number;
}

export async function convertImagesToPDF(
  images: string[] | ScanPage[],
  filename: string = 'document.pdf',
  enhance: boolean = true
): Promise<{ 
  base64: string; 
  filename: string;
}> {
  if (Platform.OS !== 'web') {
    return convertImagesToPDFMobile(images, filename);
  }
  
  try {
    console.log(`Starting PDF conversion for ${images.length} page(s)...`);
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
    
    const pageWidth = 210;
    const pageHeight = 297;
    let isFirstPage = true;
    
    for (let i = 0; i < images.length; i++) {
      const currentImage = images[i];
      const imageData = typeof currentImage === 'string' ? currentImage : currentImage.base64;
      console.log(`Processing page ${i + 1}/${images.length}...`);
      
      let processedImage = imageData;
      
      if (enhance) {
        processedImage = await enhanceDocumentImage(imageData);
      }
      
      const cleanBase64 = processedImage.replace(/^data:image\/[a-z]+;base64,/, '');
      const imageDataUrl = `data:image/jpeg;base64,${cleanBase64}`;
      
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image page ${i + 1}`));
        img.src = imageDataUrl;
      });
      
      const imgWidth = img.width;
      const imgHeight = img.height;
      
      const widthRatio = pageWidth / imgWidth;
      const heightRatio = pageHeight / imgHeight;
      const ratio = Math.min(widthRatio, heightRatio);
      
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      
      const xPos = (pageWidth - finalWidth) / 2;
      const yPos = (pageHeight - finalHeight) / 2;
      
      if (!isFirstPage) {
        pdf.addPage();
      }
      isFirstPage = false;
      
      pdf.addImage(
        imageDataUrl,
        'JPEG',
        xPos,
        yPos,
        finalWidth,
        finalHeight,
        undefined,
        'NONE'
      );
      
      console.log(`Page ${i + 1} added to PDF`);
    }
    
    const pdfOutput = pdf.output('dataurlstring');
    console.log('PDF output format:', pdfOutput.substring(0, 50));
    
    const pdfBase64 = pdfOutput.split(',')[1];
    
    if (!pdfBase64 || pdfBase64.length === 0) {
      console.error('Empty PDF base64 data');
      throw new Error('PDF generation failed - no data');
    }
    
    console.log('PDF generated successfully');
    console.log('PDF size:', (pdfBase64.length / 1024).toFixed(2), 'KB');
    
    try {
      const pdfHeader = atob(pdfBase64.substring(0, 20));
      console.log('PDF header:', pdfHeader.substring(0, 10));
      if (!pdfHeader.startsWith('%PDF')) {
        console.error('Invalid PDF header:', pdfHeader);
        throw new Error('Generated PDF has invalid header');
      }
    } catch (headerError) {
      console.error('Error checking PDF header:', headerError);
      throw new Error('Failed to validate PDF: ' + (headerError instanceof Error ? headerError.message : 'Unknown error'));
    }
    
    return {
      base64: pdfBase64,
      filename: filename.replace(/\.(jpg|jpeg|png)$/i, '.pdf'),
    };
  } catch (error) {
    console.error('Error converting images to PDF:', error);
    throw new Error('Failed to convert to PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

async function enhanceDocumentImage(base64Image: string): Promise<string> {
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for enhancement'));
      img.src = `data:image/jpeg;base64,${cleanBase64}`;
    });
    
    canvas.width = img.width;
    canvas.height = img.height;
    
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const contrast = 1.35;
    const brightness = 15;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, contrast * (data[i] - 128) + 128 + brightness));
      data[i + 1] = Math.min(255, Math.max(0, contrast * (data[i + 1] - 128) + 128 + brightness));
      data[i + 2] = Math.min(255, Math.max(0, contrast * (data[i + 2] - 128) + 128 + brightness));
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const enhancedBase64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
    return `data:image/jpeg;base64,${enhancedBase64}`;
  } catch (error) {
    console.log('Enhancement failed, using original image:', error);
    return base64Image;
  }
}

/**
 * Reads a generated PDF file back as base64.
 * Android's legacy FileSystem module sometimes rejects files under
 * cache/Print/ ("Location isn't readable"), so this tries several
 * strategies before giving up.
 */
async function readPdfAsBase64(uri: string): Promise<string> {
  // 1) Direct legacy read, with one delayed retry in case the file is
  //    momentarily still being finalized.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (readErr) {
      console.log(`Legacy read of PDF failed (attempt ${attempt + 1}):`, readErr instanceof Error ? readErr.message : readErr);
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // 2) Copy into the app's own cache root and read the copy.
  const dest = `${FileSystem.cacheDirectory}print_${Date.now()}.pdf`;
  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    const base64 = await FileSystem.readAsStringAsync(dest, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log('Read PDF via copied cache file');
    return base64;
  } catch (copyErr) {
    console.log('Copy-to-cache read failed:', copyErr instanceof Error ? copyErr.message : copyErr);
    throw new Error('Generated PDF could not be read back from storage');
  } finally {
    try {
      await FileSystem.deleteAsync(dest, { idempotent: true });
    } catch {}
  }
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_LOOKUP = new Uint8Array(128);
for (let i = 0; i < BASE64_ALPHABET.length; i++) {
  BASE64_LOOKUP[BASE64_ALPHABET.charCodeAt(i)] = i;
}

/** Decodes a base64 string into a binary (latin1) string, one byte per char. */
function base64ToBinary(b64: string): string {
  const clean = b64.replace(/[^A-Za-z0-9+\/]/g, '');
  const out: string[] = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    buffer = ((buffer << 6) | BASE64_LOOKUP[clean.charCodeAt(i)]) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push(String.fromCharCode((buffer >> bits) & 0xff));
    }
  }
  return out.join('');
}

/** Encodes a binary (latin1) string as base64. */
function binaryToBase64(binary: string): string {
  const out: string[] = [];
  for (let i = 0; i < binary.length; i += 3) {
    const b0 = binary.charCodeAt(i);
    const b1 = i + 1 < binary.length ? binary.charCodeAt(i + 1) : 0;
    const b2 = i + 2 < binary.length ? binary.charCodeAt(i + 2) : 0;
    out.push(BASE64_ALPHABET[b0 >> 2]);
    out.push(BASE64_ALPHABET[((b0 & 3) << 4) | (b1 >> 4)]);
    out.push(i + 1 < binary.length ? BASE64_ALPHABET[((b1 & 15) << 2) | (b2 >> 6)] : '=');
    out.push(i + 2 < binary.length ? BASE64_ALPHABET[b2 & 63] : '=');
  }
  return out.join('');
}

/** Reads pixel dimensions from a JPEG's SOF marker. */
function getJpegSizeFromBinary(binary: string): { width: number; height: number } {
  let i = 2;
  while (i + 9 < binary.length) {
    if (binary.charCodeAt(i) !== 0xff) {
      i++;
      continue;
    }
    const marker = binary.charCodeAt(i + 1);
    const isSof =
      marker >= 0xc0 && marker <= 0xcf &&
      marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      return {
        height: (binary.charCodeAt(i + 5) << 8) | binary.charCodeAt(i + 6),
        width: (binary.charCodeAt(i + 7) << 8) | binary.charCodeAt(i + 8),
      };
    }
    const length = (binary.charCodeAt(i + 2) << 8) | binary.charCodeAt(i + 3);
    if (length <= 0) break;
    i += 2 + length;
  }
  return { width: 0, height: 0 };
}

/**
 * Builds a single PDF as base64 purely in JavaScript by embedding each JPEG
 * page with the DCTDecode filter. No native file-system access is involved,
 * which sidesteps Android's "Location isn't readable" issue entirely.
 */
function buildPdfFromJpegs(jpegDataUris: string[]): string {
  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;
  const MARGIN = 12;

  const pages = jpegDataUris.map(dataUri => {
    const binary = base64ToBinary(dataUri.replace(/^data:image\/jpeg;base64,/, ''));
    const { width, height } = getJpegSizeFromBinary(binary);
    return {
      binary,
      width: width > 0 ? width : 1240,
      height: height > 0 ? height : 1754,
    };
  });

  // Object numbering: 1 = catalog, 2 = page tree, then 3 per page (page, contents, image).
  const pageNums: { page: number; contents: number; image: number }[] = [];
  let next = 3;
  for (let i = 0; i < pages.length; i++) {
    pageNums.push({ page: next, contents: next + 1, image: next + 2 });
    next += 3;
  }

  const body: string[] = [];
  const pushObject = (content: string, streamBinary?: string) => {
    body.push(
      streamBinary !== undefined
        ? `${content}\nstream\n${streamBinary}\nendstream`
        : content,
    );
  };

  pushObject('<< /Type /Catalog /Pages 2 0 R >>');
  const kids = pageNums.map(p => `${p.page} 0 R`).join(' ');
  pushObject(`<< /Type /Pages /Kids [ ${kids} ] /Count ${pages.length} >>`);

  pages.forEach((page, i) => {
    const contentsObj = pageNums[i].contents;
    const imageObj = pageNums[i].image;
    const ratio = Math.min(
      (A4_WIDTH - MARGIN * 2) / page.width,
      (A4_HEIGHT - MARGIN * 2) / page.height,
    );
    const drawW = page.width * ratio;
    const drawH = page.height * ratio;
    const x = (A4_WIDTH - drawW) / 2;
    const y = (A4_HEIGHT - drawH) / 2;
    const contentStream = `q\n${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im0 Do\nQ`;

    pushObject(
      `<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 ${A4_WIDTH} ${A4_HEIGHT} ] ` +
      `/Resources << /XObject << /Im0 ${imageObj} 0 R >> /ProcSet [ /PDF /ImageC ] >> ` +
      `/Contents ${contentsObj} 0 R >>`,
    );
    pushObject(`<< /Length ${contentStream.length} >>`, contentStream);
    pushObject(
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.binary.length} >>`,
      page.binary,
    );
  });

  const header = '%PDF-1.4\n%\u00E2\u00E3\u00CF\u00D3\n';
  const numbered: string[] = body.map(
    (chunk, i) => `${i + 1} 0 obj\n${chunk}\nendobj\n`,
  );
  const trueOffsets: number[] = [];
  let cursor = header.length;
  numbered.forEach(chunk => {
    trueOffsets.push(cursor);
    cursor += chunk.length;
  });
  const bodyStr = numbered.join('');

  const startxref = cursor;
  const xrefEntries = trueOffsets
    .map(off => `${String(off).padStart(10, '0')} 00000 n \n`)
    .join('');
  const trailer =
    `xref\n0 ${trueOffsets.length + 1}\n0000000000 65535 f \n${xrefEntries}` +
    `trailer\n<< /Size ${trueOffsets.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;

  return binaryToBase64(header + bodyStr + trailer);
}

async function convertImagesToPDFMobile(
  images: string[] | ScanPage[],
  filename: string = 'document.pdf'
): Promise<{ 
  base64: string; 
  filename: string;
}> {
  try {
    const MAX_PAGES = 20;
    const MAX_HTML_SIZE_MB = 15;
    const MAX_HTML_SIZE = MAX_HTML_SIZE_MB * 1024 * 1024;

    const pagesToConvert = images.slice(0, MAX_PAGES);
    if (images.length > MAX_PAGES) {
      console.warn(`PDF conversion limited to ${MAX_PAGES} pages (had ${images.length})`);
    }

    console.log(`Starting mobile PDF conversion for ${pagesToConvert.length} page(s)...`);

    const base64DataUris: string[] = [];
    let totalBase64Size = 0;
    for (let i = 0; i < pagesToConvert.length; i++) {
      const img = images[i];
      const imageData = typeof img === 'string' ? img : img.base64;
      let dataUri = imageData;

      if (!dataUri.startsWith('data:')) {
        if (dataUri.startsWith('file://') || dataUri.startsWith('/')) {
          try {
            const fileBase64 = await FileSystem.readAsStringAsync(dataUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            dataUri = `data:image/jpeg;base64,${fileBase64}`;
            console.log(`Read file image ${i + 1}, base64 length: ${fileBase64.length}`);
          } catch (readErr) {
            console.error(`Failed to read image file ${i + 1}:`, readErr);
            continue;
          }
        } else {
          dataUri = `data:image/jpeg;base64,${imageData}`;
        }
      }

      base64DataUris.push(dataUri);
      totalBase64Size += dataUri.length;
      console.log(`Prepared image ${i + 1}/${pagesToConvert.length} for PDF (${(dataUri.length / 1024).toFixed(0)}KB)`);
    }

    if (base64DataUris.length === 0) {
      throw new Error('No valid images to convert');
    }

    // Primary strategy: pure-JS PDF assembly (no filesystem access).
    const allJpeg = base64DataUris.every(uri => uri.startsWith('data:image/jpeg'));
    if (allJpeg) {
      try {
        const base64 = buildPdfFromJpegs(base64DataUris);
        console.log('PDF generated via pure-JS builder, size:', (base64.length / 1024).toFixed(2), 'KB');
        return {
          base64,
          filename: filename.replace(/\.(jpg|jpeg|png)$/i, '.pdf'),
        };
      } catch (jsErr) {
        console.log('Pure-JS PDF build failed, falling back to expo-print:', jsErr instanceof Error ? jsErr.message : jsErr);
      }
    }

    const imagesHtml = base64DataUris.map((dataUri, index) => {
      return `
        <div style="page-break-after: ${index === base64DataUris.length - 1 ? 'avoid' : 'always'}; width: 100%; height: 100vh; display: flex; justify-content: center; align-items: center; overflow: hidden; padding: 0; margin: 0;">
          <img src="${dataUri}" style="max-width: 100%; max-height: 100%; object-fit: contain; display: block;" />
        </div>
      `;
    }).join('');
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @page {
              size: A4;
              margin: 3mm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              background: white;
            }
            img {
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
            }
          </style>
        </head>
        <body>
          ${imagesHtml}
        </body>
      </html>
    `;
    
    console.log('HTML prepared, total length:', (html.length / 1024).toFixed(0), 'KB');
    if (html.length > MAX_HTML_SIZE) {
      throw new Error(`PDF HTML exceeds ${MAX_HTML_SIZE_MB}MB limit - too many/large images`);
    }
    const { uri } = await Print.printToFileAsync({ html });
    console.log('PDF created at:', uri);

    const base64 = await readPdfAsBase64(uri);
    
    console.log('PDF generated successfully on mobile');
    console.log('PDF size:', (base64.length / 1024).toFixed(2), 'KB');

    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      console.log('Failed to clean up PDF temp file');
    }
    
    return {
      base64,
      filename: filename.replace(/\.(jpg|jpeg|png)$/i, '.pdf'),
    };
  } catch (error) {
    console.error('Error converting images to PDF on mobile:', error);
    throw new Error('Failed to convert to PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

export async function convertImageToPDF(base64Image: string, filename: string = 'document.pdf'): Promise<{ 
  base64: string; 
  filename: string;
}> {
  return convertImagesToPDF([base64Image], filename, true);
}
