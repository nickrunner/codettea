import React from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FeatureList() {
  const { features, selectedFeature, selectFeature, isLoading } = useStore();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Features</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          {features.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No features yet. Create your first feature to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {features.map((feature) => (
                <div
                  key={feature.id}
                  className={cn(
                    'cursor-pointer rounded-lg border p-3 transition-colors hover:bg-accent',
                    selectedFeature?.id === feature.id && 'bg-accent'
                  )}
                  onClick={() => selectFeature(feature)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{feature.name}</p>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {feature.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{feature.issues.length} issues</span>
                        <span>•</span>
                        <span>{feature.branch}</span>
                      </div>
                    </div>
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