import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  LinearProgress,
  Alert,
  Chip,
  Collapse,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Stop as StopIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

interface ExecutionLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: string;
}

interface ExecutionStatusProps {
  taskId?: string | null;
  featureName?: string;
  issueNumber?: number | null;
  onClose?: () => void;
  onStop?: () => void;
}

export const ExecutionStatus: React.FC<ExecutionStatusProps> = ({
  taskId,
  featureName,
  issueNumber,
  onClose,
  onStop,
}) => {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [status, setStatus] = useState<'running' | 'completed' | 'failed' | 'stopped'>('running');
  const [copied, setCopied] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const scrollToBottom = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!taskId) return;

    // Connect to SSE endpoint
    const eventSource = new EventSource(`/api/sse/tasks/${taskId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      addLog('info', 'Connected to execution stream');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'log') {
          addLog(data.level || 'info', data.message, data.details);
        } else if (data.type === 'status') {
          setStatus(data.status);
          if (data.status === 'completed') {
            addLog('success', 'Execution completed successfully');
          } else if (data.status === 'failed') {
            addLog('error', `Execution failed: ${data.error || 'Unknown error'}`);
          }
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      addLog('error', 'Connection lost. Reconnecting...');
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [taskId]);

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  const addLog = (level: ExecutionLog['level'], message: string, details?: string) => {
    const newLog: ExecutionLog = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
    };
    setLogs((prev) => [...prev, newLog]);
  };

  const handleCopyLogs = () => {
    const logText = logs
      .map((log) => `[${new Date(log.timestamp).toLocaleTimeString()}] ${log.message}`)
      .join('\n');
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStop = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setStatus('stopped');
    addLog('warning', 'Execution stopped by user');
    onStop?.();
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'primary';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'stopped':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getLogColor = (level: ExecutionLog['level']) => {
    switch (level) {
      case 'error':
        return 'error.main';
      case 'warning':
        return 'warning.main';
      case 'success':
        return 'success.main';
      default:
        return 'text.secondary';
    }
  };

  if (!taskId) {
    return null;
  }

  return (
    <Card
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 600,
        maxHeight: 500,
        zIndex: 1300,
        boxShadow: 3,
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Execution Status
          </Typography>
          {featureName && (
            <Chip label={featureName} size="small" variant="outlined" />
          )}
          {issueNumber && (
            <Chip label={`#${issueNumber}`} size="small" color="primary" variant="outlined" />
          )}
          <Chip
            label={status}
            size="small"
            color={getStatusColor()}
            icon={status === 'completed' ? <CheckCircleIcon /> : undefined}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton size="small" onClick={handleCopyLogs} title="Copy logs">
            <CopyIcon fontSize="small" />
          </IconButton>
          {status === 'running' && (
            <IconButton size="small" onClick={handleStop} color="warning" title="Stop execution">
              <StopIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton size="small" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
          {onClose && (
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {status === 'running' && <LinearProgress />}

      <Collapse in={isExpanded}>
        <CardContent
          sx={{
            maxHeight: 350,
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            bgcolor: 'grey.50',
            p: 2,
          }}
        >
          {!isConnected && taskId && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Connecting to execution stream...
            </Alert>
          )}

          {logs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Waiting for execution logs...
            </Typography>
          ) : (
            <Box>
              {logs.map((log) => (
                <Box
                  key={log.id}
                  sx={{
                    mb: 1,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: log.level === 'error' ? 'error.light' : 'transparent',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        minWidth: 80,
                        mr: 2,
                      }}
                    >
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: getLogColor(log.level),
                        wordBreak: 'break-word',
                        flex: 1,
                      }}
                    >
                      {log.message}
                    </Typography>
                  </Box>
                  {log.details && (
                    <Box sx={{ ml: 12, mt: 0.5 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {log.details}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ))}
              <div ref={logsEndRef} />
            </Box>
          )}
        </CardContent>
      </Collapse>

      {copied && (
        <Alert
          severity="success"
          sx={{
            position: 'absolute',
            bottom: 60,
            right: 20,
            zIndex: 1,
          }}
        >
          Logs copied to clipboard
        </Alert>
      )}
    </Card>
  );
};