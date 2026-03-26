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

async function convertImagesToPDFMobile(
  images: string[] | ScanPage[],
  filename: string = 'document.pdf'
): Promise<{ 
  base64: string; 
  filename: string;
}> {
  try {
    console.log(`Starting mobile PDF conversion for ${images.length} page(s)...`);

    const base64DataUris: string[] = [];
    for (let i = 0; i < images.length; i++) {
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
      console.log(`Prepared image ${i + 1}/${images.length} for PDF (${(dataUri.length / 1024).toFixed(0)}KB)`);
    }

    if (base64DataUris.length === 0) {
      throw new Error('No valid images to convert');
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
    const { uri } = await Print.printToFileAsync({ html });
    console.log('PDF created at:', uri);
    
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
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
