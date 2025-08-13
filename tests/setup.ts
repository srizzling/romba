// Setup file for vitest to polyfill missing globals
import { vi } from 'vitest';

// Polyfill File constructor for undici compatibility
if (typeof global.File === 'undefined') {
  global.File = class File {
    constructor(bits: any[], name: string, options?: any) {
      // Minimal File polyfill
    }
  } as any;
}

// Polyfill other web APIs if needed
if (typeof global.Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(bits?: any[], options?: any) {
      // Minimal Blob polyfill
    }
  } as any;
}