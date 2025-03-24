declare module 'mapbox-gl' {
  export interface MapboxGeoJSONFeature {
    id?: string | number;
    type: 'Feature';
    geometry: {
      type: string;
      coordinates: number[] | number[][] | number[][][];
    };
    properties: { [name: string]: any };
  }

  export class Map {
    constructor(options: any);
    addControl(control: any): void;
    on(event: string, callback: Function): void;
    remove(): void;
    getStyle(): any;
    setStyle(style: string): void;
    flyTo(options: { center: [number, number]; zoom: number }): void;
    loaded(): boolean;
    isStyleLoaded(): boolean;
    getCenter(): { lng: number; lat: number };
    getZoom(): number;
    addSource(id: string, source: any): void;
    addLayer(layer: any): void;
    removeLayer(id: string): void;
    removeSource(id: string): void;
    getLayer(id: string): any;
    getSource(id: string): any;
    fitBounds(bounds: [[number, number], [number, number]], options?: any): void;
    getCanvas(): { style: any };
    resize(): void;
  }

  export class LngLatBounds {
    constructor(sw?: [number, number], ne?: [number, number]);
    extend(coord: [number, number] | LngLatBounds): this;
    getCenter(): { lng: number; lat: number };
    getSouthWest(): { lng: number; lat: number };
    getNorthEast(): { lng: number; lat: number };
  }

  export class NavigationControl {}
  export class GeolocateControl {}
  export class ScaleControl {}
  export class FullscreenControl {}

  export const accessToken: string;

  export default {
    Map,
    NavigationControl,
    GeolocateControl,
    ScaleControl,
    FullscreenControl,
    LngLatBounds,
    accessToken
  };
}
