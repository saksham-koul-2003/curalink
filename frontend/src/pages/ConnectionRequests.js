import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './ConnectionRequests.css';

const ConnectionRequests = () => {
  const [connectionData, setConnectionData] = useState({
    incoming: [],
    outgoing: [],
    accepted: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('incoming');

  useEffect(() => {
    fetchConnectionRequests();
  }, []);

  const fetchConnectionRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/researchers/connections');
      setConnectionData(response.data);
    } catch (error) {
      console.error('Failed to fetch connection requests:', error);
      alert('Failed to load connection requests');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (connectionId, action) => {
    try {
      await api.post(`/researchers/connections/${connectionId}/respond`, { action });
      alert(`Connection request ${action}ed successfully`);
      fetchConnectionRequests();
    } catch (error) {
      console.error('Failed to respond to connection request:', error);
      alert(`Failed to ${action} connection request`);
    }
  };

  const displayItems = () => {
    switch (activeTab) {
      case 'incoming':
        return connectionData.incoming || [];
      case 'outgoing':
        return connectionData.outgoing || [];
      case 'accepted':
        return connectionData.accepted || [];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <>
        <Navbar isPatient={false} />
        <div className="loading">Loading connection requests...</div>
      </>
    );
  }

  return (
    <>
      <Navbar isPatient={false} />
      <div className="connection-requests-page">
        <div className="container">
          <h1 className="page-title">Connection Requests</h1>

          <div className="tabs">
            <button
              className={`tab ${activeTab === 'incoming' ? 'active' : ''}`}
              onClick={() => setActiveTab('incoming')}
            >
              Incoming ({connectionData.incoming?.length || 0})
            </button>
            <button
              className={`tab ${activeTab === 'outgoing' ? 'active' : ''}`}
              onClick={() => setActiveTab('outgoing')}
            >
              Outgoing ({connectionData.outgoing?.length || 0})
            </button>
            <button
              className={`tab ${activeTab === 'accepted' ? 'active' : ''}`}
              onClick={() => setActiveTab('accepted')}
            >
              Connected ({connectionData.accepted?.length || 0})
            </button>
          </div>

          <div className="connections-list">
            {displayItems().length > 0 ? (
              displayItems().map((connection) => (
                <div key={connection.id} className="card">
                  <h3>{connection.name}</h3>
                  <p className="text-muted">{connection.email}</p>
                  {connection.location && <p className="text-muted">Location: {connection.location}</p>}
                  
                  {connection.specialties && connection.specialties.length > 0 && (
                    <div className="tags-list">
                      <strong>Specialties: </strong>
                      {connection.specialties.map((spec, idx) => (
                        <span key={idx} className="badge badge-primary">{spec}</span>
                      ))}
                    </div>
                  )}

                  {connection.research_interests && connection.research_interests.length > 0 && (
                    <div className="tags-list">
                      <strong>Research Interests: </strong>
                      {connection.research_interests.map((interest, idx) => (
                        <span key={idx} className="badge badge-secondary">{interest}</span>
                      ))}
                    </div>
                  )}

                  <p className="text-muted" style={{ fontSize: '0.9em', marginTop: '10px' }}>
                    Requested: {new Date(connection.created_at).toLocaleDateString()}
                  </p>

                  {activeTab === 'incoming' && (
                    <div className="card-actions">
                      <button
                        onClick={() => handleResponse(connection.id, 'accept')}
                        className="btn btn-primary"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleResponse(connection.id, 'reject')}
                        className="btn btn-outline"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {activeTab === 'outgoing' && (
                    <div className="card-actions">
                      <span className="badge badge-secondary">Pending</span>
                    </div>
                  )}

                  {activeTab === 'accepted' && (
                    <div className="card-actions">
                      <span className="badge badge-primary">Connected</span>
                      <p className="text-muted" style={{ fontSize: '0.85em' }}>
                        Connected since: {new Date(connection.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-muted text-center">
                {activeTab === 'incoming' && 'No incoming connection requests'}
                {activeTab === 'outgoing' && 'No outgoing connection requests'}
                {activeTab === 'accepted' && 'No accepted connections yet'}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ConnectionRequests;

