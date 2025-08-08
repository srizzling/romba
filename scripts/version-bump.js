#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

/**
 * Analyze conventional commits since last tag and determine version bump
 */
function analyzeCommits() {
  try {
    // Get the last tag, or fallback to first commit
    let lastTag;
    try {
      lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    } catch {
      // No tags yet, use first commit
      lastTag = execSync('git rev-list --max-parents=0 HEAD', { encoding: 'utf8' }).trim();
    }

    // Get commits since last tag
    const commits = execSync(`git log ${lastTag}..HEAD --pretty=format:"%s"`, { encoding: 'utf8' })
      .split('\n')
      .filter(line => line.trim());

    console.log(`📊 Analyzing ${commits.length} commits since ${lastTag}:`);
    commits.forEach(commit => console.log(`  • ${commit}`));

    let hasMajor = false;
    let hasMinor = false;
    let hasPatch = false;

    commits.forEach(commit => {
      const lower = commit.toLowerCase();
      
      // Breaking changes trigger major version
      if (lower.includes('breaking change') || lower.includes('!:')) {
        hasMajor = true;
      }
      // New features trigger minor version
      else if (lower.startsWith('feat(') || lower.startsWith('feat:')) {
        hasMinor = true;
      }
      // Bug fixes and other changes trigger patch version
      else if (lower.startsWith('fix(') || lower.startsWith('fix:') ||
               lower.startsWith('perf(') || lower.startsWith('perf:')) {
        hasPatch = true;
      }
    });

    // Determine version bump
    if (hasMajor) {
      console.log('🚀 MAJOR version bump detected (breaking changes)');
      return 'major';
    } else if (hasMinor) {
      console.log('✨ MINOR version bump detected (new features)');
      return 'minor';
    } else if (hasPatch) {
      console.log('🐛 PATCH version bump detected (fixes/improvements)');
      return 'patch';
    } else {
      console.log('📝 No significant changes detected, defaulting to patch');
      return 'patch';
    }

  } catch (error) {
    console.error('Error analyzing commits:', error.message);
    console.log('🔄 Defaulting to patch version bump');
    return 'patch';
  }
}

/**
 * Bump version and create tag
 */
function bumpVersion() {
  const versionType = process.argv[2] || analyzeCommits();
  
  console.log(`\n🏷️  Bumping ${versionType} version...`);
  
  try {
    // Update package.json version
    const output = execSync(`npm version ${versionType} --no-git-tag-version`, { encoding: 'utf8' });
    const newVersion = output.trim();
    
    console.log(`📦 Updated package.json to ${newVersion}`);
    
    // Add package.json to git
    execSync('git add package.json');
    
    // Create commit
    execSync(`git commit -m "chore(release): 🚀 bump version to ${newVersion}"`);
    
    // Create and push tag
    execSync(`git tag ${newVersion}`);
    console.log(`🏷️  Created tag: ${newVersion}`);
    
    // Push commits and tags
    execSync('git push origin main');
    execSync(`git push origin ${newVersion}`);
    console.log(`🚀 Pushed ${newVersion} to origin`);
    
    console.log(`\n✅ Release ${newVersion} complete!`);
    console.log(`📋 GoReleaser will now create the GitHub release with changelog`);
    
  } catch (error) {
    console.error('❌ Error during version bump:', error.message);
    process.exit(1);
  }
}

// Run the bump
bumpVersion();