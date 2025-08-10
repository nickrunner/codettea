import React from 'react';
import { Issue } from '@/types/api';
import styles from './IssueProgress.module.css';
import clsx from 'clsx';

interface IssueProgressProps {
  issues: Issue[];
  featureName?: string;
  loading?: boolean;
  error?: string | null;
  onIssueClick?: (issueNumber: number) => void;
}

export const IssueProgress: React.FC<IssueProgressProps> = ({
  issues,
  featureName,
  loading,
  error,
  onIssueClick,
}) => {
  const getProgressStats = () => {
    const total = issues.length;
    const completed = issues.filter((i) => i.status === 'closed').length;
    const inProgress = issues.filter((i) => i.status === 'in_progress').length;
    const open = issues.filter((i) => i.status === 'open').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, open, percentage };
  };

  const getStatusIcon = (status: Issue['status']) => {
    switch (status) {
      case 'closed':
        return '✅';
      case 'in_progress':
        return '🔄';
      case 'open':
        return '⭕';
      default:
        return '❓';
    }
  };

  const getStatusClass = (status: Issue['status']) => {
    switch (status) {
      case 'closed':
        return styles.closed;
      case 'in_progress':
        return styles.inProgress;
      case 'open':
        return styles.open;
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            {featureName ? `Issues - ${featureName}` : 'Issues'}
          </h3>
        </div>
        <div className={styles.loading}>Loading issues...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            {featureName ? `Issues - ${featureName}` : 'Issues'}
          </h3>
        </div>
        <div className={styles.error} role="alert">
          {error}
        </div>
      </div>
    );
  }

  const stats = getProgressStats();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          {featureName ? `Issues - ${featureName}` : 'Issues'}
        </h3>
      </div>

      {issues.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No issues found for this feature</p>
        </div>
      ) : (
        <>
          <div className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <span className={styles.progressText}>
                Progress: {stats.completed} of {stats.total} completed
              </span>
              <span className={styles.progressPercentage}>{stats.percentage}%</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${stats.percentage}%` }}
                role="progressbar"
                aria-valuenow={stats.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <div className={styles.progressStats}>
              <span className={styles.statItem}>
                <span className={styles.statIcon}>✅</span>
                {stats.completed} Completed
              </span>
              <span className={styles.statItem}>
                <span className={styles.statIcon}>🔄</span>
                {stats.inProgress} In Progress
              </span>
              <span className={styles.statItem}>
                <span className={styles.statIcon}>⭕</span>
                {stats.open} Open
              </span>
            </div>
          </div>

          <div className={styles.issueList}>
            {issues.map((issue) => (
              <div
                key={issue.number}
                className={styles.issueItem}
                onClick={() => onIssueClick?.(issue.number)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onIssueClick?.(issue.number);
                  }
                }}
              >
                <div className={styles.issueHeader}>
                  <div className={styles.issueNumber}>#{issue.number}</div>
                  <span
                    className={clsx(styles.statusIndicator, getStatusClass(issue.status))}
                  >
                    {getStatusIcon(issue.status)}
                  </span>
                </div>
                <h4 className={styles.issueTitle}>{issue.title}</h4>
                {issue.labels.length > 0 && (
                  <div className={styles.labels}>
                    {issue.labels.map((label) => (
                      <span key={label} className={styles.label}>
                        {label}
                      </span>
                    ))}
                  </div>
                )}
                {issue.assignee && (
                  <div className={styles.assignee}>
                    👤 {issue.assignee}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};