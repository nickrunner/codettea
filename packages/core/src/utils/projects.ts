import fs from 'fs/promises';
import path from 'path';

export interface ProjectInfo {
  name: string;
  path: string;
  hasClaudeMd: boolean;
}

/**
 * Find git projects in current and parent directories
 */
export async function findGitProjects(
  currentDir: string = process.cwd(),
): Promise<ProjectInfo[]> {
  const parentDir = path.dirname(currentDir);
  const projects: ProjectInfo[] = [];

  // First, check the parent directory for git projects (typical use case)
  try {
    const parentEntries = await fs.readdir(parentDir, {withFileTypes: true});

    for (const entry of parentEntries) {
      if (entry.isDirectory()) {
        const projectPath = path.join(parentDir, entry.name);
        const gitPath = path.join(projectPath, '.git');

        try {
          const stats = await fs.stat(gitPath);
          if (stats.isDirectory()) {
            // Check for CLAUDE.md
            let hasClaudeMd = false;
            try {
              await fs.stat(path.join(projectPath, 'CLAUDE.md'));
              hasClaudeMd = true;
            } catch {
              // CLAUDE.md might not exist, that's okay
            }

            projects.push({
              name: entry.name,
              path: projectPath,
              hasClaudeMd,
            });
          }
        } catch {
          // Directory might not be a git repo or have issues
        }
      }
    }

    // Also check subdirectories of current directory (in case running from git root)
    const currentEntries = await fs.readdir(currentDir, {
      withFileTypes: true,
    });

    for (const entry of currentEntries) {
      if (entry.isDirectory() && !projects.some(p => p.name === entry.name)) {
        const projectPath = path.join(currentDir, entry.name);
        const gitPath = path.join(projectPath, '.git');

        try {
          const stats = await fs.stat(gitPath);
          if (stats.isDirectory()) {
            let hasClaudeMd = false;
            try {
              await fs.stat(path.join(projectPath, 'CLAUDE.md'));
              hasClaudeMd = true;
            } catch {
              // CLAUDE.md might not exist, that's okay
            }

            projects.push({
              name: entry.name,
              path: projectPath,
              hasClaudeMd,
            });
          }
        } catch {
          // Directory might not be a git repo or have issues
        }
      }
    }
  } catch (error) {
    console.error('Error scanning for projects:', error);
  }

  return projects;
}

/**
 * Select a project from available options
 */
export function selectProject(
  projects: ProjectInfo[],
  choice: string,
): ProjectInfo | undefined {
  const index = parseInt(choice) - 1;
  if (index >= 0 && index < projects.length) {
    return projects[index];
  }
  return undefined;
}

/**
 * Get project name from path
 */
export function getProjectName(projectPath: string): string {
  return path.basename(projectPath);
}

/**
 * Check if a directory is a git repository
 */
export async function isGitRepository(dirPath: string): Promise<boolean> {
  try {
    const gitPath = path.join(dirPath, '.git');
    const stats = await fs.stat(gitPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a project has a CLAUDE.md file
 */
export async function hasClaudeConfig(projectPath: string): Promise<boolean> {
  try {
    await fs.stat(path.join(projectPath, 'CLAUDE.md'));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get project information
 */
export async function getProjectInfo(projectPath: string): Promise<ProjectInfo | null> {
  const isGitRepo = await isGitRepository(projectPath);
  if (!isGitRepo) {
    return null;
  }

  const hasClaudeMd = await hasClaudeConfig(projectPath);
  const name = getProjectName(projectPath);

  return {
    name,
    path: projectPath,
    hasClaudeMd,
  };
}