import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { ClaudeStatus as ClaudeStatusType } from '@/types/api';

interface ClaudeStatusProps {
  status: ClaudeStatusType | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export const ClaudeStatus = React.memo<ClaudeStatusProps>(({
  status,
  loading,
  error,
  onRefresh,
}) => {
  const getStatusColor = () => {
    if (loading) return 'default';
    if (error) return 'error';
    if (!status) return 'default';
    return status.connected ? 'success' : 'error';
  };

  const getStatusText = () => {
    if (loading) return 'Checking...';
    if (error) return 'Error';
    if (!status) return 'Unknown';
    return status.connected ? 'Connected' : 'Disconnected';
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Claude Connection</Typography>
        {onRefresh && (
          <IconButton
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh Claude status"
            color="primary"
          >
            <RefreshIcon />
          </IconButton>
        )}
      </Box>

      <Stack spacing={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Chip
            label={getStatusText()}
            color={getStatusColor()}
            variant={loading ? 'outlined' : 'filled'}
            icon={loading ? <CircularProgress size={16} /> : undefined}
          />
        </Box>

        {error && (
          <Alert severity="error">{error}</Alert>
        )}

        {status && status.connected && status.capabilities && (
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Model:
                  </Typography>
                  <Typography variant="body2">
                    {status.capabilities.model}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Max Tokens:
                  </Typography>
                  <Typography variant="body2">
                    {status.capabilities.maxTokens.toLocaleString()}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Last Check:
                  </Typography>
                  <Typography variant="body2">
                    {new Date(status.lastCheck).toLocaleTimeString()}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
});