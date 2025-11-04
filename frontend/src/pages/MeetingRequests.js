import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './MeetingRequests.css';

const MeetingRequests = () => {
  const [meetingData, setMeetingData] = useState({
    pending: [],
    accepted: [],
    rejected: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchMeetingRequests();
  }, []);

  const fetchMeetingRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/experts/meetings');
      setMeetingData(response.data);
    } catch (error) {
      console.error('Failed to fetch meeting requests:', error);
      if (error.response?.status === 404) {
        // Researcher might not be registered as expert yet
        setMeetingData({ pending: [], accepted: [], rejected: [] });
      } else {
        alert('Failed to load meeting requests');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId, action) => {
    try {
      await api.post(`/experts/meetings/${requestId}/respond`, { action });
      alert(`Meeting request ${action}ed successfully`);
      fetchMeetingRequests();
    } catch (error) {
      console.error('Failed to respond to meeting request:', error);
      alert(`Failed to ${action} meeting request`);
    }
  };

  const displayItems = () => {
    switch (activeTab) {
      case 'pending':
        return meetingData.pending || [];
      case 'accepted':
        return meetingData.accepted || [];
      case 'rejected':
        return meetingData.rejected || [];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <>
        <Navbar isPatient={false} />
        <div className="loading">Loading meeting requests...</div>
      </>
    );
  }

  return (
    <>
      <Navbar isPatient={false} />
      <div className="meeting-requests-page">
        <div className="container">
          <h1 className="page-title">Meeting Requests</h1>
          <p className="page-subtitle">
            Manage requests from patients who want to meet with you
          </p>

          <div className="tabs">
            <button
              className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              Pending ({meetingData.pending?.length || 0})
            </button>
            <button
              className={`tab ${activeTab === 'accepted' ? 'active' : ''}`}
              onClick={() => setActiveTab('accepted')}
            >
              Accepted ({meetingData.accepted?.length || 0})
            </button>
            <button
              className={`tab ${activeTab === 'rejected' ? 'active' : ''}`}
              onClick={() => setActiveTab('rejected')}
            >
              Rejected ({meetingData.rejected?.length || 0})
            </button>
          </div>

          <div className="meetings-list">
            {displayItems().length > 0 ? (
              displayItems().map((request) => (
                <div key={request.id} className="card">
                  <h3>{request.patient_name || 'Anonymous Patient'}</h3>
                  <p className="text-muted">Email: {request.patient_email}</p>
                  {request.patient_contact && (
                    <p className="text-muted">Contact: {request.patient_contact}</p>
                  )}
                  
                  {request.message && (
                    <div className="message-box">
                      <strong>Message:</strong>
                      <p>{request.message}</p>
                    </div>
                  )}

                  <p className="text-muted" style={{ fontSize: '0.9em', marginTop: '10px' }}>
                    Requested: {new Date(request.created_at).toLocaleString()}
                  </p>

                  {activeTab === 'pending' && (
                    <div className="card-actions">
                      <button
                        onClick={() => handleResponse(request.id, 'accept')}
                        className="btn btn-primary"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleResponse(request.id, 'reject')}
                        className="btn btn-outline"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {activeTab === 'accepted' && (
                    <div className="card-actions">
                      <span className="badge badge-primary">Accepted</span>
                      <p className="text-muted" style={{ fontSize: '0.85em' }}>
                        Accepted on: {new Date(request.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {activeTab === 'rejected' && (
                    <div className="card-actions">
                      <span className="badge badge-secondary">Rejected</span>
                      <p className="text-muted" style={{ fontSize: '0.85em' }}>
                        Rejected on: {new Date(request.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p className="text-muted text-center">
                  {activeTab === 'pending' && 'No pending meeting requests'}
                  {activeTab === 'accepted' && 'No accepted meeting requests'}
                  {activeTab === 'rejected' && 'No rejected meeting requests'}
                </p>
                {meetingData.pending?.length === 0 && meetingData.accepted?.length === 0 && meetingData.rejected?.length === 0 && (
                  <p className="text-muted text-center" style={{ marginTop: '1rem' }}>
                    Make sure you've set "Available for meetings" in your profile settings
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MeetingRequests;

