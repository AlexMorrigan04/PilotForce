declare module 'crypto-browserify' {
  import * as crypto from 'crypto';
  
  // Re-export the core Node.js crypto interfaces
  export interface Hash extends crypto.Hash {}
  export interface Hmac extends crypto.Hmac {}
  
  // Common crypto methods
  export function createHash(algorithm: string): Hash;
  export function createHmac(algorithm: string, key: string | Buffer): Hmac;
  export function randomBytes(size: number): Buffer;
  export function randomBytes(size: number, callback: (err: Error | null, buf: Buffer) => void): void;
  export function pbkdf2(password: string | Buffer, salt: string | Buffer, iterations: number, keylen: number, digest: string, callback: (err: Error | null, derivedKey: Buffer) => void): void;
  export function pbkdf2Sync(password: string | Buffer, salt: string | Buffer, iterations: number, keylen: number, digest: string): Buffer;
  
  // Add more methods as needed
  export function getCiphers(): string[];
  export function getHashes(): string[];
}

// Also provide declarations for stream-browserify and other polyfills
declare module 'stream-browserify' {
  export * from 'stream';
}

declare module 'buffer/' {
  export * from 'buffer';
}

declare module 'process/browser' {
  export = process;
}
