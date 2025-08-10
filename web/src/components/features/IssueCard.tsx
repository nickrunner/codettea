import React from 'react';
import { Issue } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, GitPullRequest, Users, AlertCircle } from 'lucide-react';

interface IssueCardProps {
  issue: Issue;
  onWorkOn?: () => void;
}

export function IssueCard({ issue, onWorkOn }: IssueCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                #{issue.number}
              </span>
              <h4 className="font-medium">{issue.title}</h4>
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2">
              {issue.description}
            </p>

            <div className="flex items-center gap-4 text-xs">
              {issue.prNumber && (
                <div className="flex items-center gap-1">
                  <GitPullRequest className="h-3 w-3" />
                  <span>PR #{issue.prNumber}</span>
                </div>
              )}
              
              {issue.assignedAgent && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{issue.assignedAgent}</span>
                </div>
              )}

              {issue.attempts > 0 && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>
                    Attempt {issue.attempts}/{issue.maxAttempts}
                  </span>
                </div>
              )}

              {issue.dependencies && issue.dependencies.length > 0 && (
                <div className="flex items-center gap-1">
                  <span>Depends on: {issue.dependencies.join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={
                issue.status === 'completed'
                  ? 'success'
                  : issue.status === 'failed'
                  ? 'destructive'
                  : issue.status === 'in_progress'
                  ? 'warning'
                  : 'default'
              }
            >
              {issue.status}
            </Badge>
            
            {onWorkOn && issue.status !== 'completed' && (
              <Button size="sm" onClick={onWorkOn}>
                <Play className="mr-1 h-3 w-3" />
                Work On
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}