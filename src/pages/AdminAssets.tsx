import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Button, Modal } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminNavbar from '../components/common/Navbar';
import { FiSearch, FiRefreshCw, FiDownload, FiEdit, FiTrash2, FiEye, FiFilter, FiX, FiGrid, FiList, FiMap, FiPackage } from 'react-icons/fi';
import * as adminService from '../services/adminService';
import AdminAssetsList from '../components/admin/AdminAssetsList';

interface Asset {
  id: string;
  name: string;
  type: string;
  address: string;
  postcode: string;
  area: number;
  centerPoint: [number, number];
  coordinates: Array<Array<Array<number>>>;
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

interface Company {
  id: string;
  name: string;
}

interface AssetStats {
  total: number;
  buildings: number;
  construction: number;
  area: number;
  security: number;
  infrastructure: number;
  [key: string]: number;
}

const AdminAssets: React.FC = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    companyId: ''
  });
  const navigate = useNavigate();
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [stats, setStats] = useState<AssetStats>({
    total: 0,
    buildings: 0,
    construction: 0,
    area: 0,
    security: 0,
    infrastructure: 0
  });

  useEffect(() => {
    if (!isAdmin) {
      setError('You do not have permission to access this page');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      return;
    }

    loadAssets();
    fetchCompanies();
  }, [isAdmin, navigate, filters]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const response = await adminService.getAllAssets();
      if (response && response.assets) {
        // Calculate stats
        const newStats = response.assets.reduce((acc: AssetStats, asset) => {
          acc.total++;
          const type = (asset.type || '').toLowerCase();
          // Only increment if it's a known type
          if (type === 'buildings' || type === 'construction' || type === 'area' || 
              type === 'security' || type === 'infrastructure') {
            acc[type]++;
          }
          return acc;
        }, { total: 0, buildings: 0, construction: 0, area: 0, security: 0, infrastructure: 0 });
        setStats(newStats);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await adminService.getAllCompanies();
      
      if (!response || !response.companies) {
        setCompanies([]);
      } else {
        
        // Make sure each company has a valid ID
        const processedCompanies = response.companies.map((company: any) => ({
          id: company.id || company.companyId || `company-${Math.random().toString(36).substring(2, 11)}`,
          name: company.name || company.companyName || 'Unknown Company'
        }));
        
        setCompanies(processedCompanies);
      }
    } catch (err: any) {
      setCompanies([]); // Set empty array on error
    }
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      type: '',
      companyId: ''
    });
    setSearchTerm('');
  };

  const handleExportAssets = () => {
    // Implementation for exporting assets
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Asset Management
            </h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {viewMode === 'list' ? <FiGrid className="mr-2" /> : <FiList className="mr-2" />}
              {viewMode === 'list' ? 'Grid View' : 'List View'}
            </button>
            <button
              type="button"
              onClick={handleExportAssets}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiDownload className="mr-2" />
              Export
            </button>
            <Link
              to="/admin/assets/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiMap className="mr-2" />
              Add New Asset
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-blue-100 rounded-md p-3">
                    <FiMap className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Assets</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-indigo-100 rounded-md p-3">
                    <FiPackage className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Buildings</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.buildings}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-yellow-100 rounded-md p-3">
                    <FiMap className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Construction</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.construction}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-green-100 rounded-md p-3">
                    <FiMap className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Area</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.area}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-purple-100 rounded-md p-3">
                    <FiMap className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Security</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.security}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-red-100 rounded-md p-3">
                    <FiMap className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Infrastructure</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.infrastructure}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                  Search
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="search"
                    id="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    placeholder="Search assets..."
                  />
                </div>
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Asset Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">All Types</option>
                  <option value="buildings">Buildings</option>
                  <option value="construction">Construction</option>
                  <option value="area">Area</option>
                  <option value="security">Security</option>
                  <option value="infrastructure">Infrastructure</option>
                </select>
              </div>

              <div>
                <label htmlFor="companyId" className="block text-sm font-medium text-gray-700">
                  Company
                </label>
                <select
                  id="companyId"
                  name="companyId"
                  value={filters.companyId}
                  onChange={(e) => handleFilterChange('companyId', e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">All Companies</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end space-x-3">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FiX className="mr-2" />
                  Clear
                </button>
                <button
                  type="button"
                  onClick={loadAssets}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FiRefreshCw className="mr-2" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiX className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Assets List */}
        <div className="bg-white shadow rounded-lg">
          <AdminAssetsList
            showActions={true}
            onDelete={async (assetId) => {
              try {
                await adminService.deleteAsset(assetId);
                loadAssets();
              } catch (err: any) {
                setError(err.message || 'Failed to delete asset');
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminAssets;
