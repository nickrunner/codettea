import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from 'react-hot-toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

// Pages
import { Dashboard } from '@/pages/Dashboard';
import { Features } from '@/pages/Features';
import { Agents } from '@/pages/Agents';
import { Worktrees } from '@/pages/Worktrees';
import { Activity } from '@/pages/Activity';
import { Configuration } from '@/pages/Configuration';
import { Login } from '@/pages/Login';

// Loading component
import { LoadingScreen } from '@/components/shared/LoadingScreen';

function App() {
  const { 
    isAuthenticated, 
    checkAuth, 
    loadConfig, 
    loadFeatures,
    loadAgents,
    loadWorktrees,
    connectWebSocket,
    theme 
  } = useStore();

  const [isInitializing, setIsInitializing] = React.useState(true);

  // Set up keyboard shortcuts
  useKeyboardShortcuts();

  useEffect(() => {
    // Apply theme on mount
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const initialize = async () => {
      try {
        await checkAuth();
        const store = useStore.getState();
        
        if (store.isAuthenticated) {
          await Promise.all([
            loadConfig(),
            loadFeatures(),
            loadAgents(),
            loadWorktrees(),
            connectWebSocket()
          ]);
        }
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, []);

  if (isInitializing) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster position="bottom-right" />
      </>
    );
  }

  return (
    <>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/features" element={<Features />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/worktrees" element={<Worktrees />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/config" element={<Configuration />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <Toaster position="bottom-right" />
    </>
  );
}

export default App;