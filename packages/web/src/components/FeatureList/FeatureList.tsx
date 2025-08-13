import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { 
  Add as AddIcon,
  PlayArrow as PlayArrowIcon,
  Architecture as ArchitectureIcon,
} from '@mui/icons-material';
import { Feature } from '@/types/api';

interface FeatureListProps {
  features: Feature[];
  loading?: boolean;
  error?: string | null;
  selectedFeature?: string | null;
  onSelectFeature?: (featureName: string) => void;
  onCreateFeature?: () => void;
  onRunFeature?: (featureName: string, architectureMode: boolean) => void;
  runningFeatures?: Set<string>;
}

export const FeatureList = React.memo<FeatureListProps>(({
  features,
  loading,
  error,
  selectedFeature,
  onSelectFeature,
  onCreateFeature,
  onRunFeature,
  runningFeatures = new Set(),
}) => {
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; featureName: string; architectureMode: boolean }>({
    open: false,
    featureName: '',
    architectureMode: false,
  });
  const getStatusColor = (status: Feature['status']) => {
    switch (status) {
      case 'planning':
        return 'info';
      case 'in_progress':
        return 'warning';
      case 'completed':
        return 'success';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleRunFeature = (featureName: string, architectureMode: boolean) => {
    setConfirmDialog({ open: true, featureName, architectureMode });
  };

  const handleConfirmRun = () => {
    const { featureName, architectureMode } = confirmDialog;
    onRunFeature?.(featureName, architectureMode);
    setConfirmDialog({ open: false, featureName: '', architectureMode: false });
  };

  const handleCancelRun = () => {
    setConfirmDialog({ open: false, featureName: '', architectureMode: false });
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Features
        </Typography>
        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" ml={2}>
            Loading features...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Features
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Features</Typography>
        {onCreateFeature && (
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            color="primary"
            onClick={onCreateFeature}
            size="small"
            aria-label="Create new feature"
          >
            New Feature
          </Button>
        )}
      </Box>

      {features.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={3}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No features yet
              </Typography>
              {onCreateFeature && (
                <Button
                  startIcon={<AddIcon />}
                  variant="contained"
                  color="primary"
                  onClick={onCreateFeature}
                  sx={{ mt: 2 }}
                >
                  Create your first feature
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {features.map((feature) => (
            <Card
              key={feature.name}
              className={selectedFeature === feature.name ? 'selected' : ''}
              sx={{
                cursor: onSelectFeature ? 'pointer' : 'default',
                borderLeft: selectedFeature === feature.name ? 4 : 0,
                borderColor: 'primary.main',
                '&:hover': onSelectFeature ? {
                  bgcolor: 'action.hover',
                } : {},
              }}
              onClick={() => onSelectFeature?.(feature.name)}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {feature.name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {onRunFeature && feature.status === 'planning' && (
                      <Tooltip title="Run architecture mode">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRunFeature(feature.name, true);
                          }}
                          disabled={runningFeatures.has(feature.name)}
                        >
                          <ArchitectureIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onRunFeature && feature.status === 'in_progress' && (
                      <Tooltip title="Work on issues">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRunFeature(feature.name, false);
                          }}
                          disabled={runningFeatures.has(feature.name)}
                        >
                          <PlayArrowIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Chip
                      label={feature.status.replace('_', ' ')}
                      color={getStatusColor(feature.status)}
                      size="small"
                    />
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {feature.description}
                </Typography>
                <Box display="flex" gap={2}>
                  <Typography variant="caption" color="text.secondary">
                    {feature.branch}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(feature.updatedAt)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={confirmDialog.open} onClose={handleCancelRun}>
        <DialogTitle>
          {confirmDialog.architectureMode ? 'Run Architecture Mode' : 'Work on Issues'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.architectureMode
              ? `This will run the architecture agent to analyze and create issues for the "${confirmDialog.featureName}" feature. Continue?`
              : `This will start working on the next available issue for the "${confirmDialog.featureName}" feature. Continue?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRun}>Cancel</Button>
          <Button onClick={handleConfirmRun} color="primary" variant="contained">
            {confirmDialog.architectureMode ? 'Run Architecture' : 'Start Work'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});