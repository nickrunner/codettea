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
  Stack,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { Feature } from '@/types/api';

interface FeatureListProps {
  features: Feature[];
  loading?: boolean;
  error?: string | null;
  selectedFeature?: string | null;
  onSelectFeature?: (featureName: string) => void;
  onCreateFeature?: () => void;
}

export const FeatureList = React.memo<FeatureListProps>(({
  features,
  loading,
  error,
  selectedFeature,
  onSelectFeature,
  onCreateFeature,
}) => {
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

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Features
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
                  <Typography variant="subtitle1" fontWeight="bold">
                    {feature.name}
                  </Typography>
                  <Chip
                    label={feature.status.replace('_', ' ')}
                    color={getStatusColor(feature.status)}
                    size="small"
                  />
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
    </Box>
  );
});