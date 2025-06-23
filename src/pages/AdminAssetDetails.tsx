import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminNavbar from '../components/common/Navbar';
import { 
  FiArrowLeft, FiEdit, FiTrash2, FiMap, FiPackage,
  FiUpload, FiDownload, FiCheckCircle, FiXCircle 
} from 'react-icons/fi';
import Map, { Source, Layer, Marker, MapRef, MapLayerMouseEvent } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import adminService from '../services/adminService';

interface AssetDetails {
  id: string;
  name: string;
  type: string;
  address: string;
  postcode: string;
  area: number;
  centerPoint: [number, number];
  coordinates: Array<Array<[number, number]>>;
  description: string;
  companyId: string;
  companyName: string;
  userId: string;
  username: string;
  tags: string[];
  registrationNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: Array<Array<[number, number]>>;
  };
  properties: Record<string, any>;
}

const AdminAssetDetails: React.FC = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const { isAdmin } = useAuth();
  const [asset, setAsset] = useState<AssetDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewState, setViewState] = useState({
    longitude: -2.587910,
    latitude: 51.454514,
    zoom: 16
  });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<MapRef>(null);
  const navigate = useNavigate();

  // Verify admin status and load data
  useEffect(() => {
    if (!isAdmin) {
      setError('You do not have permission to access this page');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      return;
    }
    
    if (assetId) {
      fetchAssetDetails();
    } else {
      setError('No asset ID provided');
    }
  }, [isAdmin, assetId, navigate]);

  // Fetch asset details
  const fetchAssetDetails = async () => {
    setLoading(true);
    try {
      if (!assetId) {
        setError("Asset ID is missing");
        setLoading(false);
        return;
      }
      const response = await adminService.getAssetById(assetId);
      if (response && response.success && response.data) {
        setAsset(response.data);
        // Update map view if coordinates are available
        if (response.data.centerPoint) {
          setViewState({
            longitude: response.data.centerPoint[0],
            latitude: response.data.centerPoint[1],
            zoom: 16
          });
        }
      } else {
        setError('Asset not found');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading asset details');
    } finally {
      setLoading(false);
    }
  };

  // Handle asset deletion
  const handleDeleteAsset = async () => {
    if (!assetId) return;
    
    if (window.confirm('Are you sure you want to delete this asset? This action cannot be undone.')) {
      try {
        setLoading(true);
        await adminService.deleteAsset(assetId);
        alert('Asset deleted successfully');
        navigate('/admin/assets');
      } catch (err: any) {
        setError(err.message || 'Failed to delete asset');
        setLoading(false);
      }
    }
  };

  // Get asset type color
  const getAssetTypeColor = (assetType: string) => {
    switch(assetType?.toLowerCase()) {
      case 'buildings':
        return { color: '#3182ce', strokeColor: '#2c5282' };
      case 'construction':
        return { color: '#dd6b20', strokeColor: '#9c4221' };
      case 'area':
        return { color: '#38a169', strokeColor: '#276749' };
      case 'security':
        return { color: '#805ad5', strokeColor: '#553c9a' };
      case 'infrastructure':
        return { color: '#e53e3e', strokeColor: '#c53030' };
      default:
        return { color: '#3182ce', strokeColor: '#2c5282' };
    }
  };

  // Calculate bounds for the asset polygon
  const calculateAssetBounds = (coordinates: Array<[number, number]>): [[number, number], [number, number]] | null => {
    if (!coordinates || coordinates.length === 0) return null;
    
    let minLng = coordinates[0][0];
    let minLat = coordinates[0][1];
    let maxLng = coordinates[0][0];
    let maxLat = coordinates[0][1];
    
    coordinates.forEach((coord) => {
      if (coord[0] < minLng) minLng = coord[0];
      if (coord[1] < minLat) minLat = coord[1];
      if (coord[0] > maxLng) maxLng = coord[0];
      if (coord[1] > maxLat) maxLat = coord[1];
    });
    
    return [[minLng, minLat], [maxLng, maxLat]];
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <AdminNavbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link
            to="/admin/assets"
            className="text-blue-600 hover:text-blue-800 inline-flex items-center"
          >
            <FiArrowLeft className="mr-1" /> Back to Assets
          </Link>
        </div>
        
        <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Asset Details</h1>
            {asset && (
              <p className="text-gray-600">
                ID: {assetId} • Created {new Date(asset.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
          {asset && (
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Link
                to={`/admin/assets/edit/${assetId}`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
              >
                <FiEdit className="mr-2 -ml-1" />
                Edit Asset
              </Link>
              <button
                onClick={handleDeleteAsset}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                <FiTrash2 className="mr-2 -ml-1 text-red-500" />
                Delete
              </button>
            </div>
          )}
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex flex-col items-center">
            <p className="text-lg font-semibold mb-2">Error Loading Asset</p>
            <p>{error}</p>
            <Link
              to="/admin/assets"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <FiArrowLeft className="mr-2" /> Return to Assets
            </Link>
          </div>
        ) : !asset ? (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6 flex flex-col items-center">
            <p className="text-lg font-semibold mb-2">Asset Not Found</p>
            <p>The requested asset could not be found. It may have been deleted or you may not have permission to view it.</p>
            <Link
              to="/admin/assets"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <FiArrowLeft className="mr-2" /> Return to Assets
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Left 2 Columns */}
            <div className="lg:col-span-2">
              {/* Primary Asset Information */}
              <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Asset Information</h2>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-3">Basic Information</h3>
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-xs text-gray-500">Asset Name</dt>
                          <dd className="text-sm text-gray-900">{asset.name}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Asset Type</dt>
                          <dd className="text-sm text-gray-900">{asset.type}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Registration Number</dt>
                          <dd className="text-sm text-gray-900">{asset.registrationNumber || 'N/A'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Status</dt>
                          <dd className="text-sm text-gray-900">{asset.status}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* Location Info */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-3">Location Information</h3>
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-xs text-gray-500">Address</dt>
                          <dd className="text-sm text-gray-900">{asset.address}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Postcode</dt>
                          <dd className="text-sm text-gray-900">{asset.postcode}</dd>
                        </div>
                        {asset.area && (
                          <div>
                            <dt className="text-xs text-gray-500">Area</dt>
                            <dd className="text-sm text-gray-900">{asset.area.toFixed(2)} m²</dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-gray-500 mb-3">Description</h3>
                      <p className="text-sm text-gray-900 whitespace-pre-line">
                        {asset.description || 'No description provided'}
                      </p>
                    </div>

                    {/* Tags */}
                    {asset.tags && asset.tags.length > 0 && (
                      <div className="md:col-span-2">
                        <h3 className="text-sm font-medium text-gray-500 mb-3">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {asset.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Map */}
              <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Asset Location</h2>
                </div>
                <div className="p-6">
                  <div className="h-[400px] relative rounded-lg overflow-hidden shadow-inner">
                    <Map
                      {...viewState}
                      onMove={evt => setViewState(evt.viewState)}
                      mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                      mapboxAccessToken={process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}
                      scrollZoom={true}
                      onLoad={(evt: MapLayerMouseEvent) => {
                        setMapLoaded(true);
                        
                        if (!asset?.coordinates || asset.coordinates.length === 0) return;
                        
                        setTimeout(() => {
                          try {
                            const bounds = calculateAssetBounds(asset.coordinates[0]);
                            if (bounds && mapRef.current) {
                              const map = mapRef.current.getMap();
                              map.fitBounds(bounds, {
                                padding: 80,
                                maxZoom: 19,
                                duration: 800
                              });
                            }
                          } catch (e) {
                            setMapError('Error displaying asset on map');
                          }
                        }, 100);
                      }}
                      ref={mapRef}
                    >
                      {mapLoaded && asset?.coordinates && asset.coordinates.length > 0 && (
                        <Source
                          id="asset-boundary"
                          type="geojson"
                          data={{
                            type: 'Feature',
                            geometry: {
                              type: 'Polygon',
                              coordinates: asset.coordinates
                            },
                            properties: {}
                          } as GeoJSONFeature}
                        >
                          <Layer
                            id="asset-boundary-fill"
                            type="fill"
                            paint={{
                              'fill-color': getAssetTypeColor(asset.type).color,
                              'fill-opacity': 0.3
                            }}
                          />
                          <Layer
                            id="asset-boundary-line"
                            type="line"
                            paint={{
                              'line-color': getAssetTypeColor(asset.type).strokeColor,
                              'line-width': 2
                            }}
                          />
                        </Source>
                      )}
                      
                      {mapLoaded && asset?.centerPoint && (
                        <Marker 
                          longitude={asset.centerPoint[0]} 
                          latitude={asset.centerPoint[1]}
                          anchor="bottom"
                        >
                          <div className="w-8 h-8 rounded-full bg-white p-1 shadow-lg flex items-center justify-center">
                            <svg className="w-5 h-5" fill={getAssetTypeColor(asset.type).color} viewBox="0 0 24 24">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                            </svg>
                          </div>
                        </Marker>
                      )}
                    </Map>
                    {mapError && (
                      <div className="absolute bottom-0 left-0 right-0 bg-red-100 text-red-800 p-2 text-sm">
                        {mapError}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar - Company Information */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Company Information</h2>
                </div>
                <div className="p-6">
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-xs text-gray-500">Company ID</dt>
                      <dd className="text-sm text-gray-900">{asset.companyId}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Company Name</dt>
                      <dd className="text-sm text-gray-900">{asset.companyName}</dd>
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <dt className="text-xs text-gray-500">Created By</dt>
                      <dd className="text-sm text-gray-900">{asset.username}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">User ID</dt>
                      <dd className="text-sm text-gray-900">{asset.userId}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Created At</dt>
                      <dd className="text-sm text-gray-900">{new Date(asset.createdAt).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Last Updated</dt>
                      <dd className="text-sm text-gray-900">{new Date(asset.updatedAt).toLocaleString()}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminAssetDetails; 