import * as L from 'leaflet';

declare module 'leaflet' {
  interface Map {
    createPane(name: string): HTMLElement;
    getPane(name: string): HTMLElement;
    _moveEnd(forceReset?: boolean): void;
  }
  
  interface MapOptions {
    renderer?: L.Renderer;
    fadeAnimation?: boolean;
    zoomAnimation?: boolean;
    markerZoomAnimation?: boolean;
    inertia?: boolean;
    dragging?: boolean;
    doubleClickZoom?: boolean;
    scrollWheelZoom?: boolean;
    keyboard?: boolean;
    boxZoom?: boolean;
    touchZoom?: boolean;
    tap?: boolean;
  }
  
  namespace Canvas {
    interface Options {
      pane?: string;
      padding?: number;
    }
  }
  
  function canvas(options?: Canvas.Options): Renderer;
  
  // Add support for GeoTIFF layer options
  namespace Layer {
    interface Options {
      keepBuffer?: number;
      updateWhenIdle?: boolean;
      updateWhenZooming?: boolean;
      noWrap?: boolean;
    }
  }
  
  // Add proper bounds interface
  interface LatLngBounds {
    isValid(): boolean;
    getSouthWest(): LatLng;
    getNorthEast(): LatLng;
    getCenter(): LatLng;
  }
}

// Declare global window property for storing GeoTIFF bounds
interface Window {
  __geoTiffBounds?: any;
}
