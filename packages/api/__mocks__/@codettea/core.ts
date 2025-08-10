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