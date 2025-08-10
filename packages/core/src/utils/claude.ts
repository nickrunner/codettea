import {exec, spawn} from 'child_process';
import {promisify} from 'util';
import fs from 'fs/promises';
import {readFileSync} from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export class ClaudeAgent {
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

  static async executeFromFile(
    promptFilePath: string,
    agentType: string,
    workingDir: string,
  ): Promise<string | undefined> {
    try {
      console.log(`🤖 Executing ${agentType} agent in ${workingDir}`);
      console.log(`📄 Prompt file: ${promptFilePath}`);

      await ClaudeAgent.checkAvailability();

      const promptContent = await fs.readFile(promptFilePath, 'utf-8');
      console.log(`✅ Prompt file readable (${promptContent.length} chars)`);
      console.log(`📝 Prompt size: ${promptContent.length} characters`);

      console.log(
        `⏳ Claude is analyzing the comprehensive instructions (may take 10-30 minutes)...`,
      );
      console.log(
        `💡 Note: Complex multi-agent prompts take time - Claude is working even when quiet\n`,
      );

      return await ClaudeAgent.runClaudeProcess(
        promptFilePath,
        agentType,
        workingDir,
      );
    } catch (error) {
      console.log(`❌ Claude CLI execution failed: ${error}`);
      throw new Error(`Claude Code agent execution failed: ${error}`);
    }
  }

  // Keep the old method for backwards compatibility, but mark as deprecated
  static async execute(
    prompt: string,
    agentType: string,
    workingDir: string,
  ): Promise<string | undefined> {
    console.log(
      `⚠️ executeAgent with prompt string is deprecated - use executeAgentFromFile instead`,
    );

    // Create temporary file for backwards compatibility
    const timestamp = Date.now();
    const promptFile = path.join(
      workingDir,
      `.codettea-${agentType}-prompt-${timestamp}.md`,
    );
    await fs.writeFile(promptFile, prompt, {mode: 0o644});

    try {
      return await ClaudeAgent.executeFromFile(
        promptFile,
        agentType,
        workingDir,
      );
    } finally {
      // Clean up temporary file
      try {
        await fs.unlink(promptFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private static async cleanupPromptFile(promptFile: string) {
    // Clean up ALL prompt files immediately after execution
    // No need to preserve them since they just cause clutter
    try {
      console.log(`🧹 Cleaning up prompt file: ${promptFile}`);
      await fs.unlink(promptFile);
      console.log(`✅ Prompt file cleaned up successfully`);
    } catch (error) {
      console.log(`⚠️ Could not clean up prompt file: ${error}`);
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

      console.log(`📂 Reading prompt file: ${promptFile}`);
      const promptContent = readFileSync(promptFile, 'utf-8');

      const escapedPrompt = promptContent.replace(/'/g, "'\"'\"'");

      console.log(
        `📝 Prompt content loaded: ${escapedPrompt.length} characters`,
      );
      console.log(`📄 First 200 chars: ${escapedPrompt.substring(0, 200)}...`);

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

      claudeProcess.stderr.on('data', async data => {
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

      claudeProcess.on('close', async code => {
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

        await this.cleanupPromptFile(promptFile);

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

      claudeProcess.on('error', async error => {
        console.error(`❌ Process error: ${error.message}`);
        await this.cleanupPromptFile(promptFile);
        clearInterval(spinnerInterval);
        clearInterval(progressInterval);
        clearTimeout(timeout);
        reject(new Error(`Failed to start Claude CLI: ${error.message}`));
      });
    });
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
