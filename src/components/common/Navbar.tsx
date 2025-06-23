import React from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiLogOut } from 'react-icons/fi';

const AdminNavbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, logout } = useAuth();

  // Only show admin navbar if user has admin privileges
  if (!isAdmin) {
    return null;
  }

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
    }
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
      <Container>
        <Navbar.Brand as={Link} to="/admin">PilotForce Admin</Navbar.Brand>
        <Navbar.Toggle aria-controls="admin-navbar-nav" />
        <Navbar.Collapse id="admin-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link 
              as={Link} 
              to="/admin/users" 
              className={isActive('/admin/users')}
            >
              User Management
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/admin/companies" 
              className={isActive('/admin/companies')}
            >
              Company Management
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/admin/assets" 
              className={isActive('/admin/assets')}
            >
              Asset Management
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/admin/bookings" 
              className={isActive('/admin/bookings')}
            >
              Booking Management
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/admin/system-logs" 
              className={isActive('/admin/system-logs')}
            >
              System Logs
            </Nav.Link>
          </Nav>
          <Nav>
            <Nav.Link as={Link} to="/dashboard" className="me-3">Back to Dashboard</Nav.Link>
            <Nav.Link 
              onClick={handleLogout}
              className="d-flex align-items-center text-danger"
            >
              <FiLogOut className="me-1" />
              Logout
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AdminNavbar;
