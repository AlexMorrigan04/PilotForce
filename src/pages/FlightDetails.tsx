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
import { Breadcrumbs, BreadcrumbItem } from '../components/Breadcrumbs';

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
  const flightDataRef = useRef<HTMLDivElement>(null);

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

  // New function to check if flight has images/data
  const hasFlightData = () => {
    return images.length > 0 || geoTiffUrl !== null;
  };

  // New function to check booking status
  const isBookingActive = () => {
    return booking?.status === 'in-progress' || booking?.status === 'completed';
  };

  const scrollToFlightData = () => {
    flightDataRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  // Add a function to format scheduling information
  const formatSchedulingInfo = (booking: any) => {
    // If no scheduling info is available, use the flightDate
    if (!booking.scheduling) {
      return {
        label: "Scheduled Date",
        value: new Date(booking.flightDate).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      };
    }
  
    const { scheduleType } = booking.scheduling;
  
    // Handle different schedule types
    if (scheduleType === 'scheduled') {
      return {
        label: "Scheduled Date",
        value: new Date(booking.scheduling.date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      };
    } else if (scheduleType === 'flexible') {
      return {
        label: "Flexible Date",
        value: `${new Date(booking.scheduling.date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })} (±${booking.scheduling.flexibility.replace('day', 'day').replace('week', 'week')})`,
        subtext: "Based on your flexibility preferences"
      };
    } else if (scheduleType === 'repeat') {
      const frequency = booking.scheduling.repeatFrequency.charAt(0).toUpperCase() + 
                        booking.scheduling.repeatFrequency.slice(1);
      
      return {
        label: "Recurring Schedule",
        value: `${frequency}`,
        subtext: `From ${new Date(booking.scheduling.startDate).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })} to ${new Date(booking.scheduling.endDate).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })}`
      };
    }
  
    // Fallback to flight date if schedule type is not recognized
    return {
      label: "Scheduled Date",
      value: new Date(booking.flightDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    };
  };

  // Breadcrumbs configuration
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Dashboard', href: '/dashboard', current: false },
    { name: 'Flights', href: '/my-bookings', current: false },
    { name: booking?.assetName || 'Flight Details', href: `/flight-details/${bookingId}`, current: true }
  ];

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
              Back to Flights
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
              Back to Flights
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
              Back to Flights
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
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Flight Details</h1>
            <p className="text-gray-600">Viewing details for booking {booking.BookingId || booking.id}</p>
          </div>
          <button
            onClick={() => navigate('/my-bookings')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Flights
          </button>
        </div>

        {/* Add breadcrumbs */}
        <Breadcrumbs items={breadcrumbs} className="mb-6" />
        
        {/* Booking Overview Card - Moved to top for better hierarchy */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-50 p-3 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{booking.assetName || "Flight Booking"}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {Array.isArray(booking.jobTypes) && booking.jobTypes.length > 0
                      ? booking.jobTypes.join(', ') 
                      : booking.jobType || booking.serviceType || 'Not specified'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                  {getStatusText(booking.status)}
                </span>
                {booking.status === 'pending' && (
                  <p className="text-xs text-gray-500 mt-1">Awaiting confirmation</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-3 border-t border-gray-200">
              {/* Replace original fixed scheduled date cell with dynamic scheduling info */}
              <div className="px-6 py-4 border-r border-gray-200">
                {booking && (
                  <>
                    <p className="text-xs text-gray-500 uppercase font-medium">{formatSchedulingInfo(booking).label}</p>
                    <p className="mt-1 text-sm font-medium">{formatSchedulingInfo(booking).value}</p>
                    {formatSchedulingInfo(booking).subtext && (
                      <p className="text-xs text-gray-500">{formatSchedulingInfo(booking).subtext}</p>
                    )}
                  </>
                )}
              </div>
              
              <div className="px-6 py-4 border-r border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-medium">Site Contact</p>
                <p className="mt-1 text-sm font-medium">
                  {booking.siteContact?.name || booking.contactPerson || "Not specified"}
                </p>
              </div>
              
              <div className="px-6 py-4">
                <p className="text-xs text-gray-500 uppercase font-medium">Request Date</p>
                <p className="mt-1 text-sm font-medium">{booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                }) : "Unknown"}</p>
              </div>
            </div>
            
            {/* Action Buttons - Moved here from bottom of details section */}
            {(booking.status === 'scheduled' || booking.status === 'pending') && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex space-x-3">
                  <button className="flex-1 bg-red-50 py-2 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 hover:bg-red-100 flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2 2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {booking.status === 'completed' && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button 
                  onClick={scrollToFlightData}
                  className="w-full bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  View Data
                </button>
              </div>
            )}
            {booking.status === 'in-progress' && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button 
                  onClick={scrollToFlightData}
                  className="w-full bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Track Progress
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Two-column layout for flight details and map */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column (2/3 width) - Detailed Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Flight Details</h3>
              </div>
              
              <div className="divide-y divide-gray-200">
                {/* Service Details - Now supports multiple services */}
                <div className="px-6 py-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Services Booked
                  </h4>
                  {/* Display multiple job types */}
                  {Array.isArray(booking.jobTypes) && booking.jobTypes.length > 0 ? (
                    <div className="space-y-3">
                      {booking.jobTypes.map((jobType: string, index: number) => (
                        <div key={index} className={index !== booking.jobTypes.length - 1 ? "pb-3 border-b border-gray-100" : ""}>
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                            </div>
                            <p className="ml-3 text-sm font-medium text-gray-700">{jobType}</p>
                          </div>
                          
                          {/* Show service options if available */}
                          {booking.serviceOptions && booking.serviceOptions[jobType] && (
                            <div className="mt-2 ml-8 pl-3 border-l-2 border-blue-100">
                              {Object.entries(booking.serviceOptions[jobType]).map(([optKey, optValue]) => (
                                <div key={optKey} className="text-xs text-gray-600 mt-1">
                                  <span className="font-medium">{optKey.charAt(0).toUpperCase() + optKey.slice(1)}:</span>{' '}
                                  {Array.isArray(optValue) 
                                    ? (optValue as string[]).join(', ') 
                                    : optValue as string}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded p-3 text-sm text-gray-500 italic">
                      No detailed service information available
                    </div>
                  )}
                </div>
                
                {/* Contact Information - Now uses siteContact properly */}
                <div className="px-6 py-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Contact Information
                  </h4>
                  {(booking.siteContact || booking.contactPerson || booking.contactPhone || booking.siteContactNumber) ? (
                    <div className="bg-white rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Contact Person</p>
                          <p className="text-sm font-medium">
                            {booking.siteContact?.name || booking.contactPerson || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="text-sm font-medium">
                            {booking.siteContact?.phone || booking.contactPhone || booking.siteContactNumber || "Not specified"}
                          </p>
                        </div>
                        {(booking.siteContact?.email || booking.contactEmail) && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="text-sm font-medium">{booking.siteContact?.email || booking.contactEmail}</p>
                          </div>
                        )}
                        {booking.siteContact?.isAvailableOnsite && (
                          <div className="col-span-2 mt-1">
                            <p className="text-xs flex items-center text-green-600">
                              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Contact will be available on-site
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded p-3 text-sm text-gray-500 italic">
                      No contact information provided
                    </div>
                  )}
                </div>
                
                {/* Add Schedule Details Section - New section to display detailed scheduling info */}
                {booking && booking.scheduling && (
                  <div className="px-6 py-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Schedule Details
                    </h4>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {booking.scheduling.scheduleType === 'scheduled' && 'Specific Date'}
                            {booking.scheduling.scheduleType === 'flexible' && 'Flexible Date'}
                            {booking.scheduling.scheduleType === 'repeat' && 'Recurring Schedule'}
                          </p>
                          
                          {booking.scheduling.scheduleType === 'scheduled' && (
                            <p className="text-sm text-gray-600 mt-1">
                              Scheduled for {new Date(booking.scheduling.date).toLocaleDateString('en-GB', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                          )}
                          
                          {booking.scheduling.scheduleType === 'flexible' && (
                            <>
                              <p className="text-sm text-gray-600 mt-1">
                                Preferred date: {new Date(booking.scheduling.date).toLocaleDateString('en-GB', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                Flexibility: {booking.scheduling.flexibility === 'exact' ? 'Exact date' : 
                                  booking.scheduling.flexibility === '1-day' ? '±1 Day' :
                                  booking.scheduling.flexibility === '3-days' ? '±3 Days' :
                                  booking.scheduling.flexibility === '1-week' ? '±1 Week' : 
                                  booking.scheduling.flexibility}
                              </p>
                            </>
                          )}
                          
                          {booking.scheduling.scheduleType === 'repeat' && (
                            <>
                              <p className="text-sm text-gray-600 mt-1">
                                Frequency: {booking.scheduling.repeatFrequency.charAt(0).toUpperCase() + booking.scheduling.repeatFrequency.slice(1)}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                Start date: {new Date(booking.scheduling.startDate).toLocaleDateString('en-GB', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                End date: {new Date(booking.scheduling.endDate).toLocaleDateString('en-GB', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Notes - Only show section if notes exist */}
                {booking.notes ? (
                  <div className="px-6 py-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Additional Notes
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm whitespace-pre-line">{booking.notes}</p>
                    </div>
                  </div>
                ) : null}
                
                {/* Asset Information (if available) */}
                {asset && (
                  <div className="px-6 py-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Asset Information
                    </h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Name</p>
                        <p className="text-sm font-medium">{asset.name || asset.Name || "Unnamed Asset"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Type</p>
                        <p className="text-sm font-medium capitalize">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {asset.type || asset.AssetType || "Unknown"}
                          </span>
                        </p>
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
                )}
              </div>
            </div>
          </div>
          
          {/* Right Column (1/3 width) - Map - Modified to be full height */}
          <div className="h-full flex flex-col">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Location
                </h3>
              </div>
              
              {/* Map container that fills available space */}
              <div className="flex-grow relative min-h-[400px]">
                <Map
                  {...viewState}
                  onMove={(evt: any) => setViewState(evt.viewState)}
                  style={{ 
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0
                  }}
                  mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
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

                  {/* Add navigation controls */}
                  {/* <NavigationControl position="top-right" /> */}
                </Map>
              </div>
              
              <div className="px-4 py-3 text-center bg-gray-50 text-xs text-gray-500 border-t border-gray-200">
                {asset 
                  ? `${asset.name || asset.Name || "Asset"} location` 
                  : "Approximate flight location"}
              </div>
            </div>
          </div>
        </div>
        
        {/* Images and Maps Section - Modified height for better image display */}
        <div 
          ref={flightDataRef} 
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6"
        >
          <div className="border-b border-gray-200">
            <div className="px-6 py-4 flex justify-between items-center">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">Flight Data</h3>
                <p className="text-sm text-gray-500 mt-1">View captured images and flight path</p>
              </div>
              
              {isBookingActive() && (
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
                    Image Gallery
                    {images.length > 0 && (
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {images.length}
                      </span>
                    )}
                  </button>
                </div>
              )}
              
              {isBookingActive() && images.length > 0 && (
                <button
                  onClick={downloadAllFiles}
                  disabled={isDownloading || images.length === 0}
                  className="inline-flex items-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDownloading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {downloadProgress}%
                    </>
                  ) : (
                    <>
                      <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download All Files
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          
          <div className="p-0">
            {/* Status-based content */}
            {!isBookingActive() ? (
              // For pending or scheduled bookings
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="bg-blue-50 rounded-full p-4 mb-4">
                  <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Flight Not Yet Completed</h3>
                <p className="text-base text-gray-600 max-w-md">
                  {booking.status === 'pending' 
                    ? "This booking is awaiting confirmation. Once confirmed, we'll schedule the flight date."
                    : `This flight is scheduled for ${new Date(booking.flightDate).toLocaleDateString()}. Images and data will be available after the flight is completed.`
                  }
                </p>
                <div className="mt-6">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                    {getStatusText(booking.status)}
                  </span>
                </div>
              </div>
            ) : hasFlightData() ? (
              // For completed bookings with data
              <>
                {activeTab === 'imageMap' && (
                  <div className="h-[700px]">
                    <ImageMap 
                      imageLocations={imageLocations} 
                      bookingId={booking.id || booking.BookingId}
                      mapboxAccessToken={MAPBOX_ACCESS_TOKEN || ''}
                      geoTiffFilename={geoTiffFilename}
                      geoTiffUrl={geoTiffUrl}
                      onMapLoad={handleImageMapLoad}
                      mapRef={imageMapRef}
                    />
                    {imageLocations.length === 0 && !geoTiffUrl && (
                      <div className="bg-yellow-50 p-4 rounded-md m-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                              No geotagged images available for map display.
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
                      <>
                        {images.length > 0 ? (
                          <div className="max-h-[700px] overflow-y-auto custom-scrollbar pr-2">
                            <BookingImageGallery 
                              images={images} 
                              isLoading={isLoadingImages} 
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                            <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">No Images Available</h3>
                            <p className="text-gray-500">No images have been uploaded for this flight yet.</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              // For completed bookings without data
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Flight Data Available</h3>
                <p className="text-base text-gray-600 max-w-md mb-6">
                  {booking.status === 'completed' 
                    ? "This flight has been completed, but no images or data have been uploaded yet."
                    : "Images and data will be available after the flight is completed and processed."
                  }
                </p>
                <div className="p-2 bg-blue-50 rounded-lg text-sm text-blue-800">
                  <span className="font-medium">Status:</span> {getStatusText(booking.status)}
                </div>
              </div>
            )}
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
      maxZoom: 20
    });

  } catch (error) {
    console.error('Error fitting map to asset:', error);
  }
}
export default FlightDetails;

