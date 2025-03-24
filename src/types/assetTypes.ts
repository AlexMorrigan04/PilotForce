export type AssetType = 'property' | 'building' | 'site';

export interface Asset {
  id: string;
  name: string;
  description?: string;
  location?: string;
  coordinates?: {
    type: string;
    geometry: {
      type: string;
      coordinates: any;
    };
    properties: any;
  } | number[][][]; // Allow direct polygon coordinates array
  size?: string;
  sizeUnit?: string;
  area?: number;
  type?: string;
  assetType?: AssetType;
  address?: string;
  imageUrl?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  userId: string;
}

export interface AssetFilter {
  assetType?: string;
  searchTerm?: string;
}

export interface GeoJSONGeometry {
  type: string;
  coordinates: number[][][] | number[][]; // For polygons or other geometry types
}

export interface GeoJSONFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: any;
  };
  properties?: any;
}

export interface GeoJSONCollection {
  type: string;
  features: GeoJSONFeature[];
}

