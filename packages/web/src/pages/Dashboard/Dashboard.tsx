import React, { useEffect, useCallback } from 'react';
import { Grid, Paper, Typography, Box, Card, CardContent } from '@mui/material';
import { ClaudeStatus } from '@/components/ClaudeStatus';
import { FeatureList } from '@/components/FeatureList';
import { ProjectSelector } from '@/components/ProjectSelector';
import { useClaudeStatus } from '@/hooks/useClaudeStatus';
import { useFeatures } from '@/hooks/useFeatures';
import { useProjects } from '@/hooks/useProjects';

export const Dashboard: React.FC = () => {
  const { status: claudeStatus, loading: claudeLoading, error: claudeError, refresh: refreshClaude } = useClaudeStatus();
  const { features, loading: featuresLoading, error: featuresError, refresh: refreshFeatures } = useFeatures();
  const { projects, loading: projectsLoading, error: projectsError, setActiveProject, scanProjects } = useProjects();

  useEffect(() => {
    // Refresh data on mount
    refreshClaude();
    refreshFeatures();
    scanProjects();
  }, [refreshClaude, refreshFeatures, scanProjects]);

  const handleProjectSelect = useCallback(async (projectName: string) => {
    await setActiveProject(projectName);
    refreshFeatures(); // Refresh features after changing project
  }, [setActiveProject, refreshFeatures]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h2" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Overview of your multi-agent development system
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <ClaudeStatus
              status={claudeStatus}
              loading={claudeLoading}
              error={claudeError}
              onRefresh={refreshClaude}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <ProjectSelector
              projects={projects}
              loading={projectsLoading}
              error={projectsError}
              onSelectProject={handleProjectSelect}
              onScanProjects={scanProjects}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <FeatureList
              features={features.slice(0, 5)} // Show only recent features
              loading={featuresLoading}
              error={featuresError}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Stats
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {features.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Features
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="warning.main">
                      {features.filter(f => f.status === 'in_progress').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      In Progress
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      {features.filter(f => f.status === 'completed').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completed
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="info.main">
                      {projects.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Projects
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};