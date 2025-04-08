import React, { useState } from 'react';
import { FiEdit, FiTrash2, FiExternalLink, FiChevronUp, FiChevronDown } from 'react-icons/fi';

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

interface AssetTableProps {
  assets: Asset[];
  loading: boolean;
  onEdit: (assetId: string) => void;
  onDelete: (assetId: string) => void;
  onViewDetails: (assetId: string) => void;
  selectedAssets: string[];
  onSelectAsset: (assetId: string) => void;
  onSelectAll: () => void;
}

type SortField = 'name' | 'companyName' | 'username' | 'type' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const AssetTable: React.FC<AssetTableProps> = ({
  assets,
  loading,
  onEdit,
  onDelete,
  onViewDetails,
  selectedAssets,
  onSelectAsset,
  onSelectAll
}) => {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAssets = [...assets].sort((a, b) => {
    // Special handling for dates
    if (sortField === 'createdAt') {
      const aDate = new Date(a[sortField]);
      const bDate = new Date(b[sortField]);
      if (aDate.getTime() === bDate.getTime()) return 0;
      const result = aDate < bDate ? -1 : 1;
      return sortDirection === 'asc' ? result : -result;
    }
    
    // Handle non-date fields
    const aValue = a[sortField];
    const bValue = b[sortField];
    if (aValue === bValue) return 0;
    const result = aValue < bValue ? -1 : 1;
    return sortDirection === 'asc' ? result : -result;
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <FiChevronUp className="inline ml-1" /> : <FiChevronDown className="inline ml-1" />;
  };

  const renderSortableHeader = (field: SortField, label: string) => (
    <th 
      scope="col" 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
      onClick={() => handleSort(field)}
    >
      {label} {getSortIcon(field)}
    </th>
  );

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded mr-2"
                  checked={selectedAssets.length === assets.length && assets.length > 0}
                  onChange={onSelectAll}
                />
                <span className="sr-only">Select All</span>
              </div>
            </th>
            {renderSortableHeader('name', 'Asset Name')}
            {renderSortableHeader('type', 'Type')}
            {renderSortableHeader('companyName', 'Company')}
            {renderSortableHeader('username', 'Created By')}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Registration
            </th>
            {renderSortableHeader('status', 'Status')}
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                <div className="flex justify-center items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
                  <span>Loading assets...</span>
                </div>
              </td>
            </tr>
          ) : sortedAssets.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                No assets found
              </td>
            </tr>
          ) : (
            sortedAssets.map(asset => (
              <tr key={asset.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    checked={selectedAssets.includes(asset.id)}
                    onChange={() => onSelectAsset(asset.id)}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {asset.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {asset.companyName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {asset.username}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {asset.registrationNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(asset.status)}`}>
                    {asset.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onViewDetails(asset.id)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                    title="View Asset Details"
                  >
                    <FiExternalLink />
                  </button>
                  <button
                    onClick={() => onEdit(asset.id)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                    title="Edit Asset"
                  >
                    <FiEdit />
                  </button>
                  <button
                    onClick={() => onDelete(asset.id)}
                    className="text-blue-600 hover:text-blue-900"
                    title="Delete Asset"
                  >
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AssetTable;
