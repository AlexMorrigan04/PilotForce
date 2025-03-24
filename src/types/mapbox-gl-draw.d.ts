declare module '@mapbox/mapbox-gl-draw' {
  class MapboxDraw {
    constructor(options?: {
      displayControlsDefault?: boolean;
      controls?: {
        point?: boolean;
        line_string?: boolean;
        polygon?: boolean;
        trash?: boolean;
        combine_features?: boolean;
        uncombine_features?: boolean;
      };
    });
    
    add(geojson: any): string[];
    get(featureId: string): any;
    getAll(): { features: any[] };
    delete(featureIds: string[]): void;
    deleteAll(): void;
    changeMode(mode: string, options?: any): void;
    modes: any;
  }

  export default MapboxDraw;
}
