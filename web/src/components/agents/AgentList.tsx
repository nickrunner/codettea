import React from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Zap, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function AgentList() {
  const { agents, selectedAgent, selectAgent, isLoading } = useStore();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Agents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'architecture':
        return <Zap className="h-4 w-4" />;
      case 'solver':
        return <CheckCircle className="h-4 w-4" />;
      case 'reviewer':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'warning';
      case 'completed':
        return 'success';
      case 'failed':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Agents</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          {agents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No agents are currently active
            </p>
          ) : (
            <div className="space-y-2">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className={cn(
                    'cursor-pointer rounded-lg border p-3 transition-colors hover:bg-accent',
                    selectedAgent?.id === agent.id && 'bg-accent'
                  )}
                  onClick={() => selectAgent(agent)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getAgentIcon(agent.type)}
                        <p className="font-medium">{agent.id}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{agent.type}</span>
                        {agent.feature && (
                          <>
                            <span>•</span>
                            <span>{agent.feature}</span>
                          </>
                        )}
                        {agent.issueNumber && (
                          <>
                            <span>•</span>
                            <span>Issue #{agent.issueNumber}</span>
                          </>
                        )}
                      </div>
                      {agent.startTime && (
                        <p className="text-xs text-muted-foreground">
                          Started: {format(new Date(agent.startTime), 'HH:mm:ss')}
                        </p>
                      )}
                    </div>
                    <Badge variant={getStatusColor(agent.status) as 'default' | 'warning' | 'success' | 'destructive'}>
                      {agent.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}