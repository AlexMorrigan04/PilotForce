import React, { useState, useRef, useEffect } from 'react';
import mapboxgl from "mapbox-gl";
import 'mapbox-gl/dist/mapbox-gl.css';
// Update import statement to use named exports
import Map, { Marker, Popup } from 'react-map-gl';
import * as GeoTIFF from 'geotiff';
import AWS from 'aws-sdk';
import { fromArrayBuffer } from 'geotiff';

interface GeoTiffUploaderProps {
  mapboxAccessToken: string;
  bookingId?: string; // Add optional bookingId prop
}

// Interface for image location data
interface ImageLocation {
  latitude: number;
  longitude: number;
  name?: string;
}

export const GeoTiffUploader: React.FC<GeoTiffUploaderProps> = ({ mapboxAccessToken, bookingId }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [geoTiffFile, setGeoTiffFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layerId, setLayerId] = useState<string | null>(null);
  const [mapIsLoaded, setMapIsLoaded] = useState(false);
  const [imageLocations, setImageLocations] = useState<ImageLocation[]>([]);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [showPopup, setShowPopup] = useState<{[key: string]: boolean}>({});
  const [viewState, setViewState] = useState({
    longitude: -1.1743,
    latitude: 52.3555,
    zoom: 10
  });
  
  // Add state for S3 upload status
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Initialize map with react-map-gl approach
  const handleMapLoad = (event: any) => {
    const map = event.target;
    mapRef.current = map;
    setMapIsLoaded(true);
    console.log('Map style has loaded');
  };
  
  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setGeoTiffFile(event.target.files[0]);
      setError(null);
    }
  };
  
  // Extract image locations from GeoTIFF metadata
  const extractImageLocations = async (image: GeoTIFF.GeoTIFFImage): Promise<ImageLocation[]> => {
    const locations: ImageLocation[] = [];
    
    try {
      // Try to get EXIF GPS data from the GeoTIFF
      const fileDirectory = image.getFileDirectory();
      console.log('Checking file directory for GPS info:', fileDirectory);
      
      // Check for standard EXIF GPS tags
      if (fileDirectory.GeoAsciiParams) {
        console.log('Found GeoAsciiParams:', fileDirectory.GeoAsciiParams);
      }
      
      // Try to get GeoKeys which might contain projection info
      try {
        const geoKeys = image.getGeoKeys();
        console.log('GeoKeys:', geoKeys);
      } catch (err) {
        console.log('No GeoKeys available');
      }

      // Check for embedded XMP metadata which might contain camera locations
      if (fileDirectory.ImageDescription) {
        console.log('Image description:', fileDirectory.ImageDescription);
        
        // Some software stores GPS in image description as XML
        try {
          if (fileDirectory.ImageDescription.includes('<x:xmpmeta')) {
            // Parse XMP data - simplified example
            const xmpMatch = fileDirectory.ImageDescription.match(/<drone-dji:GpsLatitude>(.*?)<\/drone-dji:GpsLatitude>.*?<drone-dji:GpsLongitude>(.*?)<\/drone-dji:GpsLongitude>/s);
            if (xmpMatch && xmpMatch.length >= 3) {
              const lat = parseFloat(xmpMatch[1]);
              const lng = parseFloat(xmpMatch[2]);
              if (!isNaN(lat) && !isNaN(lng)) {
                locations.push({ latitude: lat, longitude: lng, name: 'Camera Position' });
              }
            }
          }
        } catch (err) {
          console.error('Error parsing XMP data:', err);
        }
      }
      
      // If we found no locations but have a valid bounding box, use the corners as example points
      if (locations.length === 0) {
        const bbox = image.getBoundingBox();
        console.log('Using bounding box for sample points:', bbox);
        
        // Center point
        const centerLng = (bbox[0] + bbox[2]) / 2;
        const centerLat = (bbox[1] + bbox[3]) / 2;
        locations.push({ latitude: centerLat, longitude: centerLng, name: 'Center Point' });
        
        // Corners (if they appear to be valid coordinates)
        if (Math.abs(bbox[0]) <= 180 && Math.abs(bbox[1]) <= 90) {
          locations.push({ 
            latitude: bbox[1], longitude: bbox[0], 
            name: 'Southwest Corner' 
          });
        }
        
        if (Math.abs(bbox[2]) <= 180 && Math.abs(bbox[3]) <= 90) {
          locations.push({ 
            latitude: bbox[3], longitude: bbox[2], 
            name: 'Northeast Corner' 
          });
        }
      }
    } catch (err) {
      console.error('Error extracting image locations:', err);
    }
    
    return locations;
  };
  
  // New function to upload to S3 after processing
  const uploadToS3 = async (file: File, canvas: HTMLCanvasElement) => {
    if (!bookingId) return; // Only upload if bookingId is provided
    
    setIsUploading(true);
    setUploadProgress(0);
    
    // Replace hardcoded AWS credentials with environment variables
    const awsRegion = process.env.REACT_APP_AWS_REGION;
    const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
    const secretKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;

    try {
      // Configure AWS SDK for S3 upload
      const s3 = new AWS.S3({
        region: awsRegion,
        accessKeyId: accessKey,
        secretAccessKey: secretKey
      });
      
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob as Blob);
        }, 'image/tiff');
      });
      
      // Upload to S3
      const s3Key = `uploads/${bookingId}/geotiff_${Date.now()}.tiff`;
      
      const upload = s3.upload({
        Bucket: 'drone-images-bucket',
        Key: s3Key,
        Body: blob,
        ContentType: 'image/tiff'
      });
      
      // Add progress tracking
      upload.on('httpUploadProgress', (progress) => {
        const percentage = Math.round((progress.loaded / progress.total) * 100);
        setUploadProgress(percentage);
      });
      
      // Complete the upload
      await upload.promise();
      setUploadSuccess(true);
      console.log('GeoTIFF uploaded successfully to S3');
      
    } catch (err) {
      console.error('Error uploading to S3:', err);
      setError(`Error uploading to S3: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  // Process and display GeoTIFF
  const handleUpload = async () => {
    if (!geoTiffFile || !mapRef.current) {
      setError('Please select a GeoTIFF file first.');
      return;
    }
    
    if (!mapIsLoaded) {
      setError('Map is still loading. Please wait a moment and try again.');
      return;
    }
    
    try {
      setIsLoading(true);
      setImageLocations([]);
      console.log('File size:', geoTiffFile.size, 'bytes');
      console.log('File type:', geoTiffFile.type);
      
      // Read file as ArrayBuffer
      const arrayBuffer = await geoTiffFile.arrayBuffer();
      console.log('ArrayBuffer size:', arrayBuffer.byteLength);
      
      const tiff = await fromArrayBuffer(arrayBuffer);
      console.log('GeoTIFF loaded:', tiff);
      
      const imageCount = await tiff.getImageCount();
      console.log('Number of images in GeoTIFF:', imageCount);
      
      const image = await tiff.getImage(0);
      console.log('GeoTIFF first image:', image);
      
      // Extract image locations from GeoTIFF metadata
      const locations = await extractImageLocations(image);
      setImageLocations(locations);
      console.log('Extracted image locations:', locations);
      
      const bbox = image.getBoundingBox();
      console.log('Bounding box:', bbox);
      
      // Get GeoTIFF metadata
      const width = image.getWidth();
      const height = image.getHeight();
      console.log('Dimensions:', width, 'x', height);
      
      try {
        const samplesPerPixel = image.getSamplesPerPixel();
        console.log('Samples per pixel:', samplesPerPixel);
      } catch (spErr) {
        console.error('Error getting samples per pixel:', spErr);
      }
      
      // Check if the raster data is as expected
      const rasters = await image.readRasters() as GeoTIFF.TypedArray[];
      console.log('Number of raster bands:', rasters.length);
      
      if (rasters.length > 0) {
        console.log('First band data type:', rasters[0].constructor.name);
        console.log('First band length:', rasters[0].length);
        console.log('First band sample values:', 
          Array.from(rasters[0].slice(0, 10)).map(v => v.toString()).join(', '));
      }
      
      // Create canvas to hold the image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Create ImageData from raster data
      const imageData = ctx.createImageData(width, height);
      
      // Assuming RGB or RGBA data
      const numBands = rasters.length;
      console.log('Processing image with', numBands, 'bands');
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = y * width + x;
          const index = i * 4;
          
          if (numBands >= 3) { // RGB or RGBA
            imageData.data[index] = rasters[0][i]; // R
            imageData.data[index + 1] = rasters[1][i]; // G
            imageData.data[index + 2] = rasters[2][i]; // B
            imageData.data[index + 3] = numBands === 4 ? rasters[3][i] : 255; // A
          } else { // Grayscale
            const val = rasters[0][i];
            imageData.data[index] = val; // R
            imageData.data[index + 1] = val; // G
            imageData.data[index + 2] = val; // B
            imageData.data[index + 3] = 255; // A
          }
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // Convert canvas to a data URL
      const imageUrl = canvas.toDataURL();
      console.log('Canvas data URL length:', imageUrl.length);
      
      // Upload to S3 if bookingId is provided
      if (bookingId) {
        await uploadToS3(geoTiffFile, canvas);
      }
      
      // Remove previous layer if exists
      if (layerId && mapRef.current.getLayer(layerId)) {
        mapRef.current.removeLayer(layerId);
        mapRef.current.removeSource(layerId);
      }
      
      // Create a new unique ID
      const newLayerId = `geotiff-layer-${Date.now()}`;
      setLayerId(newLayerId);
      
      console.log('Adding image to map with coordinates:', [
        [bbox[0], bbox[3]], // top left [lng, lat]
        [bbox[2], bbox[3]], // top right [lng, lat]
        [bbox[2], bbox[1]], // bottom right [lng, lat]
        [bbox[0], bbox[1]]  // bottom left [lng, lat]
      ]);
      
      // Add image to map
      mapRef.current.addSource(newLayerId, {
        type: 'image',
        url: imageUrl,
        coordinates: [
          [bbox[0], bbox[3]], // top left [lng, lat]
          [bbox[2], bbox[3]], // top right [lng, lat]
          [bbox[2], bbox[1]], // bottom right [lng, lat]
          [bbox[0], bbox[1]]  // bottom left [lng, lat]
        ]
      });
      
      mapRef.current.addLayer({
        id: newLayerId,
        type: 'raster',
        source: newLayerId,
        paint: {
          'raster-opacity': 0.7
        }
      });
      
      console.log('Layer added successfully, fitting map to bounds');
      
      // Fit map to GeoTIFF bounds
      if (locations.length > 0) {
        // Use the raw array format for bounds which is fully supported by fitBounds
        const minLng = Math.min(...locations.map(loc => loc.longitude));
        const minLat = Math.min(...locations.map(loc => loc.latitude));
        const maxLng = Math.max(...locations.map(loc => loc.longitude));
        const maxLat = Math.max(...locations.map(loc => loc.latitude));
        
        // Use the simpler array format that doesn't require LngLatBounds
        mapRef.current.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]], 
          { padding: 50 }
        );
      } else {
        // Fit map to GeoTIFF bounds
        mapRef.current.fitBounds([
          [bbox[0], bbox[1]], // SW
          [bbox[2], bbox[3]]  // NE
        ], { padding: 50 });
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error processing GeoTIFF:', err);
      setIsLoading(false);
      setError(`Error processing GeoTIFF: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  const handleReset = () => {
    if (mapRef.current && layerId) {
      if (mapRef.current.getLayer(layerId)) {
        mapRef.current.removeLayer(layerId);
      }
      if (mapRef.current.getSource(layerId)) {
        mapRef.current.removeSource(layerId);
      }
      setLayerId(null);
    }
    
    // Reset all state
    setImageLocations([]);
    setGeoTiffFile(null);
    setError(null);
    setShowPopup({});
  };
  
  return (
    <div className={bookingId ? "bg-white rounded-lg" : "mt-8 p-4 bg-white rounded-lg shadow"}>
      {!bookingId && <h2 className="text-xl font-bold mb-4">WebODM GeoTIFF Uploader</h2>}
      
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">
          Upload GeoTIFF Orthophoto:
          <input
            type="file"
            accept=".tif,.tiff,.geotiff"
            onChange={handleFileChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </label>
        
        <div className="mt-4 flex space-x-2">
          <button
            onClick={handleUpload}
            disabled={!geoTiffFile || isLoading || isUploading || !mapIsLoaded}
            className={`px-4 py-2 rounded ${
              !geoTiffFile || isLoading || isUploading || !mapIsLoaded
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoading ? 'Loading...' : isUploading ? `Uploading (${uploadProgress}%)` : 'Display on Map'}
          </button>
          
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Reset
          </button>
        </div>
      </div>
      
      {/* Show upload success message */}
      {uploadSuccess && (
        <div className="mb-4 p-2 bg-green-100 border border-green-400 text-green-700 rounded">
          GeoTIFF uploaded successfully! The file is now associated with this booking.
        </div>
      )}
      
      {!mapIsLoaded && (
        <div className="mb-4 p-2 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          Map is still loading, please wait...
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {imageLocations.length > 0 && (
        <div className="mb-4 p-2 bg-green-100 border border-green-400 text-green-700 rounded">
          Found {imageLocations.length} image locations in the GeoTIFF file.
        </div>
      )}
      
      {geoTiffFile && (
        <p className="mb-4 text-sm text-gray-600">
          Selected file: {geoTiffFile.name}
        </p>
      )}
      
      <div className="w-full h-96 rounded border border-gray-300">
        <Map
          {...viewState}
          onMove={(evt: any) => setViewState(evt.viewState)}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/satellite-v9"
          mapboxAccessToken={mapboxAccessToken}
          onLoad={handleMapLoad}
        >
          {imageLocations.map((location, index) => (
            <Marker
              key={`marker-${index}`}
              longitude={location.longitude}
              latitude={location.latitude}
            >
              <div 
                className="marker" 
                style={{
                  backgroundImage: 'url(https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png)',
                  width: '24px',
                  height: '24px',
                  backgroundSize: 'cover',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  border: '2px solid white'
                }}
                onClick={() => {
                  setShowPopup({...showPopup, [index]: !showPopup[index]});
                }}
              />
              
              {showPopup[index] && (
                <Popup
                  longitude={location.longitude}
                  latitude={location.latitude}
                  closeButton={true}
                  closeOnClick={false}
                  onClose={() => setShowPopup({...showPopup, [index]: false})}
                  anchor="bottom"
                >
                  <div>
                    <h3>{location.name || 'Image Location'}</h3>
                    <p>Coordinates: [{location.longitude.toFixed(6)}, {location.latitude.toFixed(6)}]</p>
                  </div>
                </Popup>
              )}
            </Marker>
          ))}
        </Map>
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Instructions:</p>
        <ol className="list-decimal list-inside">
          <li>Export an orthophoto as GeoTIFF from WebODM</li>
          <li>Upload the GeoTIFF file using the button above</li>
          <li>Click "Display on Map" to overlay it on the map</li>
          <li>Image locations will be displayed as markers if found in the file</li>
          <li>Click on a marker to see more details</li>
        </ol>
      </div>
    </div>
  );
};
