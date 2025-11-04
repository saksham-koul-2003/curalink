import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';
import api from '../services/api';
import './Dashboard.css';

const PatientDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followedExpertIds, setFollowedExpertIds] = useState(new Set());
  const [favoriteTrials, setFavoriteTrials] = useState(new Set());
  const [favoritePublications, setFavoritePublications] = useState(new Set());
  const [favoriteExperts, setFavoriteExperts] = useState(new Set());
  const [selectedTrial, setSelectedTrial] = useState(null);
  const [showTrialDetails, setShowTrialDetails] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const response = await api.get('/favorites');
      const favorites = response.data || {};
      setFavoriteTrials(new Set((favorites.clinical_trials || []).map(t => t.id)));
      setFavoritePublications(new Set((favorites.publications || []).map(p => p.id)));
      setFavoriteExperts(new Set((favorites.health_experts || []).map(e => e.id)));
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    }
  };

  const toggleFavorite = async (itemId, itemType) => {
    const favoriteSet = itemType === 'clinical_trial' ? favoriteTrials :
                        itemType === 'publication' ? favoritePublications :
                        favoriteExperts;
    const setFavoriteSet = itemType === 'clinical_trial' ? setFavoriteTrials :
                          itemType === 'publication' ? setFavoritePublications :
                          setFavoriteExperts;
    const isFavorited = favoriteSet.has(itemId);
    
    try {
      if (isFavorited) {
        await api.delete(`/favorites/${itemType}/${itemId}`);
        setFavoriteSet(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      } else {
        await api.post('/favorites', {
          item_type: itemType,
          item_id: itemId,
        });
        setFavoriteSet(prev => new Set(prev).add(itemId));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // Secondary fetch to ensure trials appear immediately after onboarding
  useEffect(() => {
    const boostTrials = async () => {
      if (!dashboardData) return;
      const { profile, recommendations } = dashboardData;
      const hasTrials = (recommendations?.clinical_trials || []).length > 0;
      const hasConditions = Array.isArray(profile?.conditions) && profile.conditions.length > 0;
      const hasNL = (profile?.natural_language_input || '').trim().length > 0;
      if (hasTrials || (!hasConditions && !hasNL)) return;

      try {
        const query = hasConditions ? profile.conditions.join(' ') : profile.natural_language_input;
        const resp = await api.get('/trials/search', { params: { query, status: 'recruiting' } });
        if (Array.isArray(resp.data) && resp.data.length > 0) {
          setDashboardData((prev) => ({
            ...prev,
            recommendations: {
              ...prev.recommendations,
              clinical_trials: resp.data,
            },
          }));
        }
      } catch (e) {
        // ignore errors; dashboard already has a baseline state
      }
    };
    boostTrials();
  }, [dashboardData]);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/patients/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const followExpert = async (expertId) => {
    try {
      await api.post(`/experts/${expertId}/follow`);
      setFollowedExpertIds(prev => new Set(prev).add(expertId));
    } catch (e) {
      console.error('Failed to follow expert:', e);
    }
  };

  const handleViewTrialDetails = (trial) => {
    setSelectedTrial(trial);
    setShowTrialDetails(true);
  };

  const handleCloseTrialDetails = () => {
    setShowTrialDetails(false);
    setSelectedTrial(null);
  };

  if (loading) {
    return (
      <>
        <Navbar isPatient={true} />
        <Loader message="Loading your dashboard..." />
      </>
    );
  }

  const { recommendations } = dashboardData || {};

  return (
    <>
      <Navbar isPatient={true} />
      <div className="dashboard">
        <div className="container">
          <section className="dashboard-section">
            <div className="section-header">
              <h2>Recommended Clinical Trials</h2>
              <Link to="/patient/trials" className="view-all">View All →</Link>
            </div>
            <div className="grid">
              {recommendations?.clinical_trials?.slice(0, 3).map((trial) => (
                <div key={trial.id || trial.nct_id} className="trial-card">
                  <button
                    className={`favorite-star ${favoriteTrials.has(trial.id || trial.nct_id) ? 'favorited' : ''}`}
                    onClick={() => toggleFavorite(trial.id || trial.nct_id, 'clinical_trial')}
                    title={favoriteTrials.has(trial.id || trial.nct_id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {favoriteTrials.has(trial.id || trial.nct_id) ? '★' : '☆'}
                  </button>
                  <h3 className="trial-title">{trial.title}</h3>
                  {(trial.description || trial.ai_summary) && (
                    <p className="trial-description">
                      {trial.description || trial.ai_summary}
                    </p>
                  )}
                  <div className="trial-details-row">
                    <span className="trial-phase">{trial.phase || 'Phase N/A'}</span>
                    <span className={`trial-status-badge ${trial.status?.toLowerCase() === 'recruiting' ? 'recruiting' : ''}`}>
                      {trial.status || 'Unknown'}
                    </span>
                    {trial.location && (
                      <span className="trial-location">
                        📍 {trial.location}
                      </span>
                    )}
                  </div>
                  <div className="trial-card-actions">
                    <button 
                      className="btn-view-details"
                      onClick={() => handleViewTrialDetails(trial)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
              {(!recommendations?.clinical_trials || recommendations.clinical_trials.length === 0) && (
                <p className="text-muted">No clinical trials found. Update your profile to see recommendations.</p>
              )}
            </div>
          </section>

          <section className="dashboard-section">
            <div className="section-header">
              <h2>Recommended Health Experts</h2>
              <Link to="/patient/experts" className="view-all">View All →</Link>
            </div>
            <div className="grid">
              {recommendations?.health_experts?.slice(0, 3).map((expert) => (
                <div key={expert.id} className="expert-card">
                  <button
                    className={`favorite-star ${favoriteExperts.has(expert.id) ? 'favorited' : ''}`}
                    onClick={() => toggleFavorite(expert.id, 'health_expert')}
                    title={favoriteExperts.has(expert.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {favoriteExperts.has(expert.id) ? '★' : '☆'}
                  </button>
                  <h3 className="expert-title">{expert.name || 'Expert'}</h3>
                  {(expert.specialties?.[0] || expert.institution) && (
                    <p className="expert-affiliation">
                      {expert.specialties?.[0] || 'Medical'} • {expert.institution || 'Institution'}
                    </p>
                  )}
                  {expert.location && (
                    <p className="expert-location">📍 {expert.location}</p>
                  )}
                  {(expert.specialties || expert.research_interests) && (
                    <div className="expert-tags">
                      {[...(expert.specialties || []), ...(expert.research_interests || [])].slice(0, 2).map((tag, idx) => (
                        <span key={idx} className="expert-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="expert-card-actions">
                    {followedExpertIds.has(expert.id) ? (
                      <span className="status-following">✓ Following</span>
                    ) : (
                      <button
                        className="btn-view-details"
                        onClick={() => followExpert(expert.id)}
                      >
                        Follow Expert
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {(!recommendations?.health_experts || recommendations.health_experts.length === 0) && (
                <p className="text-muted">No health experts found. Update your profile to see recommendations.</p>
              )}
            </div>
          </section>

          <section className="dashboard-section">
            <div className="section-header">
              <h2>Latest Publications</h2>
              <Link to="/patient/publications" className="view-all">View All →</Link>
            </div>
            <div className="grid">
              {recommendations?.publications?.slice(0, 3).map((pub) => (
                <div key={pub.id || Math.random()} className="publication-card">
                  <button
                    className={`favorite-star ${favoritePublications.has(pub.id) ? 'favorited' : ''}`}
                    onClick={() => toggleFavorite(pub.id, 'publication')}
                    title={favoritePublications.has(pub.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {favoritePublications.has(pub.id) ? '★' : '☆'}
                  </button>
                  <h3 className="publication-title">{pub.title}</h3>
                  {pub.journal && (
                    <p className="publication-journal">{pub.journal}</p>
                  )}
                  {(pub.ai_summary || pub.abstract) && (
                    <p className="publication-description">
                      {pub.ai_summary || (pub.abstract ? pub.abstract.substring(0, 150) + '...' : '')}
                    </p>
                  )}
                  {pub.url && (
                    <div className="publication-card-actions">
                      <a href={pub.url} target="_blank" rel="noopener noreferrer" className="btn-view-details">
                        Read Full Paper
                      </a>
                    </div>
                  )}
                </div>
              ))}
              {(!recommendations?.publications || recommendations.publications.length === 0) && (
                <p className="text-muted">No publications found. Update your profile to see recommendations.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Trial Details Modal */}
      {showTrialDetails && selectedTrial && (
        <div className="modal-overlay" onClick={handleCloseTrialDetails}>
          <div className="modal-content trial-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Trial Details</h2>
              <button className="modal-close" onClick={handleCloseTrialDetails}>×</button>
            </div>
            <div className="modal-body">
              <div className="trial-detail-section">
                <h3>{selectedTrial.title}</h3>
              </div>

              {selectedTrial.ai_summary && (
                <div className="trial-detail-section">
                  <h4>Summary</h4>
                  <p>{selectedTrial.ai_summary}</p>
                </div>
              )}

              {selectedTrial.description && (
                <div className="trial-detail-section">
                  <h4>Description</h4>
                  <p>{selectedTrial.description}</p>
                </div>
              )}

              {selectedTrial.conditions && Array.isArray(selectedTrial.conditions) && selectedTrial.conditions.length > 0 && (
                <div className="trial-detail-section">
                  <h4>Target Conditions</h4>
                  <div className="trial-tags">
                    {selectedTrial.conditions.map((condition, idx) => (
                      <span key={idx} className="trial-tag">{condition}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="trial-detail-row">
                <div className="trial-detail-item">
                  <span className="detail-label">Phase:</span>
                  <span className="detail-value">{selectedTrial.phase || 'N/A'}</span>
                </div>
                <div className="trial-detail-item">
                  <span className="detail-label">Status:</span>
                  <span className={`detail-value trial-status-badge ${selectedTrial.status?.toLowerCase() === 'recruiting' ? 'recruiting' : ''}`}>
                    {selectedTrial.status || 'Unknown'}
                  </span>
                </div>
              </div>

              {selectedTrial.location && (
                <div className="trial-detail-section">
                  <h4>Location</h4>
                  <p>📍 {selectedTrial.location}</p>
                </div>
              )}

              {selectedTrial.eligibility_criteria && (
                <div className="trial-detail-section">
                  <h4>Eligibility Criteria</h4>
                  <p>{selectedTrial.eligibility_criteria}</p>
                </div>
              )}

              {selectedTrial.contact_email && (
                <div className="trial-detail-section">
                  <h4>Contact Information</h4>
                  <p>
                    <a href={`mailto:${selectedTrial.contact_email}`} className="contact-link">
                      {selectedTrial.contact_email}
                    </a>
                  </p>
                </div>
              )}

              {selectedTrial.nct_id && (
                <div className="trial-detail-section">
                  <h4>ClinicalTrials.gov ID</h4>
                  <p>
                    <a 
                      href={selectedTrial.ctgov_url || `https://clinicaltrials.gov/search?id=${selectedTrial.nct_id}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="external-link"
                    >
                      {selectedTrial.nct_id}
                    </a>
                    {' '} - View on ClinicalTrials.gov
                  </p>
                </div>
              )}

              <div className="modal-actions">
                {selectedTrial.ctgov_url || selectedTrial.nct_id ? (
                  <a
                    href={selectedTrial.ctgov_url || `https://clinicaltrials.gov/search?id=${selectedTrial.nct_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-clinical-gov-modal"
                    style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}
                  >
                    View on ClinicalTrials.gov
                  </a>
                ) : null}
                <button
                  onClick={handleCloseTrialDetails}
                  className="btn btn-outline"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PatientDashboard;

