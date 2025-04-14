declare module 'jwt-decode' {
  export interface JwtPayload {
    [key: string]: any;
  }

  export class InvalidTokenError extends Error {
    constructor(message: string);
  }

  /**
   * Decodes a JWT token
   * @param token - The JWT token string to decode
   * @param options - Optional configuration for decoding
   * @returns The decoded token payload
   */
  export function jwtDecode<T = JwtPayload>(token: string, options?: { header: boolean }): T;
}
