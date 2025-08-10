import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { Activity, GitBranch, Users, FolderTree, Play, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const navigate = useNavigate();
  const { agents, features, worktrees, config } = useStore();

  const activeAgents = agents.filter(a => a.status === 'running').length;
  const activeFeatures = features.filter(f => f.status === 'in_progress').length;

  const stats = [
    {
      title: 'Active Agents',
      value: activeAgents,
      total: agents.length,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      title: 'Features',
      value: activeFeatures,
      total: features.length,
      icon: GitBranch,
      color: 'text-green-500',
    },
    {
      title: 'Worktrees',
      value: worktrees.filter(w => w.status === 'active').length,
      total: worktrees.length,
      icon: FolderTree,
      color: 'text-purple-500',
    },
    {
      title: 'Activity',
      value: agents.filter(a => a.status === 'running').length,
      total: 0,
      icon: Activity,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to Codettea - Your multi-agent development engine
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stat.value}
                {stat.total > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {' '}/ {stat.total}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Start working on your features quickly
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button onClick={() => navigate('/features')}>
            <Plus className="mr-2 h-4 w-4" />
            New Feature
          </Button>
          <Button variant="outline" onClick={() => navigate('/agents')}>
            <Play className="mr-2 h-4 w-4" />
            View Agents
          </Button>
        </CardContent>
      </Card>

      {/* Recent Features */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Features</CardTitle>
          <CardDescription>
            Your most recent feature developments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {features.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No features yet. Create your first feature to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {features.slice(0, 5).map((feature) => (
                <div
                  key={feature.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{feature.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                  <Badge
                    variant={
                      feature.status === 'completed'
                        ? 'success'
                        : feature.status === 'failed'
                        ? 'destructive'
                        : 'default'
                    }
                  >
                    {feature.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Project */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle>Current Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Project:</span>{' '}
                {config.currentProject || 'None selected'}
              </p>
              <p className="text-sm">
                <span className="font-medium">Main Repo:</span>{' '}
                {config.mainRepoPath}
              </p>
              <p className="text-sm">
                <span className="font-medium">Max Concurrent Tasks:</span>{' '}
                {config.maxConcurrentTasks}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}