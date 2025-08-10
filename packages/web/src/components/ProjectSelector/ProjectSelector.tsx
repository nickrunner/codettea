import React from 'react';
import { Project } from '@/types/api';
import styles from './ProjectSelector.module.css';
import clsx from 'clsx';

interface ProjectSelectorProps {
  projects: Project[];
  selectedProject?: string | null;
  loading?: boolean;
  error?: string | null;
  onSelectProject?: (projectName: string) => void;
  onScanProjects?: () => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  selectedProject,
  loading,
  error,
  onSelectProject,
  onScanProjects,
}) => {
  const activeProject = projects.find((p) => p.isActive);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Projects</h3>
        </div>
        <div className={styles.loading}>Scanning projects...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Projects</h3>
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
        <h3 className={styles.title}>Projects</h3>
        {onScanProjects && (
          <button
            onClick={onScanProjects}
            className={styles.scanButton}
            disabled={loading}
            aria-label="Scan for projects"
          >
            🔍 Scan
          </button>
        )}
      </div>

      {activeProject && (
        <div className={styles.activeProject}>
          <div className={styles.activeLabel}>Active Project</div>
          <div className={styles.projectInfo}>
            <h4 className={styles.projectName}>{activeProject.name}</h4>
            <div className={styles.projectDetails}>
              <span className={styles.projectPath}>{activeProject.path}</span>
              {activeProject.currentBranch && (
                <span className={styles.branchInfo}>
                  🌿 {activeProject.currentBranch}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No projects found</p>
          {onScanProjects && (
            <button onClick={onScanProjects} className={styles.scanButtonLarge}>
              Scan for projects
            </button>
          )}
        </div>
      ) : (
        <div className={styles.projectList}>
          <div className={styles.listHeader}>Available Projects</div>
          {projects.map((project) => (
            <div
              key={project.name}
              className={clsx(
                styles.projectItem,
                project.isActive && styles.active,
                selectedProject === project.name && styles.selected
              )}
              onClick={() => onSelectProject?.(project.name)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectProject?.(project.name);
                }
              }}
              aria-selected={selectedProject === project.name}
              aria-current={project.isActive ? 'true' : undefined}
            >
              <div className={styles.projectItemHeader}>
                <span className={styles.projectItemName}>{project.name}</span>
                {project.isActive && (
                  <span className={styles.activeBadge}>Active</span>
                )}
              </div>
              <div className={styles.projectItemMeta}>
                <span className={styles.projectItemPath}>{project.path}</span>
                <div className={styles.projectItemIcons}>
                  {project.hasGit && (
                    <span className={styles.gitIcon} title="Git repository">
                      
                    </span>
                  )}
                  {project.remoteUrl && (
                    <span className={styles.remoteIcon} title="Has remote">
                      ☁️
                    </span>
                  )}
                </div>
              </div>
              {project.currentBranch && (
                <div className={styles.projectItemBranch}>
                  🌿 {project.currentBranch}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};