import React from 'react';
import { Agent } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Square, Terminal, Info } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface AgentDetailProps {
  agent: Agent;
}

export function AgentDetail({ agent }: AgentDetailProps) {
  const { stopAgent } = useStore();
  const [logs, setLogs] = React.useState<string[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = React.useState(false);
  const [isStopping, setIsStopping] = React.useState(false);
  const logsEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    loadLogs();
    
    // Set up log streaming if agent is running
    if (agent.status === 'running') {
      const unsubscribe = apiClient.streamAgentLogs(
        agent.id,
        (log) => {
          setLogs(prev => [...prev, log]);
          scrollToBottom();
        },
        (error) => {
          console.error('Log streaming error:', error);
        }
      );

      return () => unsubscribe();
    }
  }, [agent.id, agent.status]);

  const loadLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const response = await apiClient.getAgentLogs(agent.id);
      setLogs(response.logs);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleStop = async () => {
    try {
      setIsStopping(true);
      await stopAgent(agent.id);
      toast.success('Agent stopped successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to stop agent');
    } finally {
      setIsStopping(false);
    }
  };

  const getDuration = () => {
    if (!agent.startTime) return 'N/A';
    const start = new Date(agent.startTime);
    const end = agent.endTime ? new Date(agent.endTime) : new Date();
    const duration = end.getTime() - start.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{agent.id}</CardTitle>
            <CardDescription>
              {agent.type} agent
              {agent.feature && ` • Feature: ${agent.feature}`}
              {agent.issueNumber && ` • Issue: #${agent.issueNumber}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                agent.status === 'completed'
                  ? 'success'
                  : agent.status === 'failed'
                  ? 'destructive'
                  : agent.status === 'running'
                  ? 'warning'
                  : 'default'
              }
            >
              {agent.status}
            </Badge>
            {agent.status === 'running' && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleStop}
                disabled={isStopping}
              >
                <Square className="mr-1 h-3 w-3" />
                Stop
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">
              <Info className="mr-2 h-4 w-4" />
              Information
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Terminal className="mr-2 h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type</p>
                <p className="capitalize">{agent.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className="capitalize">{agent.status}</p>
              </div>
              {agent.pid && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Process ID</p>
                  <p>{agent.pid}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Duration</p>
                <p>{getDuration()}</p>
              </div>
              {agent.startTime && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Started</p>
                  <p>{format(new Date(agent.startTime), 'PPpp')}</p>
                </div>
              )}
              {agent.endTime && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ended</p>
                  <p>{format(new Date(agent.endTime), 'PPpp')}</p>
                </div>
              )}
            </div>
            {agent.error && (
              <div className="rounded-lg bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive">Error</p>
                <p className="text-sm">{agent.error}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs">
            <ScrollArea className="h-[400px] rounded-lg border bg-black p-4">
              {isLoadingLogs ? (
                <p className="text-sm text-gray-400">Loading logs...</p>
              ) : logs.length === 0 ? (
                <p className="text-sm text-gray-400">No logs available</p>
              ) : (
                <div className="space-y-1 font-mono text-xs text-green-400">
                  {logs.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}