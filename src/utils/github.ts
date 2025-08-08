import {exec} from 'child_process';
import {promisify} from 'util';

const execAsync = promisify(exec);

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  body: string;
  state: string;
}

export interface PRReview {
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
  author: {
    login: string;
  };
  submittedAt: string;
}

export class GitHubUtils {
  static async getIssue(
    issueNumber: number,
    cwd: string,
  ): Promise<GitHubIssue> {
    const {stdout} = await execAsync(
      `gh issue view ${issueNumber} --json title,body,state,number`,
      {cwd},
    );
    return JSON.parse(stdout);
  }

  static async createIssue(
    title: string,
    body: string,
    labels: string,
    project: string,
    cwd: string,
  ): Promise<number> {
    const {stdout} = await execAsync(
      `gh issue create --title ${JSON.stringify(title)} --body ${JSON.stringify(body)} --label "${labels}" --project "${project}"`,
      {cwd},
    );
    const match = stdout.match(/\/issues\/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  static async closeIssue(
    issueNumber: number,
    comment: string,
    cwd: string,
  ): Promise<void> {
    await execAsync(
      `gh issue close ${issueNumber} --comment "${comment}"`,
      {cwd},
    );
  }

  static async createPR(
    title: string,
    body: string,
    base: string,
    cwd: string,
  ): Promise<number> {
    const {stdout} = await execAsync(
      `gh pr create --title ${JSON.stringify(title)} --body ${JSON.stringify(body)} --base ${base}`,
      {cwd},
    );
    const match = stdout.match(/\/pull\/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  static async listPRs(
    limit: number,
    cwd: string,
  ): Promise<GitHubPR[]> {
    const {stdout} = await execAsync(
      `gh pr list --limit ${limit} --json number,title,body,state`,
      {cwd},
    );
    return JSON.parse(stdout);
  }

  static async searchPRs(
    search: string,
    cwd: string,
  ): Promise<GitHubPR[]> {
    const {stdout} = await execAsync(
      `gh pr list --search "${search}" --json number,title,body,state`,
      {cwd},
    );
    return JSON.parse(stdout);
  }

  static async findPRForIssue(
    issueNumber: number,
    cwd: string,
  ): Promise<number | null> {
    try {
      const prs = await GitHubUtils.searchPRs(`#${issueNumber}`, cwd);
      
      const matchingPR = prs.find(
        (pr: any) =>
          pr.state === 'OPEN' &&
          (pr.title.includes(`#${issueNumber}`) ||
            pr.body.includes(`#${issueNumber}`) ||
            pr.body.includes(`Closes #${issueNumber}`) ||
            pr.body.includes(`Fixes #${issueNumber}`)),
      );

      return matchingPR ? matchingPR.number : null;
    } catch (error) {
      console.log(`⚠️  Could not search for existing PRs: ${error}`);
      return null;
    }
  }

  static async listIssues(
    label: string,
    limit: number,
    cwd: string,
  ): Promise<number[]> {
    try {
      const {stdout} = await execAsync(
        `gh issue list --label "${label}" --limit ${limit} --json number --jq '.[].number'`,
        {cwd},
      );
      return stdout
        .trim()
        .split('\n')
        .map(num => parseInt(num))
        .filter(num => !isNaN(num));
    } catch {
      console.warn(`⚠️ Could not retrieve issues for label ${label}`);
      return [];
    }
  }

  static parseDependencies(issueBody: string): number[] {
    const dependencyRegex = /(?:depends on|blocked by)\s+#(\d+)/gi;
    const matches = Array.from(issueBody.matchAll(dependencyRegex));
    return matches.map(match => parseInt(match[1]));
  }

  static parseCreatedIssues(response: string): number[] {
    const issueMatches = response.match(/#(\d+)/g) || [];
    return issueMatches
      .map(match => parseInt(match.substring(1)))
      .filter((num, index, array) => array.indexOf(num) === index);
  }

  static async mergePR(
    prNumber: number,
    cwd: string,
    method: 'merge' | 'squash' | 'rebase' = 'squash',
  ): Promise<void> {
    const methodFlag = method === 'squash' ? '--squash' : method === 'rebase' ? '--rebase' : '--merge';
    
    try {
      // Try to merge with branch deletion first
      await execAsync(`gh pr merge ${prNumber} ${methodFlag} --delete-branch`, {cwd});
      console.log(`✅ PR #${prNumber} merged and branch deleted`);
    } catch (error) {
      // If branch deletion fails (common in worktree setups), merge without deletion
      console.log(`⚠️ Branch deletion failed, merging without deletion: ${error}`);
      
      try {
        await execAsync(`gh pr merge ${prNumber} ${methodFlag}`, {cwd});
        console.log(`✅ PR #${prNumber} merged (branch deletion will be handled separately)`);
      } catch (mergeError) {
        console.error(`❌ Failed to merge PR #${prNumber}: ${mergeError}`);
        throw mergeError;
      }
    }
  }

  static async deleteBranch(
    branchName: string,
    cwd: string,
    remote: boolean = true,
  ): Promise<void> {
    try {
      // Delete local branch
      await execAsync(`git branch -D ${branchName}`, {cwd});
      console.log(`🗑️ Deleted local branch: ${branchName}`);
      
      if (remote) {
        // Delete remote branch
        await execAsync(`git push origin --delete ${branchName}`, {cwd});
        console.log(`🗑️ Deleted remote branch: ${branchName}`);
      }
    } catch (error) {
      console.log(`⚠️ Could not delete branch ${branchName}: ${error}`);
      // Don't throw - branch deletion is cleanup, not critical
    }
  }

  static async getPR(
    prNumber: number,
    cwd: string,
  ): Promise<GitHubPR> {
    const {stdout} = await execAsync(
      `gh pr view ${prNumber} --json title,body,state,number`,
      {cwd},
    );
    return JSON.parse(stdout);
  }

  static async getPRBranchName(
    prNumber: number,
    cwd: string,
  ): Promise<string> {
    const {stdout} = await execAsync(
      `gh pr view ${prNumber} --json headRefName --jq '.headRefName'`,
      {cwd},
    );
    return stdout.trim();
  }

  static async addIssueLabel(
    issueNumber: number,
    label: string,
    cwd: string,
  ): Promise<void> {
    await execAsync(`gh issue edit ${issueNumber} --add-label "${label}"`, {cwd});
  }

  static async checkAuth(cwd: string): Promise<boolean> {
    try {
      await execAsync('gh auth status', {cwd});
      return true;
    } catch {
      return false;
    }
  }

  static async getPRReviews(
    prNumber: number,
    cwd: string,
  ): Promise<PRReview[]> {
    try {
      const {stdout} = await execAsync(
        `gh pr view ${prNumber} --json reviews --jq '.reviews[] | {state: .state, author: {login: .author.login}, submittedAt: .submittedAt}'`,
        {cwd},
      );
      
      if (!stdout.trim()) {
        return [];
      }
      
      // Parse each line as a separate JSON object
      const reviews = stdout
        .trim()
        .split('\n')
        .map(line => JSON.parse(line));
      
      return reviews;
    } catch (error) {
      console.log(`⚠️ Could not get PR reviews for #${prNumber}: ${error}`);
      return [];
    }
  }

  static async hasPendingChangeRequests(
    prNumber: number,
    cwd: string,
  ): Promise<boolean> {
    try {
      const reviews = await GitHubUtils.getPRReviews(prNumber, cwd);
      
      // Get the latest review state per reviewer
      const latestReviews = new Map<string, string>();
      
      reviews
        .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
        .forEach(review => {
          latestReviews.set(review.author.login, review.state);
        });
      
      // Check if any reviewer's latest state is CHANGES_REQUESTED
      return Array.from(latestReviews.values()).some(state => state === 'CHANGES_REQUESTED');
    } catch (error) {
      console.log(`⚠️ Could not check change requests for PR #${prNumber}: ${error}`);
      return false;
    }
  }
}