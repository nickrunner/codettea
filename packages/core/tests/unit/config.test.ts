import {
  getConfigFilePath,
  mergeProjectConfig,
  getDefaultConfig,
  validateConfig,
  SystemConfig,
  ProjectConfig,
} from '../../src/utils/config';

describe('Config Utilities', () => {
  describe('getConfigFilePath', () => {
    it('should generate correct config file path', () => {
      expect(getConfigFilePath('/path/to/repo')).toBe(
        '/path/to/repo/.codettea/multi-agent-config.json'
      );
      expect(getConfigFilePath('/Users/dev/project')).toBe(
        '/Users/dev/project/.codettea/multi-agent-config.json'
      );
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration', () => {
      const config = getDefaultConfig('/test/dir');
      expect(config.mainRepoPath).toBe('/test/dir');
      expect(config.baseWorktreePath).toBe('/test');
      expect(config.maxConcurrentTasks).toBe(2);
      expect(config.requiredApprovals).toBe(3);
      expect(config.reviewerProfiles).toEqual(['frontend', 'backend', 'devops']);
      expect(config.baseBranch).toBeUndefined();
    });

    it('should use process.cwd() when no directory provided', () => {
      const config = getDefaultConfig();
      expect(config.mainRepoPath).toBe(process.cwd());
    });
  });

  describe('mergeProjectConfig', () => {
    const systemConfig: SystemConfig = {
      mainRepoPath: '/path/to/repo',
      baseWorktreePath: '/path/to',
      maxConcurrentTasks: 2,
      requiredApprovals: 3,
      reviewerProfiles: ['frontend', 'backend'],
    };

    it('should return system config when project config is null', () => {
      const merged = mergeProjectConfig(systemConfig, null);
      expect(merged).toEqual(systemConfig);
    });

    it('should merge project config with system config', () => {
      const projectConfig: ProjectConfig = {
        baseBranch: 'develop',
        maxConcurrentTasks: 4,
        requiredApprovals: 2,
      };

      const merged = mergeProjectConfig(systemConfig, projectConfig);
      expect(merged.baseBranch).toBe('develop');
      expect(merged.maxConcurrentTasks).toBe(4);
      expect(merged.requiredApprovals).toBe(2);
      expect(merged.mainRepoPath).toBe('/path/to/repo'); // unchanged
      expect(merged.reviewerProfiles).toEqual(['frontend', 'backend']); // unchanged
    });

    it('should handle partial project config', () => {
      const projectConfig: ProjectConfig = {
        baseBranch: 'main',
      };

      const merged = mergeProjectConfig(systemConfig, projectConfig);
      expect(merged.baseBranch).toBe('main');
      expect(merged.maxConcurrentTasks).toBe(2); // system default
      expect(merged.requiredApprovals).toBe(3); // system default
    });

    it('should override reviewer profiles when provided', () => {
      const projectConfig: ProjectConfig = {
        reviewerProfiles: ['qa', 'security'],
      };

      const merged = mergeProjectConfig(systemConfig, projectConfig);
      expect(merged.reviewerProfiles).toEqual(['qa', 'security']);
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const config: SystemConfig = {
        mainRepoPath: '/path/to/repo',
        baseWorktreePath: '/path/to',
        maxConcurrentTasks: 3,
        requiredApprovals: 2,
        reviewerProfiles: ['frontend'],
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing mainRepoPath', () => {
      const config: SystemConfig = {
        mainRepoPath: '',
        baseWorktreePath: '/path/to',
        maxConcurrentTasks: 2,
        requiredApprovals: 3,
        reviewerProfiles: ['frontend'],
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('mainRepoPath is required');
    });

    it('should detect missing baseWorktreePath', () => {
      const config: SystemConfig = {
        mainRepoPath: '/path/to/repo',
        baseWorktreePath: '',
        maxConcurrentTasks: 2,
        requiredApprovals: 3,
        reviewerProfiles: ['frontend'],
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('baseWorktreePath is required');
    });

    it('should validate maxConcurrentTasks range', () => {
      const configTooLow: SystemConfig = {
        mainRepoPath: '/path/to/repo',
        baseWorktreePath: '/path/to',
        maxConcurrentTasks: 0,
        requiredApprovals: 3,
        reviewerProfiles: ['frontend'],
      };

      const configTooHigh: SystemConfig = {
        mainRepoPath: '/path/to/repo',
        baseWorktreePath: '/path/to',
        maxConcurrentTasks: 6,
        requiredApprovals: 3,
        reviewerProfiles: ['frontend'],
      };

      expect(validateConfig(configTooLow).valid).toBe(false);
      expect(validateConfig(configTooLow).errors).toContain(
        'maxConcurrentTasks must be between 1 and 5'
      );

      expect(validateConfig(configTooHigh).valid).toBe(false);
      expect(validateConfig(configTooHigh).errors).toContain(
        'maxConcurrentTasks must be between 1 and 5'
      );
    });

    it('should validate requiredApprovals range', () => {
      const configTooLow: SystemConfig = {
        mainRepoPath: '/path/to/repo',
        baseWorktreePath: '/path/to',
        maxConcurrentTasks: 2,
        requiredApprovals: 0,
        reviewerProfiles: ['frontend'],
      };

      const configTooHigh: SystemConfig = {
        mainRepoPath: '/path/to/repo',
        baseWorktreePath: '/path/to',
        maxConcurrentTasks: 2,
        requiredApprovals: 6,
        reviewerProfiles: ['frontend'],
      };

      expect(validateConfig(configTooLow).valid).toBe(false);
      expect(validateConfig(configTooLow).errors).toContain(
        'requiredApprovals must be between 1 and 5'
      );

      expect(validateConfig(configTooHigh).valid).toBe(false);
      expect(validateConfig(configTooHigh).errors).toContain(
        'requiredApprovals must be between 1 and 5'
      );
    });

    it('should require at least one reviewer profile', () => {
      const config: SystemConfig = {
        mainRepoPath: '/path/to/repo',
        baseWorktreePath: '/path/to',
        maxConcurrentTasks: 2,
        requiredApprovals: 3,
        reviewerProfiles: [],
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one reviewer profile is required');
    });
  });
});