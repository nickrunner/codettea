import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '@/pages/Dashboard';
import { Features } from '@/pages/Features';
import { Projects } from '@/pages/Projects';
import { Settings } from '@/pages/Settings';
import { Layout } from '@/components/Layout';
import './App.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/features" element={<Features />} />
          <Route path="/features/:featureName" element={<Features />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;