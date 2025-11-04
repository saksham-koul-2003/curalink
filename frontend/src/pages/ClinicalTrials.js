import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Trials.css';

const ClinicalTrials = ({ isResearcher = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    location: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTrialDetailsModal, setShowTrialDetailsModal] = useState(false);
  const [selectedTrial, setSelectedTrial] = useState(null);
  const [expandedSummaries, setExpandedSummaries] = useState(new Set()); // Track which summaries are expanded
  const [fullSummaries, setFullSummaries] = useState(new Set()); // Track which summaries are fully expanded (read more)
  const [patientFullSummaries, setPatientFullSummaries] = useState(new Set()); // Track patient summaries fully expanded
  const [patientViewedSummaries, setPatientViewedSummaries] = useState(new Set()); // Track which patient summaries are viewed
  const [newTrial, setNewTrial] = useState({
    title: '',
    description: '',
    conditions: [],
    phase: '',
    status: 'recruiting',
    location: '',
    eligibility_criteria: '',
    contact_email: '',
    progress_percentage: 0,
  });
  const [currentCondition, setCurrentCondition] = useState('');
  const [favoriteTrials, setFavoriteTrials] = useState(new Set());

  useEffect(() => {
    // Reset expanded summaries when component mounts or page changes
    setExpandedSummaries(new Set());
    setFullSummaries(new Set());
    setPatientFullSummaries(new Set());
    setPatientViewedSummaries(new Set());
    
    // Clear trials first to prevent showing old data
    setTrials([]);
    
    // For researchers: ALWAYS use fetchMyTrials if isResearcher prop is true
    // The isResearcher prop is the source of truth - it comes from the route
    // Don't wait for user to load - the prop tells us this is the researcher route
    if (isResearcher) {
      // ALWAYS fetch my trials for researcher route, regardless of user loading state
      // The backend will handle authentication and return only researcher's trials
      fetchMyTrials();
    } else {
      // For patients: use searchTrials
      searchTrials();
    }
    fetchFavorites();
  }, [isResearcher, user?.user_type, user]);

  const fetchFavorites = async () => {
    try {
      const response = await api.get('/favorites');
      const favorites = response.data || {};
      const trialIds = (favorites.clinical_trials || []).map(t => t.id);
      setFavoriteTrials(new Set(trialIds));
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    }
  };

  const toggleFavorite = async (trialId, itemType = 'clinical_trial') => {
    const isFavorited = favoriteTrials.has(trialId);
    
    try {
      if (isFavorited) {
        await api.delete(`/favorites/${itemType}/${trialId}`);
        setFavoriteTrials(prev => {
          const newSet = new Set(prev);
          newSet.delete(trialId);
          return newSet;
        });
      } else {
        await api.post('/favorites', {
          item_type: itemType,
          item_id: trialId,
        });
        setFavoriteTrials(prev => new Set(prev).add(trialId));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (showCreateModal || showEditModal || showTrialDetailsModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCreateModal, showEditModal, showTrialDetailsModal]);

  // Check for edit parameter in URL
  useEffect(() => {
    if (isResearcher && user?.user_type === 'researcher' && trials.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get('edit');
      if (editId) {
        // Find the trial and open edit modal
        const trial = trials.find(t => t.id === parseInt(editId));
        if (trial && !showEditModal) {
          setSelectedTrial(trial);
          setNewTrial({
            title: trial.title || '',
            description: trial.description || '',
            conditions: trial.conditions || [],
            phase: trial.phase || '',
            status: trial.status || 'recruiting',
            location: trial.location || '',
            eligibility_criteria: trial.eligibility_criteria || '',
            contact_email: trial.contact_email || '',
            progress_percentage: trial.progress_percentage || 0,
          });
          setShowEditModal(true);
          // Clean up URL
          window.history.replaceState({}, '', '/researcher/trials');
        }
      }
    }
  }, [trials, isResearcher, user?.user_type]);

  const searchTrials = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.query = searchQuery;
      if (filters.status) params.status = filters.status;
      if (filters.location) params.location = filters.location;

      console.log('[ClinicalTrials Page] Searching trials with params:', params);
      
      const response = await api.get('/trials/search', { params });
      console.log('[ClinicalTrials Page] Received', response.data?.length || 0, 'trials');
      
      // Ensure each trial has ctgov_url
      const trialsWithUrls = (response.data || []).map(trial => ({
        ...trial,
        ctgov_url: trial.ctgov_url || (trial.nct_id ? `https://clinicaltrials.gov/search?id=${trial.nct_id}` : null),
      }));
      
      setTrials(trialsWithUrls);
    } catch (error) {
      console.error('Failed to search trials:', error);
      alert('Failed to search trials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTrials = async () => {
    setLoading(true);
    try {
      console.log('[ClinicalTrials Page] Fetching my trials (researcher only)');
      const response = await api.get('/trials/search', { params: { my_trials_only: 'true' } });
      console.log('[ClinicalTrials Page] Received', response.data?.length || 0, 'researcher trials');
      setTrials(response.data || []);
    } catch (error) {
      console.error('Failed to fetch trials:', error);
      setTrials([]); // Clear trials on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrial = async (e) => {
    e.preventDefault();
    try {
      await api.post('/trials', newTrial);
      setShowCreateModal(false);
      setNewTrial({
        title: '',
        description: '',
        conditions: [],
        phase: '',
        status: 'recruiting',
        location: '',
        eligibility_criteria: '',
        contact_email: '',
        progress_percentage: 0,
      });
      if (isResearcher) {
        fetchMyTrials();
      } else {
        searchTrials();
      }
    } catch (error) {
      console.error('Failed to create trial:', error);
      alert('Failed to create trial');
    }
  };

  const handleEditTrial = async (trial) => {
    setSelectedTrial(trial);
    setNewTrial({
      title: trial.title || '',
      description: trial.description || '',
      conditions: trial.conditions || [],
      phase: trial.phase || '',
      status: trial.status || 'recruiting',
      location: trial.location || '',
      eligibility_criteria: trial.eligibility_criteria || '',
      contact_email: trial.contact_email || '',
      progress_percentage: trial.progress_percentage || 0,
    });
    setShowEditModal(true);
  };

  const handleUpdateTrial = async (e) => {
    e.preventDefault();
    if (!selectedTrial) return;
    
    try {
      await api.put(`/trials/${selectedTrial.id}`, newTrial);
      setShowEditModal(false);
      setSelectedTrial(null);
      setNewTrial({
        title: '',
        description: '',
        conditions: [],
        phase: '',
        status: 'recruiting',
        location: '',
        eligibility_criteria: '',
        contact_email: '',
        progress_percentage: 0,
      });
      if (isResearcher) {
        fetchMyTrials();
      } else {
        searchTrials();
      }
    } catch (error) {
      console.error('Failed to update trial:', error);
      alert('Failed to update trial');
    }
  };

  const addCondition = () => {
    if (currentCondition.trim()) {
      setNewTrial({
        ...newTrial,
        conditions: [...newTrial.conditions, currentCondition.trim()],
      });
      setCurrentCondition('');
    }
  };

  const handleGenerateSummary = async (trialId) => {
    try {
      const response = await api.post(`/trials/${trialId}/generate-summary`);
      console.log('Summary generated:', response.data.ai_summary);
      // Update the trial in the list
      setTrials(trials.map(trial => 
        trial.id === trialId ? response.data : trial
      ));
      // Expand the summary after generation (for researchers)
      if (isResearcher) {
        setExpandedSummaries(new Set([...expandedSummaries, trialId]));
      } else {
        // For patients, show the summary immediately after generation
        setPatientViewedSummaries(new Set([...patientViewedSummaries, trialId]));
        setPatientFullSummaries(new Set([...patientFullSummaries, trialId]));
      }
      alert('AI summary generated successfully!');
    } catch (error) {
      console.error('Failed to generate summary:', error);
      alert(error.response?.data?.error || 'Failed to generate summary');
    }
  };

  const toggleSummary = (trialId) => {
    const newExpanded = new Set(expandedSummaries);
    if (newExpanded.has(trialId)) {
      newExpanded.delete(trialId);
      // Also remove from full summaries when collapsing
      const newFull = new Set(fullSummaries);
      newFull.delete(trialId);
      setFullSummaries(newFull);
    } else {
      newExpanded.add(trialId);
    }
    setExpandedSummaries(newExpanded);
  };

  const toggleFullSummary = (trialId) => {
    const newFull = new Set(fullSummaries);
    if (newFull.has(trialId)) {
      newFull.delete(trialId);
    } else {
      newFull.add(trialId);
    }
    setFullSummaries(newFull);
  };

  const togglePatientFullSummary = (trialId) => {
    const newFull = new Set(patientFullSummaries);
    if (newFull.has(trialId)) {
      newFull.delete(trialId);
    } else {
      newFull.add(trialId);
    }
    setPatientFullSummaries(newFull);
  };

  const togglePatientViewSummary = (trialId) => {
    const newViewed = new Set(patientViewedSummaries);
    if (newViewed.has(trialId)) {
      newViewed.delete(trialId);
      // Also collapse the full summary when hiding
      const newFull = new Set(patientFullSummaries);
      newFull.delete(trialId);
      setPatientFullSummaries(newFull);
    } else {
      newViewed.add(trialId);
    }
    setPatientViewedSummaries(newViewed);
  };

  const handleViewTrialDetails = (trial) => {
    setSelectedTrial(trial);
    setShowTrialDetailsModal(true);
  };

  const handleCloseTrialDetails = () => {
    setShowTrialDetailsModal(false);
    setSelectedTrial(null);
  };

  // Prevent scroll propagation from modal content to overlay
  const handleModalContentScroll = (e) => {
    e.stopPropagation();
  };

  const handleEmailClick = (email) => {
    // Open email compose box with mailto link
    const subject = encodeURIComponent('Inquiry about Clinical Trial');
    const body = encodeURIComponent('Dear Trial Administrator,\n\nI am interested in learning more about this clinical trial.\n\nThank you for your time.');
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  return (
    <>
      <Navbar isPatient={!isResearcher} />
      <div className="trials-page">
        <div className="container">
          <div className="page-header">
            <h1>{isResearcher ? 'Manage Clinical Trials' : 'Clinical Trials'}</h1>
            {isResearcher && (
              <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                Create New Trial
              </button>
            )}
          </div>

          {!isResearcher && (
            <div className="search-filters">
              <input
                type="text"
                placeholder="Search trials (e.g., Lung Cancer Immunotherapy Trials)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') searchTrials();
                }}
                className="search-input"
              />
              <div className="filters">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All Status</option>
                  <option value="recruiting">Recruiting</option>
                  <option value="completed">Completed</option>
                  <option value="not yet recruiting">Not Yet Recruiting</option>
                </select>
                <input
                  type="text"
                  placeholder="Location filter"
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                />
                <button onClick={searchTrials} className="btn btn-primary">
                  Search
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <Loader message="Loading clinical trials..." />
          ) : (
            <div className="trials-grid">
              {trials.map((trial) => (
                <div key={trial.id} className="trial-card">
                  {!isResearcher && (
                    <button
                      className={`favorite-star ${favoriteTrials.has(trial.id) ? 'favorited' : ''}`}
                      onClick={() => toggleFavorite(trial.id)}
                      title={favoriteTrials.has(trial.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {favoriteTrials.has(trial.id) ? '★' : '☆'}
                    </button>
                  )}
                  <h3 className="trial-title">{trial.title}</h3>
                  
                  {/* AI Summary Section - Only for researchers, show on click */}
                  {isResearcher && trial.ai_summary && expandedSummaries.has(trial.id) && (
                    <div className="ai-summary-section">
                      <div className="ai-summary-header">
                        <span className="ai-badge">🤖 AI Summary</span>
                        <button 
                          className="ai-summary-close"
                          onClick={() => toggleSummary(trial.id)}
                          title="Hide summary"
                        >
                          ×
                        </button>
                      </div>
                      <div className={`ai-summary-content ${!fullSummaries.has(trial.id) ? 'ai-summary-collapsed' : ''}`}>
                        <p className="ai-summary-text">
                          {trial.ai_summary || 'No summary available'}
                        </p>
                      </div>
                      {trial.ai_summary && trial.ai_summary.length > 200 && (
                        <button 
                          className="btn-read-more"
                          onClick={() => toggleFullSummary(trial.id)}
                        >
                          {fullSummaries.has(trial.id) ? 'Read Less' : 'Read More'}
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Show AI Summary Button - Only if summary exists and not expanded */}
                  {isResearcher && trial.ai_summary && !expandedSummaries.has(trial.id) && (
                    <button
                      onClick={() => toggleSummary(trial.id)}
                      className="btn-show-ai-summary"
                    >
                      🤖 View AI Summary
                    </button>
                  )}
                  
                  {/* Regular Description - Show if no AI summary (for researchers) or if no AI summary for patients */}
                  {((isResearcher && !trial.ai_summary && trial.description) || (!isResearcher && !trial.ai_summary && trial.description)) && (
                    <p className="trial-description">
                      {trial.description}
                    </p>
                  )}
                  
                  {/* AI Summary for Patients - Show button first, then summary on click */}
                  {!isResearcher && trial.ai_summary && !patientViewedSummaries.has(trial.id) && (
                    <button
                      onClick={() => togglePatientViewSummary(trial.id)}
                      className="btn-show-ai-summary"
                    >
                      🤖 View AI Summary
                    </button>
                  )}
                  
                  {/* AI Summary for Patients - Show if viewed */}
                  {!isResearcher && trial.ai_summary && patientViewedSummaries.has(trial.id) && (
                    <div className="ai-summary-section">
                      <div className="ai-summary-header">
                        <span className="ai-badge">🤖 AI Summary</span>
                        <button 
                          className="ai-summary-close"
                          onClick={() => togglePatientViewSummary(trial.id)}
                          title="Hide summary"
                        >
                          ×
                        </button>
                      </div>
                      <div className={`ai-summary-content ${!patientFullSummaries.has(trial.id) ? 'ai-summary-collapsed' : ''}`}>
                        <p className="ai-summary-text">
                          {trial.ai_summary}
                        </p>
                      </div>
                      {trial.ai_summary && trial.ai_summary.length > 200 && (
                        <button 
                          className="btn-read-more"
                          onClick={() => togglePatientFullSummary(trial.id)}
                        >
                          {patientFullSummaries.has(trial.id) ? 'Read Less' : 'Read More'}
                        </button>
                      )}
                    </div>
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
                    {isResearcher ? (
                      <>
                        <button
                          onClick={() => handleEditTrial(trial)}
                          className="btn-view-details"
                        >
                          Manage Trial
                        </button>
                        {trial.description && (
                          <button
                            onClick={() => handleGenerateSummary(trial.id)}
                            className="btn-contact-admin btn-generate-ai"
                            title="Generate AI Summary"
                          >
                            🤖 Generate AI Summary
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button 
                          className="btn-view-details"
                          onClick={() => handleViewTrialDetails(trial)}
                        >
                          View Details
                        </button>
                        {trial.description && !trial.ai_summary && (trial.created_by === null || trial.nct_id) && (
                          <button
                            onClick={() => handleGenerateSummary(trial.id)}
                            className="btn-contact-admin btn-generate-ai"
                            title="Generate AI Summary"
                          >
                            🤖 Generate AI Summary
                          </button>
                        )}
                        {trial.nct_id && (
                          <a
                            href={trial.ctgov_url || `https://clinicaltrials.gov/search?id=${trial.nct_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-contact-admin btn-clinical-gov"
                            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            View on ClinicalTrials.gov
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {trials.length === 0 && (
                <p className="text-muted text-center">No trials found. Try adjusting your search.</p>
              )}
            </div>
          )}

          {showCreateModal && (
            <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} onScroll={handleModalContentScroll}>
                <h2>Create New Clinical Trial</h2>
                <form onSubmit={handleCreateTrial}>
                  <div className="input-group">
                    <label>Title *</label>
                    <input
                      type="text"
                      value={newTrial.title}
                      onChange={(e) => setNewTrial({ ...newTrial, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Description *</label>
                    <textarea
                      value={newTrial.description}
                      onChange={(e) => setNewTrial({ ...newTrial, description: e.target.value })}
                      required
                      rows="4"
                    />
                  </div>
                  <div className="input-group">
                    <label>Conditions</label>
                    <div className="tag-input">
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
                      />
                      <button type="button" onClick={addCondition} className="btn btn-primary">
                        Add
                      </button>
                    </div>
                    {newTrial.conditions.length > 0 && (
                      <div className="tags-list">
                        {newTrial.conditions.map((cond, idx) => (
                          <span key={idx} className="badge">
                            {cond}
                            <button
                              type="button"
                              onClick={() => {
                                setNewTrial({
                                  ...newTrial,
                                  conditions: newTrial.conditions.filter((_, i) => i !== idx),
                                });
                              }}
                              className="badge-remove"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="input-group">
                    <label>Phase</label>
                    <select
                      value={newTrial.phase}
                      onChange={(e) => setNewTrial({ ...newTrial, phase: e.target.value })}
                    >
                      <option value="">Select Phase</option>
                      <option value="Phase 1">Phase 1</option>
                      <option value="Phase 2">Phase 2</option>
                      <option value="Phase 3">Phase 3</option>
                      <option value="Phase 4">Phase 4</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Status</label>
                    <select
                      value={newTrial.status}
                      onChange={(e) => setNewTrial({ ...newTrial, status: e.target.value })}
                    >
                      <option value="recruiting">Recruiting</option>
                      <option value="not yet recruiting">Not Yet Recruiting</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Location</label>
                    <input
                      type="text"
                      value={newTrial.location}
                      onChange={(e) => setNewTrial({ ...newTrial, location: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label>Eligibility Criteria</label>
                    <textarea
                      value={newTrial.eligibility_criteria}
                      onChange={(e) => setNewTrial({ ...newTrial, eligibility_criteria: e.target.value })}
                      rows="3"
                    />
                  </div>
                  <div className="input-group">
                    <label>Contact Email</label>
                    <input
                      type="email"
                      value={newTrial.contact_email}
                      onChange={(e) => setNewTrial({ ...newTrial, contact_email: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label>Progress (%)</label>
                    <input
                      type="number"
                      value={newTrial.progress_percentage}
                      onChange={(e) => setNewTrial({ ...newTrial, progress_percentage: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-outline">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">Create</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Trial Modal */}
          {showEditModal && selectedTrial && (
            <div className="modal-overlay" onClick={() => {
              setShowEditModal(false);
              setSelectedTrial(null);
            }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} onScroll={handleModalContentScroll}>
                <h2>Manage Clinical Trial</h2>
                <form onSubmit={handleUpdateTrial}>
                  <div className="input-group">
                    <label>Title *</label>
                    <input
                      type="text"
                      value={newTrial.title}
                      onChange={(e) => setNewTrial({ ...newTrial, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Description *</label>
                    <textarea
                      value={newTrial.description}
                      onChange={(e) => setNewTrial({ ...newTrial, description: e.target.value })}
                      required
                      rows="4"
                    />
                  </div>
                  <div className="input-group">
                    <label>Conditions</label>
                    <div className="tag-input">
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
                      />
                      <button type="button" onClick={addCondition} className="btn btn-primary">
                        Add
                      </button>
                    </div>
                    {newTrial.conditions.length > 0 && (
                      <div className="tags-list">
                        {newTrial.conditions.map((cond, idx) => (
                          <span key={idx} className="badge">
                            {cond}
                            <button
                              type="button"
                              onClick={() => {
                                setNewTrial({
                                  ...newTrial,
                                  conditions: newTrial.conditions.filter((_, i) => i !== idx),
                                });
                              }}
                              className="badge-remove"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="input-group">
                    <label>Phase</label>
                    <select
                      value={newTrial.phase}
                      onChange={(e) => setNewTrial({ ...newTrial, phase: e.target.value })}
                    >
                      <option value="">Select Phase</option>
                      <option value="Phase 1">Phase 1</option>
                      <option value="Phase 2">Phase 2</option>
                      <option value="Phase 3">Phase 3</option>
                      <option value="Phase 4">Phase 4</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Status</label>
                    <select
                      value={newTrial.status}
                      onChange={(e) => setNewTrial({ ...newTrial, status: e.target.value })}
                    >
                      <option value="recruiting">Recruiting</option>
                      <option value="not yet recruiting">Not Yet Recruiting</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Location</label>
                    <input
                      type="text"
                      value={newTrial.location}
                      onChange={(e) => setNewTrial({ ...newTrial, location: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label>Eligibility Criteria</label>
                    <textarea
                      value={newTrial.eligibility_criteria}
                      onChange={(e) => setNewTrial({ ...newTrial, eligibility_criteria: e.target.value })}
                      rows="3"
                    />
                  </div>
                  <div className="input-group">
                    <label>Contact Email</label>
                    <input
                      type="email"
                      value={newTrial.contact_email}
                      onChange={(e) => setNewTrial({ ...newTrial, contact_email: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label>Progress (%)</label>
                    <input
                      type="number"
                      value={newTrial.progress_percentage}
                      onChange={(e) => setNewTrial({ ...newTrial, progress_percentage: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => {
                      setShowEditModal(false);
                      setSelectedTrial(null);
                    }} className="btn btn-outline">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">Update Trial</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Trial Details Modal for Patients */}
          {!isResearcher && showTrialDetailsModal && selectedTrial && (
            <div className="modal-overlay" onClick={handleCloseTrialDetails}>
              <div className="modal-content trial-details-modal" onClick={(e) => e.stopPropagation()} onScroll={handleModalContentScroll}>
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
        </div>
      </div>
    </>
  );
};

export default ClinicalTrials;

