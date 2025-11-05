import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ChatBot from './components/ChatBot';
import LandingPage from './pages/LandingPage';
import PatientOnboarding from './pages/PatientOnboarding';
import ResearcherOnboarding from './pages/ResearcherOnboarding';
import PatientDashboard from './pages/PatientDashboard';
import ResearcherDashboard from './pages/ResearcherDashboard';
import ClinicalTrials from './pages/ClinicalTrials';
import Publications from './pages/Publications';
import ResearcherPublications from './pages/ResearcherPublications';
import HealthExperts from './pages/HealthExperts';
import Collaborators from './pages/Collaborators';
import ConnectionRequests from './pages/ConnectionRequests';
import MeetingRequests from './pages/MeetingRequests';
import Forums from './pages/Forums';
import Favorites from './pages/Favorites';
import Chat from './pages/Chat';
import PrivateRoute from './components/PrivateRoute';
import './App.css';
import './styles/theme.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/onboarding/patient" element={<PatientOnboarding />} />
          <Route path="/onboarding/researcher" element={<ResearcherOnboarding />} />
          <Route
            path="/patient/dashboard"
            element={
              <PrivateRoute>
                <PatientDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/patient/trials"
            element={
              <PrivateRoute>
                <ClinicalTrials />
              </PrivateRoute>
            }
          />
          <Route
            path="/patient/publications"
            element={
              <PrivateRoute>
                <Publications />
              </PrivateRoute>
            }
          />
          <Route
            path="/patient/experts"
            element={
              <PrivateRoute>
                <HealthExperts />
              </PrivateRoute>
            }
          />
          <Route
            path="/patient/forums"
            element={
              <PrivateRoute>
                <Forums />
              </PrivateRoute>
            }
          />
          <Route
            path="/patient/favorites"
            element={
              <PrivateRoute>
                <Favorites />
              </PrivateRoute>
            }
          />
          <Route
            path="/researcher/dashboard"
            element={
              <PrivateRoute>
                <ResearcherDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/researcher/collaborators"
            element={
              <PrivateRoute>
                <Collaborators />
              </PrivateRoute>
            }
          />
          <Route
            path="/researcher/connections"
            element={
              <PrivateRoute>
                <ConnectionRequests />
              </PrivateRoute>
            }
          />
          <Route
            path="/researcher/chat/:connectionId"
            element={
              <PrivateRoute>
                <Chat />
              </PrivateRoute>
            }
          />
          <Route
            path="/researcher/publications"
            element={
              <PrivateRoute>
                <ResearcherPublications />
              </PrivateRoute>
            }
          />
          <Route
            path="/researcher/meetings"
            element={
              <PrivateRoute>
                <MeetingRequests />
              </PrivateRoute>
            }
          />
          <Route
            path="/researcher/trials"
            element={
              <PrivateRoute>
                <ClinicalTrials isResearcher={true} />
              </PrivateRoute>
            }
          />
          <Route
            path="/researcher/forums"
            element={
              <PrivateRoute>
                <Forums isResearcher={true} />
              </PrivateRoute>
            }
          />
          <Route
            path="/researcher/favorites"
            element={
              <PrivateRoute>
                <Favorites isResearcher={true} />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ChatBot />
      </Router>
    </AuthProvider>
  );
}

export default App;

