#!/usr/bin/env tsx
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const promises_1 = __importDefault(require("fs/promises"));
async function testClaudeStreaming() {
    console.log('🧪 Testing Claude CLI streaming behavior\n');
    // Test 1: Simple echo test
    console.log('Test 1: Simple echo command');
    await testCommand(['echo', 'Hello World']);
    // Test 2: Claude with simple input
    console.log('\nTest 2: Claude with simple string');
    const simpleProcess = (0, child_process_1.spawn)('bash', ['-c', 'echo "Say hello" | claude code --dangerously-skip-permissions'], {
        stdio: ['pipe', 'pipe', 'pipe'],
    });
    await monitorProcess(simpleProcess, 'Claude Simple');
    // Test 3: Create a test prompt file and use it
    console.log('\nTest 3: Claude with file input');
    const promptFile = './test-prompt.md';
    const testPrompt = `Hello Claude! Please respond with exactly this format:

Step 1: I understand the request
Step 2: This is working
Step 3: Streaming test complete

Please make your response exactly like that with each step on its own line.`;
    await promises_1.default.writeFile(promptFile, testPrompt);
    console.log(`📝 Created test prompt (${testPrompt.length} chars)`);
    const fileProcess = (0, child_process_1.spawn)('bash', ['-c', `cat "${promptFile}" | claude code --dangerously-skip-permissions`], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, TERM: 'xterm-256color' },
    });
    await monitorProcess(fileProcess, 'Claude File');
    // Test 4: Test with actual large prompt from orchestrator
    console.log('\nTest 4: Testing with actual large solver prompt');
    const largePromptFile = '/Users/nickschrock/git/stays-promotion-builder-v2/.codettea-solver-prompt.md';
    try {
        const largePromptContent = await promises_1.default.readFile(largePromptFile, 'utf-8');
        console.log(`📝 Found large prompt file (${largePromptContent.length} chars)`);
        // Test with the actual large prompt
        const largeProcess = (0, child_process_1.spawn)('bash', [
            '-c',
            `cat "${largePromptFile}" | claude code --dangerously-skip-permissions`,
        ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                TERM: 'xterm-256color',
                PWD: '/Users/nickschrock/git/stays-promotion-builder-v2',
            },
        });
        await monitorProcess(largeProcess, 'Claude Large Prompt', 120000); // 2 minute timeout for large prompt
    }
    catch (error) {
        console.log(`❌ Could not test large prompt: ${error}`);
    }
    // Clean up
    await promises_1.default.unlink(promptFile);
    console.log('🧹 Cleaned up test prompt file');
}
async function testCommand(args) {
    const process = (0, child_process_1.spawn)(args[0], args.slice(1), {
        stdio: ['pipe', 'pipe', 'pipe'],
    });
    return monitorProcess(process, args.join(' '));
}
async function monitorProcess(process, label, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
        let output = '';
        let errorOutput = '';
        let hasOutput = false;
        console.log(`🚀 Started ${label} (PID: ${process.pid})`);
        // Close stdin
        process.stdin.end();
        // Monitor stdout with immediate writing
        process.stdout.on('data', (data) => {
            const chunk = data.toString();
            output += chunk;
            hasOutput = true;
            console.log(`📤 [${label}] Received ${chunk.length} chars`);
            // Show the actual content with a prefix
            const lines = chunk.split('\n');
            lines.forEach((line, idx) => {
                if (line.trim() || idx < lines.length - 1) {
                    console.log(`   │ ${line}`);
                }
            });
        });
        // Monitor stderr
        process.stderr.on('data', (data) => {
            const chunk = data.toString();
            errorOutput += chunk;
            console.error(`🔴 [${label} Error] ${chunk.trimEnd()}`);
        });
        // Handle completion
        process.on('close', (code) => {
            console.log(`✅ ${label} completed (exit code: ${code})`);
            console.log(`📊 Output: ${output.length} chars, Errors: ${errorOutput.length} chars`);
            if (!hasOutput && code === 0) {
                console.log(`⚠️  Process completed successfully but no stdout received`);
            }
            if (code !== 0) {
                console.log(`❌ Non-zero exit code: ${code}`);
                if (errorOutput) {
                    console.log(`Error details: ${errorOutput}`);
                }
                reject(new Error(`Process failed with code ${code}`));
            }
            else {
                resolve();
            }
        });
        // Handle process errors
        process.on('error', (error) => {
            console.error(`❌ Process error: ${error.message}`);
            reject(error);
        });
        // Add timeout
        const timeout = setTimeout(() => {
            console.log(`⏰ ${label} timeout - killing process`);
            process.kill('SIGTERM');
            reject(new Error(`${label} timed out`));
        }, timeoutMs);
        process.on('close', () => {
            clearTimeout(timeout);
        });
    });
}
// Run the test
if (require.main === module) {
    testClaudeStreaming().catch(console.error);
}
//# sourceMappingURL=test-claude-streaming.js.map