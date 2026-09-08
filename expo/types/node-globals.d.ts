/**
 * Ambient type declarations for Node globals used by server-side code
 * (backend/trpc) and the text-encoding polyfill. The Expo environment does not
 * allow installing @types/node, so the minimal surface actually used is
 * declared here instead.
 */

declare var global: typeof globalThis;

declare class Buffer {
  constructor(input: string | ArrayLike<number>, encoding?: string);
  static from(value: string, encoding?: string): Buffer;
  static from(value: ArrayLike<number>): Buffer;
  static from(value: ArrayBufferLike): Buffer;
  static alloc(size: number, fill?: string | number | Buffer): Buffer;
  static isBuffer(value: unknown): value is Buffer;
  readonly length: number;
  toString(encoding?: string): string;
}
