import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './Publications.css';

const Publications = () => {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritePublications, setFavoritePublications] = useState(new Set());

  useEffect(() => {
    fetchRecommended();
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const response = await api.get('/favorites');
      const favorites = response.data || {};
      setFavoritePublications(new Set((favorites.publications || []).map(p => p.id)));
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    }
  };

  const toggleFavorite = async (pubId) => {
    const isFavorited = favoritePublications.has(pubId);
    
    try {
      if (isFavorited) {
        await api.delete(`/favorites/publication/${pubId}`);
        setFavoritePublications(prev => {
          const newSet = new Set(prev);
          newSet.delete(pubId);
          return newSet;
        });
      } else {
        await api.post('/favorites', {
          item_type: 'publication',
          item_id: pubId,
        });
        setFavoritePublications(prev => new Set(prev).add(pubId));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const fetchRecommended = async () => {
    setLoading(true);
    try {
      const response = await api.get('/publications/recommended');
      setPublications(response.data);
    } catch (error) {
      console.error('Failed to fetch publications:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchPublications = async () => {
    if (!searchQuery.trim()) {
      fetchRecommended();
      return;
    }

    setLoading(true);
    setPublications([]); // Clear previous results
    try {
      console.log(`Searching for: ${searchQuery}`);
      const response = await api.get('/publications/search', {
        params: { query: searchQuery },
      });
      console.log(`Received ${response.data?.length || 0} publications`);
      setPublications(response.data || []);
      
      if (!response.data || response.data.length === 0) {
        console.warn('No publications found for:', searchQuery);
      }
    } catch (error) {
      console.error('Failed to search publications:', error);
      console.error('Error details:', error.response?.data || error.message);
      setPublications([]);
      alert(`Search failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar isPatient={true} />
      <div className="publications-page">
        <div className="container">
          <h1 className="page-title">Publications</h1>

          <div className="search-bar">
            <input
              type="text"
              placeholder="Search publications by keywords (e.g., 'cancer', 'diabetes treatment', 'immunotherapy')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') searchPublications();
              }}
              className="search-input"
            />
            <button onClick={searchPublications} className="btn btn-primary">
              Search
            </button>
            <button onClick={fetchRecommended} className="btn btn-outline">
              Show Recommended
            </button>
          </div>
          
          <div className="info-box" style={{ marginTop: '20px', padding: '15px', background: '#f0f8ff', borderRadius: '8px', fontSize: '14px' }}>
            <strong>💡 Tip:</strong> Search for topics like "cancer treatment", "diabetes research", or "heart disease" 
            to find publications from PubMed, NEJM, JAMA, and other top medical journals. 
            The system automatically searches external APIs and generates AI summaries for each publication.
          </div>

          {loading ? (
            <div className="loading">
              <p>Searching publications from PubMed, Semantic Scholar, and other sources...</p>
              <p style={{ fontSize: '14px', color: '#666' }}>This may take a few seconds...</p>
            </div>
          ) : (
            <div className="publications-grid">
              {publications.length > 0 ? (
                publications.map((pub) => (
                <div key={pub.id} className="publication-card">
                  <button
                    className={`favorite-star ${favoritePublications.has(pub.id) ? 'favorited' : ''}`}
                    onClick={() => toggleFavorite(pub.id)}
                    title={favoritePublications.has(pub.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {favoritePublications.has(pub.id) ? '★' : '☆'}
                  </button>
                  <h3 className="publication-title">{pub.title}</h3>
                  {pub.journal && (
                    <p className="publication-journal">{pub.journal}</p>
                  )}
                  {pub.authors && pub.authors.length > 0 && (
                    <p className="publication-authors">Authors: {pub.authors.slice(0, 3).join(', ')}{pub.authors.length > 3 ? ' et al.' : ''}</p>
                  )}
                  {pub.ai_summary && (
                    <p className="publication-description">{pub.ai_summary}</p>
                  )}
                  <div className="publication-meta">
                    {pub.pub_date && (
                      <span className="publication-date">{new Date(pub.pub_date).getFullYear()}</span>
                    )}
                    {pub.doi && (
                      <span className="publication-doi">DOI: {pub.doi.substring(0, 20)}...</span>
                    )}
                  </div>
                  <div className="publication-card-actions">
                    {pub.url && (
                      <a
                        href={pub.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-view-details"
                      >
                        Read Full Paper
                      </a>
                    )}
                    {!pub.url && (
                      <button className="btn-view-details" disabled>
                        View Details
                      </button>
                    )}
                  </div>
                </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p className="text-muted" style={{ fontSize: '18px', marginBottom: '10px' }}>
                    No publications found for "{searchQuery}"
                  </p>
                  <p className="text-muted" style={{ fontSize: '14px' }}>
                    Try different search terms like "cancer treatment", "diabetes research", or "heart disease"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Publications;

