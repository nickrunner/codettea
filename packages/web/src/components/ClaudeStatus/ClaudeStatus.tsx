import React from 'react';
import { ClaudeStatus as ClaudeStatusType } from '@/types/api';
import styles from './ClaudeStatus.module.css';
import clsx from 'clsx';

interface ClaudeStatusProps {
  status: ClaudeStatusType | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export const ClaudeStatus: React.FC<ClaudeStatusProps> = ({
  status,
  loading,
  error,
  onRefresh,
}) => {
  const getStatusColor = () => {
    if (loading) return 'pending';
    if (error) return 'error';
    if (!status) return 'unknown';
    return status.connected ? 'connected' : 'disconnected';
  };

  const getStatusText = () => {
    if (loading) return 'Checking...';
    if (error) return 'Error';
    if (!status) return 'Unknown';
    return status.connected ? 'Connected' : 'Disconnected';
  };

  const statusColor = getStatusColor();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Claude Connection</h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className={styles.refreshButton}
            aria-label="Refresh Claude status"
          >
            🔄
          </button>
        )}
      </div>

      <div className={styles.statusContainer}>
        <div
          className={clsx(styles.statusIndicator, styles[statusColor])}
          role="status"
          aria-live="polite"
          aria-label={`Claude status: ${getStatusText()}`}
        />
        <span className={styles.statusText}>{getStatusText()}</span>
      </div>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {status && status.connected && status.capabilities && (
        <div className={styles.details}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Model:</span>
            <span className={styles.detailValue}>{status.capabilities.model}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Max Tokens:</span>
            <span className={styles.detailValue}>
              {status.capabilities.maxTokens.toLocaleString()}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Last Check:</span>
            <span className={styles.detailValue}>
              {new Date(status.lastCheck).toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};