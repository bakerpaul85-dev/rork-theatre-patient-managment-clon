const OriginalTextDecoder = (global as any).TextDecoder;
const OriginalTextEncoder = (global as any).TextEncoder;

class CustomTextDecoder {
  private _encoding: string;
  private options: { fatal?: boolean; ignoreBOM?: boolean };
  
  constructor(encoding?: string, options?: { fatal?: boolean; ignoreBOM?: boolean }) {
    const normalizedEncoding = (encoding || 'utf-8').toLowerCase().replace(/[_-]/g, '');
    this._encoding = normalizedEncoding;
    this.options = options || {};
  }
  
  decode(input?: BufferSource, options?: { stream?: boolean }): string {
    if (!input) {
      return '';
    }
    
    const bytes = input instanceof ArrayBuffer 
      ? new Uint8Array(input) 
      : new Uint8Array(input.buffer || input);
    
    if (OriginalTextDecoder) {
      try {
        const decoder = new OriginalTextDecoder(this._encoding, this.options);
        return decoder.decode(bytes, options);
      } catch (e) {
        console.warn('TextDecoder error, falling back:', e);
      }
    }
    
    const encoding = this._encoding.toLowerCase().replace(/[_-]/g, '');
    
    if (encoding === 'latin1' || encoding === 'iso88591' || encoding === 'windows1252') {
      let result = '';
      for (let i = 0; i < bytes.length; i++) {
        result += String.fromCharCode(bytes[i]);
      }
      return result;
    }
    
    if (encoding === 'utf8' || encoding === 'utf-8') {
      let result = '';
      let i = 0;
      while (i < bytes.length) {
        const byte1 = bytes[i++];
        if (byte1 < 0x80) {
          result += String.fromCharCode(byte1);
        } else if (byte1 >= 0xC0 && byte1 < 0xE0 && i < bytes.length) {
          const byte2 = bytes[i++];
          result += String.fromCharCode(((byte1 & 0x1F) << 6) | (byte2 & 0x3F));
        } else if (byte1 >= 0xE0 && byte1 < 0xF0 && i + 1 < bytes.length) {
          const byte2 = bytes[i++];
          const byte3 = bytes[i++];
          result += String.fromCharCode(
            ((byte1 & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F)
          );
        } else if (byte1 >= 0xF0 && i + 2 < bytes.length) {
          const byte2 = bytes[i++];
          const byte3 = bytes[i++];
          const byte4 = bytes[i++];
          let codePoint =
            ((byte1 & 0x07) << 18) |
            ((byte2 & 0x3F) << 12) |
            ((byte3 & 0x3F) << 6) |
            (byte4 & 0x3F);
          codePoint -= 0x10000;
          result += String.fromCharCode(
            0xD800 + (codePoint >> 10),
            0xDC00 + (codePoint & 0x3FF)
          );
        } else {
          result += String.fromCharCode(byte1);
        }
      }
      return result;
    }
    
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      result += String.fromCharCode(bytes[i]);
    }
    return result;
  }
  
  get encoding(): string {
    return this._encoding;
  }
  
  get fatal(): boolean {
    return this.options.fatal || false;
  }
  
  get ignoreBOM(): boolean {
    return this.options.ignoreBOM || false;
  }
}

class CustomTextEncoder {
  encode(text?: string): Uint8Array {
    if (!text) {
      return new Uint8Array(0);
    }
    
    if (OriginalTextEncoder) {
      try {
        const encoder = new OriginalTextEncoder();
        return encoder.encode(text);
      } catch (e) {
        console.warn('TextEncoder error, falling back:', e);
      }
    }
    
    const utf8: number[] = [];
    for (let i = 0; i < text.length; i++) {
      let charcode = text.charCodeAt(i);
      if (charcode < 0x80) {
        utf8.push(charcode);
      } else if (charcode < 0x800) {
        utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
      } else if (charcode < 0xd800 || charcode >= 0xe000) {
        utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
      } else {
        i++;
        charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (text.charCodeAt(i) & 0x3ff));
        utf8.push(
          0xf0 | (charcode >> 18),
          0x80 | ((charcode >> 12) & 0x3f),
          0x80 | ((charcode >> 6) & 0x3f),
          0x80 | (charcode & 0x3f)
        );
      }
    }
    return new Uint8Array(utf8);
  }
  
  encodeInto(text: string, dest: Uint8Array): { read: number; written: number } {
    const encoded = this.encode(text);
    const length = Math.min(encoded.length, dest.length);
    for (let i = 0; i < length; i++) {
      dest[i] = encoded[i];
    }
    return { read: text.length, written: length };
  }
  
  get encoding(): string {
    return 'utf-8';
  }
}

if (!OriginalTextDecoder || !OriginalTextEncoder) {
  (global as any).TextDecoder = CustomTextDecoder;
  (global as any).TextEncoder = CustomTextEncoder;
}
