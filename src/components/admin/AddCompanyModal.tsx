import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import * as adminService from '../../services/adminService';

interface AddCompanyModalProps {
  show: boolean;
  onHide: () => void;
  onCompanyAdded: () => void;
}

const AddCompanyModal: React.FC<AddCompanyModalProps> = ({ show, onHide, onCompanyAdded }) => {
  const [companyName, setCompanyName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);

  const resetForm = () => {
    setCompanyName('');
    setError(null);
    setValidated(false);
  };

  const handleClose = () => {
    resetForm();
    onHide();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    
    if (!form.checkValidity()) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const companyData = {
        Name: companyName,
        Status: 'Active',
        UserCount: 0,
        CreatedAt: new Date().toISOString()
      };
      const response = await adminService.createCompany(companyData);
      
      if (response && response.success) {
        resetForm();
        onCompanyAdded();
        onHide();
      } else {
        setError(response?.message || 'Failed to create company');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Add New Company</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form noValidate validated={validated} onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Company Name <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name"
              required
            />
            <Form.Control.Feedback type="invalid">
              Company name is required
            </Form.Control.Feedback>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit} 
          disabled={isSubmitting || !companyName.trim()}
        >
          {isSubmitting ? 'Creating...' : 'Create Company'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddCompanyModal;
