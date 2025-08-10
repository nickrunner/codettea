import React from 'react';
import { useStore } from '@/store/useStore';
import { AgentList } from '@/components/agents/AgentList';
import { AgentDetail } from '@/components/agents/AgentDetail';

export function Agents() {
  const { selectedAgent } = useStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Agents</h2>
        <p className="text-muted-foreground">
          Monitor and manage active development agents
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <AgentList />
        </div>
        <div className="lg:col-span-2">
          {selectedAgent ? (
            <AgentDetail agent={selectedAgent} />
          ) : (
            <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
              <p className="text-muted-foreground">
                Select an agent to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}