import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiEye, FiTrash2, FiEdit, FiMap } from 'react-icons/fi';
import * as adminService from '../../services/adminService';

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

interface AdminAssetsListProps {
  limit?: number;
  showActions?: boolean;
  onDelete?: (assetId: string) => void;
}

const AdminAssetsList: React.FC<AdminAssetsListProps> = ({
  limit,
  showActions = true,
  onDelete
}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllAssets();
      if (response && response.assets) {
        setAssets(response.assets);
      }
      setError(null);
    } catch (error: any) {
      setError('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const getAssetTypeColor = (assetType: string) => {
    switch(assetType?.toLowerCase()) {
      case 'buildings':
        return 'bg-blue-100 text-blue-800';
      case 'construction':
        return 'bg-yellow-100 text-yellow-800';
      case 'area':
        return 'bg-green-100 text-green-800';
      case 'security':
        return 'bg-purple-100 text-purple-800';
      case 'infrastructure':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Limit the number of assets to display if specified
  const displayedAssets = limit ? assets.slice(0, limit) : assets;

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded relative">
        No assets found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Asset Details
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Company
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {displayedAssets.map((asset) => (
            <tr key={asset.id} 
                className={`hover:bg-gray-50 ${selectedAsset === asset.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                onClick={() => setSelectedAsset(asset.id)}>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                <div className="text-sm text-gray-500">ID: {asset.id}</div>
                <div className="mt-1">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getAssetTypeColor(asset.type)}`}>
                    {asset.type}
                  </span>
                </div>
                {asset.registrationNumber && (
                  <div className="text-sm text-gray-500">Reg: {asset.registrationNumber}</div>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900">{asset.address}</div>
                <div className="text-sm text-gray-500">{asset.postcode}</div>
                {asset.area && (
                  <div className="text-sm text-gray-500">Area: {asset.area.toFixed(2)} m²</div>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900">{asset.companyName}</div>
                <div className="text-sm text-gray-500">Created by: {asset.username}</div>
                <div className="text-sm text-gray-500">{formatDate(asset.createdAt)}</div>
              </td>
              <td className="px-6 py-4 space-x-2">
                <div className="flex space-x-2">
                  <Link
                    to={`/admin/assets/details/${asset.id}`}
                    className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md text-sm flex items-center"
                    title="View Details"
                  >
                    <FiEye className="mr-1" /> View
                  </Link>
                  
                  <Link
                    to={`/admin/assets/edit/${asset.id}`}
                    className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1 rounded-md text-sm flex items-center"
                    title="Edit Asset"
                  >
                    <FiEdit className="mr-1" /> Edit
                  </Link>
                  
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this asset? This action cannot be undone.')) {
                          onDelete(asset.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md text-sm flex items-center"
                      title="Delete Asset"
                    >
                      <FiTrash2 className="mr-1" /> Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminAssetsList; 