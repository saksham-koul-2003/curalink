import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './Publications.css';

const ResearcherPublications = () => {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [favoritePublications, setFavoritePublications] = useState(new Set());

  useEffect(() => {
    fetchProfile();
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

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get('/researchers/profile');
      setProfile(response.data);
      setPublications(response.data.publications || []);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      alert('Failed to load publications');
    } finally {
      setLoading(false);
    }
  };

  const handleImportORCID = async () => {
    if (!profile?.orcid_id) {
      alert('Please add your ORCID ID in your profile settings first');
      return;
    }

    const confirmed = window.confirm(
      `Import publications from ORCID ID: ${profile.orcid_id}?\n\nThis will fetch and import your publications.`
    );

    if (!confirmed) return;

    try {
      const response = await api.post('/publications/orcid/fetch', {
        orcid_id: profile.orcid_id,
      });
      alert(`Successfully imported ${response.data.publications?.length || 0} publications from ORCID`);
      fetchProfile(); // Refresh to show new publications
    } catch (error) {
      console.error('Failed to import ORCID publications:', error);
      alert(error.response?.data?.error || 'Failed to import publications from ORCID');
    }
  };

  if (loading) {
    return (
      <>
        <Navbar isPatient={false} />
        <div className="loading">Loading publications...</div>
      </>
    );
  }

  return (
    <>
      <Navbar isPatient={false} />
      <div className="publications-page">
        <div className="container">
          <div className="page-header">
            <h1 className="page-title">My Publications</h1>
            {profile?.orcid_id && (
              <button onClick={handleImportORCID} className="btn btn-primary">
                Import from ORCID
              </button>
            )}
            {!profile?.orcid_id && (
              <div className="info-box">
                <p>Add your ORCID ID in profile settings to auto-import your publications</p>
              </div>
            )}
          </div>

          {profile?.orcid_id && (
            <div className="info-box" style={{ marginBottom: '2rem' }}>
              <p>
                <strong>ORCID ID:</strong> {profile.orcid_id}
              </p>
              <p style={{ fontSize: '0.9em', color: '#666' }}>
                Click "Import from ORCID" to fetch your latest publications
              </p>
            </div>
          )}

          {publications.length > 0 ? (
            <div className="publications-grid">
              {publications.map((pub) => (
                <div key={pub.id} className="card">
                  <h3>{pub.title}</h3>
                  {pub.journal && <p className="text-muted">{pub.journal}</p>}
                  {pub.pub_date && (
                    <p className="text-muted">Published: {new Date(pub.pub_date).getFullYear()}</p>
                  )}
                  {pub.authors && pub.authors.length > 0 && (
                    <p className="text-muted" style={{ fontSize: '0.9em' }}>
                      Authors: {pub.authors.join(', ')}
                    </p>
                  )}
                  {pub.doi && (
                    <p className="text-muted" style={{ fontSize: '0.85em' }}>
                      DOI: {pub.doi}
                    </p>
                  )}
                  {pub.ai_summary && (
                    <div className="card-summary">
                      <strong>Summary:</strong>
                      <p>{pub.ai_summary}</p>
                    </div>
                  )}
                  {pub.abstract && !pub.ai_summary && (
                    <div className="card-summary">
                      <strong>Abstract:</strong>
                      <p>{pub.abstract.substring(0, 300)}...</p>
                    </div>
                  )}
                  {pub.keywords && pub.keywords.length > 0 && (
                    <div className="tags-list">
                      {pub.keywords.map((keyword, idx) => (
                        <span key={idx} className="badge badge-secondary">{keyword}</span>
                      ))}
                    </div>
                  )}
                  <div className="card-actions">
                    {pub.url && (
                      <a
                        href={pub.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                      >
                        View Publication
                      </a>
                    )}
                    {pub.doi && (
                      <a
                        href={`https://doi.org/${pub.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline"
                      >
                        View on DOI
                      </a>
                    )}
                    <button
                      onClick={() => toggleFavorite(pub.id)}
                      className={`btn btn-outline ${favoritePublications.has(pub.id) ? 'favorited' : ''}`}
                    >
                      {favoritePublications.has(pub.id) ? '★ Saved' : '☆ Save'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="text-muted">
                {profile?.orcid_id
                  ? "You don't have any publications yet. Click 'Import from ORCID' to fetch your publications."
                  : "You don't have any publications yet. Add your ORCID ID in profile settings and import your publications."}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ResearcherPublications;

