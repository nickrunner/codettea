import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  GitBranch, 
  Users, 
  FolderTree, 
  Settings,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { ScrollArea } from '@/components/ui/scroll-area';

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/features', icon: GitBranch, label: 'Features' },
  { to: '/agents', icon: Users, label: 'Agents' },
  { to: '/worktrees', icon: FolderTree, label: 'Worktrees' },
  { to: '/activity', icon: Activity, label: 'Activity' },
  { to: '/config', icon: Settings, label: 'Configuration' },
];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-16 z-40 h-[calc(100vh-64px)] border-r bg-background transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      <ScrollArea className="h-full">
        <div className="flex flex-col h-full">
          <nav className="flex-1 space-y-1 p-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive && 'bg-accent text-accent-foreground',
                    !sidebarOpen && 'justify-center'
                  )
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className={cn(
                'w-full',
                !sidebarOpen && 'justify-center px-0'
              )}
            >
              {sidebarOpen ? (
                <>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Collapse
                </>
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}