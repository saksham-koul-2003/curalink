import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './PatientOnboarding.css';

const PatientOnboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Redirect if user is not a patient
    if (user && user.user_type !== 'patient') {
      if (user.user_type === 'researcher') {
        navigate('/onboarding/researcher');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  const [formData, setFormData] = useState({
    natural_language_input: '',
    conditions: [],
    location: '',
  });
  const [currentCondition, setCurrentCondition] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const addCondition = () => {
    if (currentCondition.trim()) {
      // Normalize condition to lowercase for display
      const normalizedCondition = currentCondition.trim().toLowerCase();
      setFormData({
        ...formData,
        conditions: [...formData.conditions, normalizedCondition],
      });
      setCurrentCondition('');
    }
  };

  const removeCondition = (index) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    });
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
        await api.put('/patients/profile', formData);
        navigate('/patient/dashboard');
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
    <div className="patient-onboarding-page">
      <div className="container">
        <div className="patient-onboarding-card">
          <div className="onboarding-header">
            <h1>
              <span className="title-blue">Patient Profile</span>{' '}
              <span className="title-purple">Setup</span>
            </h1>
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
              <div className="condition-section">
                <h2 className="section-title">Tell us about your condition</h2>
                <p className="section-description">
                  Enter your medical conditions or symptoms in natural language. For example: "I have Brain Cancer" or "Lung Cancer"
                </p>

                <div className="input-group">
                  <div className="condition-input-group">
                    <input
                      type="text"
                      value={currentCondition}
                      onChange={(e) => setCurrentCondition(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCondition();
                        }
                      }}
                      placeholder="e.g., I have Brain Cancer"
                      className="condition-input"
                    />
                    <button
                      type="button"
                      onClick={addCondition}
                      className="add-condition-btn"
                    >
                      Add
                    </button>
                  </div>
                  {formData.conditions.length > 0 && (
                    <div className="conditions-list">
                      {formData.conditions.map((condition, index) => (
                        <span key={index} className="condition-tag">
                          {condition}
                          <button
                            type="button"
                            onClick={() => removeCondition(index)}
                            className="condition-remove"
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
                <label className="field-label">Describe your condition or symptoms (optional)</label>
                <textarea
                  name="natural_language_input"
                  value={formData.natural_language_input}
                  onChange={handleInputChange}
                  placeholder="e.g., I have Brain Cancer, or I'm interested in immunotherapy trials..."
                  rows="4"
                />
                <small className="help-text">
                  Enter in natural language - our AI will understand and extract relevant conditions
                </small>
              </div>

              <div className="input-group">
                <label className="field-label">Location (optional)</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="City, Country (e.g., New York, USA)"
                />
                <small className="help-text">
                  This helps us show you relevant trials and experts near you
                </small>
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

export default PatientOnboarding;

