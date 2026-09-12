import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import CodebaseIntelligence from './pages/CodebaseIntelligence';
import LinkedInOptimizer from './pages/LinkedInOptimizer';
import JobRecommendations from './pages/JobRecommendations';

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/codebase" element={<CodebaseIntelligence />} />
          <Route path="/linkedin" element={<LinkedInOptimizer />} />
          <Route path="/jobs" element={<JobRecommendations />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
