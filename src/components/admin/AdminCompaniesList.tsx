import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiEye, FiUsers, FiCheck, FiX, FiAlertTriangle } from 'react-icons/fi';
import * as adminService from '../../services/adminService';
import AddCompanyModal from './AddCompanyModal';
import { securityAuditLogger } from '../../utils/securityAuditLogger';

// Interface for the raw API response
interface CompanyApiResponse {
  CompanyId?: string;
  companyId?: string;
  Name?: string;
  CompanyName?: string;
  companyName?: string;
  Status?: string;
  status?: string;
  UserCount?: number;
  userCount?: number;
  CreatedAt?: string;
  createdAt?: string;
  EmailDomain?: string;
  emailDomain?: string;
}

// Interface for our normalized company data
interface Company {
  CompanyId: string;
  Name: string;
  Status: string;
  UserCount: number;
  CreatedAt: string;
  EmailDomain: string;
  CompanyName: string;
}

interface AdminCompaniesListProps {
  onRefresh?: () => Promise<void>;
}

const AdminCompaniesList: React.FC<AdminCompaniesListProps> = ({ onRefresh }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [processingCompanyId, setProcessingCompanyId] = useState<string | null>(null);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllCompanies();
      if (response && response.companies) {
        // Map the response to match our Company interface
        const mappedCompanies = response.companies.map((company: CompanyApiResponse): Company => ({
          CompanyId: company.CompanyId || company.companyId || '',
          Name: company.Name || company.CompanyName || company.companyName || 'Unknown Company',
          Status: company.Status || company.status || 'Active',
          UserCount: company.UserCount || company.userCount || 0,
          CreatedAt: company.CreatedAt || company.createdAt || new Date().toISOString(),
          EmailDomain: company.EmailDomain || company.emailDomain || '',
          CompanyName: company.CompanyName || company.companyName || company.Name || ''
        }));
        setCompanies(mappedCompanies);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load companies data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    // Add event listener for opening the modal
    const handleOpenModal = () => setShowAddModal(true);
    document.addEventListener('openAddCompanyModal', handleOpenModal);

    // Cleanup
    return () => {
      document.removeEventListener('openAddCompanyModal', handleOpenModal);
    };
  }, []);

  const handleAddCompany = () => {
    setShowAddModal(true);
  };

  const handleCompanyAdded = async () => {
    setShowAddModal(false);
    if (onRefresh) {
      await onRefresh();
    } else {
      await loadCompanies();
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (processingCompanyId) return;

    // Find the company details for the confirmation dialog
    const company = companies.find(c => c.CompanyId === companyId);
    if (!company) {
      setError('Company not found');
      return;
    }

    // Create a more detailed confirmation message
    const confirmMessage = company.UserCount > 0 
      ? `Warning: This company has ${company.UserCount} active user(s). Deleting the company will remove all associated data. Are you sure you want to proceed?`
      : `Are you sure you want to delete "${company.Name}"? This action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      try {
        setProcessingCompanyId(companyId);
        
        // Log the delete attempt
        securityAuditLogger.logAdminAction(
          'admin',
          'delete_company_attempt',
          { 
            companyId, 
            companyName: company.Name,
            userCount: company.UserCount,
            timestamp: new Date().toISOString() 
          },
          true
        );
        
        await adminService.deleteCompany(companyId);
        await loadCompanies();
        setError(null);
        
        // Log successful deletion
        securityAuditLogger.logAdminAction(
          'admin',
          'delete_company_success',
          { 
            companyId, 
            companyName: company.Name,
            userCount: company.UserCount,
            timestamp: new Date().toISOString() 
          },
          true
        );
      } catch (err: any) {
        setError(err.message || 'Failed to delete company');
        
        // Log failed deletion
        securityAuditLogger.logAdminAction(
          'admin',
          'delete_company_failed',
          { 
            companyId, 
            companyName: company.Name,
            error: err.message, 
            timestamp: new Date().toISOString() 
          },
          false
        );
      } finally {
        setProcessingCompanyId(null);
      }
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'disabled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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

  if (companies.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded relative">
        No companies found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Company Details
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contact Info
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {companies.map((company) => (
            <tr key={company.CompanyId} 
                className={`hover:bg-gray-50 ${selectedCompany === company.CompanyId ? 'bg-blue-50' : ''}`}
                onClick={() => setSelectedCompany(company.CompanyId)}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {company.Name}
                  {company.UserCount > 0 && (
                    <FiAlertTriangle className="inline ml-2 h-4 w-4 text-yellow-500" title={`${company.UserCount} active user(s)`} />
                  )}
                </div>
                <div className="text-sm text-gray-500">{company.CompanyName}</div>
                <div className="text-sm text-gray-500">{company.EmailDomain}</div>
                <div className="text-sm text-gray-500">{new Date(company.CreatedAt).toLocaleDateString()}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">
                  Users: {company.UserCount}
                  {company.UserCount > 0 && (
                    <span className="ml-1 text-yellow-600 text-xs">(Active)</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(company.Status)}`}>
                  {company.Status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="flex space-x-3">
                  <Link
                    to={`/admin/companies/${company.CompanyId}/users`}
                    className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md text-sm flex items-center"
                  >
                    <FiUsers className="mr-1" /> Users
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCompany(company.CompanyId);
                    }}
                    disabled={processingCompanyId === company.CompanyId}
                    className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md text-sm flex items-center"
                  >
                    {processingCompanyId === company.CompanyId ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600 mr-2" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <FiTrash2 className="mr-1" /> Delete
                      </>
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Company Modal */}
      <AddCompanyModal 
        show={showAddModal} 
        onHide={() => setShowAddModal(false)} 
        onCompanyAdded={handleCompanyAdded}
      />
    </div>
  );
};

export default AdminCompaniesList;
