import React from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, RefreshCw, FolderOpen, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function Configuration() {
  const { config, updateConfig, loadConfig } = useStore();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  
  const [formData, setFormData] = React.useState({
    mainRepoPath: config?.mainRepoPath || '',
    baseWorktreePath: config?.baseWorktreePath || '',
    maxConcurrentTasks: config?.maxConcurrentTasks || 2,
    requiredApprovals: config?.requiredApprovals || 3,
    reviewerProfiles: config?.reviewerProfiles || [],
    projects: config?.projects || [],
  });

  React.useEffect(() => {
    if (config) {
      setFormData({
        mainRepoPath: config.mainRepoPath,
        baseWorktreePath: config.baseWorktreePath,
        maxConcurrentTasks: config.maxConcurrentTasks,
        requiredApprovals: config.requiredApprovals,
        reviewerProfiles: config.reviewerProfiles,
        projects: config.projects,
      });
    }
  }, [config]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateConfig(formData);
      toast.success('Configuration saved successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReload = async () => {
    try {
      setIsLoading(true);
      await loadConfig();
      toast.success('Configuration reloaded');
    } catch (error) {
      toast.error('Failed to reload configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProject = () => {
    setFormData(prev => ({
      ...prev,
      projects: [...prev.projects, { name: '', path: '', description: '' }],
    }));
  };

  const handleRemoveProject = (index: number) => {
    setFormData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  };

  const handleProjectChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      projects: prev.projects.map((project, i) =>
        i === index ? { ...project, [field]: value } : project
      ),
    }));
  };

  const handleAddReviewerProfile = () => {
    const profile = prompt('Enter reviewer profile name:');
    if (profile && !formData.reviewerProfiles.includes(profile)) {
      setFormData(prev => ({
        ...prev,
        reviewerProfiles: [...prev.reviewerProfiles, profile],
      }));
    }
  };

  const handleRemoveReviewerProfile = (profile: string) => {
    setFormData(prev => ({
      ...prev,
      reviewerProfiles: prev.reviewerProfiles.filter(p => p !== profile),
    }));
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Configuration</h2>
          <p className="text-muted-foreground">
            Manage system settings and project configuration
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReload} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Reload
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="reviewers">Reviewers</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure core system parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mainRepoPath">Main Repository Path</Label>
                  <div className="flex gap-2">
                    <Input
                      id="mainRepoPath"
                      value={formData.mainRepoPath}
                      onChange={(e) => setFormData(prev => ({ ...prev, mainRepoPath: e.target.value }))}
                      placeholder="/path/to/main/repo"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(formData.mainRepoPath);
                        toast.success('Path copied');
                      }}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baseWorktreePath">Base Worktree Path</Label>
                  <div className="flex gap-2">
                    <Input
                      id="baseWorktreePath"
                      value={formData.baseWorktreePath}
                      onChange={(e) => setFormData(prev => ({ ...prev, baseWorktreePath: e.target.value }))}
                      placeholder="/path/to/worktrees"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(formData.baseWorktreePath);
                        toast.success('Path copied');
                      }}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxConcurrentTasks">Max Concurrent Tasks</Label>
                  <Input
                    id="maxConcurrentTasks"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.maxConcurrentTasks}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxConcurrentTasks: parseInt(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requiredApprovals">Required Approvals</Label>
                  <Input
                    id="requiredApprovals"
                    type="number"
                    min="1"
                    max="5"
                    value={formData.requiredApprovals}
                    onChange={(e) => setFormData(prev => ({ ...prev, requiredApprovals: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Projects</CardTitle>
                  <CardDescription>
                    Manage your development projects
                  </CardDescription>
                </div>
                <Button size="sm" onClick={handleAddProject}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Project
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formData.projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No projects configured. Add your first project to get started.
                </p>
              ) : (
                <div className="space-y-4">
                  {formData.projects.map((project, index) => (
                    <div key={index} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Project {index + 1}</h4>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveProject(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={project.name}
                            onChange={(e) => handleProjectChange(index, 'name', e.target.value)}
                            placeholder="Project name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Path</Label>
                          <Input
                            value={project.path}
                            onChange={(e) => handleProjectChange(index, 'path', e.target.value)}
                            placeholder="/path/to/project"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Description</Label>
                          <Input
                            value={project.description || ''}
                            onChange={(e) => handleProjectChange(index, 'description', e.target.value)}
                            placeholder="Optional description"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviewers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Reviewer Profiles</CardTitle>
                  <CardDescription>
                    Configure reviewer profiles for code reviews
                  </CardDescription>
                </div>
                <Button size="sm" onClick={handleAddReviewerProfile}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Profile
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formData.reviewerProfiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No reviewer profiles configured.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {formData.reviewerProfiles.map((profile) => (
                    <Badge
                      key={profile}
                      variant="secondary"
                      className="px-3 py-1"
                    >
                      {profile}
                      <button
                        onClick={() => handleRemoveReviewerProfile(profile)}
                        className="ml-2 text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}