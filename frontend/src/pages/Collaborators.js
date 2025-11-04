import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';
import api from '../services/api';
import './Collaborators.css';

const Collaborators = () => {
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [selectedCollaborator, setSelectedCollaborator] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [favoriteCollaborators, setFavoriteCollaborators] = useState(new Set());

  // Pre-defined specialties for dropdown
  const availableSpecialties = [
    'Oncology',
    'Neurology',
    'Immunology',
    'Cardiology',
    'Endocrinology',
    'Gastroenterology',
    'Pulmonology',
    'Rheumatology',
    'Dermatology',
    'Psychiatry',
    'Pediatrics',
    'Geriatrics',
  ];

  useEffect(() => {
    searchCollaborators();
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const response = await api.get('/favorites');
      const favorites = response.data || {};
      setFavoriteCollaborators(new Set((favorites.collaborators || []).map(c => c.id)));
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    }
  };

  const toggleFavorite = async (collaboratorId) => {
    const isFavorited = favoriteCollaborators.has(collaboratorId);
    
    try {
      if (isFavorited) {
        await api.delete(`/favorites/collaborator/${collaboratorId}`);
        setFavoriteCollaborators(prev => {
          const newSet = new Set(prev);
          newSet.delete(collaboratorId);
          return newSet;
        });
      } else {
        await api.post('/favorites', {
          item_type: 'collaborator',
          item_id: collaboratorId,
        });
        setFavoriteCollaborators(prev => new Set(prev).add(collaboratorId));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleSpecialtySelect = (specialty) => {
    setSpecialtyFilter(specialty);
    // Immediately search when specialty is selected
    searchCollaborators(searchQuery, specialty);
  };

  const searchCollaborators = async (overrideSearch = null, overrideSpecialty = null) => {
    setLoading(true);
    try {
      const params = {};
      const search = overrideSearch !== null ? overrideSearch : searchQuery;
      const specialty = overrideSpecialty !== null ? overrideSpecialty : specialtyFilter;
      
      if (search) params.search = search;
      // Only send specialty param if it's not empty (not "All Specialties")
      if (specialty && specialty !== '') {
        params.specialty = specialty;
      }

      const response = await api.get('/researchers/collaborators', { params });
      setCollaborators(response.data);
    } catch (error) {
      console.error('Failed to search collaborators:', error);
      setCollaborators([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSpecialtyFilter('');
    // Explicitly search with empty filters to show all collaborators
    searchCollaborators('', '');
  };

  const handleViewProfile = async (collaboratorId) => {
    setProfileLoading(true);
    setShowProfileModal(true);
    try {
      const response = await api.get(`/researchers/collaborators/${collaboratorId}/profile`);
      setSelectedCollaborator(response.data);
    } catch (error) {
      console.error('Failed to fetch collaborator profile:', error);
      alert('Failed to load profile');
      setShowProfileModal(false);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCloseProfile = () => {
    setShowProfileModal(false);
    setSelectedCollaborator(null);
  };

  const requestConnection = async (collaboratorId) => {
    try {
      const response = await api.post(`/researchers/collaborators/${collaboratorId}/connect`);
      alert(response.data.message || 'Connection request sent successfully');
    } catch (error) {
      console.error('Failed to request connection:', error);
      alert(error.response?.data?.error || 'Failed to send connection request');
    }
  };

  return (
    <>
      <Navbar isPatient={false} />
      <div className="collaborators-page">
        <div className="container">
          <h1 className="page-title">Collaborators</h1>

          <div className="search-filters">
            <input
              type="text"
              placeholder="Search collaborators by name, specialty, or research interests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') searchCollaborators();
              }}
              className="search-input"
            />
            <div className="filters">
              <div className="specialty-filter-section">
                <label className="filter-label">Filter by Specialty:</label>
                <select
                  value={specialtyFilter}
                  onChange={(e) => handleSpecialtySelect(e.target.value)}
                  className="specialty-select"
                >
                  <option value="">All Specialties</option>
                  {availableSpecialties.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>
              <div className="specialty-chips">
                <span className="chips-label">Quick filters:</span>
                {availableSpecialties.slice(0, 6).map((spec) => (
                  <button
                    key={spec}
                    onClick={() => handleSpecialtySelect(specialtyFilter === spec ? '' : spec)}
                    className={`specialty-chip ${specialtyFilter === spec ? 'active' : ''}`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
              <div className="filter-actions">
                <button onClick={searchCollaborators} className="btn btn-primary">
                  Search
                </button>
                {(searchQuery || specialtyFilter) && (
                  <button onClick={clearFilters} className="btn btn-outline">
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <Loader message="Loading collaborators..." />
          ) : (
            <div className="collaborators-grid">
              {collaborators.map((collaborator) => (
                <div key={collaborator.id} className="collaborator-card">
                  <button
                    className={`favorite-star ${favoriteCollaborators.has(collaborator.id) ? 'favorited' : ''}`}
                    onClick={() => toggleFavorite(collaborator.id)}
                    title={favoriteCollaborators.has(collaborator.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {favoriteCollaborators.has(collaborator.id) ? '★' : '☆'}
                  </button>
                  <h3 className="collaborator-title">{collaborator.name}</h3>
                  {collaborator.institution && (
                    <p className="collaborator-institution">{collaborator.institution}</p>
                  )}
                  {collaborator.location && (
                    <p className="collaborator-location">📍 {collaborator.location}</p>
                  )}
                  {(collaborator.specialties || collaborator.research_interests) && (
                    <div className="collaborator-tags">
                      {collaborator.specialties && collaborator.specialties.slice(0, 3).map((spec, idx) => (
                        <span key={idx} className="collaborator-tag">{spec}</span>
                      ))}
                      {collaborator.research_interests && collaborator.research_interests.slice(0, 2).map((interest, idx) => (
                        <span key={`interest-${idx}`} className="collaborator-tag">{interest}</span>
                      ))}
                    </div>
                  )}
                  <div className="collaborator-card-actions">
                    <button
                      onClick={() => handleViewProfile(collaborator.id)}
                      className="btn-view-profile"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => requestConnection(collaborator.id)}
                      className="btn-connect"
                    >
                      Connect
                    </button>
                  </div>
                </div>
              ))}
              {collaborators.length === 0 && (
                <p className="text-muted text-center">No collaborators found.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={handleCloseProfile}>
          <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Collaborator Profile</h2>
              <button className="modal-close" onClick={handleCloseProfile}>×</button>
            </div>
            <div className="modal-body">
              {profileLoading ? (
                <Loader message="Loading profile..." />
              ) : selectedCollaborator ? (
                <>
                  <div className="profile-section">
                    <h3>{selectedCollaborator.name}</h3>
                    {selectedCollaborator.institution && (
                      <p className="profile-institution">{selectedCollaborator.institution}</p>
                    )}
                    {selectedCollaborator.location && (
                      <p className="profile-location">📍 {selectedCollaborator.location}</p>
                    )}
                  </div>

                  {selectedCollaborator.specialties && selectedCollaborator.specialties.length > 0 && (
                    <div className="profile-section">
                      <h4>Specialties</h4>
                      <div className="profile-tags">
                        {selectedCollaborator.specialties.map((spec, idx) => (
                          <span key={idx} className="profile-tag">{spec}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCollaborator.research_interests && selectedCollaborator.research_interests.length > 0 && (
                    <div className="profile-section">
                      <h4>Research Interests</h4>
                      <div className="profile-tags">
                        {selectedCollaborator.research_interests.map((interest, idx) => (
                          <span key={idx} className="profile-tag">{interest}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCollaborator.publications && selectedCollaborator.publications.length > 0 && (
                    <div className="profile-section">
                      <h4>Recent Publications</h4>
                      <div className="publications-list">
                        {selectedCollaborator.publications.map((pub, idx) => (
                          <div key={idx} className="publication-item">
                            <h5 className="publication-title">{pub.title}</h5>
                            {pub.journal && (
                              <p className="publication-journal">{pub.journal}</p>
                            )}
                            {pub.pub_date && (
                              <p className="publication-date">{pub.pub_date}</p>
                            )}
                            {pub.url && (
                              <a href={pub.url} target="_blank" rel="noopener noreferrer" className="publication-link">
                                View Publication →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p>No profile data available</p>
              )}
            </div>
            <div className="modal-actions">
              {selectedCollaborator && (
                <button
                  onClick={() => {
                    requestConnection(selectedCollaborator.id);
                    handleCloseProfile();
                  }}
                  className="btn btn-primary"
                >
                  Send Connection Request
                </button>
              )}
              <button onClick={handleCloseProfile} className="btn btn-outline">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Collaborators;
