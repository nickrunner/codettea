import React, { useEffect } from 'react';
import { ClaudeStatus } from '@/components/ClaudeStatus';
import { FeatureList } from '@/components/FeatureList';
import { ProjectSelector } from '@/components/ProjectSelector';
import { useClaudeStatus } from '@/hooks/useClaudeStatus';
import { useFeatures } from '@/hooks/useFeatures';
import { useProjects } from '@/hooks/useProjects';
import styles from './Dashboard.module.css';

export const Dashboard: React.FC = () => {
  const { status: claudeStatus, loading: claudeLoading, error: claudeError, refresh: refreshClaude } = useClaudeStatus();
  const { features, loading: featuresLoading, error: featuresError, refresh: refreshFeatures } = useFeatures();
  const { projects, loading: projectsLoading, error: projectsError, setActiveProject, scanProjects } = useProjects();

  useEffect(() => {
    // Refresh data on mount
    refreshClaude();
    refreshFeatures();
    scanProjects();
  }, []);

  const handleProjectSelect = async (projectName: string) => {
    await setActiveProject(projectName);
    refreshFeatures(); // Refresh features after changing project
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Dashboard</h2>
        <p className={styles.subtitle}>Overview of your multi-agent development system</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.statusSection}>
          <ClaudeStatus
            status={claudeStatus}
            loading={claudeLoading}
            error={claudeError}
            onRefresh={refreshClaude}
          />
        </div>

        <div className={styles.projectsSection}>
          <ProjectSelector
            projects={projects}
            loading={projectsLoading}
            error={projectsError}
            onSelectProject={handleProjectSelect}
            onScanProjects={scanProjects}
          />
        </div>

        <div className={styles.featuresSection}>
          <FeatureList
            features={features.slice(0, 5)} // Show only recent features
            loading={featuresLoading}
            error={featuresError}
          />
        </div>

        <div className={styles.statsSection}>
          <div className={styles.statsCard}>
            <h3>Quick Stats</h3>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{features.length}</span>
                <span className={styles.statLabel}>Total Features</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>
                  {features.filter(f => f.status === 'in_progress').length}
                </span>
                <span className={styles.statLabel}>In Progress</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>
                  {features.filter(f => f.status === 'completed').length}
                </span>
                <span className={styles.statLabel}>Completed</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{projects.length}</span>
                <span className={styles.statLabel}>Projects</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};