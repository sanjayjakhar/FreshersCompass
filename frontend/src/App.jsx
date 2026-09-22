import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import CareerTwin from './pages/CareerTwin';
import ResumeATS from './pages/ResumeATS';
import CodebaseIntelligence from './pages/CodebaseIntelligence';
import AIInterview from './pages/AIInterview';
import JobRecommendations from './pages/JobRecommendations';
import SkillRoadmap from './pages/SkillRoadmap';
import ApplicationTracker from './pages/ApplicationTracker';
import PortfolioGenerator from './pages/PortfolioGenerator';
import Settings from './pages/Settings';
import LinkedInOptimizer from './pages/LinkedInOptimizer';

function App() {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Main App Cockpit Routes (Wrapped in Persistent Left Sidebar + Topbar) */}
      <Route
        path="/dashboard"
        element={
          <AppLayout>
            <Dashboard />
          </AppLayout>
        }
      />
      <Route
        path="/career-twin"
        element={
          <AppLayout>
            <CareerTwin />
          </AppLayout>
        }
      />
      <Route
        path="/resume"
        element={
          <AppLayout>
            <ResumeATS />
          </AppLayout>
        }
      />
      <Route
        path="/codebase"
        element={
          <AppLayout>
            <CodebaseIntelligence />
          </AppLayout>
        }
      />
      <Route
        path="/interview"
        element={
          <AppLayout>
            <AIInterview />
          </AppLayout>
        }
      />
      <Route
        path="/jobs"
        element={
          <AppLayout>
            <JobRecommendations />
          </AppLayout>
        }
      />
      <Route
        path="/roadmap"
        element={
          <AppLayout>
            <SkillRoadmap />
          </AppLayout>
        }
      />
      <Route
        path="/applications"
        element={
          <AppLayout>
            <ApplicationTracker />
          </AppLayout>
        }
      />
      <Route
        path="/portfolio"
        element={
          <AppLayout>
            <PortfolioGenerator />
          </AppLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <AppLayout>
            <Settings />
          </AppLayout>
        }
      />

      <Route
        path="/linkedin"
        element={
          <AppLayout>
            <LinkedInOptimizer />
          </AppLayout>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
