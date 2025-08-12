export class Orchestrator {
  constructor(_config: any, _featureName: string) {}
  
  async executeFeature(_spec: any): Promise<void> {
    return Promise.resolve();
  }
}

export class GitHubUtils {
  constructor(_repoPath: string) {}
  
  async listIssuesForFeature(_name: string): Promise<any[]> {
    return Promise.resolve([]);
  }
}

// Features utilities
export const getExistingFeatures = jest.fn().mockResolvedValue([]);
export const getFeatureIssues = jest.fn().mockResolvedValue([]);
export const getFeatureDetails = jest.fn().mockResolvedValue(null);
export const workOnNextIssue = jest.fn().mockResolvedValue(null);
export const selectSpecificIssue = jest.fn().mockResolvedValue(null);
export const addIssuesToFeature = jest.fn().mockResolvedValue({ success: [], failed: [] });
export const sortIssuesByStep = jest.fn().mockImplementation((issues) => issues);
export const isValidFeatureName = jest.fn().mockReturnValue(true);

// Worktree utilities
export const getWorktreeStatus = jest.fn().mockResolvedValue(null);
export const getWorktreeList = jest.fn().mockResolvedValue([]);
export const createWorktree = jest.fn().mockResolvedValue(undefined);
export const removeWorktree = jest.fn().mockResolvedValue(undefined);
export const cleanupWorktrees = jest.fn().mockResolvedValue({ removed: [], failed: [] });
export const validateWorktreePath = jest.fn().mockResolvedValue(true);
export const getWorktrees = jest.fn().mockResolvedValue([]);

// System utilities
export const checkSystemStatus = jest.fn().mockResolvedValue({
  gitStatus: 'clean',
  githubAuthenticated: true,
  claudeAvailable: true,
});
export const checkClaudeCode = jest.fn().mockResolvedValue(true);
export const testClaudeConnection = jest.fn().mockResolvedValue(true);
export const getClaudeLocation = jest.fn().mockResolvedValue('/usr/local/bin/claude');
export const checkGitHubAuth = jest.fn().mockResolvedValue(true);
export const getDefaultBranch = jest.fn().mockResolvedValue('main');
export const getCurrentBranch = jest.fn().mockResolvedValue('main');

// Branch utilities
export const getAllBranches = jest.fn().mockResolvedValue([]);
export const deleteMergedBranches = jest.fn().mockResolvedValue({ deleted: [], failed: [] });
export const deleteSpecificBranches = jest.fn().mockResolvedValue({ deleted: [], failed: [] });
export const cleanupRemoteReferences = jest.fn().mockResolvedValue([]);
export const fullBranchCleanup = jest.fn().mockResolvedValue({
  branches: { deleted: [], failed: [] },
  remoteRefs: [],
});
export const previewCleanup = jest.fn().mockResolvedValue({
  mergedBranches: [],
  remoteReferences: [],
});

// Project utilities
export const findGitProjects = jest.fn().mockResolvedValue([]);
export const selectProject = jest.fn().mockResolvedValue(null);
export const getProjectConfig = jest.fn().mockResolvedValue({});
export const saveProjectConfig = jest.fn().mockResolvedValue(undefined);

// Config utilities
export const loadConfig = jest.fn().mockResolvedValue({});
export const saveConfig = jest.fn().mockResolvedValue(undefined);
export const getConfigPath = jest.fn().mockReturnValue('/path/to/config');
export const ensureConfigDirectory = jest.fn().mockResolvedValue(undefined);

// Issue utilities
export const parseIssueNumber = jest.fn().mockReturnValue(null);
export const formatIssueTitle = jest.fn().mockReturnValue('');
export const getIssueDetails = jest.fn().mockResolvedValue(null);
export const listOpenIssues = jest.fn().mockResolvedValue([]);

// Status utilities
export const getSystemInfo = jest.fn().mockResolvedValue({});
export const checkDependencies = jest.fn().mockResolvedValue({});
export const getActiveProcesses = jest.fn().mockResolvedValue([]);

// Git utilities
export const GitUtils = jest.fn().mockImplementation(() => ({
  createFeatureBranch: jest.fn().mockResolvedValue(undefined),
  createWorktree: jest.fn().mockResolvedValue(undefined),
  checkoutBranch: jest.fn().mockResolvedValue(undefined),
  commitChanges: jest.fn().mockResolvedValue(undefined),
  pushBranch: jest.fn().mockResolvedValue(undefined),
  getStatus: jest.fn().mockResolvedValue('clean'),
  getCurrentBranch: jest.fn().mockResolvedValue('main'),
  getDefaultBranch: jest.fn().mockResolvedValue('main'),
}));

// Claude utilities
export const ClaudeAgent = jest.fn().mockImplementation(() => ({
  execute: jest.fn().mockResolvedValue({ success: true }),
  test: jest.fn().mockResolvedValue(true),
}));