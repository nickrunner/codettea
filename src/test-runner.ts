#!/usr/bin/env tsx

import {exec} from 'child_process';
import {promisify} from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface TestRunnerResult {
  name: string;
  success: boolean;
  output: string;
  duration: number;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

class TestRunner {
  private results: TestRunnerResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Multi-Agent System Test Suite');
    console.log('================================\n');

    // Run different test categories
    await this.runUnitTests();
    await this.runIntegrationTests();
    await this.runLinting();
    await this.runTypeChecking();
    await this.runTemplateValidation();

    // Generate summary
    this.generateSummary();
  }

  private async runUnitTests(): Promise<void> {
    console.log('📋 Running Unit Tests...');

    const startTime = Date.now();
    try {
      const {stdout, stderr} = await execAsync('npm run test:unit', {
        env: {...process.env, NODE_ENV: 'test'},
      });

      const duration = Date.now() - startTime;
      this.results.push({
        name: 'Unit Tests',
        success: true,
        output: stdout + stderr,
        duration,
      });

      console.log('✅ Unit tests passed');
      this.logTestStats(stdout);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.results.push({
        name: 'Unit Tests',
        success: false,
        output: error.stdout + error.stderr,
        duration,
      });

      console.log('❌ Unit tests failed');
      console.log(error.stdout || error.stderr);
    }

    console.log('');
  }

  private async runIntegrationTests(): Promise<void> {
    console.log('🔗 Running Integration Tests...');

    // Check if integration tests should run
    const shouldRunIntegration = process.env.TEST_INTEGRATION === 'true';

    if (!shouldRunIntegration) {
      console.log(
        '⏭️  Skipping integration tests (set TEST_INTEGRATION=true to run)',
      );
      console.log('');
      return;
    }

    const startTime = Date.now();
    try {
      const {stdout, stderr} = await execAsync('npm run test:integration', {
        env: {...process.env, NODE_ENV: 'test', TEST_INTEGRATION: 'true'},
      });

      const duration = Date.now() - startTime;
      this.results.push({
        name: 'Integration Tests',
        success: true,
        output: stdout + stderr,
        duration,
      });

      console.log('✅ Integration tests passed');
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.results.push({
        name: 'Integration Tests',
        success: false,
        output: error.stdout + error.stderr,
        duration,
      });

      console.log('❌ Integration tests failed');
      console.log(error.stdout || error.stderr);
    }

    console.log('');
  }

  private async runLinting(): Promise<void> {
    console.log('🔍 Running ESLint...');

    const startTime = Date.now();
    try {
      const {stdout, stderr} = await execAsync('npm run lint');

      const duration = Date.now() - startTime;
      this.results.push({
        name: 'ESLint',
        success: true,
        output: stdout + stderr,
        duration,
      });

      console.log('✅ Linting passed');
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.results.push({
        name: 'ESLint',
        success: false,
        output: error.stdout + error.stderr,
        duration,
      });

      console.log('❌ Linting failed');
      console.log(error.stdout || error.stderr);
    }

    console.log('');
  }

  private async runTypeChecking(): Promise<void> {
    console.log('📝 Running TypeScript Type Checking...');

    const startTime = Date.now();
    try {
      const {stdout, stderr} = await execAsync('npm run type-check');

      const duration = Date.now() - startTime;
      this.results.push({
        name: 'TypeScript',
        success: true,
        output: stdout + stderr,
        duration,
      });

      console.log('✅ Type checking passed');
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.results.push({
        name: 'TypeScript',
        success: false,
        output: error.stdout + error.stderr,
        duration,
      });

      console.log('❌ Type checking failed');
      console.log(error.stdout || error.stderr);
    }

    console.log('');
  }

  private async runTemplateValidation(): Promise<void> {
    console.log('📄 Running Template Validation...');

    const startTime = Date.now();
    try {
      const {stdout, stderr} = await execAsync('npm run test-templates');

      const duration = Date.now() - startTime;
      this.results.push({
        name: 'Templates',
        success: true,
        output: stdout + stderr,
        duration,
      });

      console.log('✅ Template validation passed');
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.results.push({
        name: 'Templates',
        success: false,
        output: error.stdout + error.stderr,
        duration,
      });

      console.log('❌ Template validation failed');
      console.log(error.stdout || error.stderr);
    }

    console.log('');
  }

  private logTestStats(output: string): void {
    // Extract test statistics from Jest output
    const testMatch = output.match(/Tests:\s+(\d+)\s+passed/);
    const timeMatch = output.match(/Time:\s+([\d.]+)\s*s/);

    if (testMatch) {
      console.log(`   📊 ${testMatch[1]} tests passed`);
    }

    if (timeMatch) {
      console.log(`   ⏱️  ${timeMatch[1]}s execution time`);
    }
  }

  private generateSummary(): void {
    console.log('📊 Test Summary');
    console.log('===============\n');

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    // Overall status
    const overallSuccess = failedTests === 0;
    const statusIcon = overallSuccess ? '✅' : '❌';
    const statusText = overallSuccess ? 'PASSED' : 'FAILED';

    console.log(`${statusIcon} Overall Status: ${statusText}`);
    console.log(`📈 Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s\n`);

    // Detailed results
    console.log('📋 Detailed Results:');
    this.results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      const duration = (result.duration / 1000).toFixed(2);
      console.log(`   ${icon} ${result.name} (${duration}s)`);
    });

    // Failure details
    const failures = this.results.filter(r => !r.success);
    if (failures.length > 0) {
      console.log('\n❌ Failure Details:');
      failures.forEach(failure => {
        console.log(`\n${failure.name}:`);
        console.log('-'.repeat(failure.name.length + 1));
        console.log(failure.output.substring(0, 500) + '...');
      });
    }

    // Recommendations
    this.generateRecommendations();

    // Exit with appropriate code
    process.exit(overallSuccess ? 0 : 1);
  }

  private generateRecommendations(): void {
    const failures = this.results.filter(r => !r.success);

    if (failures.length === 0) {
      console.log(
        '\n🎉 All tests passed! Your multi-agent system is ready for production.',
      );
      return;
    }

    console.log('\n💡 Recommendations:');

    failures.forEach(failure => {
      switch (failure.name) {
        case 'Unit Tests':
          console.log(
            '   • Review failing unit tests and fix implementation issues',
          );
          console.log('   • Check mock setup and test data in tests/fixtures/');
          break;

        case 'Integration Tests':
          console.log(
            '   • Verify system dependencies (Claude Code CLI, GitHub CLI)',
          );
          console.log('   • Check file system permissions and paths');
          break;

        case 'ESLint':
          console.log(
            '   • Run `npm run lint -- --fix` to auto-fix style issues',
          );
          console.log('   • Review ESLint rules in .eslintrc.js');
          break;

        case 'TypeScript':
          console.log('   • Fix TypeScript compilation errors');
          console.log(
            '   • Ensure all dependencies have proper type definitions',
          );
          break;

        case 'Templates':
          console.log('   • Check template files in prompts/ directory');
          console.log(
            '   • Verify all template variables are properly defined',
          );
          break;
      }
    });

    console.log('\n🔧 Debug Commands:');
    console.log('   npm run test:watch     # Run tests in watch mode');
    console.log('   npm run test:coverage  # Generate coverage report');
    console.log('   npm run lint -- --fix  # Auto-fix linting issues');
    console.log('   npm run type-check     # Check TypeScript types');
  }

  async runCoverageReport(): Promise<void> {
    console.log('📊 Generating Coverage Report...');

    try {
      await execAsync('npm run test:coverage');

      // Check if coverage meets thresholds
      const coveragePath = path.join(
        process.cwd(),
        'coverage',
        'lcov-report',
        'index.html',
      );

      try {
        await fs.access(coveragePath);
        console.log(`✅ Coverage report generated: ${coveragePath}`);
        console.log(
          '📊 Open coverage/lcov-report/index.html to view detailed results',
        );
      } catch {
        console.log('⚠️  Coverage report not found, but tests completed');
      }
    } catch (error: any) {
      console.log('❌ Coverage generation failed:', error.message);
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const runner = new TestRunner();

  if (args.includes('--coverage')) {
    await runner.runCoverageReport();
  } else {
    await runner.runAllTests();
  }
}

if (require.main === module) {
  main().catch(console.error);
}
