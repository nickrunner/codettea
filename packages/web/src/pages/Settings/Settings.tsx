import React, { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';
import { Config } from '@/types/api';
import styles from './Settings.module.css';

export const Settings: React.FC = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editedConfig, setEditedConfig] = useState<Partial<Config>>({});

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiClient.getConfig();
      setConfig(data);
      setEditedConfig(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load configuration';
      setError(errorMessage);
      console.error('Error loading config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const updatedConfig = await apiClient.updateConfig(editedConfig);
      setConfig(updatedConfig);
      alert('Configuration saved successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save configuration';
      setError(errorMessage);
      console.error('Error saving config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    setError(null);
    
    try {
      const result = await apiClient.validateConfig();
      if (result.valid) {
        alert('Configuration is valid');
      } else {
        alert(`Configuration validation failed:\n${result.errors?.join('\n')}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate configuration';
      setError(errorMessage);
      console.error('Error validating config:', err);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading configuration...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Failed to load configuration</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Settings</h2>
        <p className={styles.subtitle}>Configure your development environment</p>
      </div>

      {error && (
        <div className={styles.error} role="alert">
          {error}
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