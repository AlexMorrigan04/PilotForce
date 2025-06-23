import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import * as adminService from '../../services/adminService';

interface InvitationModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (email: string, companyId: string, companyName: string, role: string) => Promise<void>;
  companies?: Array<{ id: string; name: string }>;
}

const InvitationModal: React.FC<InvitationModalProps> = ({ show, onClose, onSubmit, companies: propCompanies = [] }) => {
  const [email, setEmail] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('User');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>(propCompanies);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);

  const handleCompanyChange = (selectedCompanyId: string) => {
    setCompanyId(selectedCompanyId);
    const selected = companies.find(company => company.id === selectedCompanyId);
    setCompanyName(selected?.name || '');
  };

  const getAuthToken = () => {
    const tokensString = localStorage.getItem('tokens');
    if (tokensString) {
      try {
        const tokens = JSON.parse(tokensString);
        if (tokens.idToken) {
          return tokens.idToken;
        }
      } catch (e) {
      }
    }
    
    const idToken = localStorage.getItem('idToken');
    if (idToken) return idToken;
    
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) return accessToken;
    
    return null;
  };

  const fetchCompanies = async () => {
    try {
      setCompaniesLoading(true);
      setCompaniesError(null);
      
      const token = getAuthToken();
      
      if (!token) {
        throw new Error('Authentication token missing');
      }
      const response = await adminService.getAllCompanies();
      
      if (response && response.companies) {
        const formattedCompanies = response.companies.map(company => ({
          id: company.CompanyId || '',
          name: company.Name || 'Unknown Company'
        }));
        setCompanies(formattedCompanies);
      }
    } catch (err: any) {
      if (err.message === 'Authentication token missing') {
        setCompaniesError("Authentication error. Please log in again.");
      } else {
        setCompaniesError("Failed to load companies");
      }
      
      if (propCompanies && propCompanies.length > 0) {
        setCompanies(propCompanies);
        setCompaniesError(null);
      }
    } finally {
      setCompaniesLoading(false);
    }
  };
  
  useEffect(() => {
    if (show && companies.length === 0) {
      fetchCompanies();
    }
    
    if (show && !getAuthToken()) {
      setError('Authentication token missing. Please refresh and log in again.');
    }
  }, [show, propCompanies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = getAuthToken();
      
      if (!token) {
        throw new Error('Authentication token missing');
      }
      if (!email || !companyId || !companyName || !role) {
        throw new Error('All fields are required');
      }

      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailPattern.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      await onSubmit(email, companyId, companyName, role);

      setSuccess(`Invitation sent successfully to ${email}!`);

      setEmail('');
      setCompanyId('');
      setCompanyName('');
      setRole('User');
      
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
      
    } catch (err: any) {
      if (err.message && err.message.includes('Authentication')) {
        setError('Authentication error. Please refresh the page and log in again.');
      } else if (err.message && err.message.includes('already been sent')) {
        setError('An invitation has already been sent to this email address');
      } else {
        setError(err.message || 'Failed to send invitation');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Send User Invitation</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" className="mb-3">
            {success}
          </Alert>
        )}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Email Address*</Form.Label>
            <Form.Control
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <Form.Text className="text-muted">
              An invitation will be sent to this email address
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Company*</Form.Label>
            <Form.Select
              value={companyId}
              onChange={(e) => handleCompanyChange(e.target.value)}
              required
              disabled={loading || companiesLoading}
            >
              <option value="">Select a company</option>
              {companiesLoading ? (
                <option disabled>Loading companies...</option>
              ) : (
                companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))
              )}
            </Form.Select>
            {companiesError && (
              <Form.Text className="text-danger">
                {companiesError}
              </Form.Text>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Role*</Form.Label>
            <Form.Select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              disabled={loading}
            >
              <option value="User">User</option>
              <option value="CompanyAdmin">Company Admin</option>
            </Form.Select>
            <Form.Text className="text-muted">
              Defines what permissions the user will have
            </Form.Text>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="mr-2"
              />
              Sending...
            </>
          ) : (
            'Send Invitation'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default InvitationModal;
