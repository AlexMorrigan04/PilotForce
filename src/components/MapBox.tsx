import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

interface MapBoxProps {
  assets: any[];
  selectedAsset: any;
  setSelectedAsset: (asset: any) => void;
  height?: string;
}

const MapBox: React.FC<MapBoxProps> = ({ assets, selectedAsset, setSelectedAsset, height = '100%' }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || '';

    try {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [-2.587910, 51.454514],
        zoom: 12
      });

      mapRef.current = map as mapboxgl.Map;

      map.on('load', () => {
        map.addControl(new mapboxgl.NavigationControl());
        if (assets.length > 0) {
          loadAssetsOnMap(map as mapboxgl.Map);
        }
      });

      return () => {
        // Clean up markers first
        Object.values(markersRef.current).forEach(marker => {
          try {
            marker.remove();
          } catch (e) {
            console.warn('Error removing marker:', e);
          }
        });
        markersRef.current = {};
        
        // Then safely remove the map
        if (mapRef.current) {
          try {
            if (mapRef.current._removed !== true) {
              mapRef.current.remove();
            }
          } catch (e) {
            console.warn('Error during map cleanup:', e);
          }
          mapRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      return () => {};
    }
  }, []);

  const loadAssetsOnMap = (map: mapboxgl.Map) => {
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    if (map.getLayer('asset-fills')) map.removeLayer('asset-fills');
    if (map.getLayer('asset-outlines')) map.removeLayer('asset-outlines');
    if (map.getLayer('selected-asset')) map.removeLayer('selected-asset');
    if (map.getLayer('selected-asset-fill')) map.removeLayer('selected-asset-fill');
    if (map.getSource('assets')) map.removeSource('assets');
    if (map.getSource('selected')) map.removeSource('selected');

    if (assets.length === 0) return;

    const assetFeatures = assets
      .filter(asset => asset.coordinates && asset.coordinates.length > 0)
      .map(asset => ({
        type: "Feature" as const,
        properties: {
          id: asset.id,
          name: asset.name,
        },
        geometry: {
          type: 'Polygon' as 'Polygon',
          coordinates: asset.coordinates,
        },
      }));

    if (assetFeatures.length === 0) return;

    map.addSource('assets', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: assetFeatures,
      },
    });

    map.addLayer({
      id: 'asset-fills',
      type: 'fill',
      source: 'assets',
      paint: {
        'fill-color': '#3182ce',
        'fill-opacity': 0.4,
      },
    });

    map.addLayer({
      id: 'asset-outlines',
      type: 'line',
      source: 'assets',
      paint: {
        'line-color': '#2c5282',
        'line-width': 2,
      },
    });

    const bounds = calculateBounds(assetFeatures.map(feature => feature.geometry.coordinates));
    map.fitBounds(bounds as [[number, number], [number, number]], {
      padding: 40,
      maxZoom: 15,
    });

    map.on('click', 'asset-fills', (e) => {
      if (!e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const assetId = feature.properties?.id;
      const clickedAsset = assets.find(asset => asset.id === assetId);
      
      if (clickedAsset) {
        setSelectedAsset(clickedAsset);
      }
    });

    map.on('mouseenter', 'asset-fills', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    
    map.on('mouseleave', 'asset-fills', () => {
      map.getCanvas().style.cursor = '';
    });
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded()) return;

    loadAssetsOnMap(map);
  }, [assets]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded()) return;

    if (map.getLayer('selected-asset-fill')) map.removeLayer('selected-asset-fill');
    if (map.getLayer('selected-asset')) map.removeLayer('selected-asset');
    if (map.getSource('selected')) map.removeSource('selected');

    if (selectedAsset && selectedAsset.coordinates) {
      map.addSource('selected', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: selectedAsset.coordinates,
          },
        },
      });

      map.addLayer({
        id: 'selected-asset',
        type: 'line',
        source: 'selected',
        paint: {
          'line-color': '#e53e3e',
          'line-width': 3,
          'line-dasharray': [2, 1]
        },
      });

      map.addLayer({
        id: 'selected-asset-fill',
        type: 'fill',
        source: 'selected',
        paint: {
          'fill-color': '#e53e3e',
          'fill-opacity': 0.2,
        },
      });
      
      // Fly to the selected asset
      if (selectedAsset.coordinates && selectedAsset.coordinates.length > 0) {
        const bounds = calculateBounds([selectedAsset.coordinates]);
        map.fitBounds(bounds as [[number, number], [number, number]], {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 16,
          duration: 1000
        });
      }
    }
  }, [selectedAsset]);

  const calculateBounds = (coordinates: [number, number][][]) => {
    if (!coordinates || !coordinates[0] || !coordinates[0][0]) {
      // Default to UK bounds if no coordinates
      return [[-8.0, 49.0], [2.0, 59.0]];
    }
    
    let minX = coordinates[0][0][0];
    let minY = coordinates[0][0][1];
    let maxX = coordinates[0][0][0];
    let maxY = coordinates[0][0][1];
    
    coordinates.forEach(coordSet => {
      coordSet.forEach(coord => {
        if (coord[0] < minX) minX = coord[0];
        if (coord[1] < minY) minY = coord[1];
        if (coord[0] > maxX) maxX = coord[0];
        if (coord[1] > maxY) maxY = coord[1];
      });
    });
    
    return [[minX, minY], [maxX, maxY]];
  };

  return (
    <div 
      ref={mapContainerRef} 
      className="rounded-md overflow-hidden"
      style={{ height: height, width: "100%" }}
    >
      {/* Loading indicator that shows only while map is initializing */}
      {(!mapRef.current || !assets.length) && (
        <div className="absolute inset-0 flex justify-center items-center bg-gray-100 bg-opacity-50">
          <p className="text-gray-500">Loading map...</p>
        </div>
      )}
    </div>
  );
};

export default MapBox;
