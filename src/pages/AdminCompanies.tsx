import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminNavbar from '../components/AdminNavbar';
import CompanyTable from '../components/admin/CompanyTable';
import { FiBriefcase, FiSearch, FiRefreshCw, FiDownload } from 'react-icons/fi';
import * as adminService from '../services/adminService';
import { validateAmplifyConfig } from '../utils/apiUtils';

interface Company {
  id: string;
  name: string;
  primaryDomain: string;
  status: string;
  userCount: number;
  createdAt: string;
}

const AdminCompanies: React.FC = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Verify Amplify configuration
  useEffect(() => {
    validateAmplifyConfig();
  }, []);

  // Verify admin status and load data
  useEffect(() => {
    if (!isAdmin) {
      setError('You do not have permission to access this page');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      return;
    }
    
    fetchCompanies();
  }, [isAdmin, navigate]);

  // Fetch companies from API
  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const response = await adminService.getAllCompanies();
      
      // Check if response has companies array
      if (!response || !response.companies) {
        throw new Error('Invalid API response format');
      }
      
      // Log the raw data for debugging
      
      // Map the API response to our Company interface
      const mappedCompanies = response.companies.map((company: any) => ({
        id: company.CompanyId || company.id || '',
        name: company.Name || company.CompanyName || company.name || '',
        primaryDomain: company.PrimaryDomain || company.EmailDomain || company.domain || '',
        status: company.Status || company.status || 'Active',
        userCount: company.UserCount || company.userCount || 0,
        createdAt: company.CreatedAt || company.createdAt || ''
      }));
      
      setCompanies(mappedCompanies);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  // Filter companies based on search term
  const filteredCompanies = companies.filter(company => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      (company.name && company.name.toLowerCase().includes(searchTermLower)) ||
      (company.primaryDomain && company.primaryDomain.toLowerCase().includes(searchTermLower)) ||
      (company.status && company.status.toLowerCase().includes(searchTermLower))
    );
  });

  // Handle company selection for bulk actions
  const handleSelectAll = () => {
    if (selectedCompanies.length === filteredCompanies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(filteredCompanies.map(company => company.id));
    }
  };

  const handleSelectCompany = (companyId: string) => {
    if (selectedCompanies.includes(companyId)) {
      setSelectedCompanies(selectedCompanies.filter(id => id !== companyId));
    } else {
      setSelectedCompanies([...selectedCompanies, companyId]);
    }
  };

  // Company management actions
  const handleAddCompany = () => {
    navigate('/admin/companies/add');
  };

  const handleEditCompany = (companyId: string) => {
    navigate(`/admin/companies/edit/${companyId}`);
  };

  const handleViewCompanyDetails = (companyId: string) => {
    navigate(`/admin/companies/details/${companyId}`);
  };

  const handleManageCompanyUsers = (companyId: string) => {
    navigate(`/admin/companies/${companyId}/users`);
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (window.confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      try {
        setLoading(true);
        await adminService.deleteCompany(companyId);
        // Update local state
        setCompanies(companies.filter(company => company.id !== companyId));
        // Remove from selected companies if present
        setSelectedCompanies(selectedCompanies.filter(id => id !== companyId));
        alert('Company deleted successfully');
      } catch (err: any) {
        setError(err.message || 'Failed to delete company');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle bulk actions
  const handleBulkDelete = async () => {
    if (selectedCompanies.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedCompanies.length} companies? This action cannot be undone.`)) {
      try {
        setLoading(true);
        
        // Process deletions sequentially
        for (const companyId of selectedCompanies) {
          await adminService.deleteCompany(companyId);
        }
        
        // Update local state
        setCompanies(companies.filter(company => !selectedCompanies.includes(company.id)));
        setSelectedCompanies([]);
        alert('Companies deleted successfully');
      } catch (err: any) {
        setError(err.message || 'Failed to delete companies');
      } finally {
        setLoading(false);
      }
    }
  };

  // Export companies to CSV
  const handleExportCompanies = () => {
    const headers = ['Company Name', 'Domain', 'Status', 'Users', 'Created'];
    
    const csvData = filteredCompanies.map(company => [
      company.name,
      company.primaryDomain || '',
      company.status || 'Active',
      company.userCount.toString(),
      new Date(company.createdAt).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'companies.csv');
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
            <h1 className="text-3xl font-bold text-gray-900">Company Management</h1>
            <p className="text-gray-600">View and manage companies in the system</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button 
              onClick={handleAddCompany}
              className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-white hover:bg-blue-700 focus:outline-none"
            >
              <FiBriefcase className="mr-2" />
              Add Company
            </button>
            <button 
              onClick={handleExportCompanies}
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

        {/* Company management controls */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="relative w-full sm:w-64 mb-4 sm:mb-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search companies..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {filteredCompanies.length} company/companies
              </span>
              <button
                onClick={fetchCompanies}
                className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                title="Refresh"
              >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          
          {selectedCompanies.length > 0 && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center">
              <span className="mr-4 text-sm text-blue-800">
                {selectedCompanies.length} company/companies selected
              </span>
              <button 
                onClick={handleBulkDelete}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          )}
          
          {/* Company table */}
          <CompanyTable 
            companies={filteredCompanies}
            loading={loading}
            onEdit={handleEditCompany}
            onDelete={handleDeleteCompany}
            onViewDetails={handleViewCompanyDetails}
            onManageUsers={handleManageCompanyUsers}
            selectedCompanies={selectedCompanies}
            onSelectCompany={handleSelectCompany}
            onSelectAll={handleSelectAll}
          />
          
          {/* Pagination - could be implemented if needed */}
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredCompanies.length}</span> of <span className="font-medium">{filteredCompanies.length}</span> results
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminCompanies;
