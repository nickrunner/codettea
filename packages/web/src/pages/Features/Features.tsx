import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FeatureList } from '@/components/FeatureList';
import { IssueProgress } from '@/components/IssueProgress';
import { ExecutionStatus } from '@/components/ExecutionStatus';
import { useFeatures, useFeatureIssues } from '@/hooks/useFeatures';
import { apiClient } from '@/services/api';
import { toast } from 'react-hot-toast';
import styles from './Features.module.css';

export const Features: React.FC = () => {
  const { featureName } = useParams<{ featureName?: string }>();
  const navigate = useNavigate();
  const [selectedFeature, setSelectedFeature] = useState<string | null>(featureName || null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureDescription, setNewFeatureDescription] = useState('');
  const [architectureMode, setArchitectureMode] = useState(false);
  const [executionTaskId, setExecutionTaskId] = useState<string | null>(null);
  const [runningFeatures, setRunningFeatures] = useState<Set<string>>(new Set());
  const [workingOnIssues, setWorkingOnIssues] = useState<Set<number>>(new Set());

  const { features, loading, error, refresh, createFeature } = useFeatures();
  const { issues, loading: issuesLoading, error: issuesError } = useFeatureIssues(selectedFeature);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
      toast.error('Please provide both name and description');
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
      toast.success('Feature created successfully');
      
      if (architectureMode) {
        // Automatically run architecture mode
        handleRunFeature(feature.name, true);
      }
    } catch (err) {
      console.error('Failed to create feature:', err);
      toast.error('Failed to create feature');
    }
  };

  const handleRunFeature = useCallback(async (featureName: string, architectureMode: boolean) => {
    try {
      setRunningFeatures(prev => new Set(prev).add(featureName));
      
      const { taskId } = await apiClient.runFeatureTask({
        featureName,
        issueNumbers: architectureMode ? [] : [-1], // Use empty array for arch mode, -1 for next issue
      });
      
      setExecutionTaskId(taskId);
      toast.success(`Started ${architectureMode ? 'architecture analysis' : 'working on issues'} for ${featureName}`);
    } catch (error) {
      console.error('Failed to run feature task:', error);
      toast.error(`Failed to run ${architectureMode ? 'architecture mode' : 'issue work'}`);
    } finally {
      setRunningFeatures(prev => {
        const next = new Set(prev);
        next.delete(featureName);
        return next;
      });
    }
  }, []);

  const handleWorkOnIssue = useCallback(async (issueNumber: number) => {
    if (!selectedFeature) return;
    
    try {
      setWorkingOnIssues(prev => new Set(prev).add(issueNumber));
      
      const { taskId } = await apiClient.runFeatureTask({
        featureName: selectedFeature,
        issueNumbers: [issueNumber],
      });
      
      setExecutionTaskId(taskId);
      toast.success(`Started working on issue #${issueNumber}`);
    } catch (error) {
      console.error('Failed to work on issue:', error);
      toast.error('Failed to start work on issue');
    } finally {
      setWorkingOnIssues(prev => {
        const next = new Set(prev);
        next.delete(issueNumber);
        return next;
      });
    }
  }, [selectedFeature]);

  const handleStopExecution = useCallback(() => {
    setExecutionTaskId(null);
    refresh();
  }, [refresh]);

  const handleCloseExecution = useCallback(() => {
    setExecutionTaskId(null);
  }, []);

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
            onRunFeature={handleRunFeature}
            runningFeatures={runningFeatures}
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
              onWorkOnIssue={handleWorkOnIssue}
              workingOnIssues={workingOnIssues}
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
      
      <ExecutionStatus
        taskId={executionTaskId}
        featureName={selectedFeature || undefined}
        onClose={handleCloseExecution}
        onStop={handleStopExecution}
      />
    </div>
  );
};