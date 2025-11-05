import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './ResearcherOnboarding.css';

const ResearcherOnboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Redirect if user is not a researcher
    // Only redirect if we're sure user exists and is wrong type
    // Don't redirect if user is null (still loading)
    if (user && user.user_type !== 'researcher') {
      if (user.user_type === 'patient') {
        navigate('/onboarding/patient');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  const [formData, setFormData] = useState({
    specialties: [],
    research_interests: [],
    orcid_id: '',
    researchgate_id: '',
    available_for_meetings: false,
    bio: '',
  });

  const [currentInterest, setCurrentInterest] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-defined specialties
  const availableSpecialties = [
    'Oncology',
    'Neurology',
    'Immunology',
    'Cardiology',
    'Endocrinology',
    'Gastroenterology',
    'Pulmonology',
    'Rheumatology',
  ];

  const handleSpecialtyToggle = (specialty) => {
    setFormData((prev) => {
      const isSelected = prev.specialties.includes(specialty);
      return {
        ...prev,
        specialties: isSelected
          ? prev.specialties.filter((s) => s !== specialty)
          : [...prev.specialties, specialty],
      };
    });
  };

  const addInterest = () => {
    if (currentInterest.trim()) {
      setFormData({
        ...formData,
        research_interests: [...formData.research_interests, currentInterest.trim()],
      });
      setCurrentInterest('');
    }
  };

  const removeInterest = (index) => {
    setFormData({
      ...formData,
      research_interests: formData.research_interests.filter((_, i) => i !== index),
    });
  };

  const handleInputChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (currentStep === 1) {
        // Move to step 2
        setCurrentStep(2);
        setLoading(false);
      } else {
        // Verify token exists before making request
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required. Please refresh the page and try again.');
          setLoading(false);
          return;
        }

        // Submit final form
        await api.put('/researchers/profile', formData);
        // Ensure loading is set to false before navigation
        setLoading(false);
        // Small delay to ensure state is updated
        setTimeout(() => {
          navigate('/researcher/dashboard');
        }, 100);
      }
    } catch (err) {
      console.error('Profile update error:', err);
      const errorMessage = err.response?.data?.error || 'Failed to save profile. Please try again.';
      
      // If 401, user needs to re-authenticate
      if (err.response?.status === 401) {
        setError('Session expired. Please refresh the page and try again.');
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else {
        setError(errorMessage);
      }
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="researcher-onboarding-page">
      <div className="container">
        <div className="researcher-onboarding-card">
          <div className="onboarding-header">
            <h1>Researcher Profile Setup</h1>
            <span className="step-indicator">Step {currentStep} of {totalSteps}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>

          {error && <div className="error">{error}</div>}

          {currentStep === 1 ? (
            <form onSubmit={handleSubmit}>
              <div className="expertise-section">
                <h2 className="section-title">Your Expertise</h2>
                <p className="section-description">
                  Select your specialties and research interests to connect with relevant opportunities.
                </p>

                <div className="input-group">
                  <label className="field-label">Specialties</label>
                  <div className="specialties-grid">
                    {availableSpecialties.map((specialty) => (
                      <button
                        key={specialty}
                        type="button"
                        className={`specialty-tag ${
                          formData.specialties.includes(specialty) ? 'selected' : ''
                        }`}
                        onClick={() => handleSpecialtyToggle(specialty)}
                      >
                        {specialty}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="input-group">
                  <label className="field-label">Research Interests</label>
                  <div className="interest-input-group">
                    <input
                      type="text"
                      value={currentInterest}
                      onChange={(e) => setCurrentInterest(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addInterest();
                        }
                      }}
                      placeholder="e.g., Immunotherapy, Clinical AI, Gene Therapy"
                      className="interest-input"
                    />
                    <button
                      type="button"
                      onClick={addInterest}
                      className="add-interest-btn"
                    >
                      +
                    </button>
                  </div>
                  {formData.research_interests.length > 0 && (
                    <div className="interests-list">
                      {formData.research_interests.map((interest, index) => (
                        <span key={index} className="interest-tag">
                          {interest}
                          <button
                            type="button"
                            onClick={() => removeInterest(index)}
                            className="interest-remove"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" className="continue-btn" disabled={loading}>
                Continue →
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="field-label">ORCID ID (optional)</label>
                <input
                  type="text"
                  name="orcid_id"
                  value={formData.orcid_id}
                  onChange={handleInputChange}
                  placeholder="0000-0000-0000-0000"
                />
                <small className="help-text">
                  We'll automatically import your publications if you provide your ORCID
                </small>
              </div>

              <div className="input-group">
                <label className="field-label">ResearchGate ID (optional)</label>
                <input
                  type="text"
                  name="researchgate_id"
                  value={formData.researchgate_id}
                  onChange={handleInputChange}
                  placeholder="Your ResearchGate profile URL or ID"
                />
              </div>

              <div className="input-group">
                <label className="field-label">Bio (optional)</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Tell us about your research background and interests..."
                  rows="4"
                />
              </div>

              <div className="input-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="available_for_meetings"
                    checked={formData.available_for_meetings}
                    onChange={handleInputChange}
                  />
                  Available for meetings with patients
                </label>
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleBack} className="btn btn-outline">
                  Back
                </button>
                <button type="submit" className="continue-btn" disabled={loading}>
                  {loading ? 'Saving...' : 'Complete Setup'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResearcherOnboarding;

