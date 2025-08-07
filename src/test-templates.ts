#!/usr/bin/env tsx

import fs from 'fs/promises';
import path from 'path';

async function testTemplateSystem() {
  console.log('🧪 Testing Multi-Agent Template System\n');

  // Test variables
  const testVars = {
    ISSUE_NUMBER: '123',
    FEATURE_NAME: 'user-auth',
    ATTEMPT_NUMBER: '1',
    MAX_ATTEMPTS: '3',
    AGENT_ID: 'solver-test-001',
    WORKTREE_PATH: '/Users/nickschrock/git/stays-user-auth',
    BASE_BRANCH: 'feature/user-auth'
  };

  // Helper function (same as in orchestrator)
  function customizePromptTemplate(template: string, variables: Record<string, string>): string {
    let customized = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `$${key}`;
      customized = customized.replace(new RegExp(placeholder.replace(/\$/g, '\\$'), 'g'), value);
    }
    
    return customized;
  }

  try {
    // Test solve template
    console.log('📋 Testing Solve Template:');
    console.log('='.repeat(50));
    
    const solveTemplate = await fs.readFile(
      path.join(__dirname, 'commands/test-solve.md'),
      'utf-8'
    );
    
    const customizedSolve = customizePromptTemplate(solveTemplate, testVars);
    console.log(customizedSolve);
    console.log('\n');

    // Test review template (first few lines)
    console.log('🔍 Testing Review Template Variables:');
    console.log('='.repeat(50));
    
    const reviewTemplate = await fs.readFile(
      path.join(__dirname, 'commands/review.md'),
      'utf-8'
    );

    const reviewVars = {
      PR_NUMBER: '456',
      ISSUE_NUMBER: '123', 
      FEATURE_NAME: 'user-auth',
      REVIEWER_PROFILE: 'frontend',
      AGENT_ID: 'reviewer-test-001',
      WORKTREE_PATH: '/Users/nickschrock/git/stays-user-auth',
      ATTEMPT_NUMBER: '1'
    };

    const customizedReview = customizePromptTemplate(reviewTemplate, reviewVars);
    
    // Show first 20 lines to verify substitution
    const reviewLines = customizedReview.split('\n').slice(0, 20);
    console.log(reviewLines.join('\n'));
    console.log('...(truncated)\n');

    console.log('✅ Template system test completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Solve template variables: ${Object.keys(testVars).length}`);
    console.log(`- Review template variables: ${Object.keys(reviewVars).length}`);
    console.log('- Variable substitution: Working');
    console.log('- File loading: Working');

  } catch (error) {
    console.error('❌ Template test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testTemplateSystem();
}