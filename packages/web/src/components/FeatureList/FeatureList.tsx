import React from 'react';
import { Feature } from '@/types/api';
import styles from './FeatureList.module.css';
import clsx from 'clsx';

interface FeatureListProps {
  features: Feature[];
  loading?: boolean;
  error?: string | null;
  selectedFeature?: string | null;
  onSelectFeature?: (featureName: string) => void;
  onCreateFeature?: () => void;
}

export const FeatureList: React.FC<FeatureListProps> = ({
  features,
  loading,
  error,
  selectedFeature,
  onSelectFeature,
  onCreateFeature,
}) => {
  const getStatusBadgeClass = (status: Feature['status']) => {
    switch (status) {
      case 'planning':
        return styles.planning;
      case 'in_progress':
        return styles.inProgress;
      case 'completed':
        return styles.completed;
      case 'archived':
        return styles.archived;
      default:
        return '';
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
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Features</h3>
        </div>
        <div className={styles.loading}>Loading features...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Features</h3>
        </div>
        <div className={styles.error} role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Features</h3>
        {onCreateFeature && (
          <button
            onClick={onCreateFeature}
            className={styles.createButton}
            aria-label="Create new feature"
          >
            + New Feature
          </button>
        )}
      </div>

      {features.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No features yet</p>
          {onCreateFeature && (
            <button onClick={onCreateFeature} className={styles.createButtonLarge}>
              Create your first feature
            </button>
          )}
        </div>
      ) : (
        <div className={styles.featureList}>
          {features.map((feature) => (
            <div
              key={feature.name}
              className={clsx(
                styles.featureItem,
                selectedFeature === feature.name && styles.selected
              )}
              onClick={() => onSelectFeature?.(feature.name)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectFeature?.(feature.name);
                }
              }}
              aria-selected={selectedFeature === feature.name}
            >
              <div className={styles.featureHeader}>
                <h4 className={styles.featureName}>{feature.name}</h4>
                <span
                  className={clsx(
                    styles.statusBadge,
                    getStatusBadgeClass(feature.status)
                  )}
                >
                  {feature.status.replace('_', ' ')}
                </span>
              </div>
              <p className={styles.featureDescription}>{feature.description}</p>
              <div className={styles.featureMeta}>
                <span className={styles.branch}>
                  🌿 {feature.branch}
                </span>
                <span className={styles.date}>
                  📅 {formatDate(feature.updatedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};