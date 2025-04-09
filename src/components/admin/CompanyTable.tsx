import React from 'react';
import { FiEdit, FiTrash2, FiEye, FiUsers, FiAward } from 'react-icons/fi';

interface Company {
  id: string;
  name: string;
  primaryDomain: string;
  status: string;
  userCount: number;
  createdAt: string;
}

interface CompanyTableProps {
  companies: Company[];
  loading: boolean;
  onEdit: (companyId: string) => void;
  onDelete: (companyId: string) => void;
  onViewDetails: (companyId: string) => void;
  onManageUsers: (companyId: string) => void;
  selectedCompanies: string[];
  onSelectCompany: (companyId: string) => void;
  onSelectAll: () => void;
}

const CompanyTable: React.FC<CompanyTableProps> = ({
  companies,
  loading,
  onEdit,
  onDelete,
  onViewDetails,
  onManageUsers,
  selectedCompanies,
  onSelectCompany,
  onSelectAll
}) => {
  // Format date strings for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  // Get status badge style based on status
  const getStatusBadgeStyle = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    const statusLower = status.toLowerCase();
    if (statusLower === 'active') return 'bg-green-100 text-green-800';
    if (statusLower === 'inactive') return 'bg-red-100 text-red-800';
    if (statusLower === 'pending') return 'bg-yellow-100 text-yellow-800';
    if (statusLower === 'suspended') return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No companies found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  checked={selectedCompanies.length > 0 && selectedCompanies.length === companies.length}
                  onChange={onSelectAll}
                />
              </div>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Company Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email Domain
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Users
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {companies.map((company) => (
            <tr key={company.id} className="hover:bg-gray-50">
              <td className="px-3 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    checked={selectedCompanies.includes(company.id)}
                    onChange={() => onSelectCompany(company.id)}
                  />
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{company.name || 'Unnamed Company'}</div>
                <div className="text-xs text-gray-500">ID: {company.id ? company.id.slice(0, 8) : 'N/A'}</div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                {company.primaryDomain || 'N/A'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeStyle(company.status)}`}>
                  {company.status || 'Unknown'}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                {company.userCount || 0}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(company.createdAt)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => onViewDetails(company.id)}
                    className="text-blue-600 hover:text-blue-900"
                    title="View details"
                  >
                    <FiEye className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onManageUsers(company.id)}
                    className="text-indigo-600 hover:text-indigo-900"
                    title="Manage company users"
                  >
                    <FiUsers className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onEdit(company.id)}
                    className="text-green-600 hover:text-green-900"
                    title="Edit company"
                  >
                    <FiEdit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onDelete(company.id)}
                    className="text-red-600 hover:text-red-900"
                    title="Delete company"
                  >
                    <FiTrash2 className="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CompanyTable;
