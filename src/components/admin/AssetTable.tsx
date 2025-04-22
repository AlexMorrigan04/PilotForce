import React, { useEffect } from 'react';
import { FiEdit, FiTrash2, FiEye, FiMapPin } from 'react-icons/fi';

interface Asset {
  id: string;
  name: string;
  type: string;
  address?: string;
  postcode?: string;
  area?: string;
  coordinates?: string;
  description?: string;
  companyId: string;
  companyName: string;
  userId: string;
  username: string;
  tags?: string[];
  registrationNumber: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

interface AssetTableProps {
  assets: Asset[];
  loading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onViewDetails: (id: string) => void;
  selectedAssets: string[];
  onSelectAsset: (id: string) => void;
  onSelectAll: () => void;
}

const AssetTable: React.FC<AssetTableProps> = ({
  assets,
  loading,
  onEdit,
  onDelete,
  onViewDetails,
  selectedAssets,
  onSelectAsset,
  onSelectAll,
}) => {
  // Add debugging to check what assets are being received
  useEffect(() => {
    console.log('AssetTable received assets:', assets);
  }, [assets]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Format area to display with two decimal places and add "m²"
  const formatArea = (area: string | undefined) => {
    if (!area) return 'N/A';
    try {
      const numArea = parseFloat(area);
      return `${numArea.toFixed(2)} m²`;
    } catch (e) {
      return area;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={selectedAssets.length > 0 && selectedAssets.length === assets.length}
                  onChange={onSelectAll}
                />
              </div>
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Asset
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Area
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Company
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created Date
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            Array(5).fill(0).map((_, index) => (
              <tr key={`skeleton-${index}`} className="animate-pulse">
                {/* Loading skeleton cells */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </td>
              </tr>
            ))
          ) : assets && assets.length > 0 ? (
            assets.map((asset) => {
              // Add console log to track rendering of each asset row
              console.log('Rendering asset row:', asset);
              return (
                <tr key={asset.id || `asset-${Math.random().toString(36).substring(2, 9)}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={selectedAssets.includes(asset.id)}
                        onChange={() => onSelectAsset(asset.id)}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{asset.name || 'Unnamed Asset'}</div>
                    <div className="text-xs text-gray-500">{asset.description?.substring(0, 30) || 'No description'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {asset.type || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FiMapPin className="text-gray-500 mr-1" />
                      <div>
                        <div className="text-sm text-gray-900">{asset.address || 'No address'}</div>
                        <div className="text-xs text-gray-500">{asset.postcode || 'No postcode'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatArea(asset.area)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {asset.companyName || 'Unknown Company'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${asset.status === 'Active' ? 'bg-green-100 text-green-800' : 
                        asset.status === 'Maintenance' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'}`}>
                      {asset.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(asset.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => onViewDetails(asset.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <FiEye />
                      </button>
                      <button
                        onClick={() => onEdit(asset.id)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit"
                      >
                        <FiEdit />
                      </button>
                      <button
                        onClick={() => onDelete(asset.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                No assets found. Try changing your filters or add new assets.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AssetTable;
