import React from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity as ActivityIcon, GitBranch, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export function Activity() {
  const { agents, features, notifications } = useStore();

  // Combine and sort all activities by timestamp
  const activities = React.useMemo(() => {
    interface ActivityItem {
      type: string;
      id: string;
      timestamp: Date;
      title: string;
      description: string;
      status: string;
      icon: React.ComponentType<{ className?: string }>;
    }
    const items: ActivityItem[] = [];

    // Add agent activities
    agents.forEach(agent => {
      if (agent.startTime) {
        items.push({
          type: 'agent',
          id: agent.id,
          timestamp: new Date(agent.startTime),
          title: `Agent ${agent.id} started`,
          description: `${agent.type} agent started working${agent.feature ? ` on ${agent.feature}` : ''}${agent.issueNumber ? ` issue #${agent.issueNumber}` : ''}`,
          status: agent.status,
          icon: Users,
        });
      }
      if (agent.endTime) {
        items.push({
          type: 'agent',
          id: `${agent.id}-end`,
          timestamp: new Date(agent.endTime),
          title: `Agent ${agent.id} ${agent.status}`,
          description: `${agent.type} agent ${agent.status}`,
          status: agent.status,
          icon: agent.status === 'completed' ? CheckCircle : XCircle,
        });
      }
    });

    // Add feature activities
    features.forEach(feature => {
      items.push({
        type: 'feature',
        id: feature.id,
        timestamp: new Date(feature.createdAt),
        title: `Feature "${feature.name}" created`,
        description: feature.description,
        status: 'created',
        icon: GitBranch,
      });

      if (feature.updatedAt !== feature.createdAt) {
        items.push({
          type: 'feature',
          id: `${feature.id}-update`,
          timestamp: new Date(feature.updatedAt),
          title: `Feature "${feature.name}" updated`,
          description: `Status: ${feature.status}`,
          status: feature.status,
          icon: GitBranch,
        });
      }
    });

    // Add notifications as activities
    notifications.forEach(notification => {
      items.push({
        type: 'notification',
        id: notification.id,
        timestamp: notification.timestamp,
        title: notification.message,
        description: '',
        status: notification.level,
        icon: ActivityIcon,
      });
    });

    // Sort by timestamp (newest first)
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [agents, features, notifications]);

  const getStatusVariant = (status: string): 'default' | 'success' | 'destructive' | 'warning' => {
    switch (status) {
      case 'completed':
      case 'success':
      case 'created':
        return 'success';
      case 'failed':
      case 'error':
        return 'destructive';
      case 'running':
      case 'in_progress':
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Activity</h2>
        <p className="text-muted-foreground">
          Real-time activity feed from all agents and operations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <ActivityIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No activity yet</p>
                <p className="text-sm text-muted-foreground">
                  Start working on features to see activity here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex gap-4 rounded-lg border p-4"
                  >
                    <div className="flex-shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <activity.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{activity.title}</p>
                        <Badge variant={getStatusVariant(activity.status)}>
                          {activity.status}
                        </Badge>
                      </div>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground">
                          {activity.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{format(activity.timestamp, 'PPp')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}