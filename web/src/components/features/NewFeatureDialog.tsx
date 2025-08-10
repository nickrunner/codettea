import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useStore } from '@/store/useStore';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface NewFeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewFeatureDialog({ open, onOpenChange }: NewFeatureDialogProps) {
  const { createFeature } = useStore();
  const [isCreating, setIsCreating] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');

  const handleCreate = async () => {
    if (!name.trim() || !description.trim()) {
      toast.error('Please provide both name and description');
      return;
    }

    try {
      setIsCreating(true);
      await createFeature(name, description);
      toast.success('Feature created successfully');
      onOpenChange(false);
      // Reset form
      setName('');
      setDescription('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create feature');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Feature</DialogTitle>
          <DialogDescription>
            Start a new feature development workflow. The architecture agent will
            analyze your requirements and create GitHub issues.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Feature Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., user-authentication"
              disabled={isCreating}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this feature should do..."
              rows={4}
              disabled={isCreating}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Feature'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}