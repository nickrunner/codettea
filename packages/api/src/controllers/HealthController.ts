import { Controller, Get, Route, Tags } from 'tsoa';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

interface ServiceCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  responseTime?: number;
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  services: ServiceCheck[];
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  environment: string;
}

@Route('health')
@Tags('Health')
export class HealthController extends Controller {
  /**
   * Get the health status of the API with service connectivity checks
   * @summary Enhanced health check endpoint with dependency validation
   */
  @Get()
  public async getHealth(): Promise<HealthStatus> {
    const services: ServiceCheck[] = [];
    
    // Check Claude CLI availability
    const claudeCheck = await this.checkClaude();
    services.push(claudeCheck);
    
    // Check GitHub CLI availability
    const githubCheck = await this.checkGitHub();
    services.push(githubCheck);
    
    // Check file system access
    const fileSystemCheck = await this.checkFileSystem();
    services.push(fileSystemCheck);
    
    // Check Git repository
    const gitCheck = await this.checkGitRepo();
    services.push(gitCheck);
    
    // Determine overall health status
    const unhealthyServices = services.filter(s => s.status === 'unhealthy');
    const degradedServices = services.filter(s => s.status === 'degraded');
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (unhealthyServices.length > 0) {
      overallStatus = 'unhealthy';
      this.setStatus(503);
    } else if (degradedServices.length > 0) {
      overallStatus = 'degraded';
      this.setStatus(503);
    }
    
    // Get memory usage
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const usedMem = memUsage.heapUsed + memUsage.external;
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services,
      memory: {
        used: Math.round(usedMem / 1024 / 1024),
        total: Math.round(totalMem / 1024 / 1024),
        percentage: Math.round((usedMem / totalMem) * 100)
      },
      environment: process.env.NODE_ENV || 'development'
    };
  }
  
  private async checkClaude(): Promise<ServiceCheck> {
    const startTime = Date.now();
    try {
      const { stdout } = await execAsync('which claude', { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      if (stdout.trim()) {
        return {
          name: 'Claude CLI',
          status: 'healthy',
          message: 'Claude CLI is available',
          responseTime
        };
      }
      
      return {
        name: 'Claude CLI',
        status: 'degraded',
        message: 'Claude CLI not found in PATH',
        responseTime
      };
    } catch (error) {
      logger.error('Claude CLI check failed:', error);
      return {
        name: 'Claude CLI',
        status: 'unhealthy',
        message: `Claude CLI check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime
      };
    }
  }
  
  private async checkGitHub(): Promise<ServiceCheck> {
    const startTime = Date.now();
    try {
      const { stdout } = await execAsync('gh auth status', { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      if (stdout.includes('Logged in')) {
        return {
          name: 'GitHub CLI',
          status: 'healthy',
          message: 'GitHub CLI is authenticated',
          responseTime
        };
      }
      
      return {
        name: 'GitHub CLI',
        status: 'degraded',
        message: 'GitHub CLI not authenticated',
        responseTime
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // If gh is not installed, mark as degraded rather than unhealthy
      if (errorMessage.includes('command not found')) {
        return {
          name: 'GitHub CLI',
          status: 'degraded',
          message: 'GitHub CLI not installed',
          responseTime: Date.now() - startTime
        };
      }
      
      logger.error('GitHub CLI check failed:', error);
      return {
        name: 'GitHub CLI',
        status: 'unhealthy',
        message: `GitHub CLI check failed: ${errorMessage}`,
        responseTime: Date.now() - startTime
      };
    }
  }
  
  private async checkFileSystem(): Promise<ServiceCheck> {
    const startTime = Date.now();
    try {
      // Try to access the project root
      await fs.access(process.cwd(), fs.constants.R_OK | fs.constants.W_OK);
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'File System',
        status: 'healthy',
        message: 'File system is accessible',
        responseTime
      };
    } catch (error) {
      logger.error('File system check failed:', error);
      return {
        name: 'File System',
        status: 'unhealthy',
        message: `File system check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime
      };
    }
  }
  
  private async checkGitRepo(): Promise<ServiceCheck> {
    const startTime = Date.now();
    try {
      await execAsync('git status --short', { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'Git Repository',
        status: 'healthy',
        message: 'Git repository is accessible',
        responseTime
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // If not in a git repo, mark as degraded
      if (errorMessage.includes('not a git repository')) {
        return {
          name: 'Git Repository',
          status: 'degraded',
          message: 'Not in a git repository',
          responseTime: Date.now() - startTime
        };
      }
      
      logger.error('Git repository check failed:', error);
      return {
        name: 'Git Repository',
        status: 'unhealthy',
        message: `Git repository check failed: ${errorMessage}`,
        responseTime: Date.now() - startTime
      };
    }
  }
}

