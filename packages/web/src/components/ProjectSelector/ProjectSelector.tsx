import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
} from '@mui/material';
import { Search as SearchIcon, Folder as FolderIcon } from '@mui/icons-material';
import { Project } from '@/types/api';

interface ProjectSelectorProps {
  projects: Project[];
  selectedProject?: string | null;
  loading?: boolean;
  error?: string | null;
  onSelectProject?: (projectName: string) => void;
  onScanProjects?: () => void;
}

export const ProjectSelector = React.memo<ProjectSelectorProps>(({
  projects,
  selectedProject,
  loading,
  error,
  onSelectProject,
  onScanProjects,
}) => {
  const activeProject = projects.find((p) => p.isActive);

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Projects
        </Typography>
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Projects
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Projects</Typography>
        {onScanProjects && (
          <IconButton
            onClick={onScanProjects}
            disabled={loading}
            aria-label="Scan for projects"
            color="primary"
          >
            <SearchIcon />
          </IconButton>
        )}
      </Box>

      {activeProject && (
        <Card sx={{ mb: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <CardContent>
            <Typography variant="overline" sx={{ opacity: 0.9 }}>
              Active Project
            </Typography>
            <Typography variant="h6">{activeProject.name}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {activeProject.path}
            </Typography>
            {activeProject.currentBranch && (
              <Box mt={1}>
                <Chip
                  label={activeProject.currentBranch}
                  size="small"
                  sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'inherit' }}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {projects.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={3}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No projects found
              </Typography>
              {onScanProjects && (
                <Button
                  startIcon={<SearchIcon />}
                  variant="contained"
                  onClick={onScanProjects}
                  sx={{ mt: 2 }}
                >
                  Scan for projects
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Available Projects
            </Typography>
            <List sx={{ p: 0 }}>
              {projects.map((project) => (
                <ListItem
                  key={project.name}
                  disablePadding
                  secondaryAction={
                    project.isActive && (
                      <Chip label="Active" color="primary" size="small" />
                    )
                  }
                >
                  <ListItemButton
                    selected={selectedProject === project.name || project.isActive}
                    onClick={() => onSelectProject?.(project.name)}
                  >
                    <FolderIcon sx={{ mr: 2, color: 'text.secondary' }} />
                    <ListItemText
                      primary={project.name}
                      secondary={
                        <React.Fragment>
                          <Typography variant="caption" component="span">
                            {project.path}
                          </Typography>
                          {project.currentBranch && (
                            <Typography variant="caption" component="span" sx={{ ml: 1 }}>
                              • {project.currentBranch}
                            </Typography>
                          )}
                        </React.Fragment>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
});