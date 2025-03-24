declare module 'geotiff' {
  export function fromUrl(url: string): Promise<GeoTIFF>;
  export function fromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<GeoTIFF>;
  export function fromBlob(blob: Blob): Promise<GeoTIFF>;

  export interface GeoTIFF {
    getImage(index?: number): Promise<GeoTIFFImage>;
    getImageCount(): Promise<number>;
  }

  export interface GeoTIFFImage {
    getWidth(): number;
    getHeight(): number;
    getBoundingBox(): [number, number, number, number]; // [xmin, ymin, xmax, ymax]
    getResolution(): [number, number]; // [x-resolution, y-resolution]
    getTiePoints(): Array<any>;
    getGeoKeys(): any;
    getOrigin(): [number, number];
    getFileDirectory(): any;
    getSamplesPerPixel(): number; // Add the missing method
    readRasters(options?: {
      window?: [number, number, number, number];
      samples?: number[];
      interleave?: boolean;
      pool?: any;
      width?: number;
      height?: number;
    }): Promise<TypedArray[]>; // Changed return type to be more specific - GeoTIFF typically returns TypedArray[]
  }

  type TypedArray = 
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array;
}
