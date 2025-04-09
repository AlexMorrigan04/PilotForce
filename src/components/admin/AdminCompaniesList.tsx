import React, { useState, useEffect } from 'react';
import * as adminService from '../../services/adminService';

interface Company {
  id: string;
  name: string;
  domain: string;
  status: string;
  createdAt: string;
  userCount?: number;
}

interface AdminCompaniesListProps {
  // Add props as needed
}

const AdminCompaniesList: React.FC<AdminCompaniesListProps> = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const response = await adminService.getAllCompanies();
        if (response && response.companies) {
          setCompanies(response.companies);
        }
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load companies');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  if (loading) {
    return <div>Loading companies...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Companies Management</h2>
      
      {companies.length === 0 ? (
        <p>No companies found.</p>
      ) : (
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Name</th>
              <th className="py-2 px-4 border-b">Domain</th>
              <th className="py-2 px-4 border-b">Status</th>
              <th className="py-2 px-4 border-b">Users</th>
              <th className="py-2 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(company => (
              <tr key={company.id}>
                <td className="py-2 px-4 border-b">{company.name}</td>
                <td className="py-2 px-4 border-b">{company.domain}</td>
                <td className="py-2 px-4 border-b">{company.status}</td>
                <td className="py-2 px-4 border-b">{company.userCount || 0}</td>
                <td className="py-2 px-4 border-b">
                  {/* Action buttons */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminCompaniesList;
