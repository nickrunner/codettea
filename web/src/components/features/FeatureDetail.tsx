import React from 'react';
import { Feature } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IssueCard } from './IssueCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, GitBranch, FolderOpen } from 'lucide-react';
import { useStore } from '@/store/useStore';
import toast from 'react-hot-toast';

interface FeatureDetailProps {
  feature: Feature;
}

export function FeatureDetail({ feature }: FeatureDetailProps) {
  const { deleteFeature, assignIssue } = useStore();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete feature "${feature.name}"?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteFeature(feature.id);
      toast.success('Feature deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete feature');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleWorkOnIssue = async (issueNumber: number) => {
    try {
      await assignIssue(feature.id, issueNumber);
      toast.success(`Started working on issue #${issueNumber}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign issue');
    }
  };

  const pendingIssues = feature.issues.filter(i => i.status === 'pending');
  const inProgressIssues = feature.issues.filter(i => i.status === 'in_progress');
  const completedIssues = feature.issues.filter(i => i.status === 'completed');
  const failedIssues = feature.issues.filter(i => i.status === 'failed');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl">{feature.name}</CardTitle>
            <CardDescription>{feature.description}</CardDescription>
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GitBranch className="h-4 w-4" />
                <code>{feature.branch}</code>
              </div>
              {feature.worktreePath && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FolderOpen className="h-4 w-4" />
                  <code>{feature.worktreePath}</code>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                feature.status === 'completed'
                  ? 'success'
                  : feature.status === 'failed'
                  ? 'destructive'
                  : feature.status === 'in_progress'
                  ? 'warning'
                  : 'default'
              }
            >
              {feature.status}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">
              Pending ({pendingIssues.length})
            </TabsTrigger>
            <TabsTrigger value="in_progress">
              In Progress ({inProgressIssues.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedIssues.length})
            </TabsTrigger>
            <TabsTrigger value="failed">
              Failed ({failedIssues.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <ScrollArea className="h-[400px]">
              {pendingIssues.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending issues
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingIssues.map((issue) => (
                    <IssueCard
                      key={issue.number}
                      issue={issue}
                      onWorkOn={() => handleWorkOnIssue(issue.number)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="in_progress">
            <ScrollArea className="h-[400px]">
              {inProgressIssues.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No issues in progress
                </p>
              ) : (
                <div className="space-y-3">
                  {inProgressIssues.map((issue) => (
                    <IssueCard key={issue.number} issue={issue} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="completed">
            <ScrollArea className="h-[400px]">
              {completedIssues.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No completed issues
                </p>
              ) : (
                <div className="space-y-3">
                  {completedIssues.map((issue) => (
                    <IssueCard key={issue.number} issue={issue} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="failed">
            <ScrollArea className="h-[400px]">
              {failedIssues.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No failed issues
                </p>
              ) : (
                <div className="space-y-3">
                  {failedIssues.map((issue) => (
                    <IssueCard
                      key={issue.number}
                      issue={issue}
                      onWorkOn={() => handleWorkOnIssue(issue.number)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}