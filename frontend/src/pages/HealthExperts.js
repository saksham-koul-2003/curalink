import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';
import api from '../services/api';
import './Experts.css';

const HealthExperts = () => {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [followedExpertIds, setFollowedExpertIds] = useState(new Set());
  const [favoriteExpertIds, setFavoriteExpertIds] = useState(new Set());
  const [filters, setFilters] = useState({
    specialty: '',
    location: '',
  });
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(null);
  const [meetingRequest, setMeetingRequest] = useState({
    patient_name: '',
    patient_contact: '',
    message: '',
  });

  useEffect(() => {
    fetchRecommended();
    fetchFollowedExperts();
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const response = await api.get('/favorites');
      const favorites = response.data || {};
      setFavoriteExpertIds(new Set((favorites.health_experts || []).map(e => e.id)));
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    }
  };

  const toggleFavorite = async (expertId) => {
    const isFavorited = favoriteExpertIds.has(expertId);
    
    try {
      if (isFavorited) {
        await api.delete(`/favorites/health_expert/${expertId}`);
        setFavoriteExpertIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(expertId);
          return newSet;
        });
      } else {
        await api.post('/favorites', {
          item_type: 'health_expert',
          item_id: expertId,
        });
        setFavoriteExpertIds(prev => new Set(prev).add(expertId));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const fetchFollowedExperts = async () => {
    try {
      // Fetch followed experts from favorites
      const response = await api.get('/favorites');
      const favorites = response.data || {};
      const expertFavorites = favorites.health_experts || [];
      const expertIds = new Set(expertFavorites.map(fav => fav.id || fav.item_id).filter(Boolean));
      setFollowedExpertIds(expertIds);
    } catch (error) {
      console.error('Failed to fetch followed experts:', error);
      // Also try to get from expert_follows table if available
      // For now, we'll use favorites as the source of truth
    }
  };

  const fetchRecommended = async () => {
    setLoading(true);
    try {
      const response = await api.get('/experts/recommended');
      let rec = Array.isArray(response.data) ? response.data : [];
      // Fallback: if empty, derive from patient profile conditions and run a search
      if (rec.length === 0) {
        try {
          const prof = await api.get('/patients/profile');
          const conditions = Array.isArray(prof.data?.conditions) ? prof.data.conditions : [];
          const query = conditions.join(' ');
          if (query.trim().length > 0) {
            const sr = await api.get('/experts/search', { params: { query } });
            rec = Array.isArray(sr.data) ? sr.data : [];
          }
        } catch (e) {
          // ignore profile fallback errors, will show empty state
        }
      }
      setExperts(rec);
    } catch (error) {
      console.error('Failed to fetch experts:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchExperts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.query = searchQuery;
      if (filters.specialty) params.specialty = filters.specialty;
      // Only apply location filter if not showing all locations
      if (filters.location && !showAllLocations) {
        params.location = filters.location;
      }

      const response = await api.get('/experts/search', { params });
      setExperts(response.data);
    } catch (error) {
      console.error('Failed to search experts:', error);
    } finally {
      setLoading(false);
    }
  };

  const followExpert = async (expertId) => {
    try {
      await api.post(`/experts/${expertId}/follow`);
      setFollowedExpertIds(prev => new Set(prev).add(expertId));
    } catch (error) {
      console.error('Failed to follow expert:', error);
      alert('Failed to follow expert');
    }
  };

  const submitMeetingRequest = async (expertId) => {
    try {
      await api.post(`/experts/${expertId}/meeting-request`, meetingRequest);
      alert('Meeting request submitted successfully');
      setShowMeetingModal(null);
      setMeetingRequest({ patient_name: '', patient_contact: '', message: '' });
    } catch (error) {
      console.error('Failed to submit meeting request:', error);
      alert('Failed to submit meeting request');
    }
  };

  return (
    <>
      <Navbar isPatient={true} />
      <div className="experts-page">
        <div className="container">
          <div className="page-header">
            <h1 className="page-title">Health Experts</h1>
            <p className="page-subtitle">Recommended experts based on your profile conditions</p>
          </div>

          <div className="search-filters">
            <input
              type="text"
              placeholder="Search experts by name, specialty, or research interests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') searchExperts();
              }}
              className="search-input"
            />
            <div className="filters">
              <input
                type="text"
                placeholder="Specialty filter"
                value={filters.specialty}
                onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
              />
              <input
                type="text"
                placeholder="Location filter"
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                disabled={showAllLocations}
              />
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showAllLocations}
                  onChange={(e) => {
                    setShowAllLocations(e.target.checked);
                    if (e.target.checked) {
                      // Clear location filter when showing all
                      setFilters({ ...filters, location: '' });
                    }
                  }}
                />
                <span>Show all experts (ignore location)</span>
              </label>
              <button onClick={searchExperts} className="btn btn-primary">
                Search
              </button>
            </div>
          </div>

          {loading ? (
            <Loader message="Loading health experts..." />
          ) : experts.length > 0 ? (
            <>
              <h2 className="section-subtitle" style={{ marginTop: '24px', marginBottom: '16px', fontSize: '18px', fontWeight: 600, color: '#374151' }}>
                Recommended for You
              </h2>
              <div className="experts-grid">
                {experts.map((expert) => (
                <div key={expert.id} className="expert-card">
                  <button
                    className={`favorite-star ${favoriteExpertIds.has(expert.id) ? 'favorited' : ''}`}
                    onClick={() => toggleFavorite(expert.id)}
                    title={favoriteExpertIds.has(expert.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {favoriteExpertIds.has(expert.id) ? '★' : '☆'}
                  </button>
                  <h3 className="expert-title">{expert.name}</h3>
                  {expert.institution && (
                    <p className="expert-affiliation">{expert.institution}</p>
                  )}
                  {expert.location && (
                    <p className="expert-location">📍 {expert.location}</p>
                  )}
                  {(expert.specialties || expert.research_interests) && (
                    <div className="expert-tags">
                      {expert.specialties && expert.specialties.slice(0, 3).map((spec, idx) => (
                        <span key={idx} className="expert-tag">{spec}</span>
                      ))}
                      {expert.research_interests && expert.research_interests.slice(0, 2).map((interest, idx) => (
                        <span key={`interest-${idx}`} className="expert-tag">{interest}</span>
                      ))}
                    </div>
                  )}
                  {expert.is_on_platform && (
                    <span className="platform-badge">On Platform</span>
                  )}
                  <div className="expert-card-actions">
                    {followedExpertIds.has(expert.id) ? (
                      <span className="status-following">✓ Following</span>
                    ) : (
                      <button
                        onClick={() => followExpert(expert.id)}
                        className="btn-view-details"
                      >
                        Follow Expert
                      </button>
                    )}
                    {expert.is_on_platform && (
                      <button
                        onClick={() => setShowMeetingModal(expert.id)}
                        className="btn-contact-admin"
                      >
                        Request Meeting
                      </button>
                    )}
                  </div>
                </div>
              ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p className="text-muted text-center" style={{ padding: '40px', fontSize: '16px' }}>
                No experts found. Update your profile with your medical conditions to see recommended experts.
              </p>
            </div>
          )}

          {showMeetingModal && (
            <div className="modal-overlay" onClick={() => setShowMeetingModal(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Request Meeting</h2>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  submitMeetingRequest(showMeetingModal);
                }}>
                  <div className="input-group">
                    <label>Your Name *</label>
                    <input
                      type="text"
                      value={meetingRequest.patient_name}
                      onChange={(e) => setMeetingRequest({ ...meetingRequest, patient_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Contact Information *</label>
                    <input
                      type="text"
                      value={meetingRequest.patient_contact}
                      onChange={(e) => setMeetingRequest({ ...meetingRequest, patient_contact: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Message</label>
                    <textarea
                      value={meetingRequest.message}
                      onChange={(e) => setMeetingRequest({ ...meetingRequest, message: e.target.value })}
                      rows="4"
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => setShowMeetingModal(null)} className="btn btn-outline">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">Submit Request</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default HealthExperts;

