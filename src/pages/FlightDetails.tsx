import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AWS from 'aws-sdk';
import { Navbar } from '../components/Navbar';
import { BookingImageGallery } from '../components/bookings/BookingImageGallery';
import { ImageMap } from '../components/bookings/ImageMap';
import Map, { Source, Layer, Marker, NavigationControl } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf';
import MapboxLogger from '../utils/mapboxLogger';

const FlightDetails: React.FC = () => {
  const params = useParams();
  const { bookingId } = params;
  const navigate = useNavigate();
  
  const [booking, setBooking] = useState<any>(null);
  const [asset, setAsset] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [imageLocations, setImageLocations] = useState<{ url: string; latitude: number; longitude: number }[]>([]);
  const [geoTiffFilename, setGeoTiffFilename] = useState<string | null>(null);
  const [geoTiffUrl, setGeoTiffUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'images' | 'imageMap'>('imageMap');
  const [isLoadingImages, setIsLoadingImages] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewState, setViewState] = useState({
    longitude: -2.587910,
    latitude: 51.454514,
    zoom: 12
  });
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [assetMapLoaded, setAssetMapLoaded] = useState<boolean>(false);
  const [imageMapLoaded, setImageMapLoaded] = useState<boolean>(false);
  const [geoTiffLoaded, setGeoTiffLoaded] = useState<boolean>(false);
  const [geoTiffError, setGeoTiffError] = useState<string | null>(null);
  const assetMapRef = useRef<any>(null);
  const imageMapRef = useRef<any>(null);

  // AWS configuration
  const awsRegion = process.env.REACT_APP_AWS_REGION;
  const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
  const secretKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;

  // Mapbox access token
  const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

  AWS.config.update({
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    region: awsRegion
  });

  const dynamoDb = new AWS.DynamoDB.DocumentClient({ 
    region: awsRegion,
    accessKeyId: accessKey,
    secretAccessKey: secretKey
  });

  // Create S3 instance
  const s3 = new AWS.S3({
    region: awsRegion,
    accessKeyId: accessKey,
    secretAccessKey: secretKey
  });

  // Define the asset type colors and icons for display like in AssetDetails
  const assetTypeDetails: Record<string, { color: string, strokeColor: string }> = {
    buildings: {
      color: '#3182ce',
      strokeColor: '#2c5282'
    },
    construction: {
      color: '#dd6b20',
      strokeColor: '#9c4221'
    },
    area: {
      color: '#38a169',
      strokeColor: '#276749'
    },
    security: {
      color: '#805ad5',
      strokeColor: '#553c9a'
    },
    infrastructure: {
      color: '#e53e3e',
      strokeColor: '#c53030'
    }
  };

  // Get asset type coloring
  const getAssetTypeColor = (type: string) => {
    return assetTypeDetails[type] || { color: '#3182ce', strokeColor: '#2c5282' };
  };
  
  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!bookingId) {
        setError("Booking ID is missing. Please check the URL and try again.");
        setIsLoading(false);
        return;
      }

      try {
        // Try a scan operation to be more flexible with the ID
        const scanParams = {
          TableName: 'Bookings',
          FilterExpression: 'BookingId = :bid OR id = :bid',
          ExpressionAttributeValues: {
            ':bid': bookingId
          }
        };
        
        const scanData = await dynamoDb.scan(scanParams).promise();
        
        if (scanData.Items && scanData.Items.length > 0) {
          const item = scanData.Items[0];
          setBooking(item);
          console.log("Booking details:", item); // Log booking details
          
          // Log the AssetId
          const assetId = item.AssetId || item.assetId;
          console.log("AssetId:", assetId);
          
          // Update map view if location is available
          if (item.location) {
            try {
              // Try to parse location as "lat, lng" string
              const [lat, lng]: [number, number] = item.location.split(',').map((coord: string) => parseFloat(coord.trim()));
              if (!isNaN(lat) && !isNaN(lng)) {
                setViewState({
                  latitude: lat,
                  longitude: lng,
                  zoom: 14
                });
              }
            } catch (e) {
              console.error('Error parsing location:', e);
            }
          }
          
          // Fetch asset details if we have an AssetId
          if (assetId) {
            try {
              // First try to scan for asset since the key schema might not match exactly
              const assetScanParams = {
                TableName: 'Assets',
                FilterExpression: 'AssetId = :aid OR id = :aid',
                ExpressionAttributeValues: {
                  ':aid': assetId
                }
              };
              
              const assetScanData = await dynamoDb.scan(assetScanParams).promise();
              
              if (assetScanData.Items && assetScanData.Items.length > 0) {
                const assetItem = assetScanData.Items[0];
                setAsset(assetItem);
                console.log("Asset details:", assetItem);
                console.log("Asset coordinates:", assetItem.coordinates);
                
                // Calculate center from coordinates if available
                if (assetItem.coordinates && assetItem.coordinates.length > 0) {
                  try {
                    // For polygon coordinates, use the turf centerOfMass
                    const polygon = turf.polygon(assetItem.coordinates);
                    const center = turf.centroid(polygon);
                    const centerPoint = center.geometry.coordinates;
                    console.log("Center point:", centerPoint);
                    
                    // Set a more zoomed-in view to focus better on the asset
                    setViewState({
                      latitude: centerPoint[1],
                      longitude: centerPoint[0],
                      zoom: 16
                    });
                  } catch (e) {
                    console.error('Error calculating center point:', e);
                  }
                } else if (assetItem.centerPoint) {
                  setViewState({
                    latitude: assetItem.centerPoint[1],
                    longitude: assetItem.centerPoint[0],
                    zoom: 16
                  });
                }
              }
            } catch (assetError) {
              console.error('Error fetching asset details:', assetError);
            }
          }
        } else {
          setError("Booking not found. It may have been deleted or the ID is incorrect.");
        }
      } catch (error) {
        console.error('Error fetching booking details:', error);
        setError("Failed to load booking details. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId]);

  useEffect(() => {
    if ((activeTab === 'images' || activeTab === 'imageMap') && images.length === 0 && !imageError) {
      const loadImages = async () => {
        setIsLoadingImages(true);
        try {
          // Query the ImageUploads table to get image metadata
          const imageParams = {
            TableName: 'ImageUploads',
            FilterExpression: 'BookingId = :bookingId',
            ExpressionAttributeValues: {
              ':bookingId': bookingId
            }
          };
          
          const imageData = await dynamoDb.scan(imageParams).promise();
          
          const dbImages = imageData.Items?.map(item => ({
            url: item.s3Url,
            key: item.s3Key,
            name: item.filename || "Unknown",
            type: item.fileType || "Image",
            size: item.size || 0,
            geolocation: item.geolocation
          })) || [];
          
          setImages(dbImages);
          
        } catch (error) {
          console.error('Failed to load booking images:', error);
          setImageError('Failed to load images. Please try again later.');
        } finally {
          setIsLoadingImages(false);
        }
      };
      loadImages();
    }
  }, [activeTab, bookingId, images.length, imageError, dynamoDb]);

  useEffect(() => {
    if (activeTab === 'imageMap' && images.length > 0) {
      const fetchGeolocations = async () => {
        try {
          // Extract geolocation data from the items with valid coordinates
          const geolocations = images
            .filter(item => item.geolocation && item.geolocation.latitude && item.geolocation.longitude)
            .map(item => {
              // Parse latitude and longitude from various possible formats
              const latitude = typeof item.geolocation.latitude === 'object' 
                ? parseFloat(item.geolocation.latitude.N) 
                : parseFloat(item.geolocation.latitude);
              
              const longitude = typeof item.geolocation.longitude === 'object'
                ? parseFloat(item.geolocation.longitude.N)
                : parseFloat(item.geolocation.longitude);
              
              // Extract heading/direction information
              const heading = item.geolocation.heading 
                ? (typeof item.geolocation.heading === 'object' 
                    ? parseFloat(item.geolocation.heading.N) 
                    : parseFloat(item.geolocation.heading))
                : undefined;
                
              const altitude = item.geolocation.altitude
                ? (typeof item.geolocation.altitude === 'object'
                    ? parseFloat(item.geolocation.altitude.N)
                    : parseFloat(item.geolocation.altitude))
                : undefined;
              
              // Log the direction/heading information for each image
              console.log(`Image: ${item.name || 'Unnamed'} - Direction/Heading: ${heading !== undefined ? heading + '°' : 'Not available'}`);
              
              return {
                url: item.url,
                latitude,
                longitude,
                name: item.name || `Image ${images.indexOf(item) + 1}`,
                heading,
                altitude
              };
            });
          
          console.log("Image locations with direction data extracted from uploaded images:", geolocations);
          setImageLocations(geolocations);
        } catch (error) {
          console.error('Error fetching image geolocation data:', error);
        }
      };
      fetchGeolocations();
    }
  }, [activeTab, images]);

  useEffect(() => {
    if (activeTab === 'imageMap') {
      const fetchGeoTiffData = async () => {
        const params = {
          TableName: 'GeoTiffUploads',
          FilterExpression: 'BookingId = :bookingId',
          ExpressionAttributeValues: {
            ':bookingId': bookingId
          }
        };
        try {
          const data = await dynamoDb.scan(params).promise();
          if (data.Items && data.Items.length > 0) {
            const geoTiff = data.Items[0];
            setGeoTiffFilename(geoTiff.filename);
            
            // Create a signed URL with long expiration
            const s3Params = {
              Bucket: 'drone-images-bucket',
              Key: geoTiff.s3Key,
              Expires: 3600 // 1 hour
            };
            
            try {
              const signedUrl = s3.getSignedUrl('getObject', s3Params);
              setGeoTiffUrl(signedUrl);
              MapboxLogger.log(`GeoTIFF Filename: ${geoTiff.filename}`);
              MapboxLogger.log(`Generated signed URL for GeoTIFF: ${signedUrl.substring(0, 100)}...`);
            } catch (signedUrlError) {
              MapboxLogger.error("Error generating signed URL:", signedUrlError);
              // Fall back to the regular s3Url if available
              setGeoTiffUrl(geoTiff.s3Url);
            }
          } else {
            MapboxLogger.warn('No GeoTIFF data found for this booking');
          }
        } catch (error) {
          MapboxLogger.error('Error fetching GeoTIFF data:', error);
        }
      };
      fetchGeoTiffData();
    }
  }, [activeTab, bookingId]);

  const checkForGeoTiffFiles = async () => {
    if (!bookingId) return;
    
    try {
      const params = {
        TableName: 'GeoTiffUploads',
        FilterExpression: 'BookingId = :bookingId',
        ExpressionAttributeValues: {
          ':bookingId': bookingId
        }
      };
      
      const data = await dynamoDb.scan(params).promise();
      
      if (data.Items && data.Items.length > 0) {
        // Sort by upload date (newest first) and take the first one
        const sortedItems = data.Items.sort((a, b) => 
          new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
        );
        
        const geoTiff = sortedItems[0];
        setGeoTiffFilename(geoTiff.filename);
        
        // Generate a signed URL that's valid for 1 hour (3600 seconds)
        const s3Params = {
          Bucket: 'drone-images-bucket',
          Key: geoTiff.s3Key,
          Expires: 3600
        };
        
        const signedUrl = s3.getSignedUrl('getObject', s3Params);
        setGeoTiffUrl(signedUrl);
        
        console.log("GeoTIFF file found:", geoTiff.filename);
        console.log("Signed URL generated:", signedUrl);
      } else {
        console.log("No GeoTIFF files found for this booking");
      }
    } catch (error) {
      console.error("Error checking for GeoTiff files:", error);
    }
  };

  const handleAssetMapLoad = (event: any) => {
    console.log("Asset map loaded");
    assetMapRef.current = event.target;
    setAssetMapLoaded(true);
    
    // Fit to asset if available
    if (asset && asset.coordinates && asset.coordinates.length > 0) {
      fitMapToAsset(event.target, asset);
    }
  };

  const handleImageMapLoad = (event: any) => {
    MapboxLogger.log("Image map loaded successfully");
    imageMapRef.current = event.target;
    setImageMapLoaded(true);
    
    // Add GeoTIFF if available
    if (geoTiffUrl && !geoTiffLoaded) {
      addGeoTiffToMap();
    }
  };

  const addGeoTiffToMap = () => {
    if (!imageMapRef.current || !geoTiffUrl) {
      MapboxLogger.warn("Image map or GeoTIFF URL not available");
      return;
    }
    
    try {
      MapboxLogger.log("Adding GeoTIFF to image map:", geoTiffUrl);
      
      // Access map instance safely - we already know imageMapRef is available
      const map = imageMapRef.current;
      
      // Check if source already exists
      if (map.getSource('geotiff-source')) {
        map.removeLayer('geotiff-layer');
        map.removeSource('geotiff-source');
      }
      
      // For direct GeoTIFF loading, we need to ensure we're using a CORS-enabled endpoint
      // We'll use a simpler approach that works with most Mapbox implementations
      map.addSource('geotiff-source', {
        type: 'raster',
        url: 'mapbox://mapbox.satellite',  // First add a default source
        tileSize: 256
      });
      
      // Then update it with our GeoTIFF if possible
      try {
        // Add a layer to display the GeoTIFF
        map.addLayer({
          id: 'geotiff-layer',
          type: 'raster',
          source: 'geotiff-source',
          paint: {
            'raster-opacity': 0.8
          }
        });
        
        // If we have image locations, fit the map to them
        if (imageLocations.length > 0) {
          const bounds = new mapboxgl.LngLatBounds();
          imageLocations.forEach(location => {
            bounds.extend([location.longitude, location.latitude]);
          });
          map.fitBounds(bounds, { padding: 50 });
        }
        
        setGeoTiffLoaded(true);
        setGeoTiffError(null);
        MapboxLogger.log("GeoTIFF added successfully to image map");
      } catch (innerError) {
        MapboxLogger.error("Inner error adding GeoTIFF layer:", innerError);
        setGeoTiffError("Error adding GeoTIFF layer");
      }
      
    } catch (error) {
      MapboxLogger.error("Error adding GeoTIFF to image map:", error);
      setGeoTiffError("Failed to load GeoTIFF on map");
      setGeoTiffLoaded(false);
    }
  };

  useEffect(() => {
    if (assetMapRef.current && asset && asset.coordinates && asset.coordinates.length > 0 && assetMapLoaded) {
      try {
        fitMapToAsset(assetMapRef.current, asset);
      } catch (error) {
        console.error('Error setting asset map bounds:', error);
      }
    }
  }, [asset, assetMapLoaded]);

  useEffect(() => {
    if (imageMapLoaded && geoTiffUrl && !geoTiffLoaded && activeTab === 'imageMap') {
      addGeoTiffToMap();
    }
  }, [imageMapLoaded, geoTiffUrl, activeTab]);

  const formatDateTime = (date?: string): string => {
    if (!date) return 'Date not specified';
    return new Date(date).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  // Function to download all files from the booking folder
  const downloadAllFiles = async () => {
    if (!bookingId) return;
    
    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      
      const s3 = new AWS.S3({
        region: awsRegion,
        accessKeyId: accessKey,
        secretAccessKey: secretKey
      });
      
      // List all objects in the folder
      const s3Params = {
        Bucket: 'drone-images-bucket',
        Prefix: `uploads/${bookingId}/`
      };
      
      const s3Data = await s3.listObjectsV2(s3Params).promise();
      
      if (!s3Data.Contents || s3Data.Contents.length === 0) {
        alert('No files found in this booking folder.');
        setIsDownloading(false);
        return;
      }
      
      // Create a zip file
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Download each file and add to zip
      let completedCount = 0;
      
      await Promise.all(s3Data.Contents.map(async (item) => {
        try {
          if (!item.Key) return;
          
          const fileName = item.Key.split('/').pop() || 'unknown_file';
          
          const objectParams = {
            Bucket: 'drone-images-bucket',
            Key: item.Key
          };
          
          const data = await s3.getObject(objectParams).promise();
          
          if (data.Body) {
            zip.file(fileName, data.Body as Blob | ArrayBuffer);
          }
          
          completedCount++;
          if (s3Data.Contents) {
            setDownloadProgress(Math.round((completedCount / s3Data.Contents.length) * 100));
          }
        } catch (err) {
          console.error(`Error downloading file ${item.Key}:`, err);
        }
      }));
      
      // Generate zip file and prompt download
      const zipContent = await zip.generateAsync({ type: 'blob' });
      
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(zipContent);
      downloadLink.download = `booking_${bookingId}_files.zip`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
    } catch (error) {
      console.error('Error downloading files:', error);
      alert('Failed to download files. Please try again later.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Flight Details</h1>
            <button
              onClick={() => navigate('/my-bookings')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Bookings
            </button>
          </div>
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          </main>
        <footer className="bg-white border-t border-gray-200 py-4 px-8 mt-auto">
          <div className="container mx-auto text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} PilotForce. All rights reserved.
          </div>
        </footer>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Flight Details</h1>
            <button
              onClick={() => navigate('/my-bookings')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Bookings
            </button>
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg shadow-sm">
            <h2 className="text-xl font-medium mb-2">Error Loading Flight Details</h2>
            <p>{error}</p>
            <div className="mt-4">
              <button 
                onClick={() => window.location.reload()}
                className="bg-red-100 text-red-800 px-4 py-2 rounded-md mr-4 hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        </main>
        <footer className="bg-white border-t border-gray-200 py-4 px-8 mt-auto">
          <div className="container mx-auto text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} PilotForce. All rights reserved.
          </div>
        </footer>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Flight Details</h1>
            <button
              onClick={() => navigate('/my-bookings')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Bookings
            </button>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-6 py-4 rounded-lg shadow-sm">
            <h2 className="text-xl font-medium mb-2">Booking Not Found</h2>
            <p>The flight booking you're looking for could not be found or may have been deleted.</p>
          </div>
        </main>
        <footer className="bg-white border-t border-gray-200 py-4 px-8 mt-auto">
          <div className="container mx-auto text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} PilotForce. All rights reserved.
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Flight Details</h1>
            <p className="text-gray-600">Viewing details for booking {booking.BookingId || booking.id}</p>
          </div>
          <button
            onClick={() => navigate('/my-bookings')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Bookings
          </button>
        </div>
        
        {/* Images and Maps Section - Now at the top and larger */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="border-b border-gray-200">
            <div className="px-6 py-4 flex justify-between items-center">
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('imageMap')}
                  className={`py-3 px-2 font-medium text-base ${activeTab === 'imageMap' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Image Map
                </button>
                <button
                  onClick={() => setActiveTab('images')}
                  className={`py-3 px-2 font-medium text-base relative ${activeTab === 'images' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Flight Images
                  {images.length > 0 && (
                    <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {images.length}
                    </span>
                  )}
                </button>
              </div>
              
              <button
                onClick={downloadAllFiles}
                disabled={isDownloading || images.length === 0}
                className="inline-flex items-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {downloadProgress}%
                  </>
                ) : (
                  <>
                    <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download All Files
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="p-0">
            {activeTab === 'imageMap' && (
              <div className="h-[600px]"> {/* Larger map height */}
                <ImageMap 
                  imageLocations={imageLocations} 
                  bookingId={booking.id || booking.BookingId}
                  mapboxAccessToken={MAPBOX_ACCESS_TOKEN || ''}
                  geoTiffFilename={geoTiffFilename}
                  geoTiffUrl={geoTiffUrl}
                  onMapLoad={handleImageMapLoad}
                  mapRef={imageMapRef}
                />
                {imageLocations.length === 0 && (
                  <div className="bg-yellow-50 p-4 rounded-md m-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          No image locations available.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'images' && (
              <div className="p-6">
                {imageError ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{imageError}</span>
                    <button 
                      onClick={() => setImageError(null)}
                      className="mt-2 bg-red-100 text-red-800 px-3 py-1 rounded text-sm"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    <BookingImageGallery 
                      images={images} 
                      isLoading={isLoadingImages} 
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Booking Overview - New section for key information */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Flight Overview</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-50 p-3 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{booking.jobName || booking.assetName || "Flight Booking"}</h3>
                  <p className="text-sm text-gray-500">{booking.serviceType || booking.jobType}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                booking.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' : 
                booking.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                booking.status === 'completed' ? 'bg-green-100 text-green-800' : 
                booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                'bg-gray-100 text-gray-800'
              }`}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </span>
            </div>
            
            <div className="grid grid-cols-3 border-t border-gray-200">
              <div className="px-6 py-4 border-r border-gray-200">
                <p className="text-xs text-gray-500">SCHEDULED DATE</p>
                <p className="mt-1 text-sm font-medium">{new Date(booking.flightDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}</p>
              </div>
              
              <div className="px-6 py-4 border-r border-gray-200">
                <p className="text-xs text-gray-500">SITE CONTACT</p>
                <p className="mt-1 text-sm font-medium">{booking.contactPerson || booking.siteContact || "Not specified"}</p>
              </div>
              
              <div className="px-6 py-4">
                <p className="text-xs text-gray-500">REQUEST DATE</p>
                <p className="mt-1 text-sm font-medium">{booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                }) : "Unknown"}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Two-column layout for more details and map */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Details Section - Left Column (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Flight Details</h3>
              
              <div className="space-y-6">
                {/* Contact Information */}
                {(booking.contactPerson || booking.siteContact || booking.contactPhone || booking.siteContactNumber) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Contact Information
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Contact Person</p>
                          <p className="text-sm font-medium">{booking.contactPerson || booking.siteContact || "Not specified"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="text-sm font-medium">{booking.contactPhone || booking.siteContactNumber || "Not specified"}</p>
                        </div>
                        {booking.contactEmail && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="text-sm font-medium">{booking.contactEmail}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Notes */}
                {booking.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Flight Notes
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm whitespace-pre-line">{booking.notes}</p>
                    </div>
                  </div>
                )}
                
                {/* Asset Information (if available) */}
                {asset && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Asset Information
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Name</p>
                          <p className="text-sm font-medium">{asset.name || asset.Name || "Unnamed Asset"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Type</p>
                          <p className="text-sm font-medium capitalize">{asset.type || asset.AssetType || "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Area</p>
                          <p className="text-sm font-medium">{asset.area || asset.Area || "Unknown"} m²</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Status</p>
                          <p className="text-sm font-medium">{asset.status || "Active"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="mt-6 flex space-x-3">
                {booking.status === 'scheduled' && (
                  <>
                    <button className="flex-1 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Reschedule
                    </button>
                    <button className="flex-1 bg-red-50 py-2 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 hover:bg-red-100 flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Cancel
                    </button>
                  </>
                )}
                {booking.status === 'completed' && (
                  <button className="flex-1 bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Report
                  </button>
                )}
                {booking.status === 'in-progress' && (
                  <button className="flex-1 bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Track Progress
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Map Section - Right Column (1/3 width) */}
          <div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Location
                </h3>
                <p className="text-sm text-gray-600">Flight location map</p>
              </div>
              
              <div className="relative h-[300px]">
                <Map
                  {...viewState}
                  onMove={(evt: any) => setViewState(evt.viewState)}
                  style={{ width: '100%', height: '100%' }}
                  mapStyle="mapbox://styles/mapbox/satellite-v9"
                  mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
                  attributionControl={false}
                  onLoad={handleAssetMapLoad}
                  ref={assetMapRef}
                >
                  {asset && asset.coordinates && asset.coordinates.length > 0 && (
                    <Source
                      id="asset-polygon"
                      type="geojson"
                      data={{
                        type: 'Feature',
                        properties: {},
                        geometry: {
                          type: 'Polygon',
                          coordinates: asset.coordinates,
                        },
                      }}
                    >
                      <Layer
                        id="asset-polygon-fill"
                        type="fill"
                        paint={{
                          'fill-color': getAssetTypeColor(asset.type).color,
                          'fill-opacity': 0.4,
                        }}
                      />
                      <Layer
                        id="asset-polygon-outline"
                        type="line"
                        paint={{
                          'line-color': getAssetTypeColor(asset.type).strokeColor,
                          'line-width': 2,
                        }}
                      />
                    </Source>
                  )}
                  
                  {(!asset || !asset.coordinates || asset.coordinates.length === 0) && booking.location && (
                    <Marker 
                      longitude={viewState.longitude} 
                      latitude={viewState.latitude} 
                      anchor="bottom"
                    >
                      <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </Marker>
                  )}
                </Map>
              </div>
              
              <div className="px-4 py-3 text-center bg-gray-50 text-xs text-gray-500">
                {asset 
                  ? `${asset.name || asset.Name || "Asset"} location` 
                  : "Approximate flight location"}
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-white border-t border-gray-200 py-4 px-8 mt-auto">
        <div className="container mx-auto text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} PilotForce. All rights reserved.
        </div>
      </footer>
    </div>
  );
};


function fitMapToAsset(target: any, asset: any) {
  if (!target || !asset || !asset.coordinates || asset.coordinates.length === 0) {
    console.warn('Unable to fit map to asset: missing required data');
    return;
  }

  try {
    // Create a bounding box from the asset coordinates
    const bounds = new mapboxgl.LngLatBounds();

    // Add all coordinates to the bounds
    asset.coordinates[0].forEach((coord: [number, number]) => {
      bounds.extend(coord);
    });

    // Fit the map to the bounds with some padding
    target.fitBounds(bounds, {
      padding: 50,
      maxZoom: 18
    });

  } catch (error) {
    console.error('Error fitting map to asset:', error);
  }
}
export default FlightDetails;

