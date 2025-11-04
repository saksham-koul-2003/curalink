import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';
import api from '../services/api';
import './Dashboard.css';

const ResearcherDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Always fetch fresh data when component mounts or route changes
    fetchDashboard();
  }, [location.pathname]); // Re-fetch when pathname changes

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/researchers/dashboard');
      console.log('Researcher dashboard data:', response.data);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Set empty data structure to prevent crashes
      setDashboardData({
        profile: null,
        my_trials: [],
        potential_collaborators: [],
        forum_questions: [],
      });
      // Show alert if it's an auth error
      if (error.response?.status === 403) {
        alert('You need to be logged in as a researcher to access this page.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManageTrial = (trialId) => {
    navigate(`/researcher/trials?edit=${trialId}`);
  };

  if (loading) {
    return (
      <>
        <Navbar isPatient={false} />
        <div className="dashboard">
          <div className="container">
            <Loader message="Loading your dashboard..." />
          </div>
        </div>
      </>
    );
  }

  const { my_trials = [], potential_collaborators = [], forum_questions = [] } = dashboardData || {};
  
  console.log('Dashboard render - my_trials:', my_trials);
  console.log('Dashboard render - my_trials length:', my_trials?.length);

  return (
    <>
      <Navbar isPatient={false} />
      <div className="dashboard">
        <div className="container">

          <section className="dashboard-section">
            <div className="section-header">
              <h2>My Clinical Trials</h2>
              <Link to="/researcher/trials" className="view-all">Add / Manage Trials →</Link>
            </div>
            <div className="grid">
              {my_trials?.slice(0, 2).map((trial) => {
                const progress = Math.max(0, Math.min(100, trial.progress_percentage || 0));
                return (
                  <div key={trial.id} className="researcher-trial-card">
                    <h3 className="trial-card-title">{trial.title}</h3>
                    {trial.description && (
                      <p className="trial-card-description">{trial.description.substring(0, 120)}...</p>
                    )}
                    <div className="trial-progress-section">
                      <span className="progress-label-text">Progress</span>
                      <div className="trial-progress-bar-container">
                        <div className="trial-progress-track">
                          <div className="trial-progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      <span className="trial-progress-count">{progress}%</span>
                    </div>
                    <div className="trial-phase-status-row">
                      <span className="trial-phase-text"> {trial.phase || 'N/A'}</span>
                      <span className={`trial-status-badge ${trial.status?.toLowerCase() === 'recruiting' ? 'recruiting' : ''}`}>
                        {trial.status || 'Unknown'}
                      </span>
                    </div>
                    <Link 
                      to={`/researcher/trials`} 
                      className="btn-manage-trial"
                      onClick={(e) => {
                        e.preventDefault();
                        handleManageTrial(trial.id);
                      }}
                    >
                      Manage Trial
                    </Link>
                  </div>
                );
              })}
              {(!my_trials || my_trials.length === 0) && (
                <p className="text-muted">No clinical trials yet. <Link to="/researcher/trials">Create one</Link></p>
              )}
            </div>
          </section>

          <section className="dashboard-section">
            <div className="section-header">
              <h2>Potential Collaborators</h2>
              <Link to="/researcher/collaborators" className="view-all">View All →</Link>
            </div>
            <div className="grid">
              {potential_collaborators?.slice(0, 3).map((collaborator) => (
                <div key={collaborator.id} className="card">
                  <h3>{collaborator.name}</h3>
                  {(collaborator.specialties?.[0] || collaborator.location) && (
                    <p className="card-affiliation">
                      {collaborator.specialties?.[0] || 'Research'} • {collaborator.location || 'Location'}
                    </p>
                  )}
                  {(collaborator.specialties && collaborator.specialties.length > 0) && (
                    <div className="tags-list">
                      {collaborator.specialties.slice(0, 2).map((spec, idx) => (
                        <span key={idx} className="tag-badge">{spec}</span>
                      ))}
                    </div>
                  )}
                  <p className="text-muted" style={{ marginTop: 8 }}>Recent publications</p>
                  <Link to={`/researcher/collaborators`} className="view-all" style={{ marginTop: 8, display: 'inline-block' }}>
                    Send Connection Request →
                  </Link>
                </div>
              ))}
              {(!potential_collaborators || potential_collaborators.length === 0) && (
                <p className="text-muted">No potential collaborators found. Update your profile to see recommendations.</p>
              )}
            </div>
          </section>

          <section className="dashboard-section">
            <div className="section-header">
              <h2>Forum Questions Awaiting Response</h2>
              <Link to="/researcher/forums" className="view-all">View All →</Link>
            </div>
            <div className="grid">
              {forum_questions?.slice(0, 3).map((question) => (
                <div key={question.id} className="forum-question-card">
                  <h3 className="forum-question-title">{question.title}</h3>
                  <p className="forum-question-meta">
                    By <strong>{question.author_name}</strong> • {question.category_name} • {new Date(question.created_at).toLocaleDateString()}
                  </p>
                  <p className="forum-question-summary">
                    {question.content.length > 150 ? question.content.substring(0, 150) + '...' : question.content}
                  </p>
                  <div className="forum-question-actions">
                    <Link to={`/researcher/forums`} className="btn-view-details">
                      Reply to Question
                    </Link>
                    {question.reply_count > 0 && (
                      <span className="reply-count">{question.reply_count} {question.reply_count === 1 ? 'reply' : 'replies'}</span>
                    )}
                  </div>
                </div>
              ))}
              {(!forum_questions || forum_questions.length === 0) && (
                <p className="text-muted">No questions awaiting response.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default ResearcherDashboard;

