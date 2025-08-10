"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubUtils = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class GitHubUtils {
    static async getIssue(issueNumber, cwd) {
        const { stdout } = await execAsync(`gh issue view ${issueNumber} --json title,body,state,number`, { cwd });
        return JSON.parse(stdout);
    }
    static async createIssue(title, body, labels, project, cwd) {
        const { stdout } = await execAsync(`gh issue create --title ${JSON.stringify(title)} --body ${JSON.stringify(body)} --label "${labels}" --project "${project}"`, { cwd });
        const match = stdout.match(/\/issues\/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }
    static async closeIssue(issueNumber, comment, cwd) {
        await execAsync(`gh issue close ${issueNumber} --comment "${comment}"`, {
            cwd,
        });
    }
    static async createPR(title, body, base, cwd) {
        try {
            // First attempt - normal PR creation
            const { stdout } = await execAsync(`gh pr create --title ${JSON.stringify(title)} --body ${JSON.stringify(body)} --base ${base}`, { cwd });
            const match = stdout.match(/\/pull\/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        }
        catch (error) {
            console.log(`⚠️ PR creation failed, trying with --head flag: ${error}`);
            // Fallback - try with --head flag to specify the current branch explicitly
            try {
                const { stdout: currentBranch } = await execAsync('git branch --show-current', { cwd });
                const branchName = currentBranch.trim();
                const { stdout } = await execAsync(`gh pr create --title ${JSON.stringify(title)} --body ${JSON.stringify(body)} --base ${base} --head ${branchName}`, { cwd });
                const match = stdout.match(/\/pull\/(\d+)/);
                return match ? parseInt(match[1]) : 0;
            }
            catch (fallbackError) {
                console.error(`❌ Both PR creation attempts failed: ${fallbackError}`);
                throw fallbackError;
            }
        }
    }
    static async updatePR(prNumber, title, body, cwd) {
        await execAsync(`gh pr edit ${prNumber} --title ${JSON.stringify(title)} --body ${JSON.stringify(body)}`, { cwd });
    }
    static async listPRs(limit, cwd) {
        const { stdout } = await execAsync(`gh pr list --limit ${limit} --json number,title,body,state`, { cwd });
        return JSON.parse(stdout);
    }
    static async searchPRs(search, cwd) {
        const { stdout } = await execAsync(`gh pr list --search "${search}" --json number,title,body,state`, { cwd });
        return JSON.parse(stdout);
    }
    static async findPRForIssue(issueNumber, cwd) {
        try {
            const prs = await GitHubUtils.searchPRs(`#${issueNumber}`, cwd);
            const matchingPR = prs.find((pr) => pr.state === 'OPEN' &&
                (pr.title.includes(`#${issueNumber}`) ||
                    pr.body.includes(`#${issueNumber}`) ||
                    pr.body.includes(`Closes #${issueNumber}`) ||
                    pr.body.includes(`Fixes #${issueNumber}`)));
            return matchingPR ? matchingPR.number : null;
        }
        catch (error) {
            console.log(`⚠️  Could not search for existing PRs: ${error}`);
            return null;
        }
    }
    static async listIssues(label, limit, cwd) {
        try {
            const { stdout } = await execAsync(`gh issue list --label "${label}" --limit ${limit} --json number --jq '.[].number'`, { cwd });
            return stdout
                .trim()
                .split('\n')
                .map(num => parseInt(num))
                .filter(num => !isNaN(num));
        }
        catch {
            console.warn(`⚠️ Could not retrieve issues for label ${label}`);
            return [];
        }
    }
    static parseDependencies(issueBody) {
        const dependencyRegex = /(?:depends on|blocked by)\s+#(\d+)/gi;
        const matches = Array.from(issueBody.matchAll(dependencyRegex));
        return matches.map(match => parseInt(match[1]));
    }
    static parseCreatedIssues(response) {
        const issueMatches = response.match(/#(\d+)/g) || [];
        return issueMatches
            .map(match => parseInt(match.substring(1)))
            .filter((num, index, array) => array.indexOf(num) === index);
    }
    static async mergePR(prNumber, cwd, method = 'squash') {
        const methodFlag = method === 'squash'
            ? '--squash'
            : method === 'rebase'
                ? '--rebase'
                : '--merge';
        try {
            // Try to merge with branch deletion first
            await execAsync(`gh pr merge ${prNumber} ${methodFlag} --delete-branch`, {
                cwd,
            });
            console.log(`✅ PR #${prNumber} merged and branch deleted`);
        }
        catch (error) {
            // If branch deletion fails (common in worktree setups), merge without deletion
            console.log(`⚠️ Branch deletion failed, merging without deletion: ${error}`);
            try {
                await execAsync(`gh pr merge ${prNumber} ${methodFlag}`, { cwd });
                console.log(`✅ PR #${prNumber} merged (branch deletion will be handled separately)`);
            }
            catch (mergeError) {
                console.error(`❌ Failed to merge PR #${prNumber}: ${mergeError}`);
                throw mergeError;
            }
        }
    }
    static async deleteBranch(branchName, cwd, remote = true) {
        try {
            // Delete local branch
            await execAsync(`git branch -D ${branchName}`, { cwd });
            console.log(`🗑️ Deleted local branch: ${branchName}`);
            if (remote) {
                // Delete remote branch
                await execAsync(`git push origin --delete ${branchName}`, { cwd });
                console.log(`🗑️ Deleted remote branch: ${branchName}`);
            }
        }
        catch (error) {
            console.log(`⚠️ Could not delete branch ${branchName}: ${error}`);
            // Don't throw - branch deletion is cleanup, not critical
        }
    }
    static async getPR(prNumber, cwd) {
        const { stdout } = await execAsync(`gh pr view ${prNumber} --json title,body,state,number`, { cwd });
        return JSON.parse(stdout);
    }
    static async getPRBranchName(prNumber, cwd) {
        const { stdout } = await execAsync(`gh pr view ${prNumber} --json headRefName --jq '.headRefName'`, { cwd });
        return stdout.trim();
    }
    static async addIssueLabel(issueNumber, label, cwd) {
        await execAsync(`gh issue edit ${issueNumber} --add-label "${label}"`, {
            cwd,
        });
    }
    static async checkAuth(cwd) {
        try {
            await execAsync('gh auth status', { cwd });
            return true;
        }
        catch {
            return false;
        }
    }
    static async getPRReviews(prNumber, cwd) {
        try {
            const { stdout } = await execAsync(`gh pr view ${prNumber} --json reviews --jq '.reviews[] | {state: .state, author: {login: .author.login}, submittedAt: .submittedAt, body: .body}'`, { cwd });
            if (!stdout.trim()) {
                return [];
            }
            // Parse each line as a separate JSON object
            const reviews = stdout
                .trim()
                .split('\n')
                .map(line => JSON.parse(line));
            return reviews;
        }
        catch (error) {
            console.log(`⚠️ Could not get PR reviews for #${prNumber}: ${error}`);
            return [];
        }
    }
    static async getPRComments(prNumber, cwd) {
        try {
            const { stdout } = await execAsync(`gh pr view ${prNumber} --json comments --jq '.comments[] | {author: {login: .author.login}, body: .body, createdAt: .createdAt}'`, { cwd });
            if (!stdout.trim()) {
                return [];
            }
            // Parse each line as a separate JSON object
            const comments = stdout
                .trim()
                .split('\n')
                .map(line => JSON.parse(line));
            return comments;
        }
        catch (error) {
            console.log(`⚠️ Could not get PR comments for #${prNumber}: ${error}`);
            return [];
        }
    }
    static async getAllPRFeedback(prNumber, cwd) {
        const [reviews, comments] = await Promise.all([
            GitHubUtils.getPRReviews(prNumber, cwd),
            GitHubUtils.getPRComments(prNumber, cwd),
        ]);
        return { reviews, comments };
    }
    static async hasPendingChangeRequests(prNumber, cwd) {
        try {
            const reviews = await GitHubUtils.getPRReviews(prNumber, cwd);
            // Get the latest review state and body per reviewer
            const latestReviews = new Map();
            reviews
                .sort((a, b) => new Date(a.submittedAt).getTime() -
                new Date(b.submittedAt).getTime())
                .forEach(review => {
                latestReviews.set(review.author.login, {
                    state: review.state,
                    body: review.body,
                });
            });
            // Check if any reviewer's latest state is CHANGES_REQUESTED
            const hasFormalChangeRequests = Array.from(latestReviews.values()).some(review => review.state === 'CHANGES_REQUESTED');
            // Check for rejection indicators in review comments
            const rejectionPatterns = [
                '🔴 Critical',
                'Critical Issues',
                '## ❌ REJECT',
                'Must Fix',
                'Action Items',
                'Recommendation:',
                'before merging',
                'must be addressed',
                'must be resolved',
            ];
            const hasRejectionComments = Array.from(latestReviews.values()).some(review => {
                if (!review.body)
                    return false;
                const bodyLower = review.body.toLowerCase();
                return rejectionPatterns.some(pattern => bodyLower.includes(pattern.toLowerCase()));
            });
            const result = hasFormalChangeRequests || hasRejectionComments;
            if (result) {
                console.log(`📝 Detected pending changes for PR #${prNumber}: formal=${hasFormalChangeRequests}, rejection_comments=${hasRejectionComments}`);
            }
            return result;
        }
        catch (error) {
            console.log(`⚠️ Could not check change requests for PR #${prNumber}: ${error}`);
            return false;
        }
    }
    static async submitPRReview(prNumber, result, comments, reviewerId, reviewerProfile, cwd) {
        // Just use the comments directly - they're already well-formatted by the reviewer
        // Only add metadata footer for tracking
        const reviewBody = `${comments}

---
*Review by ${reviewerProfile} agent (${reviewerId}) - Multi-agent orchestrator*`;
        try {
            // First, check if this is our own PR by getting current user
            const { stdout: currentUser } = await execAsync('gh api user --jq .login', {
                cwd,
            });
            const { stdout: prAuthor } = await execAsync(`gh pr view ${prNumber} --json author --jq .author.login`, { cwd });
            const isOwnPR = currentUser.trim() === prAuthor.trim();
            // Write review body to a temp file to preserve formatting
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            const tempFile = path.join(cwd, `.review-${prNumber}-${Date.now()}.md`);
            await fs.writeFile(tempFile, reviewBody);
            try {
                if (isOwnPR) {
                    // For own PRs, just add a comment instead of formal review
                    console.log(`📝 Adding review comment to own PR #${prNumber} (cannot formally review own PR)`);
                    await execAsync(`gh pr comment ${prNumber} --body-file "${tempFile}"`, { cwd });
                }
                else {
                    // For other PRs, submit formal review
                    const reviewAction = result === 'APPROVE' ? '--approve' : '--request-changes';
                    await execAsync(`gh pr review ${prNumber} ${reviewAction} --body-file "${tempFile}"`, { cwd });
                }
            }
            finally {
                // Clean up temp file
                try {
                    await fs.unlink(tempFile);
                }
                catch {
                    // Ignore cleanup errors
                }
            }
        }
        catch (error) {
            console.log(`⚠️ Failed to submit review for PR #${prNumber}: ${error}`);
            throw error;
        }
    }
}
exports.GitHubUtils = GitHubUtils;
//# sourceMappingURL=github.js.map