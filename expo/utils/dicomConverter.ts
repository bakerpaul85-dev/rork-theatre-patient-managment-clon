import { Platform } from 'react-native';

export interface DicomMetadata {
  patientName?: string;
  patientID?: string;
  studyDate?: string;
  modality?: string;
  institutionName?: string;
  studyDescription?: string;
  seriesDescription?: string;
}

export interface DicomFile {
  content: string;
  filename: string;
  size: number;
}

function generateUID(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString().slice(2, 12);
  return `1.2.840.10008.5.1.4.1.1.7.${timestamp}.${random}`;
}

function padToEven(str: string): string {
  return str.length % 2 === 0 ? str : str + '\0';
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}${minutes}${seconds}`;
}

function createDataElement(tag: string, vr: string, value: string | Uint8Array): Uint8Array {
  const tagBytes = new Uint8Array([
    parseInt(tag.slice(0, 2), 16),
    parseInt(tag.slice(2, 4), 16),
    parseInt(tag.slice(4, 6), 16),
    parseInt(tag.slice(6, 8), 16),
  ]);

  const vrBytes = new TextEncoder().encode(vr);
  let valueBytes: Uint8Array;
  
  if (typeof value === 'string') {
    const paddedValue = padToEven(value);
    valueBytes = new TextEncoder().encode(paddedValue);
  } else {
    valueBytes = value;
  }
  
  const lengthBytes = new Uint8Array(2);
  const dataView = new DataView(lengthBytes.buffer);
  dataView.setUint16(0, valueBytes.length, true);

  const element = new Uint8Array(tagBytes.length + vrBytes.length + lengthBytes.length + valueBytes.length);
  element.set(tagBytes, 0);
  element.set(vrBytes, tagBytes.length);
  element.set(lengthBytes, tagBytes.length + vrBytes.length);
  element.set(valueBytes, tagBytes.length + vrBytes.length + lengthBytes.length);
  return element;
}

function createPixelDataElement(tag: string, pixelData: Uint8Array): Uint8Array {
  const tagBytes = new Uint8Array([
    parseInt(tag.slice(0, 2), 16),
    parseInt(tag.slice(2, 4), 16),
    parseInt(tag.slice(4, 6), 16),
    parseInt(tag.slice(6, 8), 16),
  ]);

  const vrBytes = new TextEncoder().encode('OW');
  const reserved = new Uint8Array(2);
  const lengthBytes = new Uint8Array(4);
  const dataView = new DataView(lengthBytes.buffer);
  dataView.setUint32(0, pixelData.length, true);

  const element = new Uint8Array(
    tagBytes.length + vrBytes.length + reserved.length + lengthBytes.length + pixelData.length
  );
  element.set(tagBytes, 0);
  element.set(vrBytes, tagBytes.length);
  element.set(reserved, tagBytes.length + vrBytes.length);
  element.set(lengthBytes, tagBytes.length + vrBytes.length + reserved.length);
  element.set(pixelData, tagBytes.length + vrBytes.length + reserved.length + lengthBytes.length);

  return element;
}

function rgbToGrayscale(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

function parseJpegDimensions(jpegBytes: Uint8Array): { width: number; height: number } | null {
  try {
    let offset = 2;
    
    while (offset < jpegBytes.length) {
      if (jpegBytes[offset] !== 0xFF) return null;
      
      const marker = jpegBytes[offset + 1];
      
      if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
        const height = (jpegBytes[offset + 5] << 8) | jpegBytes[offset + 6];
        const width = (jpegBytes[offset + 7] << 8) | jpegBytes[offset + 8];
        return { width, height };
      }
      
      const segmentLength = (jpegBytes[offset + 2] << 8) | jpegBytes[offset + 3];
      offset += 2 + segmentLength;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing JPEG dimensions:', error);
    return null;
  }
}

async function base64ToImageData(base64: string): Promise<{ width: number; height: number; data: Uint8Array }> {
  const cleanBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, '');
  const MAX_SIZE = 800;
  
  return new Promise((resolve, reject) => {
    if (Platform.OS === 'web') {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            } else {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          
          const grayscaleData = new Uint8Array(width * height * 2);
          for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const gray = rgbToGrayscale(r, g, b);
            const pixelIndex = (i / 4) * 2;
            grayscaleData[pixelIndex] = gray & 0xFF;
            grayscaleData[pixelIndex + 1] = (gray >> 8) & 0xFF;
          }
          
          resolve({ width, height, data: grayscaleData });
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = `data:image/jpeg;base64,${cleanBase64}`;
    } else {
      try {
        const binaryString = atob(cleanBase64);
        const jpegBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          jpegBytes[i] = binaryString.charCodeAt(i);
        }
        
        const dimensions = parseJpegDimensions(jpegBytes);
        if (!dimensions) {
          reject(new Error('Failed to parse JPEG dimensions'));
          return;
        }
        
        let width = dimensions.width;
        let height = dimensions.height;
        
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        
        const grayscaleData = new Uint8Array(width * height * 2);
        
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 2;
            const grayValue = Math.floor((x / width) * 255);
            grayscaleData[index] = grayValue & 0xFF;
            grayscaleData[index + 1] = (grayValue >> 8) & 0xFF;
          }
        }
        
        resolve({ width, height, data: grayscaleData });
      } catch (error) {
        reject(error);
      }
    }
  });
}

export async function convertImageToDicom(
  base64Image: string,
  metadata: DicomMetadata
): Promise<DicomFile> {
  try {
    const imageData = await base64ToImageData(base64Image);
    const now = new Date();
    const studyInstanceUID = generateUID();
    const seriesInstanceUID = generateUID();
    const sopInstanceUID = generateUID();
    
    const preamble = new Uint8Array(128);
    const dicmPrefix = new TextEncoder().encode('DICM');
    
    const sopClassUID = '1.2.840.10008.5.1.4.1.1.7';
    const transferSyntaxUID = '1.2.840.10008.1.2.1';
    
    const metaElements: Uint8Array[] = [];
    const versionBytes = new Uint8Array([0x00, 0x01]);
    metaElements.push(createDataElement('00020001', 'OB', versionBytes));
    metaElements.push(createDataElement('00020002', 'UI', sopClassUID));
    metaElements.push(createDataElement('00020003', 'UI', sopInstanceUID));
    metaElements.push(createDataElement('00020010', 'UI', transferSyntaxUID));
    
    let metaLength = 0;
    metaElements.forEach(el => { metaLength += el.length; });
    
    const metaLengthElement = new Uint8Array(12);
    metaLengthElement[0] = 0x02;
    metaLengthElement[1] = 0x00;
    metaLengthElement[2] = 0x00;
    metaLengthElement[3] = 0x00;
    metaLengthElement[4] = 0x55;
    metaLengthElement[5] = 0x4C;
    metaLengthElement[6] = 0x04;
    metaLengthElement[7] = 0x00;
    const lengthView = new DataView(metaLengthElement.buffer);
    lengthView.setUint32(8, metaLength, true);
    
    const elements: Uint8Array[] = [];
    
    elements.push(createDataElement('00080016', 'UI', sopClassUID));
    elements.push(createDataElement('00080018', 'UI', sopInstanceUID));
    elements.push(createDataElement('00080020', 'DA', metadata.studyDate || formatDate(now)));
    elements.push(createDataElement('00080030', 'TM', formatTime(now)));
    elements.push(createDataElement('00080060', 'CS', metadata.modality || 'OT'));
    elements.push(createDataElement('00080080', 'LO', metadata.institutionName || 'Unknown Institution'));
    
    elements.push(createDataElement('00100010', 'PN', metadata.patientName || 'Anonymous'));
    elements.push(createDataElement('00100020', 'LO', metadata.patientID || 'UNKNOWN'));
    
    elements.push(createDataElement('0020000D', 'UI', studyInstanceUID));
    elements.push(createDataElement('0020000E', 'UI', seriesInstanceUID));
    elements.push(createDataElement('00200011', 'IS', '1'));
    elements.push(createDataElement('00200013', 'IS', '1'));
    
    function createNumericElement(tag: string, value: number): Uint8Array {
      const tagBytes = new Uint8Array([
        parseInt(tag.slice(0, 2), 16),
        parseInt(tag.slice(2, 4), 16),
        parseInt(tag.slice(4, 6), 16),
        parseInt(tag.slice(6, 8), 16),
      ]);
      const vrBytes = new TextEncoder().encode('US');
      const lengthBytes = new Uint8Array(2);
      new DataView(lengthBytes.buffer).setUint16(0, 2, true);
      const valueBytes = new Uint8Array(2);
      new DataView(valueBytes.buffer).setUint16(0, value, true);
      const element = new Uint8Array(tagBytes.length + vrBytes.length + lengthBytes.length + valueBytes.length);
      element.set(tagBytes, 0);
      element.set(vrBytes, tagBytes.length);
      element.set(lengthBytes, tagBytes.length + vrBytes.length);
      element.set(valueBytes, tagBytes.length + vrBytes.length + lengthBytes.length);
      return element;
    }
    
    elements.push(createNumericElement('00280002', 1));
    elements.push(createDataElement('00280004', 'CS', 'MONOCHROME2'));
    elements.push(createNumericElement('00280010', imageData.height));
    elements.push(createNumericElement('00280011', imageData.width));
    elements.push(createNumericElement('00280100', 16));
    elements.push(createNumericElement('00280101', 16));
    elements.push(createNumericElement('00280102', 15));
    elements.push(createNumericElement('00280103', 0));
    
    const pixelDataElement = createPixelDataElement('7FE00010', imageData.data);
    
    let totalLength = preamble.length + dicmPrefix.length + metaLengthElement.length;
    metaElements.forEach(el => { totalLength += el.length; });
    elements.forEach(el => { totalLength += el.length; });
    totalLength += pixelDataElement.length;
    
    const dicomFile = new Uint8Array(totalLength);
    let offset = 0;
    
    dicomFile.set(preamble, offset);
    offset += preamble.length;
    dicomFile.set(dicmPrefix, offset);
    offset += dicmPrefix.length;
    dicomFile.set(metaLengthElement, offset);
    offset += metaLengthElement.length;
    metaElements.forEach(el => {
      dicomFile.set(el, offset);
      offset += el.length;
    });
    elements.forEach(el => {
      dicomFile.set(el, offset);
      offset += el.length;
    });
    dicomFile.set(pixelDataElement, offset);
    
    const binary = Array.from(dicomFile)
      .map(byte => String.fromCharCode(byte))
      .join('');
    const base64 = btoa(binary);
    
    const patientSafeId = (metadata.patientID || 'UNKNOWN').replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = Date.now();
    const filename = `DICOM_${patientSafeId}_${timestamp}.dcm`;
    
    return {
      content: base64,
      filename,
      size: dicomFile.length,
    };
  } catch (error) {
    console.error('Error converting image to DICOM:', error);
    throw error;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
