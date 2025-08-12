import fs from 'fs/promises';
import path from 'path';

export interface ProjectConfig {
  baseBranch?: string;
  maxConcurrentTasks?: number;
  requiredApprovals?: number;
  reviewerProfiles?: string[];
  lastUpdated?: string;
}

export interface SystemConfig {
  mainRepoPath: string;
  baseWorktreePath: string;
  maxConcurrentTasks: number;
  requiredApprovals: number;
  reviewerProfiles: string[];
  baseBranch?: string;
}

/**
 * Get the config file path for a project
 */
export function getConfigFilePath(mainRepoPath: string): string {
  return path.join(mainRepoPath, '.codettea', 'multi-agent-config.json');
}

/**
 * Load project configuration
 */
export async function loadProjectConfig(
  mainRepoPath: string,
): Promise<ProjectConfig | null> {
  try {
    const configPath = getConfigFilePath(mainRepoPath);
    const configData = await fs.readFile(configPath, 'utf-8');
    const projectConfig = JSON.parse(configData);
    return projectConfig;
  } catch (error) {
    // Config file doesn't exist or is invalid - that's fine
    return null;
  }
}

/**
 * Save project configuration
 */
export async function saveProjectConfig(
  mainRepoPath: string,
  config: ProjectConfig,
): Promise<void> {
  try {
    const configPath = getConfigFilePath(mainRepoPath);
    const configDir = path.dirname(configPath);

    // Ensure .codettea directory exists
    await fs.mkdir(configDir, {recursive: true});

    const projectConfig = {
      ...config,
      lastUpdated: new Date().toISOString(),
    };

    await fs.writeFile(configPath, JSON.stringify(projectConfig, null, 2));
  } catch (error) {
    throw new Error(`Could not save project config: ${error}`);
  }
}

/**
 * Merge project config with system defaults
 */
export function mergeProjectConfig(
  systemConfig: SystemConfig,
  projectConfig: ProjectConfig | null,
): SystemConfig {
  if (!projectConfig) {
    return systemConfig;
  }

  return {
    ...systemConfig,
    baseBranch: projectConfig.baseBranch || systemConfig.baseBranch,
    maxConcurrentTasks:
      projectConfig.maxConcurrentTasks || systemConfig.maxConcurrentTasks,
    requiredApprovals:
      projectConfig.requiredApprovals || systemConfig.requiredApprovals,
    reviewerProfiles:
      projectConfig.reviewerProfiles || systemConfig.reviewerProfiles,
  };
}

/**
 * Get default system configuration
 */
export function getDefaultConfig(currentDir: string = process.cwd()): SystemConfig {
  return {
    mainRepoPath: currentDir,
    baseWorktreePath: path.dirname(currentDir),
    maxConcurrentTasks: 2,
    requiredApprovals: 3,
    reviewerProfiles: ['frontend', 'backend', 'devops'],
  };
}

/**
 * Validate configuration values
 */
export function validateConfig(config: SystemConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.mainRepoPath) {
    errors.push('mainRepoPath is required');
  }

  if (!config.baseWorktreePath) {
    errors.push('baseWorktreePath is required');
  }

  if (
    config.maxConcurrentTasks < 1 ||
    config.maxConcurrentTasks > 5
  ) {
    errors.push('maxConcurrentTasks must be between 1 and 5');
  }

  if (
    config.requiredApprovals < 1 ||
    config.requiredApprovals > 5
  ) {
    errors.push('requiredApprovals must be between 1 and 5');
  }

  if (!config.reviewerProfiles || config.reviewerProfiles.length === 0) {
    errors.push('At least one reviewer profile is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}