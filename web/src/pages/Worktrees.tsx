import React from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, FolderOpen, GitBranch, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export function Worktrees() {
  const { worktrees, loadWorktrees, deleteWorktree } = useStore();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await loadWorktrees();
      toast.success('Worktrees refreshed');
    } catch (error) {
      toast.error('Failed to refresh worktrees');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async (path: string) => {
    if (!confirm(`Are you sure you want to delete worktree at ${path}?`)) {
      return;
    }

    try {
      await deleteWorktree(path);
      toast.success('Worktree deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete worktree');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Worktrees</h2>
          <p className="text-muted-foreground">
            Manage Git worktrees for parallel feature development
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {worktrees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No worktrees found</p>
            <p className="text-sm text-muted-foreground">
              Worktrees will be created automatically when you start working on features
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {worktrees.map((worktree) => (
            <Card key={worktree.path}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {worktree.feature || 'Unnamed'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {worktree.path}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={worktree.status === 'active' ? 'success' : 'secondary'}
                  >
                    {worktree.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                  <code className="text-xs">{worktree.branch}</code>
                </div>

                {worktree.gitStatus && (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ahead/Behind:</span>
                      <span>
                        +{worktree.gitStatus.ahead} / -{worktree.gitStatus.behind}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Modified:</span>
                      <span>{worktree.gitStatus.modified.length} files</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Untracked:</span>
                      <span>{worktree.gitStatus.untracked.length} files</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Staged:</span>
                      <span>{worktree.gitStatus.staged.length} files</span>
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Created: {format(new Date(worktree.createdAt), 'PPp')}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      navigator.clipboard.writeText(`cd ${worktree.path}`);
                      toast.success('Path copied to clipboard');
                    }}
                  >
                    <FolderOpen className="mr-1 h-3 w-3" />
                    Copy Path
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(worktree.path)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}