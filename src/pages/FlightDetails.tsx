import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AWS from 'aws-sdk';
import { Navbar } from '../components/Navbar';
import { BookingImageGallery, ImageProps } from '../components/bookings/BookingImageGallery';
import Map, { Source, Layer, Marker, NavigationControl } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf';
import MapboxLogger from '../utils/mapboxLogger';
import { Breadcrumbs, BreadcrumbItem } from '../components/Breadcrumbs';
import S3UrlManager from '../utils/s3UrlUtils';
import ChunkReassembler from '../utils/chunkReassembler';
import { findWorkingImageUrl } from '../utils/imageLoader';
import { tryAlternativeS3Urls } from '../utils/s3UrlUtils';
import { normalizeS3Url, isGeoTiffFile } from '../utils/geoTiffUtils';
import { downloadS3Binary } from '../utils/s3ProxyFetch';
import InvitationModal from '../components/invitations/InvitationModal';
import { useAuth } from '../context/AuthContext';

// Utility function to safely convert any value to lowercase string
const safeToLowerCase = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase();
};

// Safely check if a status matches a specific value
const isStatusEqual = (status: any, value: string): boolean => {
  if (status === null || status === undefined) return false;
  return safeToLowerCase(status) === value;
}

// Update the interface for the image structure with all possible properties
interface BookingImage {
  url?: string;
  presignedUrl?: string; 
  directUrl?: string;    
  ResourceUrl?: string;
  resourceUrl?: string;
  s3Url?: string;
  name?: string;
  key?: string;
  s3Key?: string;
  S3Path?: string;
  FileName?: string;
  type?: string;
  ContentType?: string;
  Size?: number;
  size?: number;
  uploadDate?: string;
  CreatedAt?: string;
  resourceId?: string;
  ResourceId?: string; 
  isReassembled?: boolean;
  metadata?: {
    geolocation?: {
      latitude: number | { N: string } | string;
      longitude: number | { N: string } | string;
      heading?: number | { N: string } | string;
      altitude?: number | { N: string } | string;
      direction?: number | { N: string } | string;
      timestamp?: string;
      cameraModel?: string;
      model?: string;
      droneModel?: string;
      drone?: string;
      // Add DynamoDB nested structure format
      M?: {
        latitude?: { 
          M?: { 
            N?: { 
              S?: string 
            } 
          },
          N?: string
        };
        longitude?: { 
          M?: { 
            N?: { 
              S?: string 
            } 
          },
          N?: string
        };
        heading?: { 
          M?: { 
            N?: { 
              S?: string 
            } 
          },
          N?: string
        };
        altitude?: { 
          M?: { 
            N?: { 
              S?: string 
            } 
          },
          N?: string
        };
        direction?: { 
          M?: { 
            N?: { 
              S?: string 
            } 
          },
          N?: string
        };
      };
    }
  };
  geolocation?: {
    latitude: number | { N: string } | string;
    longitude: number | { N: string } | string;
    heading?: number | { N: string } | string;
    altitude?: number | { N: string } | string;
    direction?: number | { N: string } | string;
    timestamp?: string;
    cameraModel?: string;
    model?: string;
    droneModel?: string;
    drone?: string;
    // Add DynamoDB nested structure format
    M?: {
      latitude?: { 
        M?: { 
          N?: { 
            S?: string 
          } 
        },
        N?: string
      };
      longitude?: { 
        M?: { 
          N?: { 
            S?: string 
          } 
        },
        N?: string
      };
      heading?: { 
        M?: { 
          N?: { 
            S?: string 
          } 
        },
        N?: string
      };
      altitude?: { 
        M?: { 
          N?: { 
            S?: string 
          } 
        },
        N?: string
      };
      direction?: { 
        M?: { 
          N?: { 
            S?: string 
          } 
        },
        N?: string
      };
    };
  };
  _urlSource?: string;
}

// Update the interface for image locations to match the actual structure
interface ImageLocation {
  url: string;
  latitude: number;
  longitude: number;
  name?: string;
  heading?: number;
  altitude?: number;
  timestamp?: string;
  cameraModel?: string;
  droneModel?: string;
}

// Add ResponsiveImage component to handle image loading with fallbacks
const ResponsiveImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  urls?: string[];
}> = ({ src, alt, className, urls = [] }) => {
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  
  // Try the next URL in the list if one fails
  const handleError = () => {
    // Mark current URL as failed
    setFailedUrls(prev => new Set([...prev, currentSrc]));
    
    // Find the next URL that hasn't failed yet
    const nextUrl = [src, ...(urls || [])].find(url => !failedUrls.has(url) && url !== currentSrc);
    
    if (nextUrl) {
      setCurrentSrc(nextUrl);
    } else {
    }
  };

  return (
    <img 
      src={currentSrc} 
      alt={alt} 
      className={className} 
      onError={handleError}
      loading="lazy"
    />
  );
};

// Add helper function at the top level
const getAssetTypeColor = (type: string): { color: string, strokeColor: string } => {
  const colors = {
    buildings: { color: '#3182ce', strokeColor: '#2c5282' },
    construction: { color: '#dd6b20', strokeColor: '#9c4221' },
    area: { color: '#38a169', strokeColor: '#276749' },
    security: { color: '#805ad5', strokeColor: '#553c9a' },
    agriculture: { color: '#4299e1', strokeColor: '#2b6cb0' },
    infrastructure: { color: '#e53e3e', strokeColor: '#c53030' }
  };
  return colors[type as keyof typeof colors] || { color: '#718096', strokeColor: '#4a5568' };
};

