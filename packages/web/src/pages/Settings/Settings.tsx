import React, { useState, useEffect } from 'react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { ProjectConfig } from '@/types/api';
import styles from './Settings.module.css';

export const Settings: React.FC = () => {
  const {
    selectedProject,
    projectConfig,
    updateProjectConfig,
    isLoading: contextLoading,
    error: contextError
  } = useProjectContext();
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedConfig, setEditedConfig] = useState<Partial<ProjectConfig>>({});

  useEffect(() => {
    if (projectConfig) {
      setEditedConfig({
        mainRepoPath: projectConfig.mainRepoPath,
        baseWorktreePath: projectConfig.baseWorktreePath,
        maxConcurrentTasks: projectConfig.maxConcurrentTasks,
        requiredApprovals: projectConfig.requiredApprovals,
        reviewerProfiles: projectConfig.reviewerProfiles,
        baseBranch: projectConfig.baseBranch
      });
    }
  }, [projectConfig]);

  const handleSave = async () => {
    if (!selectedProject) {
      setError('Please select a project first');
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      await updateProjectConfig(editedConfig);
      alert('Configuration saved successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save configuration';
      setError(errorMessage);
      console.error('Error saving config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = () => {
    setError(null);
    
    try {
      // Validate the edited configuration locally
      const errors = [];
      
      if (!editedConfig.mainRepoPath || editedConfig.mainRepoPath.trim() === '') {
        errors.push('Main repository path is required');
      }
      
      if (!editedConfig.baseWorktreePath || editedConfig.baseWorktreePath.trim() === '') {
        errors.push('Base worktree path is required');
      }
      
      if (editedConfig.maxConcurrentTasks && editedConfig.maxConcurrentTasks < 1) {
        errors.push('Max concurrent tasks must be at least 1');
      }
      
      if (editedConfig.requiredApprovals && editedConfig.requiredApprovals < 1) {
        errors.push('Required approvals must be at least 1');
      }
      
      if (errors.length > 0) {
        alert(`Configuration validation failed:\n${errors.join('\n')}`);
      } else {
        alert('Configuration is valid');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate configuration';
      setError(errorMessage);
      console.error('Error validating config:', err);
    }
  };

  if (contextLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading configuration...</div>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <p className={styles.subtitle}>Please select a project from the dropdown above to configure settings</p>
        </div>
      </div>
    );
  }

  if (!projectConfig) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Failed to load configuration for {selectedProject}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Settings</h2>
        <p className={styles.subtitle}>
          Configure settings for <strong>{selectedProject}</strong>
        </p>
      </div>

      {(error || contextError) && (
        <div className={styles.error} role="alert">
          {error || contextError}
        </div>
      )}

      <div className={styles.section}>
        <h3>Repository Configuration</h3>
        <div className={styles.formGroup}>
          <label htmlFor="main-repo-path">Main Repository Path</label>
          <input
            id="main-repo-path"
            type="text"
            value={editedConfig.mainRepoPath || ''}
            onChange={(e) => setEditedConfig({ ...editedConfig, mainRepoPath: e.target.value })}
            placeholder="/path/to/main/repo"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="worktree-path">Base Worktree Path</label>
          <input
            id="worktree-path"
            type="text"
            value={editedConfig.baseWorktreePath || ''}
            onChange={(e) => setEditedConfig({ ...editedConfig, baseWorktreePath: e.target.value })}
            placeholder="/path/to/worktrees"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="base-branch">Base Branch</label>
          <input
            id="base-branch"
            type="text"
            value={editedConfig.baseBranch || ''}
            onChange={(e) => setEditedConfig({ ...editedConfig, baseBranch: e.target.value })}
            placeholder="main or master"
          />
        </div>
      </div>

      <div className={styles.section}>
        <h3>Task Configuration</h3>
        <div className={styles.formGroup}>
          <label htmlFor="max-concurrent">Max Concurrent Tasks</label>
          <input
            id="max-concurrent"
            type="number"
            value={editedConfig.maxConcurrentTasks || 2}
            onChange={(e) => setEditedConfig({ ...editedConfig, maxConcurrentTasks: parseInt(e.target.value) })}
            min="1"
            max="10"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="required-approvals">Required Approvals</label>
          <input
            id="required-approvals"
            type="number"
            value={editedConfig.requiredApprovals || 3}
            onChange={(e) => setEditedConfig({ ...editedConfig, requiredApprovals: parseInt(e.target.value) })}
            min="1"
            max="10"
          />
        </div>
      </div>

      <div className={styles.section}>
        <h3>Reviewer Profiles</h3>
        <div className={styles.profileList}>
          {editedConfig.reviewerProfiles?.map((profile, index) => (
            <span key={index} className={styles.profileChip}>
              {profile}
            </span>
          ))}
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="reviewer-profiles">Edit Reviewer Profiles (comma-separated)</label>
          <input
            id="reviewer-profiles"
            type="text"
            value={editedConfig.reviewerProfiles?.join(', ') || ''}
            onChange={(e) => {
              const profiles = e.target.value
                .split(',')
                .map(p => p.trim())
                .filter(p => p.length > 0);
              setEditedConfig({ ...editedConfig, reviewerProfiles: profiles });
            }}
            placeholder="frontend, backend, devops"
          />
        </div>
      </div>

      <div className={styles.actions}>
        <button onClick={handleValidate} className={styles.validateButton}>
          Validate Configuration
        </button>
        <button onClick={handleSave} className={styles.saveButton} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};