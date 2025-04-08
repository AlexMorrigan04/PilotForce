import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminNavbar from '../components/AdminNavbar';
import { FiSearch, FiRefreshCw, FiDownload, FiImage, FiMap, FiFile, FiExternalLink, FiTrash2 } from 'react-icons/fi';
import * as adminService from '../services/adminService';

interface Resource {
  id: string;
  bookingId: string;
  bookingName: string;
  companyId: string;
  companyName: string;
  resourceUrl: string;
  resourceType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  thumbnailUrl?: string;
}

interface Company {
  id: string;
  name: string;
}

const AdminResources: React.FC = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    company: '',
    type: '',
    dateFrom: '',
    dateTo: ''
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
    
    fetchResources();
    fetchCompanies();
  }, [isAdmin, navigate]);

  // Fetch resources from API
  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await adminService.getAllResources(filters);
      setResources(response.resources || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching resources:', err);
      setError(err.message || 'Failed to load resources');
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
    fetchResources();
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
      dateFrom: '',
      dateTo: ''
    });
  };

  // Filter resources based on search term
  const filteredResources = resources.filter(resource => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      resource.fileName.toLowerCase().includes(searchTermLower) ||
      resource.bookingName.toLowerCase().includes(searchTermLower) ||
      resource.companyName.toLowerCase().includes(searchTermLower) ||
      resource.resourceType.toLowerCase().includes(searchTermLower)
    );
  });

  // Toggle resource selection
  const handleToggleSelect = (resourceId: string) => {
    if (selectedResources.includes(resourceId)) {
      setSelectedResources(selectedResources.filter(id => id !== resourceId));
    } else {
      setSelectedResources([...selectedResources, resourceId]);
    }
  };

  // Select all displayed resources
  const handleSelectAll = () => {
    if (selectedResources.length === filteredResources.length) {
      setSelectedResources([]);
    } else {
      setSelectedResources(filteredResources.map(resource => resource.id));
    }
  };

  // Delete a resource
  const handleDeleteResource = async (resourceId: string, bookingId: string) => {
    if (window.confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
      try {
        setLoading(true);
        await adminService.deleteBookingResource(bookingId, resourceId);
        // Update local state
        setResources(resources.filter(resource => resource.id !== resourceId));
        setSelectedResources(selectedResources.filter(id => id !== resourceId));
        alert('Resource deleted successfully');
      } catch (err: any) {
        console.error('Error deleting resource:', err);
        setError(err.message || 'Failed to delete resource');
      } finally {
        setLoading(false);
      }
    }
  };

  // View booking details
  const handleViewBooking = (bookingId: string) => {
    navigate(`/admin/bookings/details/${bookingId}`);
  };

  // View resource in new tab
  const handleViewResource = (resourceUrl: string) => {
    window.open(resourceUrl, '_blank');
  };

  // Delete multiple resources
  const handleBulkDelete = async () => {
    if (selectedResources.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedResources.length} resources? This action cannot be undone.`)) {
      try {
        setLoading(true);
        
        let successCount = 0;
        const errorMessages: string[] = [];
        
        // Process deletions sequentially
        for (const resourceId of selectedResources) {
          const resource = resources.find(r => r.id === resourceId);
          if (!resource) continue;
          
          try {
            await adminService.deleteBookingResource(resource.bookingId, resourceId);
            successCount++;
          } catch (err: any) {
            errorMessages.push(`Failed to delete ${resource.fileName}: ${err.message}`);
          }
        }
        
        // Update local state
        setResources(resources.filter(resource => !selectedResources.includes(resource.id)));
        setSelectedResources([]);
        
        if (errorMessages.length > 0) {
          setError(`Deleted ${successCount} resources with ${errorMessages.length} errors:\n${errorMessages.join('\n')}`);
        } else {
          alert(`Successfully deleted ${successCount} resources`);
        }
      } catch (err: any) {
        console.error('Error in bulk delete operation:', err);
        setError(err.message || 'Failed to delete resources');
      } finally {
        setLoading(false);
      }
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Get appropriate icon based on resource type
  const getResourceIcon = (resource: Resource) => {
    if (resource.resourceType === 'image' || resource.mimeType.startsWith('image/')) {
      return <FiImage className="text-blue-500" />;
    } else if (resource.resourceType === 'geotiff' || 
              resource.fileName.endsWith('.tif') || 
              resource.fileName.endsWith('.tiff')) {
      return <FiMap className="text-green-500" />;
    } else {
      return <FiFile className="text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <AdminNavbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Resource Management</h1>
            <p className="text-gray-600">View and manage all uploaded resources</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button 
              onClick={() => {/* Export functionality */}}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              <FiDownload className="mr-2" />
              Export List
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Resource filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              Filters
            </h3>
            {(filters.company || filters.type || filters.dateFrom || filters.dateTo) && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                Clear Filters
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <select
                id="company"
                name="company"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={filters.company || ''}
                onChange={(e) => handleFilterChange('company', e.target.value)}
              >
                <option value="">All Companies</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Resource Type
              </label>
              <select
                id="type"
                name="type"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={filters.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <option value="">All Types</option>
                <option value="image">Images</option>
                <option value="geotiff">GeoTIFF Files</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                id="dateFrom"
                name="dateFrom"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                id="dateTo"
                name="dateTo"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Resource management controls */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="relative w-full sm:w-64 mb-4 sm:mb-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search resources..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {filteredResources.length} resource{filteredResources.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={fetchResources}
                className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                title="Refresh"
              >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          
          {selectedResources.length > 0 && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center">
              <span className="mr-4 text-sm text-blue-800">
                {selectedResources.length} resource{selectedResources.length !== 1 ? 's' : ''} selected
              </span>
              <button 
                onClick={handleBulkDelete}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          )}
          
          {/* Resources grid */}
          <div className="p-4">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading resources...</span>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No resources found
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredResources.map(resource => (
                  <div key={resource.id} className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="relative">
                      <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                        {resource.thumbnailUrl ? (
                          <img 
                            src={resource.thumbnailUrl} 
                            alt={resource.fileName}
                            className="w-full h-full object-cover"
                            onClick={() => handleViewResource(resource.resourceUrl)}
                          />
                        ) : (
                          <div 
                            className="flex flex-col items-center justify-center cursor-pointer"
                            onClick={() => handleViewResource(resource.resourceUrl)}
                          >
                            {getResourceIcon(resource)}
                            <span className="mt-2 text-sm text-gray-500">{resource.fileName.split('.').pop()?.toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      <div className="absolute top-2 left-2">
                        <input
                          type="checkbox"
                          checked={selectedResources.includes(resource.id)}
                          onChange={() => handleToggleSelect(resource.id)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-medium text-gray-900 truncate" title={resource.fileName}>
                          {resource.fileName}
                        </h3>
                        <span className="text-xs text-gray-500">{formatFileSize(resource.fileSize)}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 truncate" title={resource.bookingName}>
                        Booking: {resource.bookingName}
                      </p>
                      <p className="text-xs text-gray-500 truncate" title={resource.companyName}>
                        Company: {resource.companyName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Uploaded: {new Date(resource.uploadedAt).toLocaleDateString()}
                      </p>
                      <div className="mt-2 flex justify-between">
                        <div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            resource.resourceType === 'image' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {resource.resourceType}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewBooking(resource.bookingId)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Booking"
                          >
                            <FiExternalLink size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteResource(resource.id, resource.bookingId)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Resource"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Pagination could be added here if needed */}
        </div>
      </main>
    </div>
  );
};

export default AdminResources;
