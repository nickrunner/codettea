import {exec, spawn} from 'child_process';
import {promisify} from 'util';
import fs from 'fs/promises';
import {readFileSync} from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export class ClaudeUtils {
  static async checkAvailability(): Promise<boolean> {
    try {
      await execAsync('claude --version', {timeout: 5000});
      console.log(`✅ Claude Code CLI is available`);
      return true;
    } catch (error) {
      console.error(`❌ Claude Code CLI not available: ${error}`);
      return false;
    }
  }

  static async testConnection(workingDir: string): Promise<boolean> {
    try {
      const {stdout} = await execAsync(
        'echo "Test: please respond with DIRECT_ACCESS_OK" | claude code --dangerously-skip-permissions',
        {
          cwd: workingDir,
          timeout: 30000,
          env: {...process.env, PWD: workingDir},
        },
      );
      console.log(`✅ Direct test result: ${stdout.trim()}`);
      return true;
    } catch (error) {
      console.log(`⚠️  Direct test failed: ${error}`);
      return false;
    }
  }

  static async executeAgent(
    prompt: string,
    agentType: string,
    workingDir: string,
  ): Promise<string | undefined> {
    const promptFile = path.join(
      workingDir,
      `.codettea-${agentType}-prompt.md`,
    );
    await fs.writeFile(promptFile, prompt, {mode: 0o644});

    try {
      console.log(`🤖 Executing ${agentType} agent in ${workingDir}`);
      console.log(`📄 Prompt file: ${promptFile}`);
      console.log(`📝 Prompt size: ${prompt.length} characters`);

      await ClaudeUtils.checkAvailability();

      const testRead = await fs.readFile(promptFile, 'utf-8');
      console.log(`✅ Prompt file readable (${testRead.length} chars)`);

      console.log(`🧪 Testing Claude connection...`);
      await ClaudeUtils.testConnection(workingDir);

      console.log(`📝 Processing full prompt...`);
      console.log(
        `⏳ Claude is analyzing the comprehensive instructions (may take 10-30 minutes)...`,
      );
      console.log(
        `💡 Note: Complex multi-agent prompts take time - Claude is working even when quiet\n`,
      );

      return await ClaudeUtils.runClaudeProcess(
        promptFile,
        agentType,
        workingDir,
      );
    } catch (error) {
      console.log(`❌ Claude CLI execution failed: ${error}`);
      throw new Error(`Claude Code agent execution failed: ${error}`);
    }
  }

  private static async runClaudeProcess(
    promptFile: string,
    agentType: string,
    workingDir: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';

      const promptContent = readFileSync(promptFile, 'utf-8');
      const escapedPrompt = promptContent.replace(/'/g, "'\"'\"'");

      const claudeProcess = spawn(
        'bash',
        [
          '-c',
          `echo '${escapedPrompt}' | claude code --dangerously-skip-permissions`,
        ],
        {
          cwd: workingDir,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            PWD: workingDir,
            TERM: 'xterm-256color',
          },
        },
      );

      console.log(`🚀 Claude streaming started (PID: ${claudeProcess.pid})`);

      claudeProcess.stdin.end();

      claudeProcess.stdout.on('data', data => {
        const chunk = data.toString();
        output += chunk;
        if (chunk.length > 100) {
          console.log(`📤 [Claude] Received response (${chunk.length} chars)`);
        }
      });

      claudeProcess.stderr.on('data', data => {
        const chunk = data.toString();
        errorOutput += chunk;
        console.error(`🔴 [Claude Error] ${chunk.trimEnd()}`);
      });

      const startTime = Date.now();
      const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      let spinnerIndex = 0;

      const spinnerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

        process.stdout.write(
          `\r${spinnerFrames[spinnerIndex]} Claude processing ${agentType} instructions... (${timeStr} elapsed)`,
        );
        spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
      }, 500);

      const progressInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 60000);
        process.stdout.write(`\r${' '.repeat(80)}\r`);
        console.log(
          `💭 Claude still working on comprehensive analysis... (${elapsed} mins elapsed)`,
        );
      }, 120000);

      const timeout = setTimeout(() => {
        clearInterval(spinnerInterval);
        clearInterval(progressInterval);
        process.stdout.write(`\r${' '.repeat(80)}\r`);
        console.log(
          `⏰ Reached 1 hour timeout - this prompt may be too complex`,
        );
        claudeProcess.kill('SIGTERM');
        reject(
          new Error(
            'Claude CLI timed out after 1 hour - prompt may need simplification',
          ),
        );
      }, 3600000);

      claudeProcess.on('close', code => {
        clearInterval(spinnerInterval);
        clearInterval(progressInterval);
        clearTimeout(timeout);
        process.stdout.write(`\r${' '.repeat(80)}\r`);

        console.log(`\n✅ Claude CLI completed (exit code: ${code})`);
        console.log(`📤 Total response: ${output.length} characters`);

        if (errorOutput.trim()) {
          console.log(`⚠️ Stderr: ${errorOutput}`);
        }

        if (output.trim()) {
          console.log(`\n\x1b[36m[Claude Response]\x1b[0m`);
          console.log('─'.repeat(80));
          console.log(output);
          console.log('─'.repeat(80));
        }

        if (!agentType.includes('reviewer')) {
          setTimeout(async () => {
            try {
              console.log(`🧹 Cleaning up prompt file: ${promptFile}`);
              await fs.unlink(promptFile);
            } catch {
              // Ignore cleanup errors
            }
          }, 1000);
        }

        if (code !== 0) {
          reject(
            new Error(
              `Claude CLI exited with code ${code}. Stderr: ${errorOutput}`,
            ),
          );
          return;
        }

        if (!output || output.trim().length === 0) {
          reject(
            new Error(
              `Claude Code agent returned no output. Stderr: ${errorOutput}`,
            ),
          );
          return;
        }

        resolve(output.trim());
      });

      claudeProcess.on('error', error => {
        console.error(`❌ Process error: ${error.message}`);
        clearInterval(spinnerInterval);
        clearInterval(progressInterval);
        clearTimeout(timeout);
        reject(new Error(`Failed to start Claude CLI: ${error.message}`));
      });
    });
  }

  static parseReviewResult(reviewResponse: string): 'APPROVE' | 'REJECT' {
    // Check if both markers are present - this indicates an error in the review
    const hasApprove = reviewResponse.includes('✅ APPROVE');
    const hasReject = reviewResponse.includes('❌ REJECT');

    if (hasApprove && hasReject) {
      console.log(
        `⚠️ Both APPROVE and REJECT markers found - this is invalid, defaulting to REJECT`,
      );
      return 'REJECT';
    }

    // Look for explicit markers first
    if (hasApprove) {
      console.log(`✅ Explicit APPROVE marker found`);
      return 'APPROVE';
    }

    if (hasReject) {
      console.log(`❌ Explicit REJECT marker found`);
      return 'REJECT';
    }

    // Fallback to basic text detection for backwards compatibility
    const response = reviewResponse.toLowerCase();

    if (response.includes('approve') || response.includes('✅')) {
      console.log(`✅ Approval language detected`);
      return 'APPROVE';
    }

    if (response.includes('reject') || response.includes('❌')) {
      console.log(`❌ Rejection language detected`);
      return 'REJECT';
    }

    // Default to reject if unclear
    console.log(`❓ Unclear review result - defaulting to REJECT for safety`);
    return 'REJECT';
  }

  static parseReviewComments(reviewResponse: string): string {
    const lines = reviewResponse.split('\n');
    const filteredLines = lines.filter(
      line => line.trim() && !line.includes('claude') && !line.includes('🤖'),
    );
    return filteredLines.join('\n').trim();
  }

  static hasReworkRequiredFeedback(reviewResponse: string): boolean {
    // Look for the explicit rework marker
    if (reviewResponse.includes('**REWORK_REQUIRED**')) {
      return true;
    }

    // Also check for explicit REJECT marker as indicator of rework needed
    if (reviewResponse.includes('❌ REJECT')) {
      return true;
    }

    // Fallback for backwards compatibility
    const response = reviewResponse.toLowerCase();
    return (
      response.includes('must fix') ||
      response.includes('critical issues') ||
      response.includes('action items')
    );
  }

  static customizePromptTemplate(
    template: string,
    variables: Record<string, string>,
  ): string {
    let customized = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `$${key}`;
      customized = customized.replace(
        new RegExp(placeholder.replace(/\$/g, '\\$'), 'g'),
        value,
      );
    }

    return customized;
  }
}
