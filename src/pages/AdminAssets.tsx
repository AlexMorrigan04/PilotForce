import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminNavbar from '../components/AdminNavbar';
import AssetTable from '../components/admin/AssetTable';
import AssetFilters from '../components/admin/AssetFilters';
import { FiSearch, FiRefreshCw, FiDownload } from 'react-icons/fi';
import * as adminService from '../services/adminService';

interface Asset {
  id: string;
  name: string;
  type: string;
  companyId: string;
  companyName: string;
  userId: string;
  username: string;
  registrationNumber: string;
  status: string;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
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
    company: '',
    type: '',
    status: ''
  });
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
    
    fetchAssets();
    fetchCompanies();
  }, [isAdmin, navigate]);

  // Fetch assets from API
  const fetchAssets = async () => {
    setLoading(true);
    try {
      const response = await adminService.getAllAssets(filters);
      setAssets(response.assets || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching assets:', err);
      setError(err.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  // Fetch companies for filters
  const fetchCompanies = async () => {
    try {
      const response = await adminService.getAllCompanies();
      setCompanies(response.companies || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  // Apply filters
  useEffect(() => {
    fetchAssets();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      company: '',
      type: '',
      status: ''
    });
  };

  // Filter assets based on search term
  const filteredAssets = assets.filter(asset => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      asset.name.toLowerCase().includes(searchTermLower) ||
      asset.companyName.toLowerCase().includes(searchTermLower) ||
      asset.username.toLowerCase().includes(searchTermLower) ||
      asset.registrationNumber.toLowerCase().includes(searchTermLower) ||
      asset.type.toLowerCase().includes(searchTermLower) ||
      asset.status.toLowerCase().includes(searchTermLower)
    );
  });

  // Handle asset selection for bulk actions
  const handleSelectAll = () => {
    if (selectedAssets.length === filteredAssets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(filteredAssets.map(asset => asset.id));
    }
  };

  const handleSelectAsset = (assetId: string) => {
    if (selectedAssets.includes(assetId)) {
      setSelectedAssets(selectedAssets.filter(id => id !== assetId));
    } else {
      setSelectedAssets([...selectedAssets, assetId]);
    }
  };

  // Asset management actions
  const handleEditAsset = (assetId: string) => {
    navigate(`/admin/assets/edit/${assetId}`);
  };

  const handleViewAssetDetails = (assetId: string) => {
    navigate(`/admin/assets/details/${assetId}`);
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (window.confirm('Are you sure you want to delete this asset? This action cannot be undone.')) {
      try {
        setLoading(true);
        // Call API to delete asset
        // In a real implementation, this would use an API endpoint
        // await adminService.deleteAsset(assetId);
        
        // For now, just update the UI
        setAssets(assets.filter(asset => asset.id !== assetId));
        setSelectedAssets(selectedAssets.filter(id => id !== assetId));
        alert('Asset deleted successfully');
      } catch (err: any) {
        console.error('Error deleting asset:', err);
        setError(err.message || 'Failed to delete asset');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle bulk actions
  const handleBulkDelete = async () => {
    if (selectedAssets.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedAssets.length} assets? This action cannot be undone.`)) {
      try {
        setLoading(true);
        
        // For now, just update the UI
        setAssets(assets.filter(asset => !selectedAssets.includes(asset.id)));
        setSelectedAssets([]);
        alert('Assets deleted successfully');
      } catch (err: any) {
        console.error('Error deleting assets:', err);
        setError(err.message || 'Failed to delete assets');
      } finally {
        setLoading(false);
      }
    }
  };

  // Export assets to CSV
  const handleExportAssets = () => {
    const headers = ['Name', 'Type', 'Company', 'Created By', 'Registration', 'Status'];
    
    const csvData = filteredAssets.map(asset => [
      asset.name,
      asset.type,
      asset.companyName,
      asset.username,
      asset.registrationNumber,
      asset.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'assets.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <AdminNavbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Asset Management</h1>
            <p className="text-gray-600">View and manage all system assets</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button 
              onClick={handleExportAssets}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              <FiDownload className="mr-2" />
              Export CSV
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Asset filters */}
        <AssetFilters 
          companies={companies}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />

        {/* Asset management controls */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="relative w-full sm:w-64 mb-4 sm:mb-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search assets..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={fetchAssets}
                className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                title="Refresh"
              >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          
          {selectedAssets.length > 0 && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center">
              <span className="mr-4 text-sm text-blue-800">
                {selectedAssets.length} asset{selectedAssets.length !== 1 ? 's' : ''} selected
              </span>
              <button 
                onClick={handleBulkDelete}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          )}
          
          {/* Asset table */}
          <AssetTable 
            assets={filteredAssets}
            loading={loading}
            onEdit={handleEditAsset}
            onDelete={handleDeleteAsset}
            onViewDetails={handleViewAssetDetails}
            selectedAssets={selectedAssets}
            onSelectAsset={handleSelectAsset}
            onSelectAll={handleSelectAll}
          />
          
          {/* Pagination - could be implemented if needed */}
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredAssets.length}</span> of <span className="font-medium">{filteredAssets.length}</span> results
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAssets;
