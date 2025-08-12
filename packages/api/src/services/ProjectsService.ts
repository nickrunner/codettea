import { Project, ProjectConfig, ProjectBranch } from '../controllers/ProjectsController';
import { logger } from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import {
  findGitProjects,
  selectProject,
} from '@codettea/core';
import {
  loadProjectConfig,
  saveProjectConfig,
  validateConfig,
  getDefaultConfig,
  type SystemConfig,
  type ProjectConfig as CoreProjectConfig,
} from '@codettea/core';
import {
  getAllBranches,
} from '@codettea/core';
import {
  getDefaultBranch,
  getCurrentBranch,
} from '@codettea/core';


export class ProjectsService {
  private mainRepoPath = process.env.MAIN_REPO_PATH || process.cwd();
  private baseSearchPath = path.dirname(this.mainRepoPath);

  async getAllProjects(): Promise<Project[]> {
    try {
      // Use shared utility to find git projects
      const projectInfos = await findGitProjects(this.baseSearchPath);
      
      const projects: Project[] = [];
      for (const info of projectInfos) {
        const project: Project = {
          name: info.name,
          path: info.path,
          isGitRepo: true,
          hasClaudeConfig: info.hasClaudeMd,
        };
        
        // Get additional info for each project
        try {
          const currentBranch = await getCurrentBranch(info.path);
          project.currentBranch = currentBranch;
          
          // Get remote URL
          const {stdout} = await promisify(exec)('git remote get-url origin', {
            cwd: info.path,
          });
          if (stdout) {
            project.remoteUrl = stdout.trim();
          }
        } catch {
          // Ignore errors for optional fields
        }
        
        projects.push(project);
      }
      
      return projects;
    } catch (error) {
      logger.error('Error loading projects:', error);
      return [];
    }
  }

  async getProjectConfig(projectName: string): Promise<ProjectConfig> {
    try {
      const projectPath = await this.getProjectPath(projectName);
      if (!projectPath) {
        throw new Error(`Project ${projectName} not found`);
      }
      
      const config = await loadProjectConfig(projectPath);
      
      // Return default config merged with project config if it exists
      const defaultConfig = getDefaultConfig(projectPath);
      
      return {
        mainRepoPath: defaultConfig.mainRepoPath,
        baseWorktreePath: defaultConfig.baseWorktreePath,
        maxConcurrentTasks: config?.maxConcurrentTasks ?? defaultConfig.maxConcurrentTasks,
        requiredApprovals: config?.requiredApprovals ?? defaultConfig.requiredApprovals,
        reviewerProfiles: config?.reviewerProfiles ?? defaultConfig.reviewerProfiles,
        baseBranch: config?.baseBranch ?? defaultConfig.baseBranch,
      };
    } catch (error) {
      logger.error(`Error loading config for project ${projectName}:`, error);
      
      // Return default config if loading fails
      const defaultConfig = getDefaultConfig(this.mainRepoPath);
      return {
        mainRepoPath: defaultConfig.mainRepoPath,
        baseWorktreePath: defaultConfig.baseWorktreePath,
        maxConcurrentTasks: defaultConfig.maxConcurrentTasks,
        requiredApprovals: defaultConfig.requiredApprovals,
        reviewerProfiles: defaultConfig.reviewerProfiles,
        baseBranch: defaultConfig.baseBranch,
      };
    }
  }

  async updateProjectConfig(
    projectName: string,
    config: Partial<ProjectConfig>,
  ): Promise<ProjectConfig> {
    try {
      const projectPath = await this.getProjectPath(projectName);
      if (!projectPath) {
        throw new Error(`Project ${projectName} not found`);
      }
      
      const currentConfig = await loadProjectConfig(projectPath);
      const updatedProjectConfig: CoreProjectConfig = {
        baseBranch: config.baseBranch ?? currentConfig?.baseBranch,
        maxConcurrentTasks: config.maxConcurrentTasks ?? currentConfig?.maxConcurrentTasks ?? 2,
        requiredApprovals: config.requiredApprovals ?? currentConfig?.requiredApprovals ?? 3,
        reviewerProfiles: config.reviewerProfiles ?? currentConfig?.reviewerProfiles ?? ['backend', 'frontend', 'devops'],
      };
      
      // Create SystemConfig for validation
      const updatedConfig: SystemConfig = {
        mainRepoPath: config.mainRepoPath ?? projectPath,
        baseWorktreePath: config.baseWorktreePath ?? path.dirname(projectPath),
        maxConcurrentTasks: updatedProjectConfig.maxConcurrentTasks!,
        requiredApprovals: updatedProjectConfig.requiredApprovals!,
        reviewerProfiles: updatedProjectConfig.reviewerProfiles!,
        baseBranch: updatedProjectConfig.baseBranch,
      };
      
      // Validate the updated config
      const validation = validateConfig(updatedConfig);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
      
      await saveProjectConfig(projectPath, updatedProjectConfig);
      
      return {
        mainRepoPath: updatedConfig.mainRepoPath,
        baseWorktreePath: updatedConfig.baseWorktreePath,
        maxConcurrentTasks: updatedConfig.maxConcurrentTasks,
        requiredApprovals: updatedConfig.requiredApprovals,
        reviewerProfiles: updatedConfig.reviewerProfiles,
        baseBranch: updatedConfig.baseBranch,
      };
    } catch (error) {
      logger.error(`Error updating config for project ${projectName}:`, error);
      throw error;
    }
  }

  async selectProject(projectName: string): Promise<{
    success: boolean;
    message: string;
    project?: Project;
  }> {
    try {
      const projects = await this.getAllProjects();
      const selectedInfo = selectProject(projects.map(p => ({
        name: p.name,
        path: p.path,
        hasClaudeMd: p.hasClaudeConfig || false,
      })), projectName);
      
      if (!selectedInfo) {
        return {
          success: false,
          message: `Project ${projectName} not found`,
        };
      }
      
      // Update environment variable or config to remember selection
      process.env.MAIN_REPO_PATH = selectedInfo.path;
      
      const project = projects.find(p => p.name === selectedInfo.name);
      return {
        success: true,
        message: `Selected project ${projectName}`,
        project,
      };
    } catch (error) {
      logger.error(`Error selecting project ${projectName}:`, error);
      throw error;
    }
  }

  async getProjectBranches(projectName: string): Promise<ProjectBranch[]> {
    try {
      const projectPath = await this.getProjectPath(projectName);
      if (!projectPath) {
        throw new Error(`Project ${projectName} not found`);
      }
      
      const branchInfos = await getAllBranches(projectPath);
      
      return branchInfos.map(info => ({
        name: info.name,
        isLocal: !info.isRemote,
        isRemote: info.isRemote,
        isCurrent: info.isCurrent,
        isMerged: info.isMerged,
        lastCommit: info.lastCommit,
      }));
    } catch (error) {
      logger.error(`Error getting branches for project ${projectName}:`, error);
      return [];
    }
  }

  async getDefaultBranch(projectName: string): Promise<string> {
    try {
      const projectPath = await this.getProjectPath(projectName);
      if (!projectPath) {
        throw new Error(`Project ${projectName} not found`);
      }
      
      return await getDefaultBranch(projectPath);
    } catch (error) {
      logger.error(`Error getting default branch for project ${projectName}:`, error);
      return 'main';
    }
  }

  private async getProjectPath(projectName: string): Promise<string | null> {
    const projects = await this.getAllProjects();
    const project = projects.find(p => p.name === projectName);
    return project ? project.path : null;
  }

}