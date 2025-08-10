import React from 'react';
import { useStore } from '@/store/useStore';
import { FeatureList } from '@/components/features/FeatureList';
import { FeatureDetail } from '@/components/features/FeatureDetail';
import { NewFeatureDialog } from '@/components/features/NewFeatureDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function Features() {
  const { selectedFeature } = useStore();
  const [showNewFeature, setShowNewFeature] = React.useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Features</h2>
          <p className="text-muted-foreground">
            Manage your feature development workflows
          </p>
        </div>
        <Button onClick={() => setShowNewFeature(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Feature
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <FeatureList />
        </div>
        <div className="lg:col-span-2">
          {selectedFeature ? (
            <FeatureDetail feature={selectedFeature} />
          ) : (
            <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
              <p className="text-muted-foreground">
                Select a feature to view details
              </p>
            </div>
          )}
        </div>
      </div>

      <NewFeatureDialog
        open={showNewFeature}
        onOpenChange={setShowNewFeature}
      />
    </div>
  );
}