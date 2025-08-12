import React, { useEffect } from 'react';
import { ProjectSelector } from '@/components/ProjectSelector';
import { useProjects } from '@/hooks/useProjects';
import styles from './Projects.module.css';

export const Projects: React.FC = () => {
  const { projects, loading, error, scanProjects, setActiveProject } = useProjects();

  useEffect(() => {
    scanProjects();
  }, [scanProjects]);

  const handleProjectSelect = async (projectName: string) => {
    try {
      await setActiveProject(projectName);
      alert(`Project "${projectName}" is now active`);
    } catch (err) {
      console.error('Failed to set active project:', err);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Projects</h2>
        <p className={styles.subtitle}>Manage your development projects</p>
      </div>

      <div className={styles.content}>
        <ProjectSelector
          projects={projects}
          loading={loading}
          error={error}
          onSelectProject={handleProjectSelect}
          onScanProjects={scanProjects}
        />

        {projects.length > 0 && (
          <div className={styles.info}>
            <h3>Project Information</h3>
            <div className={styles.infoContent}>
              <p>
                <strong>Total Projects:</strong> {projects.length}
              </p>
              <p>
                <strong>Git Repositories:</strong> {projects.filter(p => p.hasGit).length}
              </p>
              <p>
                <strong>With Remote:</strong> {projects.filter(p => p.remoteUrl).length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};