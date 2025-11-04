import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = ({ isPatient = true }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const basePath = isPatient ? '/patient' : '/researcher';

  const currentPath = location.pathname;

  return (
    <>
      {/* Top Header Bar */}
      <div className="top-header">
        <div className="container">
          <div className="top-header-content">
            <Link to={basePath + '/dashboard'} className="logo-brand">
              <span className="logo-cura">Cura</span>
              <span className="logo-link">Link</span>
            </Link>
            <div className="header-user-section">
              <span className="welcome-text">Welcome, {isPatient ? 'Patient' : 'Researcher'}</span>
              <button onClick={handleLogout} className="logout-link">
                → Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <nav className="navbar">
        <div className="container">
          <div className="navbar-tabs">
            {isPatient ? (
              <>
                <Link 
                  to={basePath + '/dashboard'} 
                  className={`nav-tab ${currentPath.includes('/dashboard') ? 'active' : ''}`}
                >
                  <span className="nav-icon">📋</span> Dashboard
                </Link>
                <Link 
                  to={basePath + '/experts'} 
                  className={`nav-tab ${currentPath.includes('/experts') ? 'active' : ''}`}
                >
                  <span className="nav-icon">👥</span> Health Experts
                </Link>
                <Link 
                  to={basePath + '/trials'} 
                  className={`nav-tab ${currentPath.includes('/trials') ? 'active' : ''}`}
                >
                  <span className="nav-icon">🔍</span> Clinical Trials
                </Link>
                <Link 
                  to={basePath + '/publications'} 
                  className={`nav-tab ${currentPath.includes('/publications') ? 'active' : ''}`}
                >
                  <span className="nav-icon">📖</span> Publications
                </Link>
                <Link 
                  to={basePath + '/forums'} 
                  className={`nav-tab ${currentPath.includes('/forums') ? 'active' : ''}`}
                >
                  <span className="nav-icon">💬</span> Forums
                </Link>
                <Link 
                  to={basePath + '/favorites'} 
                  className={`nav-tab ${currentPath.includes('/favorites') ? 'active' : ''}`}
                >
                  <span className="nav-icon">⭐</span> Favorites
                </Link>
              </>
            ) : (
              <>
                <Link 
                  to={basePath + '/dashboard'} 
                  className={`nav-tab ${currentPath.includes('/dashboard') ? 'active' : ''}`}
                >
                  <span className="nav-icon">📋</span> Dashboard
                </Link>
                <Link 
                  to={basePath + '/collaborators'} 
                  className={`nav-tab ${currentPath.includes('/collaborators') ? 'active' : ''}`}
                >
                  <span className="nav-icon">👥</span> Collaborators
                </Link>
                <Link 
                  to={basePath + '/trials'} 
                  className={`nav-tab ${currentPath.includes('/trials') ? 'active' : ''}`}
                >
                  <span className="nav-icon">🔍</span> My Trials
                </Link>
                <Link 
                  to={basePath + '/forums'} 
                  className={`nav-tab ${currentPath.includes('/forums') ? 'active' : ''}`}
                >
                  <span className="nav-icon">💬</span> Forums
                </Link>
                <Link 
                  to={basePath + '/favorites'} 
                  className={`nav-tab ${currentPath.includes('/favorites') ? 'active' : ''}`}
                >
                  <span className="nav-icon">⭐</span> Favorites
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;