const FlightDetails: React.FC = (): JSX.Element => {
  const params = useParams();
  const bookingId = params.id || params.bookingId || localStorage.getItem('selectedBookingId');
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Add state for invitation modal
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Add state for page loading
  const [pageLoading, setPageLoading] = useState<boolean>(localStorage.getItem('isFlightDetailsLoading') === 'true');
  
  useEffect(() => {
    if (bookingId) {
      localStorage.setItem('selectedBookingId', bookingId);
    }
    
    // Clear the loading flag after a short delay to give the loading animation time to display
    if (localStorage.getItem('isFlightDetailsLoading') === 'true') {
      setTimeout(() => {
        setPageLoading(false);
        localStorage.removeItem('isFlightDetailsLoading');
      }, 1000);
    }
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) {
    }
  }, [bookingId]);

  const [booking, setBooking] = useState<any>(null);
  const [asset, setAsset] = useState<any>(null);
  const [images, setImages] = useState<BookingImage[]>([]); 
  const [imageLocations, setImageLocations] = useState<ImageLocation[]>([]);
  const [geoTiffFilename, setGeoTiffFilename] = useState<string | null>(null);
  const [geoTiffUrl, setGeoTiffUrl] = useState<string | null>(null);
  const [geoTiffResources, setGeoTiffResources] = useState<BookingImage[]>([]);
  const [activeTab, setActiveTab] = useState<'images' | 'imageMap'>('imageMap');
  const [isLoadingImages, setIsLoadingImages] = useState<boolean>(true);
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
  const [processedFlightData, setProcessedFlightData] = useState<{
    images: ImageProps[];
    imageLocations: ImageLocation[];
    processedAt: number;
  } | null>(null);
  const assetMapRef = useRef<any>(null);
  const imageMapRef = useRef<any>(null);
  const flightDataRef = useRef<HTMLDivElement>(null);
  const [refreshedUrls, setRefreshedUrls] = useState<{[key: string]: string}>({});
  const validationRun = useRef(false);
  const validatingUrls = useRef(false);
  const [isLoadingGeoTiffs, setIsLoadingGeoTiffs] = useState<boolean>(false);
  const [isGeoTiffDownloading, setIsGeoTiffDownloading] = useState<boolean>(false);
  const [geoTiffDownloadProgress, setGeoTiffDownloadProgress] = useState<number>(0);
  const [isLoadingMap, setIsLoadingMap] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);

  const awsRegion = process.env.REACT_APP_AWS_REGION;
  const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
  const secretKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;

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

  const s3 = new AWS.S3({
    region: awsRegion,
    accessKeyId: accessKey,
    secretAccessKey: secretKey
  });

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

  const getAssetTypeColor = (type: string) => {
    return assetTypeDetails[type] || { color: '#3182ce', strokeColor: '#2c5282' };
  };
  
  // Add normalizeS3Url function to fix URL encoding issues
  const normalizeS3Url = (url: string): string => {
    if (!url) return url;
    
    try {
      // For S3 presigned URLs, we need to be careful with decoding
      if (url.includes('X-Amz-')) {
        // Extract base URL and query parts
        const urlParts = url.split('?');
        const baseUrl = urlParts[0];
        const queryString = urlParts.length > 1 ? urlParts[1] : '';
        
        // Handle common URL encoded characters in the path (before query parameters)
        let decodedBaseUrl = baseUrl
          .replace(/%28/g, '(')
          .replace(/%29/g, ')')
          .replace(/%20/g, ' ')
          .replace(/%2B/g, '+')
          .replace(/%2C/g, ',')
          .replace(/%5B/g, '[')
          .replace(/%5D/g, ']');
        
        // Rebuild URL with original query parameters (leave them encoded)
        return queryString ? `${decodedBaseUrl}?${queryString}` : decodedBaseUrl;
      }
      
      if (url.includes('%')) {
        return decodeURIComponent(url);
      }
      
      return url;
    } catch (e) {
      return url;
    }
  };

  const processBookingData = (bookingData: any): void => {
    if (!bookingData) return;
    
    // Set the booking data
    setBooking(bookingData);
    
    // Process all resources from the Resources table without filtering out GeoTIFFs
    if (bookingData.images && Array.isArray(bookingData.images)) {
      
      // Filter out GeoTIFF files to handle separately
      const regularResources = bookingData.images.filter((img: any) => {
        const isGeoTiff = img.ContentType?.includes('tiff') || 
                          img.type?.includes('tiff') ||
                          (img.FileName?.toLowerCase() || '').endsWith('.tif') || 
                          (img.FileName?.toLowerCase() || '').endsWith('.tiff') ||
                          (img.name?.toLowerCase() || '').endsWith('.tif') || 
                          (img.name?.toLowerCase() || '').endsWith('.tiff');
        return !isGeoTiff;
      });
      
      // Set all regular images
      setImages(regularResources);
      
      // Extract locations from images for map display
      const locations = extractImageLocations(regularResources);
      if (locations.length > 0) {
        setImageLocations(locations);
      }

      // Process images for FlightDataView
      const processedImages = regularResources.map((img: any) => ({
        url: img.url || img.presignedUrl || img.ResourceUrl || '',
        name: img.name || img.FileName || 'Unnamed Image',
        type: img.type || img.ContentType,
        size: img.Size || img.size,
        uploadDate: img.uploadDate || img.CreatedAt,
        resourceId: img.resourceId || img.ResourceId
      }));

      // Store processed data
      setProcessedFlightData({
        images: processedImages,
        imageLocations: locations,
        processedAt: Date.now()
      });
    }
    
    // Process GeoTIFF data from the GeoTiffChunks table
    if (bookingData.geoTiff) {
      
      // Set the GeoTIFF filename and normalize the URL
      setGeoTiffFilename(bookingData.geoTiff.filename);
      
      // Normalize the URL to handle any encoding issues
      const normalizedUrl = normalizeS3Url(bookingData.geoTiff.url);
      setGeoTiffUrl(normalizedUrl);
      
      // Create a consistent resource object and add to geoTiffResources
      const geoTiffResource = {
        name: bookingData.geoTiff.filename,
        FileName: bookingData.geoTiff.filename,
        url: normalizedUrl,
        presignedUrl: normalizeS3Url(bookingData.geoTiff.presignedUrl) || normalizedUrl,
        resourceId: bookingData.geoTiff.resourceId,
        ResourceId: bookingData.geoTiff.resourceId,
        type: 'image/tiff',
        ContentType: 'image/tiff',
        key: bookingData.geoTiff.key,
        s3Key: bookingData.geoTiff.key,
        uploadDate: bookingData.geoTiff.uploadDate?.toString(),
        CreatedAt: bookingData.geoTiff.uploadDate?.toString(),
        isReassembled: Boolean(bookingData.geoTiff.isReassembled),
        size: bookingData.geoTiff.size || 0,
      };
      
      // Add to geoTiffResources state, ensuring we don't have duplicates
      setGeoTiffResources(prevResources => {
        // Check if this resource already exists
        const exists = prevResources.some(res => 
          res.resourceId === geoTiffResource.resourceId || 
          res.url === geoTiffResource.url
        );
        
        if (!exists) {
          return [geoTiffResource, ...prevResources];
        }
        return prevResources;
      });
      
      // Log additional information
      if (bookingData.geoTiff.isReassembled) {
      }
      
      if (bookingData.geoTiff.resourceId) {
      }
    }
  };

  // Add progress simulation effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (pageLoading) {
      // Reset progress when loading starts
      setLoadingProgress(0);
      
      // Simulate progress in stages
      const simulateProgress = () => {
        setLoadingProgress(current => {
          if (current >= 100) {
            return 100;
          }
          
          // Slow down progress as it gets higher
          if (current < 30) return current + 15;
          if (current < 60) return current + 10;
          if (current < 85) return current + 5;
          return current + 2;
        });
      };
      
      // Update progress every 300ms
      timer = setInterval(simulateProgress, 300);
      
      // Cleanup interval
      return () => clearInterval(timer);
    } else {
      // Quickly complete progress when loading is done
      setLoadingProgress(100);
    }
  }, [pageLoading]);

  // Update the LoadingOverlay component
  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div className="text-center w-full max-w-sm mx-auto px-4">
        <div className="relative mb-8">
          <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-white"></div>
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Loading Flight Details</h2>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 dark:bg-gray-700">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${loadingProgress}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500">
          {loadingProgress < 30 && "Fetching booking information..."}
          {loadingProgress >= 30 && loadingProgress < 60 && "Processing flight data..."}
          {loadingProgress >= 60 && loadingProgress < 85 && "Loading images and locations..."}
          {loadingProgress >= 85 && "Almost ready..."}
        </p>
      </div>
    </div>
  );

  // Update the useEffect for fetching booking details to handle loading states
  useEffect(() => {
    const fetchBookingDetails = async () => {
      setIsLoading(true);
      setIsLoadingImages(true);
      setIsLoadingMap(true);

      if (!bookingId) {
        setError("Booking ID is missing. Please check the URL and try again.");
        setIsLoading(false);
        setIsLoadingImages(false);
        setIsLoadingMap(false);
        return;
      }

      try {
        // Get API URL from environment
        const apiUrl = process.env.REACT_APP_API_ENDPOINT || '';
        const token = localStorage.getItem('idToken') || localStorage.getItem('token');
        
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Try multiple endpoint patterns
        const endpoints = [
          `${apiUrl}/bookings/${bookingId}`,
          `${apiUrl}/get-booking-details/${bookingId}`,
          `${apiUrl}/get-bookings-details/${bookingId}`
        ];

        let bookingData = null;
        let lastError = null;

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              const data = await response.json();
              if (data && (data.booking || data.BookingId || data.bookingId)) {
                bookingData = data.booking || data;
                break;
              }
            } else {
              lastError = `API request failed with status: ${response.status}`;
            }
          } catch (endpointError) {
            lastError = endpointError instanceof Error ? endpointError.message : 'Unknown error';
            continue;
          }
        }

        if (bookingData) {
          // Process and set the booking data
          setBooking(bookingData);
          setIsLoading(false);
          
          // If the booking has an asset, set it
          if (bookingData.asset) {
            setAsset(bookingData.asset);
          }
          
          // If the booking has images, process them
          if (bookingData.images && Array.isArray(bookingData.images)) {
            setImages(bookingData.images);
            const locations = extractImageLocations(bookingData.images);
            setImageLocations(locations);
            setIsLoadingImages(false);
          } else {
            setIsLoadingImages(false);
          }
          
          setError(null);
        } else {
          throw new Error(lastError || 'Failed to fetch booking details from all endpoints');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(`Failed to load booking details: ${errorMessage}`);
        setIsLoading(false);
        setIsLoadingImages(false);
        setIsLoadingMap(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId]);

  useEffect(() => {
    if (geoTiffResources.length > 0) {
      geoTiffResources.forEach((resource, index) => {
      });
    }
  }, [geoTiffResources]);

  useEffect(() => {
    if (activeTab === 'imageMap' && booking && bookingId && !geoTiffUrl) {
      // Only fetch GeoTIFF URL if we don't already have it
    }
  }, [activeTab, booking, bookingId, geoTiffUrl]);

  const extractImageLocations = (images: BookingImage[]): ImageLocation[] => {
    
    // Debug: Inspect the actual image data structure
    if (images.length > 0) {
      if (images[0].geolocation) {
      }
      
      // Check if metadata field contains geolocation
      if (images[0].metadata) {
      }
    }

    // Add utility function to extract nested DynamoDB values
    const extractNestedValue = (obj: any, key: string): any => {
      // Check if it's a simple value
      if (obj && typeof obj === 'object') {
        // Handle DynamoDB nested format: { "M": { "value": { "S": "actualValue" } } }
        if (obj.M && obj.M[key]) {
          if (obj.M[key].S) return obj.M[key].S;
          if (obj.M[key].N) return parseFloat(obj.M[key].N);
          if (obj.M[key].M) return obj.M[key].M;
        }
        // Handle nested object format for direct access
        if (obj[key]) return obj[key];
      }
      return null;
    };

    // Helper function to extract deeply nested DynamoDB values
    const extractDynamoDBGeoValue = (obj: any, prop: string): number | null => {
      if (!obj) return null;
      
      // Simple case - direct value
      if (typeof obj[prop] === 'number') return obj[prop];
      if (typeof obj[prop] === 'string') return parseFloat(obj[prop]);
      
      // Handle nested object: { N: { S: "value" } }
      if (obj[prop] && obj[prop].N && obj[prop].N.S) {
        return parseFloat(obj[prop].N.S);
      }
      
      // Handle { M: { ... } } structure
      if (obj.M) {
        // Try first level of nesting: { M: { latitude: ... } }
        if (obj.M[prop]) {
          // If it has a direct N property with string value
          if (obj.M[prop].N && typeof obj.M[prop].N === 'string') {
            return parseFloat(obj.M[prop].N);
          }
          
          // Handle deeper nesting: { M: { latitude: { M: { N: { S: "value" } } } } }
          if (obj.M[prop].M && obj.M[prop].M.N && obj.M[prop].M.N.S) {
            return parseFloat(obj.M[prop].M.N.S);
          }
        }
      }
      
      // Handle your specific example format: { "geolocation" : { "M" : { "latitude" : { "M" : { "N" : { "S" : "51.45560969444445" } } } } } }
      if (obj.M && obj.M[prop] && obj.M[prop].M && obj.M[prop].M.N && obj.M[prop].M.N.S) {
        return parseFloat(obj.M[prop].M.N.S);
      }
      
      // Add explicit logging to debug the structure
      if (obj.M && obj.M[prop]) {
      }
      
      return null;
    };
    
    // Modified filter to also check for geolocation inside metadata
    const locations = images
      .filter(item => {
        // Try to extract geolocation from direct property
        const hasDirectGeo = item.geolocation && 
                          ((item.geolocation.latitude !== undefined) || 
                           (item.geolocation.longitude !== undefined));
        
        // Try to extract geolocation from metadata
        const hasMetadataGeo = item.metadata && 
                            item.metadata.geolocation && 
                            ((item.metadata.geolocation.latitude !== undefined) || 
                             (item.metadata.geolocation.longitude !== undefined));
        
        // Special handling for DynamoDB nested structure
        let hasDynamoDBGeo = false;
        
        // Check for DynamoDB typical nested format in metadata
        if (item.metadata && item.metadata.geolocation && item.metadata.geolocation.M) {
          const lat = extractDynamoDBGeoValue(item.metadata.geolocation, 'latitude');
          const lng = extractDynamoDBGeoValue(item.metadata.geolocation, 'longitude');
          hasDynamoDBGeo = lat !== null && lng !== null;
          
          if (hasDynamoDBGeo) {
          }
        }
        
        // Debug: Log the results of our checks
        if (!hasDirectGeo && !hasMetadataGeo && !hasDynamoDBGeo) {
        }
        
        return hasDirectGeo || hasMetadataGeo || hasDynamoDBGeo;
      })
      .map(item => {
        
        // Get a URL for the image
        const url = item.url || item.ResourceUrl || item.resourceUrl || item.presignedUrl || '';
        
        // Get a name for the image
        const name = item.name || item.FileName || `Image ${images.indexOf(item) + 1}`;
        
        // Process latitude/longitude from complex nested structure if needed
        let latitude: number = 0;
        let longitude: number = 0;
        let heading: number | undefined = undefined;
        let altitude: number | undefined = undefined;
        
        // Case 1: Standard direct geolocation object
        if (item.geolocation) {
          if (typeof item.geolocation.latitude === 'number') {
            latitude = item.geolocation.latitude;
          } else if (typeof item.geolocation.latitude === 'string') {
            latitude = parseFloat(item.geolocation.latitude);
          }
          
          if (typeof item.geolocation.longitude === 'number') {
            longitude = item.geolocation.longitude;
          } else if (typeof item.geolocation.longitude === 'string') {
            longitude = parseFloat(item.geolocation.longitude);
          }
          
          // Extract additional metadata
          if (item.geolocation.heading) {
            heading = typeof item.geolocation.heading === 'string' 
              ? parseFloat(item.geolocation.heading) 
              : (typeof item.geolocation.heading === 'number' ? item.geolocation.heading : undefined);
          } else if (item.geolocation.direction) {
            heading = typeof item.geolocation.direction === 'string' 
              ? parseFloat(item.geolocation.direction) 
              : (typeof item.geolocation.direction === 'number' ? item.geolocation.direction : undefined);
          }
          
          if (item.geolocation.altitude) {
            altitude = typeof item.geolocation.altitude === 'string' 
              ? parseFloat(item.geolocation.altitude) 
              : (typeof item.geolocation.altitude === 'number' ? item.geolocation.altitude : undefined);
          }
        }
        
        // Case 2: Nested metadata.geolocation object
        if ((!latitude || !longitude) && item.metadata && item.metadata.geolocation) {
          if (typeof item.metadata.geolocation.latitude === 'number') {
            latitude = item.metadata.geolocation.latitude;
          } else if (typeof item.metadata.geolocation.latitude === 'string') {
            latitude = parseFloat(item.metadata.geolocation.latitude);
          }
          
          if (typeof item.metadata.geolocation.longitude === 'number') {
            longitude = item.metadata.geolocation.longitude;
          } else if (typeof item.metadata.geolocation.longitude === 'string') {
            longitude = parseFloat(item.metadata.geolocation.longitude);
          }
          
          // Extract additional metadata
          if (!heading) {
            if (item.metadata.geolocation.heading) {
              heading = typeof item.metadata.geolocation.heading === 'string' 
                ? parseFloat(item.metadata.geolocation.heading) 
                : (typeof item.metadata.geolocation.heading === 'number' ? item.metadata.geolocation.heading : undefined);
            } else if (item.metadata.geolocation.direction) {
              heading = typeof item.metadata.geolocation.direction === 'string' 
                ? parseFloat(item.metadata.geolocation.direction) 
                : (typeof item.metadata.geolocation.direction === 'number' ? item.metadata.geolocation.direction : undefined);
            }
          }
          
          if (!altitude && item.metadata.geolocation.altitude) {
            altitude = typeof item.metadata.geolocation.altitude === 'string' 
              ? parseFloat(item.metadata.geolocation.altitude) 
              : (typeof item.metadata.geolocation.altitude === 'number' ? item.metadata.geolocation.altitude : undefined);
          }
        }
        
        // Case 3: Complex DynamoDB nested structure
        if ((!latitude || !longitude) && item.metadata && item.metadata.geolocation && item.metadata.geolocation.M) {
          const latVal = extractDynamoDBGeoValue(item.metadata.geolocation, 'latitude');
          const lngVal = extractDynamoDBGeoValue(item.metadata.geolocation, 'longitude');
          
          if (latVal !== null) latitude = latVal;
          if (lngVal !== null) longitude = lngVal;
          
          // Try to extract heading/direction value
          if (!heading) {
            const headingVal = extractDynamoDBGeoValue(item.metadata.geolocation, 'heading') || 
                             extractDynamoDBGeoValue(item.metadata.geolocation, 'direction');
            if (headingVal !== null) heading = headingVal;
          }
          
          // Try to extract altitude value
          if (!altitude) {
            const altVal = extractDynamoDBGeoValue(item.metadata.geolocation, 'altitude');
            if (altVal !== null) altitude = altVal;
          }
        }
        
        // Extract timestamp if available
        const timestamp = 
          (item.metadata?.geolocation?.timestamp) || 
          item.uploadDate || 
          item.CreatedAt;
        
        // Extract camera model information if available
        const cameraModel = 
          (item.metadata?.geolocation?.cameraModel) || 
          (item.metadata?.geolocation?.model);
        
        // Extract drone information if available
        const droneModel = 
          (item.metadata?.geolocation?.droneModel) || 
          (item.metadata?.geolocation?.drone);
        
        
        // Create the location object with all metadata
        return {
          url,
          latitude,
          longitude,
          name,
          heading,
          altitude,
          timestamp,
          cameraModel,
          droneModel
        };
      });
    
    return locations;
  };

  const fallbackToDynamoDB = async () => {
    
    if (!bookingId) {
      setError("Cannot fetch booking details: Booking ID is missing");
      return;
    }
    
    const scanParams = {
      TableName: 'Bookings',
      FilterExpression: 'BookingId = :bid OR id = :bid OR bookingId = :bid',
      ExpressionAttributeValues: {
        ':bid': bookingId
      }
    };
    
    const scanData = await dynamoDb.scan(scanParams).promise();
    
    if (scanData.Items && scanData.Items.length > 0) {
      const item = scanData.Items[0];
      setBooking(item);
      
      await fetchImagesFromDynamoDB(bookingId);
    } else {
      setError("Booking not found. It may have been deleted or the ID is incorrect.");
    }
  };

  const fetchImagesFromDynamoDB = async (id: string) => {
    setIsLoadingImages(true);
    let resourcesData: AWS.DynamoDB.DocumentClient.ScanOutput | null = null;
    
    try {
      
      const resourcesParams = {
        TableName: 'Resources',
        FilterExpression: 'BookingId = :bookingId',
        ExpressionAttributeValues: {
          ':bookingId': id
        }
      };
      
      
      try {
        resourcesData = await dynamoDb.scan(resourcesParams).promise();
        
        if (resourcesData.Items && resourcesData.Items.length > 0) {
          
          const resourceFiles = resourcesData.Items.map(item => ({
            url: item.ResourceUrl,
            key: item.S3Path,
            name: item.FileName || "Unknown",
            type: item.ContentType || "Image",
            size: item.Size || 0,
            uploadDate: item.CreatedAt,
            resourceId: item.ResourceId,
            S3Path: item.S3Path,
            ResourceUrl: item.ResourceUrl,
            FileName: item.FileName,
            ContentType: item.ContentType
          }));
          
          setImages(resourceFiles);
          
          const urlSamples = resourceFiles.slice(0, 3).map(img => ({
            url: img.url,
            valid: typeof img.url === 'string' && img.url.startsWith('http'),
            s3Path: img.S3Path || 'missing'
          }));
          
          
          // Get locations for images
          const locations = extractImageLocations(resourceFiles);
          if (locations.length > 0) {
            setImageLocations(locations);
          }
          
          setIsLoadingImages(false);
          return;
        } else {
        }
      } catch (resourceError) {
      }
      
      const imageParams = {
        TableName: 'ImageUploads',
        FilterExpression: 'BookingId = :bookingId',
        ExpressionAttributeValues: {
          ':bookingId': id
        }
      };
      
      const imageData = await dynamoDb.scan(imageParams).promise();
      
      if (imageData.Items && imageData.Items.length > 0) {
        
        const dbImages = imageData.Items.map(item => ({
          url: item.s3Url,
          key: item.s3Key,
          name: item.filename || "Unknown",
          type: item.fileType || "Image",
          size: item.size || 0,
          geolocation: item.geolocation
        }));
        
        setImages(dbImages);
        
        const locations = extractImageLocations(dbImages);
        if (locations.length > 0) {
          setImageLocations(locations);
        }
      }
      
      const geoTiffParams = {
        TableName: 'GeoTiffUploads',
        FilterExpression: 'BookingId = :bookingId',
        ExpressionAttributeValues: {
          ':bookingId': id
        }
      };
      
      const geoTiffData = await dynamoDb.scan(geoTiffParams).promise();
      
      if (geoTiffData.Items && geoTiffData.Items.length > 0) {
        const geoTiff = geoTiffData.Items[0];
        setGeoTiffFilename(geoTiff.filename);
        
        if (geoTiff.s3Key) {
          const s3Params = {
            Bucket: 'drone-images-bucket',
            Key: geoTiff.s3Key,
            Expires: 3600
          };
          
          try {
            const signedUrl = s3.getSignedUrl('getObject', s3Params);
            setGeoTiffUrl(normalizeS3Url(signedUrl));
          } catch (signedUrlError) {
            setGeoTiffUrl(normalizeS3Url(geoTiff.s3Url));
          }
        }
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setImageError(`Failed to load images: ${errorMessage}`);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const mapToImageProps = (images: BookingImage[]): any[] => {
    
    if (images.length > 0) {
    }
    
    const mappedImages = images
      .filter(image => {
        const url = image.url || image.ResourceUrl || image.resourceUrl || image.s3Url || '';
        const hasUrl = url !== '' && typeof url === 'string';
        
        if (!hasUrl) {
          return false;
        }
        
        return true; // Keep all resources with valid URLs, including GeoTIFFs
      })
      .map(image => {
        // Keep original URL intact for presigned URLs
        const url = image.url || image.ResourceUrl || image.resourceUrl || image.s3Url || '';
        
        // Don't normalize presigned URLs anymore
        const normalizedUrl = url;
        const key = image.resourceId || image.key || image.s3Key || image.S3Path || url;
        
        // Generate alternative URLs for S3 resources
        const alternativeUrls = [url]; // Start with original URL as primary
        
        // Only add alternative versions if not a presigned URL
        if (!url.includes('X-Amz-Signature=')) {
          alternativeUrls.push(...tryAlternativeS3Urls(url));
        }
        
        return {
          url: url, // Use original URL (likely presigned) to maintain access
          presignedUrl: url,
          originalUrl: url, // Keep the original URL as backup
          alternativeUrls: alternativeUrls, // Store all possible URLs
          key: key,
          name: image.name || image.FileName || 'Unnamed Resource',
          type: image.type || image.ContentType || 'image/jpeg',
          size: image.size || image.Size,
          uploadDate: image.uploadDate || image.CreatedAt,
          resourceId: image.resourceId,
          s3Key: image.s3Key || image.S3Path,
          bucket: url.includes('pilotforce-resources') ? 'pilotforce-resources' : 'drone-images-bucket',
          isGeoTiff: isGeoTiffFile(image.name || image.FileName || '')
        };
      });
    
    
    if (mappedImages.length > 0) {
    }
    
    return mappedImages;
  };

  const validateImageUrls = async () => {
    if (validatingUrls.current) {
      return;
    }
    
    validatingUrls.current = true;

    const MAX_CONCURRENT_VALIDATIONS = 3;
    const imagesToValidate = images.slice(0, MAX_CONCURRENT_VALIDATIONS);
    
    try {
      for (let i = 0; i < imagesToValidate.length; i++) {
        const image = imagesToValidate[i];
        const url = image.url || image.presignedUrl;
        
        if (!url) continue;
        
        try {
          import('../utils/s3ImageLoader').then(async ({ testImageUrl }) => {
            const works = await testImageUrl(url);
            
            if (works) {
            }
          });
        } catch (err) {
        }
      }
    } finally {
      validatingUrls.current = false;
    }
  };

  const handleRefreshedUrls = (refreshedUrls: Record<string, string>) => {
    if (Object.values(refreshedUrls).filter(url => url).length === 0) {
      return;
    }
    
    
    setImages(prevImages => {
      const updatedImages = [...prevImages];
      
      Object.entries(refreshedUrls).forEach(([indexStr, url]) => {
        const index = parseInt(indexStr, 10);
        if (!isNaN(index) && index >= 0 && index < updatedImages.length && url) {
          updatedImages[index] = {
            ...updatedImages[index],
            url: url,
            presignedUrl: url
          };
        }
      });
      
      return updatedImages;
    });
  };

  const downloadGeoTiffFile = async (file: BookingImage) => {
    try {
      setIsGeoTiffDownloading(true);
      setGeoTiffDownloadProgress(0);
      
      const fileUrl = file.url || file.presignedUrl || '';
      const fileName = file.name || file.FileName || 'geotiff.tif';
      
      
      if (!fileUrl) {
        throw new Error('No URL available for this GeoTIFF file');
      }
      
      // Use our specialized download utility
      await downloadS3Binary(
        fileUrl, 
        fileName,
        (progress) => setGeoTiffDownloadProgress(progress)
      );
      
      
    } catch (error) {
      alert(`Failed to download GeoTIFF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeoTiffDownloading(false);
    }
  };

  const isGeoTiffFileLocal = (filename: string): boolean => {
    return isGeoTiffFile(filename);
  };

  const hasFlightData = () => {
    return images.length > 0 || geoTiffUrl !== null;
  };

  const isBookingActive = (): boolean => {
    const status = safeToLowerCase(booking?.status);
    return status === 'in-progress' || status === 'completed';
  };

  // Define breadcrumbs for the navigation
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'My Bookings', href: '/my-bookings' },
    { label: 'Flight Details', href: '#', current: true }
  ];

  // Status color utility function using safeToLowerCase
  const getStatusColor = (status: any): string => {
    switch (safeToLowerCase(status)) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-purple-100 text-purple-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Status text utility function using safeToLowerCase
  const getStatusText = (status: any): string => {
    const lowercaseStatus = safeToLowerCase(status);
    switch (lowercaseStatus) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      case 'scheduled':
        return 'Scheduled';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status || 'Unknown';
    }
  };

  // Format scheduling information for display
  const formatSchedulingInfo = (booking: any) => {
    if (!booking) {
      return {
        label: 'Schedule',
        value: 'Not scheduled',
        subtext: null
      };
    }

    if (booking.flightDate) {
      return {
        label: 'Flight Date',
        value: new Date(booking.flightDate).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }),
        subtext: booking.timeSlot || null
      };
    }

    if (booking.scheduling) {
      if (booking.scheduling.scheduleType === 'scheduled') {
        return {
          label: 'Scheduled Date',
          value: new Date(booking.scheduling.date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }),
        subtext: null
        };
      } else if (booking.scheduling.scheduleType === 'flexible') {
        return {
          label: 'Preferred Date',
          value: new Date(booking.scheduling.date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }),
          subtext: `Flexibility: ${getFlexibilityText(booking.scheduling.flexibility)}`
        };
      } else if (booking.scheduling.scheduleType === 'repeat') {
        return {
          label: 'Recurring',
          value: `${capitalizeFirstLetter(booking.scheduling.repeatFrequency)} from ${new Date(booking.scheduling.startDate).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}`,
          subtext: `Until ${new Date(booking.scheduling.endDate).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}`
        };
      }
    }

    return {
      label: 'Date',
      value: booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }) : 'Not specified',
      subtext: null
    };
  };

  // Helper function for formatSchedulingInfo
  const getFlexibilityText = (flexibility?: string): string => {
    switch (flexibility) {
      case 'exact':
        return 'Exact date';
      case '1-day':
        return '±1 Day';
      case '3-days':
        return '±3 Days';
      case '1-week':
        return '±1 Week';
      default:
        return flexibility || 'Flexible';
    }
  };

  // Helper function to capitalize first letter
  const capitalizeFirstLetter = (str?: string): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Scroll to flight data section
  const scrollToFlightData = () => {
    if (flightDataRef.current) {
      flightDataRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  // Asset map load handler
  const handleAssetMapLoad = (event: any) => {
    setAssetMapLoaded(true);
    setIsLoadingMap(false);
    if (!booking?.asset) {
      return;
    }
    // Validate coordinates
    if (!booking.asset.coordinates || !Array.isArray(booking.asset.coordinates) || booking.asset.coordinates.length === 0) {
      return;
    }
    
    // Get the first polygon's coordinates
    const polygonCoords = booking.asset.coordinates[0];
    if (!Array.isArray(polygonCoords) || polygonCoords.length === 0) {
      return;
    }
    setTimeout(() => {
      if (!assetMapRef.current) {
        return;
      }
      
      try {
        const map = assetMapRef.current.getMap();
        const bounds = new mapboxgl.LngLatBounds();
        let hasValidCoordinates = false;
        polygonCoords.forEach((coord: [number, number], index: number) => {
          if (Array.isArray(coord) && coord.length >= 2 && 
              !isNaN(coord[0]) && !isNaN(coord[1]) &&
              coord[0] >= -180 && coord[0] <= 180 &&
              coord[1] >= -90 && coord[1] <= 90) {
            bounds.extend(coord);
            hasValidCoordinates = true;
          } else {
          }
        });
        
        if (hasValidCoordinates) {
          const southwest = bounds.getSouthWest();
          const northeast = bounds.getNorthEast();
          const boundsArray = [
            [southwest.lng, southwest.lat],
            [northeast.lng, northeast.lat]
          ] as [[number, number], [number, number]];
          
          map.fitBounds(boundsArray, { 
            padding: 50,
            maxZoom: 19
          });
        } else {
        }
      } catch (error) {
      }
    }, 500);
  };

  // Image map load handler
  const handleImageMapLoad = (map: mapboxgl.Map) => {
    if (map && imageLocations.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      imageLocations.forEach(location => {
        bounds.extend([location.longitude, location.latitude] as [number, number]);
      });
      const southwest = bounds.getSouthWest();
      const northeast = bounds.getNorthEast();
      const boundsArray = [
        [southwest.lng, southwest.lat],
        [northeast.lng, northeast.lat]
      ] as [[number, number], [number, number]];
      map.fitBounds(boundsArray, { padding: 50 });
    }

    // If we have asset data, add the asset polygon
    if (booking?.asset?.coordinates && Array.isArray(booking.asset.coordinates)) {
      try {
        // Add source for asset polygon
        map.addSource('asset-polygon', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: booking.asset.coordinates
            }
          }
        });

        const assetColors = getAssetTypeColor(booking.asset.type || 'buildings');

        // Add fill layer
        map.addLayer({
          id: 'asset-polygon-fill',
          type: 'fill',
          source: 'asset-polygon',
          paint: {
            'fill-color': assetColors.color,
            'fill-opacity': 0.3
          }
        });

        // Add outline layer
        map.addLayer({
          id: 'asset-polygon-outline',
          type: 'line',
          source: 'asset-polygon',
          paint: {
            'line-color': assetColors.strokeColor,
            'line-width': 2
          }
        });

        // If no image locations, fit map to asset bounds
        if (imageLocations.length === 0) {
          const bounds = new mapboxgl.LngLatBounds();
          booking.asset.coordinates[0].forEach((coord: [number, number]) => {
            bounds.extend(coord);
          });
          const southwest = bounds.getSouthWest();
          const northeast = bounds.getNorthEast();
          const boundsArray = [
            [southwest.lng, southwest.lat],
            [northeast.lng, northeast.lat]
          ] as [[number, number], [number, number]];
          map.fitBounds(boundsArray, { padding: 50 });
        }
      } catch (error) {
      }
    }
  };

  // Download all files function
  const downloadAllFiles = async () => {
    if (isDownloading || images.length === 0) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);
    
    let completed = 0;
    
    try {
      const validImages = images.filter(img => img.url || img.presignedUrl);
      
      if (validImages.length === 0) {
        throw new Error("No valid URLs found for download");
      }
      
      
      // For sequential downloads to handle large files better
      for (let i = 0; i < validImages.length; i++) {
        try {
          const img = validImages[i];
          const url = img.url || img.presignedUrl;
          
          if (!url) continue;
          
          const filename = img.name || img.FileName || `file_${i}.jpg`;
          
          // Fetch the file
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Failed to download ${filename}: HTTP ${response.status}`);
          
          const blob = await response.blob();
          
          // Create download link and trigger click
          const downloadLink = document.createElement('a');
          downloadLink.href = URL.createObjectURL(blob);
          downloadLink.download = filename;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          
          // Clean up object URL
          URL.revokeObjectURL(downloadLink.href);
          
          // Update progress
          completed++;
          setDownloadProgress(Math.round((completed / validImages.length) * 100));
          
          // Small delay between downloads to prevent browser from blocking
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (itemError) {
          // Continue with next file even if one fails
        }
      }
      
      
    } catch (error) {
      alert("There was an error downloading the files. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const navigateToFlightData = () => {
    // Store the processed data in localStorage before navigation
    if (processedFlightData) {
      localStorage.setItem('preloadedFlightData', JSON.stringify({
        ...processedFlightData,
        bookingId // Include bookingId to ensure data matches
      }));
    }
    navigate(`/flight-data/${bookingId}`);
  };

  // Add type conversion for BookingImageGallery
  const convertToImageProps = (bookingImages: BookingImage[]): ImageProps[] => {
    return bookingImages.map(img => ({
      url: img.url || img.presignedUrl || img.directUrl || '',
      name: img.name || img.FileName || '',
      type: img.type || img.ContentType,
      size: img.Size || img.size,
      uploadDate: img.uploadDate || img.CreatedAt,
      resourceId: img.resourceId || img.ResourceId,
      isGeoTiff: false // Add default value
    }));
  };

  // Update the return statement to include the loading overlay
  if (pageLoading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          {/* Removed top breadcrumb */}
          {user?.role?.toLowerCase() !== 'subuser' && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Invite Client
            </button>
          )}
        </div>

        {/* Add the InvitationModal component */}
        <InvitationModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          companyId={user?.companyId || ''}
          userId={user?.id || user?.sub || ''}
          bookingId={bookingId || ''}
          bookingTitle={booking?.title || booking?.assetName || 'Flight Booking'}
        />

        {/* Show loading overlay when any component is loading */}
        {(isLoading || isLoadingImages || isLoadingMap) && <LoadingOverlay />}
        
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumbs */}
          <Breadcrumbs items={breadcrumbs} className="mb-6" />

          {/* Booking Header */}
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {booking?.title || 'Flight Details'}
                  </h1>
                  <div className="mt-1 flex items-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${booking?.status ? getStatusColor(booking.status) : 'bg-gray-100 text-gray-800'}`}>
                      {booking?.status ? getStatusText(booking.status) : 'Unknown'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/my-bookings')}
                  className="mt-4 lg:mt-0 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Flights
                </button>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <div className="px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                  <div className="bg-blue-50 p-3 rounded-full">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{booking?.assetName || "Flight Booking"}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {Array.isArray(booking?.jobTypes) && booking?.jobTypes.length > 0
                        ? booking?.jobTypes.join(', ') 
                        : booking?.jobType || booking?.serviceType || 'Not specified'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${booking?.status ? getStatusColor(booking.status) : 'bg-gray-100 text-gray-800'}`}>
                    {booking?.status ? getStatusText(booking.status) : 'Unknown'}
                  </span>
                  {safeToLowerCase(booking?.status) === 'pending' && (
                    <p className="text-xs text-gray-500 mt-1">Awaiting confirmation</p>
                  )}
                  {safeToLowerCase(booking?.status) === 'cancelled' && (
                    <p className="text-xs text-red-500 mt-1">Flight was cancelled</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-gray-200">
                <div className="px-6 py-4 border-b sm:border-b-0 sm:border-r border-gray-200">
                  {booking && (
                    <>
                      <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                        {formatSchedulingInfo(booking).label}
                      </p>
                      <p className="text-sm font-medium text-gray-800">
                        {formatSchedulingInfo(booking).value}
                      </p>
                      {formatSchedulingInfo(booking).subtext && (
                        <p className="text-xs text-gray-500 mt-1">{formatSchedulingInfo(booking).subtext}</p>
                      )}
                    </>
                  )}
                </div>
                
                <div className="px-6 py-4 border-b sm:border-b-0 sm:border-r border-gray-200">
                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">Site Contact</p>
                  <p className="text-sm font-medium text-gray-800">
                    {booking?.siteContact?.name || booking?.contactPerson || "Not specified"}
                  </p>
                  {(booking?.siteContact?.phone || booking?.siteContactNumber) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {booking?.siteContact?.phone || booking?.siteContactNumber}
                    </p>
                  )}
                </div>
                
                <div className="px-6 py-4">
                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">Request Date</p>
                  <p className="text-sm font-medium text-gray-800">
                    {booking?.createdAt ? new Date(booking?.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    }) : "Unknown"}
                  </p>
                </div>
              </div>
              
              {/* Status banner for cancelled bookings */}
              {safeToLowerCase(booking?.status) === 'cancelled' && (
                <div className="px-6 py-4 border-t border-gray-200 bg-red-50">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm text-red-700 font-medium">
                      This flight has been cancelled and will not be performed.
                    </span>
                  </div>
                </div>
              )}
              
              {/* Status banner for scheduled bookings */}
              {safeToLowerCase(booking?.status) === 'scheduled' && (
                <div className="px-6 py-4 border-t border-gray-200 bg-blue-50">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-blue-700 font-medium">
                      This flight is scheduled for {new Date(booking?.flightDate || booking?.scheduling?.date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })} {booking?.scheduling?.timeSlot && `at ${booking.scheduling.timeSlot.replace(/-/g, ' to ')}`}
                    </span>
                  </div>
                </div>
              )}
              
              {(booking?.status && ['scheduled', 'pending', 'completed', 'in-progress'].includes(safeToLowerCase(booking.status))) && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  {(['completed', 'in-progress'].includes(safeToLowerCase(booking?.status))) && (
                    <button 
                      onClick={navigateToFlightData}
                      className="w-full bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4 4L19 7" />
                      </svg>
                      {safeToLowerCase(booking?.status) === 'completed' ? 'View Flight Data' : 'Track Progress'}
                    </button>
                  )}
                  {(['scheduled', 'pending'].includes(safeToLowerCase(booking?.status))) && (
                    <div className="flex space-x-3">
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {safeToLowerCase(booking?.status) === 'scheduled' ? 'Flight scheduled' : 'Awaiting confirmation'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden h-full">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">Flight Details</h3>
                </div>
                
                <div className="divide-y divide-gray-200">
                  <div className="px-6 py-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Services Booked
                    </h4>
                    {Array.isArray(booking?.jobTypes) && booking?.jobTypes.length > 0 ? (
                      <div className="space-y-3">
                        {booking?.jobTypes.map((jobType: string, index: number) => (
                          <div key={index} className="flex items-center text-sm">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mr-3"></div>
                            <span className="text-gray-800">{jobType}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-500 italic">
                        No detailed service information available
                      </div>
                    )}
                  </div>
                  
                  <div className="px-6 py-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Contact Information
                    </h4>
                    {(booking?.siteContact || booking?.contactPerson || booking?.contactPhone || booking?.siteContactNumber) ? (
                      <div className="bg-white rounded-lg">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Contact Name</p>
                            <p className="text-sm text-gray-800 font-medium">
                              {booking?.siteContact?.name || booking?.contactPerson || "Not specified"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Contact Phone</p>
                            <p className="text-sm text-gray-800 font-medium">
                              {booking?.siteContact?.phone || booking?.contactPhone || booking?.siteContactNumber || "Not specified"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-500 italic">
                        No contact information provided
                      </div>
                    )}
                  </div>
                  
                  {booking && booking?.scheduling && (
                    <div className="px-6 py-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Schedule Details
                      </h4>
                      
                      <div className="bg-gray-50 rounded-md p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Schedule Type</p>
                            <p className="text-sm text-gray-800 font-medium">
                              {capitalizeFirstLetter(booking?.scheduling?.scheduleType || "Standard")}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              {booking?.scheduling?.scheduleType === 'repeat' ? 'Start Date' : 'Date'}
                            </p>
                            <p className="text-sm text-gray-800 font-medium">
                              {new Date(booking?.scheduling?.date || 
                                      booking?.scheduling?.startDate || 
                                      booking?.flightDate || 
                                      booking?.createdAt).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          
                          {booking?.scheduling?.scheduleType === 'flexible' && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Flexibility</p>
                              <p className="text-sm text-gray-800 font-medium">
                                {getFlexibilityText(booking?.scheduling?.flexibility)}
                              </p>
                            </div>
                          )}
                          
                          {booking?.scheduling?.scheduleType === 'repeat' && (
                            <>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">End Date</p>
                                <p className="text-sm text-gray-800 font-medium">
                                  {new Date(booking?.scheduling?.endDate).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Frequency</p>
                                <p className="text-sm text-gray-800 font-medium">
                                  {capitalizeFirstLetter(booking?.scheduling?.repeatFrequency || "Not specified")}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {booking?.notes ? (
                    <div className="px-6 py-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        Additional Notes
                      </h4>
                      <div className="bg-gray-50 rounded-md p-4">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">
                          {booking.notes}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  
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
                          <p className="text-xs text-gray-500 mb-1">Asset Name</p>
                          <p className="text-sm text-gray-800 font-medium">{asset.name || asset.Name || "Unnamed Asset"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Asset Type</p>
                          <p className="text-sm text-gray-800 font-medium">{asset.type || asset.Type || "Not specified"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Asset ID</p>
                          <p className="text-sm text-gray-800 font-medium">{asset.id || asset.Id || asset.assetId || "Not specified"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Asset Owner</p>
                          <p className="text-sm text-gray-800 font-medium">{asset.owner || asset.Owner || "Not specified"}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="h-full flex flex-col">
              <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex-1 flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Location
                  </h3>
                </div>
                
                {/* Location Map */}
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
                    {assetMapLoaded && booking?.asset?.coordinates && Array.isArray(booking.asset.coordinates) && booking.asset.coordinates.length > 0 && (
                      <Source
                        id="asset-polygon"
                        type="geojson"
                        data={{
                          type: 'Feature',
                          properties: {},
                          geometry: {
                            type: 'Polygon',
                            coordinates: booking.asset.coordinates
                          }
                        }}
                      >
                        <Layer
                          id="asset-polygon-fill"
                          type="fill"
                          paint={{
                            'fill-color': getAssetTypeColor(booking.asset.type || 'buildings').color,
                            'fill-opacity': 0.3
                          }}
                        />
                        <Layer
                          id="asset-polygon-outline"
                          type="line"
                          paint={{
                            'line-color': getAssetTypeColor(booking.asset.type || 'buildings').strokeColor,
                            'line-width': 2
                          }}
                        />
                      </Source>
                    )}
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
          
          {/* Users with Access Section */}
          {booking?.usersWithAccess && booking.usersWithAccess.length > 0 && (
            <div className="mb-8">
              <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <div className="px-6 py-5">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Users with Access</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        People who can view this flight's details and data
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <div className="space-y-4">
                      {booking.usersWithAccess.map((user: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-medium text-sm">
                                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{user.name || user.email}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                              user.accessType === 'owner' 
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.role}
                            </span>
                            {user.accessType === 'invited' && (
                              <span className="ml-2 text-xs text-gray-500">
                                Invited {new Date(user.invitedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to fit map to asset bounds
function fitMapToAsset(target: any, asset: any) {
  if (!target || !asset || !asset.coordinates || asset.coordinates.length === 0) {
    return;
  }

  try {
    const bounds = new mapboxgl.LngLatBounds();

    asset.coordinates[0].forEach((coord: [number, number]) => {
      bounds.extend(coord);
    });

    target.fitBounds(bounds, {
      padding: 50,
      maxZoom: 20
    });

  } catch (error) {
  }
}

export default FlightDetails;
