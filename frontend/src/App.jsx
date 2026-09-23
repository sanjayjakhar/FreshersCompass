import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import PageSkeleton from './components/PageSkeleton';

// Route-based code splitting (React.lazy) to minimize initial bundle size and accelerate FCP
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CareerTwin = lazy(() => import('./pages/CareerTwin'));
const ResumeATS = lazy(() => import('./pages/ResumeATS'));
const CodebaseIntelligence = lazy(() => import('./pages/CodebaseIntelligence'));
const AIInterview = lazy(() => import('./pages/AIInterview'));
const JobRecommendations = lazy(() => import('./pages/JobRecommendations'));
const SkillRoadmap = lazy(() => import('./pages/SkillRoadmap'));
const ApplicationTracker = lazy(() => import('./pages/ApplicationTracker'));
const PortfolioGenerator = lazy(() => import('./pages/PortfolioGenerator'));
const Settings = lazy(() => import('./pages/Settings'));
const LinkedInOptimizer = lazy(() => import('./pages/LinkedInOptimizer'));
const PublicPortfolio = lazy(() => import('./pages/PublicPortfolio'));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Dedicated Public Developer Portfolio Previews (Accessible without authentication) */}
        <Route path="/p/:username" element={<PublicPortfolio />} />
        <Route path="/portfolio/:username" element={<PublicPortfolio />} />

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
    </Suspense>
  );
}

export default App;
