import React, { useState, useRef, useEffect } from 'react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useProjects } from '@/hooks/useProjects';
import styles from './ProjectSelectorCompact.module.css';

export const ProjectSelectorCompact: React.FC = () => {
  const { selectedProject, selectProject, isLoading: contextLoading } = useProjectContext();
  const { projects, loading: projectsLoading } = useProjects();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isLoading = contextLoading || projectsLoading;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectProject = async (projectName: string) => {
    try {
      await selectProject(projectName);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to select project:', error);
    }
  };

  const currentProject = projects.find((p) => p.name === selectedProject);

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className={styles.projectIcon}>📁</span>
        <span className={styles.projectName}>
          {isLoading ? 'Loading...' : currentProject?.name || 'Select Project'}
        </span>
        <span className={styles.chevron} aria-hidden="true">
          ▼
        </span>
      </button>

      {isOpen && !isLoading && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>Select Project</div>
          {projects.length === 0 ? (
            <div className={styles.emptyState}>No projects available</div>
          ) : (
            <ul className={styles.projectList}>
              {projects.map((project) => (
                <li key={project.name}>
                  <button
                    className={`${styles.projectItem} ${
                      project.name === selectedProject ? styles.selected : ''
                    }`}
                    onClick={() => handleSelectProject(project.name)}
                  >
                    <span className={styles.projectItemName}>{project.name}</span>
                    {project.currentBranch && (
                      <span className={styles.projectItemBranch}>{project.currentBranch}</span>
                    )}
                    {project.name === selectedProject && (
                      <span className={styles.checkmark} aria-label="Selected">
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};