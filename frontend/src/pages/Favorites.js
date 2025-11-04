import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './Favorites.css';

const Favorites = ({ isResearcher = false }) => {
  const [favorites, setFavorites] = useState({
    publications: [],
    clinical_trials: [],
    health_experts: [],
    collaborators: [],
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchFavorites();
  }, [isResearcher]);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const response = await api.get('/favorites');
      setFavorites(response.data);
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (itemType, itemId) => {
    try {
      await api.delete(`/favorites/${itemType}/${itemId}`);
      fetchFavorites();
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      alert('Failed to remove favorite');
    }
  };

  const displayItems = () => {
    if (activeTab === 'all') {
      return [
        ...favorites.publications.map(item => ({ ...item, type: 'publication' })),
        ...favorites.clinical_trials.map(item => ({ ...item, type: 'clinical_trial' })),
        ...(isResearcher
          ? favorites.collaborators.map(item => ({ ...item, type: 'collaborator' }))
          : favorites.health_experts.map(item => ({ ...item, type: 'health_expert' }))),
      ];
    } else {
      return favorites[activeTab]?.map(item => ({ ...item, type: activeTab })) || [];
    }
  };

  return (
    <>
      <Navbar isPatient={!isResearcher} />
      <div className="favorites-page">
        <div className="container">
          <h1 className="page-title">My Favorites</h1>

          <div className="tabs">
            <button
              className={`tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
            <button
              className={`tab ${activeTab === 'publications' ? 'active' : ''}`}
              onClick={() => setActiveTab('publications')}
            >
              Publications
            </button>
            <button
              className={`tab ${activeTab === 'clinical_trials' ? 'active' : ''}`}
              onClick={() => setActiveTab('clinical_trials')}
            >
              Clinical Trials
            </button>
            {isResearcher ? (
              <button
                className={`tab ${activeTab === 'collaborators' ? 'active' : ''}`}
                onClick={() => setActiveTab('collaborators')}
              >
                Collaborators
              </button>
            ) : (
              <button
                className={`tab ${activeTab === 'health_experts' ? 'active' : ''}`}
                onClick={() => setActiveTab('health_experts')}
              >
                Health Experts
              </button>
            )}
          </div>

          {loading ? (
            <div className="loading">Loading favorites...</div>
          ) : (
            <div className="favorites-grid">
              {displayItems().map((item) => (
                <div key={item.id} className="favorite-card">
                  <h3 className="favorite-title">{item.title || item.name}</h3>
                  {item.location && <p className="favorite-location">📍 {item.location}</p>}
                  {item.journal && <p className="favorite-journal">{item.journal}</p>}
                  {item.institution && <p className="favorite-affiliation">{item.institution}</p>}
                  {item.ai_summary && <p className="favorite-description">{item.ai_summary}</p>}
                  <div className="favorite-card-actions">
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn-view-details">
                        View
                      </a>
                    )}
                    <button
                      onClick={() => removeFavorite(item.type, item.id)}
                      className="btn-contact-admin"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {displayItems().length === 0 && (
                <p className="text-muted text-center">No favorites yet. Start saving items you're interested in!</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Favorites;

