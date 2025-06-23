import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';

interface CompanyInvitationModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (email: string, role: string) => Promise<void>;
  companyId: string;
  companyName: string;
}

const CompanyInvitationModal: React.FC<CompanyInvitationModalProps> = ({ 
  show, 
  onClose, 
  onSubmit, 
  companyId,
  companyName 
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('User');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Reset form when modal is opened
    if (show) {
      setEmail('');
      setRole('User');
      setError(null);
      setSuccess(null);
    }
  }, [show]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!email || !role) {
        throw new Error('All fields are required');
      }

      // Validate email format
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailPattern.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Pass just email and role to parent component - companyId is already known
      await onSubmit(email, role);

      setSuccess(`Invitation sent successfully to ${email}!`);
      setEmail('');
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
        <Modal.Title>Invite Team Member</Modal.Title>
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
            <Form.Label>Company</Form.Label>
            <Form.Control
              type="text"
              value={companyName}
              disabled
            />
            <Form.Text className="text-muted">
              New user will be added to your company
            </Form.Text>
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
              <option value="SubUser">Sub User</option>
              <option value="CompanyAdmin">Company Admin</option>
            </Form.Select>
            <Form.Text className="text-muted">
              Defines what permissions the user will have. Sub Users have limited access to specific features.
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

export default CompanyInvitationModal;
