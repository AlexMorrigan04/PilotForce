import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set your Mapbox access token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || '';

interface MapProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    longitude: number;
    latitude: number;
    title?: string;
  }>;
}

const Map = React.forwardRef<mapboxgl.Map, MapProps>(({ 
  center = [-0.1278, 51.5074], // London as default
  zoom = 12,
  markers = []
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const markerRefs = useRef<mapboxgl.Marker[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: center,
      zoom: zoom
    });

    // If ref was provided, expose the map instance
    if (ref && 'current' in ref) {
      ref.current = mapInstance as mapboxgl.Map;
    }

    mapInstance.on('load', () => {
      setMap(mapInstance as mapboxgl.Map);
    });

    // Cleanup function with safety checks
    return () => {
      try {
        if (mapInstance) {
          mapInstance.remove();
        }
      } catch (error) {
        console.warn("Error cleaning up Mapbox instance:", error);
      }
    };
  }, []);

  // Handle markers
  useEffect(() => {
    if (!map) return;

    // Remove existing markers
    markerRefs.current.forEach(marker => marker.remove());
    markerRefs.current = [];
  }, [map]);

  // Update center and zoom when props change
  useEffect(() => {
    if (!map) return;
    map.flyTo({
      center: center,
      zoom: zoom,
      essential: true
    });
  }, [center, zoom, map]);

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-full rounded-lg shadow-sm"
      style={{ minHeight: '400px' }}
    />
  );
});

export default Map;
