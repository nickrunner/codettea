import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FeatureList } from '@/components/FeatureList';
import { IssueProgress } from '@/components/IssueProgress';
import { useFeatures, useFeatureIssues } from '@/hooks/useFeatures';
import styles from './Features.module.css';

export const Features: React.FC = () => {
  const { featureName } = useParams<{ featureName?: string }>();
  const navigate = useNavigate();
  const [selectedFeature, setSelectedFeature] = useState<string | null>(featureName || null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureDescription, setNewFeatureDescription] = useState('');
  const [architectureMode, setArchitectureMode] = useState(false);

  const { features, loading, error, refresh, createFeature } = useFeatures();
  const { issues, loading: issuesLoading, error: issuesError } = useFeatureIssues(selectedFeature);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (featureName) {
      setSelectedFeature(featureName);
    }
  }, [featureName]);

  const handleSelectFeature = (name: string) => {
    setSelectedFeature(name);
    navigate(`/features/${name}`);
  };

  const handleCreateFeature = async () => {
    if (!newFeatureName || !newFeatureDescription) {
      alert('Please provide both name and description');
      return;
    }

    try {
      const feature = await createFeature({
        name: newFeatureName,
        description: newFeatureDescription,
        architectureMode,
      });
      setShowCreateModal(false);
      setNewFeatureName('');
      setNewFeatureDescription('');
      setArchitectureMode(false);
      handleSelectFeature(feature.name);
    } catch (err) {
      console.error('Failed to create feature:', err);
    }
  };

  // TODO: Implement run task functionality when backend supports it
  // const handleRunTask = async (issueNumbers: number[]) => {
  //   if (!selectedFeature) return;
  //   console.log('Running task for issues:', issueNumbers);
  // };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Features</h2>
        <p className={styles.subtitle}>Manage and track your feature development</p>
      </div>

      <div className={styles.content}>
        <div className={styles.leftPanel}>
          <FeatureList
            features={features}
            loading={loading}
            error={error}
            selectedFeature={selectedFeature}
            onSelectFeature={handleSelectFeature}
            onCreateFeature={() => setShowCreateModal(true)}
          />
        </div>

        <div className={styles.rightPanel}>
          {selectedFeature ? (
            <IssueProgress
              issues={issues}
              featureName={selectedFeature}
              loading={issuesLoading}
              error={issuesError}
              onIssueClick={(num) => console.log('Issue clicked:', num)}
            />
          ) : (
            <div className={styles.noSelection}>
              <p>Select a feature to view its issues</p>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Create New Feature</h3>
            <div className={styles.formGroup}>
              <label htmlFor="feature-name">Feature Name</label>
              <input
                id="feature-name"
                type="text"
                value={newFeatureName}
                onChange={(e) => setNewFeatureName(e.target.value)}
                placeholder="e.g., user-authentication"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="feature-description">Description</label>
              <textarea
                id="feature-description"
                value={newFeatureDescription}
                onChange={(e) => setNewFeatureDescription(e.target.value)}
                placeholder="Describe what this feature will do..."
                rows={4}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={architectureMode}
                  onChange={(e) => setArchitectureMode(e.target.checked)}
                />
                Enable Architecture Mode (create issues automatically)
              </label>
            </div>
            <div className={styles.modalActions}>
              <button onClick={() => setShowCreateModal(false)} className={styles.cancelButton}>
                Cancel
              </button>
              <button onClick={handleCreateFeature} className={styles.createButton}>
                Create Feature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};