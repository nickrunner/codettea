import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { toggleSidebar, theme, setTheme } = useStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Cmd (Mac) or Ctrl (Windows/Linux) is pressed
      const isCmdOrCtrl = event.metaKey || event.ctrlKey;

      if (!isCmdOrCtrl) return;

      // Prevent default for all shortcuts
      const key = event.key.toLowerCase();

      switch (key) {
        case 'k':
          // Cmd/Ctrl + K: Search (could open a command palette in future)
          event.preventDefault();
          console.log('Search shortcut pressed');
          break;

        case 'b':
          // Cmd/Ctrl + B: Toggle sidebar
          event.preventDefault();
          toggleSidebar();
          break;

        case 'd':
          // Cmd/Ctrl + D: Go to dashboard
          event.preventDefault();
          navigate('/');
          break;

        case 'f':
          // Cmd/Ctrl + F: Go to features
          event.preventDefault();
          navigate('/features');
          break;

        case 'a':
          // Cmd/Ctrl + A: Go to agents
          event.preventDefault();
          navigate('/agents');
          break;

        case 'w':
          // Cmd/Ctrl + W: Go to worktrees
          event.preventDefault();
          navigate('/worktrees');
          break;

        case ',':
          // Cmd/Ctrl + ,: Go to configuration
          event.preventDefault();
          navigate('/config');
          break;

        case '/':
          // Cmd/Ctrl + /: Toggle theme
          event.preventDefault();
          setTheme(theme === 'light' ? 'dark' : 'light');
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, toggleSidebar, theme, setTheme]);
}