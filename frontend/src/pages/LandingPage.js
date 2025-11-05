import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Silent demo register to remove visible signup/login flows
  const silentStart = async (type) => {
    setIsLoading(true);
    setError(''); // Clear any previous errors
    // Check if we already have a user of this type in localStorage
    const existingUser = localStorage.getItem('user');
    if (existingUser) {
      const user = JSON.parse(existingUser);
      // If user is already the correct type, navigate directly
      if (user?.user_type === type) {
        setIsLoading(false);
        return navigate(type === 'patient' ? '/onboarding/patient' : '/onboarding/researcher');
      }
    }
    
    // Create a demo account silently with a consistent identifier based on type
    const suffix = type === 'patient' ? 'patient_demo' : 'researcher_demo';
    const email = `${suffix}@curalink.local`;
    const password = `Demo!${suffix}`;
    const name = type === 'patient' ? 'Patient User' : 'Researcher User';
    
    try {
      const result = await register(email, password, type, name);
      if (result?.success) {
        // Verify token was saved
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('Token not saved after registration');
          setError('Registration succeeded but authentication failed. Please try again.');
          setIsLoading(false);
          return;
        }
        navigate(type === 'patient' ? '/onboarding/patient' : '/onboarding/researcher');
      } else {
        // If registration fails (user might already exist), try to login instead
        try {
          const loginResult = await api.post('/auth/login', { email, password });
          if (loginResult.data.token) {
            localStorage.setItem('token', loginResult.data.token);
            localStorage.setItem('user', JSON.stringify(loginResult.data.user));
            // Verify token was saved
            const token = localStorage.getItem('token');
            if (!token) {
              console.error('Token not saved after login');
              setError('Login succeeded but authentication failed. Please try again.');
              setIsLoading(false);
              return;
            }
            // Token will be automatically added by interceptor on next request
            navigate(type === 'patient' ? '/onboarding/patient' : '/onboarding/researcher');
          } else {
            console.error('No token in login response');
            setError('Login failed. Please try again.');
            setIsLoading(false);
          }
        } catch (loginError) {
          console.error('Login error:', loginError);
          setError('Authentication failed. Please try again.');
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Failed to start. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="container">
          <div className="header-content">
            <div className="header-logo">
              <span className="logo-cura">Cura</span>
              <span className="logo-link">Link</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="landing-hero">
        <div className="container">
          <div className="hero-content">
            {/* Main Title */}
            <h1 className="hero-title animate-slide-up">
              <span className="title-prefix">Welcome to </span>
              <span className="title-cura">Cura</span>
              <span className="title-link">Link</span>
            </h1>

            {/* Subtitle with highlighted words */}
            <p className="hero-subtitle animate-fade-in-delay">
              Connecting <span className="highlight-blue">patients</span> and <span className="highlight-purple">researchers</span> to discover relevant clinical trials, medical publications, and health experts.
            </p>

            {/* Error Message */}
            {error && (
              <div className="error-message" style={{ 
                padding: '12px 20px', 
                margin: '20px auto', 
                maxWidth: '600px',
                backgroundColor: '#fee',
                color: '#c33',
                borderRadius: '8px',
                border: '1px solid #fcc',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            {/* Feature Highlights */}
            <div className="feature-highlights animate-fade-in-delay-2">
              <div className="feature-item">
                <span className="checkmark">✓</span>
                <span>Free Access</span>
              </div>
              <div className="feature-item">
                <span className="checkmark">✓</span>
                <span>AI-Powered</span>
              </div>
              <div className="feature-item">
                <span className="checkmark">✓</span>
                <span>Trusted Platform</span>
              </div>
            </div>

            {/* User Type Cards */}
            <div className="user-type-cards">
              {/* Patient Card */}
              <div 
                className={`user-card patient-card animate-slide-up-card ${isLoading ? 'loading' : ''}`}
                onClick={() => !isLoading && silentStart('patient')}
              >
                <div className="card-icon patient-icon">
                  <span className="icon-heart">❤️</span>
                </div>
                <h2 className="card-title">I am a Patient or Caregiver</h2>
                <p className="card-description">
                  Find clinical trials, health experts, and medical publications tailored to your condition.
                </p>
                <div className="card-cta">
                  <span className="cta-text blue">{isLoading ? 'Loading...' : 'Get Started'}</span>
                  <span className={`cta-arrow blue ${isLoading ? 'hidden' : ''}`}>→</span>
                </div>
              </div>

              {/* Researcher Card */}
              <div 
                className={`user-card researcher-card animate-slide-up-card-delay ${isLoading ? 'loading' : ''}`}
                onClick={() => !isLoading && silentStart('researcher')}
              >
                <div className="card-icon researcher-icon">
                  <span className="icon-search">🔍</span>
                </div>
                <h2 className="card-title">I am a Researcher</h2>
                <p className="card-description">
                  Connect with collaborators, manage clinical trials, and engage with the research community.
                </p>
                <div className="card-cta">
                  <span className="cta-text purple">{isLoading ? 'Loading...' : 'Get Started'}</span>
                  <span className={`cta-arrow purple ${isLoading ? 'hidden' : ''}`}>→</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Animated background elements */}
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            {/* Company Info Column */}
            <div className="footer-column">
              <h3 className="footer-logo">CuraLink</h3>
              <p className="footer-tagline">Transforming ideas into reality through innovative solutions.</p>
            </div>

            {/* Quick Links Column */}
            <div className="footer-column">
              <h4 className="footer-heading">Quick Links</h4>
              <ul className="footer-links">
                <li><a href="#" onClick={(e) => { e.preventDefault(); silentStart('patient'); }}>Patient Portal</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); silentStart('researcher'); }}>Researcher Portal</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="footer-bottom">
            <div className="footer-separator"></div>
            <div className="footer-bottom-content">
              <p className="footer-copyright">© 2025 CuraLink. All rights reserved.</p>
              <div className="footer-bottom-links">
                <a href="#contact">Contact Us</a>
                <a href="#about">About</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

