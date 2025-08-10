"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MergeConflictResolver = void 0;
const git_1 = require("./git");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class MergeConflictResolver {
    static async resolveMergeConflicts(cwd, branch) {
        console.log(`🔧 Resolving merge conflicts from ${branch} merge`);
        const conflictFiles = await git_1.GitUtils.getMergeConflictFiles(cwd);
        if (conflictFiles.length === 0) {
            console.log(`✅ No conflicts to resolve`);
            return true;
        }
        console.log(`📋 Found ${conflictFiles.length} conflicted files:`);
        conflictFiles.forEach(file => console.log(`  - ${file}`));
        let resolvedAll = true;
        for (const file of conflictFiles) {
            try {
                const resolution = this.determineResolutionStrategy(file);
                console.log(`🔧 ${file}: ${resolution.strategy} (${resolution.reason})`);
                if (resolution.strategy === 'auto') {
                    await this.autoResolveConflict(file, resolution, cwd);
                }
                else if (resolution.strategy === 'agent') {
                    // For now, fall back to auto resolution - can implement agent resolution later
                    console.log(`⚠️ Agent resolution not yet implemented, using auto fallback`);
                    await this.autoResolveConflict(file, resolution, cwd);
                }
                else {
                    console.log(`❌ Manual resolution required for ${file}`);
                    resolvedAll = false;
                }
            }
            catch (error) {
                console.error(`❌ Failed to resolve conflict in ${file}: ${error}`);
                resolvedAll = false;
            }
        }
        if (resolvedAll) {
            try {
                await git_1.GitUtils.completeMerge(`Resolve merge conflicts from ${branch}`, cwd);
                console.log(`✅ All conflicts resolved and merge completed`);
                return true;
            }
            catch (error) {
                console.error(`❌ Failed to complete merge: ${error}`);
                return false;
            }
        }
        else {
            console.log(`❌ Some conflicts require manual resolution`);
            return false;
        }
    }
    static determineResolutionStrategy(filePath) {
        const fileName = path_1.default.basename(filePath);
        const dirName = path_1.default.dirname(filePath);
        // Root-level temporary codettea files - delete them
        if (fileName.startsWith('.codettea-') && fileName.endsWith('-prompt.md') && dirName === '.') {
            return {
                strategy: 'auto',
                action: 'delete',
                reason: 'Root-level temporary prompt files should be deleted'
            };
        }
        // Codettea reference files - prefer theirs (newer)
        if (dirName.includes('.codettea')) {
            if (fileName.startsWith('reviewer-') || fileName.startsWith('solver-')) {
                return {
                    strategy: 'auto',
                    action: 'theirs',
                    reason: 'Codettea reference files - use newer version'
                };
            }
        }
        // Architecture notes - try to append both
        if (fileName === 'ARCHITECTURE_NOTES.md' && dirName.includes('.codettea')) {
            return {
                strategy: 'auto',
                action: 'both',
                reason: 'Architecture notes - merge both versions'
            };
        }
        // Changelog - try to append both
        if (fileName === 'CHANGELOG.md' && dirName.includes('.codettea')) {
            return {
                strategy: 'auto',
                action: 'both',
                reason: 'Changelog - merge both versions'
            };
        }
        // Source code files - need intelligent resolution
        if (fileName.endsWith('.ts') || fileName.endsWith('.js') || fileName.endsWith('.json')) {
            return {
                strategy: 'agent',
                action: 'agent-resolve',
                reason: 'Source code conflict requires intelligent resolution'
            };
        }
        // Default to manual for safety
        return {
            strategy: 'manual',
            action: 'custom',
            reason: 'Unknown file type - manual resolution required'
        };
    }
    static async autoResolveConflict(filePath, resolution, cwd) {
        if (resolution.action === 'delete') {
            // Remove the conflicted file completely
            await promises_1.default.unlink(path_1.default.join(cwd, filePath));
            // Remove it from git index 
            await git_1.GitUtils.addFiles(filePath, cwd);
            console.log(`✅ Deleted conflicted file: ${filePath}`);
        }
        else if (resolution.action === 'ours' || resolution.action === 'theirs' || resolution.action === 'both') {
            await git_1.GitUtils.resolveMergeConflict(filePath, resolution.action, cwd);
            console.log(`✅ Auto-resolved ${filePath} using ${resolution.action}`);
        }
        else {
            throw new Error(`Unsupported auto-resolution action: ${resolution.action}`);
        }
    }
    static async handleMergeConflictError(error, cwd, branch) {
        if (!error.message.includes('MERGE_CONFLICT')) {
            return false; // Not a merge conflict, can't handle
        }
        console.log(`🔧 Attempting to resolve merge conflicts automatically...`);
        const resolved = await this.resolveMergeConflicts(cwd, branch);
        if (!resolved) {
            console.log(`❌ Could not auto-resolve all conflicts`);
            console.log(`💡 Consider running: git status && git mergetool`);
            // Abort the merge to return to clean state
            try {
                await git_1.GitUtils.abortMerge(cwd);
                console.log(`🔄 Merge aborted - repository returned to clean state`);
            }
            catch (abortError) {
                console.error(`❌ Failed to abort merge: ${abortError}`);
            }
        }
        return resolved;
    }
}
exports.MergeConflictResolver = MergeConflictResolver;
//# sourceMappingURL=mergeConflictResolver.js.map