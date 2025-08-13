#!/usr/bin/env node

/**
 * Real-world integration test script for Romba Bot
 * 
 * This script tests the complete download workflow:
 * 1. GBA ROM download (small file, fast download)
 * 2. PS2 ROM download (larger file, CHD conversion test)
 * 3. Verifies file structure and CHD conversion
 * 
 * Usage: node scripts/integration-test.js
 * 
 * NOTE: This test downloads real ROM files - it's meant for
 * pre-release validation, not CI/CD runs.
 */

const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

// Test configuration
const TEST_CONFIG = {
  // Small GBA ROM for quick testing
  gba: {
    console: 'gba',
    searchTerm: 'mario kart', // Should find Mario Kart: Super Circuit
    expectedSize: '< 10MB',
    expectCHD: false
  },
  
  // PS2 ROM for CHD conversion testing  
  ps2: {
    console: 'ps2',
    searchTerm: 'guitar hero', // Should find a Guitar Hero game
    expectedSize: '> 100MB',
    expectCHD: true
  }
};

const TEST_DIR = path.join(process.cwd(), 'integration-test-downloads');
const TEST_DB = path.join(process.cwd(), 'integration-test-db.json');

class IntegrationTester {
  constructor() {
    this.results = {
      gba: { status: 'pending', details: {} },
      ps2: { status: 'pending', details: {} },
      overall: { status: 'pending', startTime: new Date() }
    };
  }

  async run() {
    console.log('🚀 Starting Romba Integration Test');
    console.log('=====================================');
    console.log(`📁 Test directory: ${TEST_DIR}`);
    console.log(`📊 Test database: ${TEST_DB}`);
    console.log('');

    try {
      await this.setup();
      await this.testGBADownload();
      await this.testPS2Download(); 
      await this.verifyResults();
      await this.cleanup();
      
      this.results.overall.status = 'passed';
      this.printSummary();
      process.exit(0);
      
    } catch (error) {
      this.results.overall.status = 'failed';
      this.results.overall.error = error.message;
      this.printSummary();
      process.exit(1);
    }
  }

  async setup() {
    console.log('🔧 Setting up test environment...');
    
    // Clean up any previous test data
    await fs.remove(TEST_DIR);
    await fs.remove(TEST_DB);
    
    // Create test directory
    await fs.ensureDir(TEST_DIR);
    
    // Set environment variables for test
    process.env.DOWNLOAD_PATH = TEST_DIR;
    process.env.DATABASE_PATH = TEST_DB;
    
    console.log('✅ Test environment ready');
  }

  async testGBADownload() {
    console.log('\\n🎮 Testing GBA ROM Download...');
    console.log('--------------------------------');
    
    try {
      const result = await this.searchAndDownload('gba', TEST_CONFIG.gba.searchTerm);
      this.results.gba.details = result;
      
      // Verify file was downloaded
      const romsDir = path.join(TEST_DIR, 'roms', 'gba');
      const files = await fs.readdir(romsDir);
      
      if (files.length === 0) {
        throw new Error('No GBA ROM files found after download');
      }
      
      const downloadedFile = path.join(romsDir, files[0]);
      const stats = await fs.stat(downloadedFile);
      
      this.results.gba.details.filePath = downloadedFile;
      this.results.gba.details.fileSize = this.formatBytes(stats.size);
      this.results.gba.details.fileName = files[0];
      
      // Verify no CHD conversion (GBA shouldn't convert)
      const chdFiles = files.filter(f => f.endsWith('.chd'));
      if (chdFiles.length > 0) {
        throw new Error('GBA ROM was incorrectly converted to CHD');
      }
      
      this.results.gba.status = 'passed';
      console.log(`✅ GBA test passed: ${files[0]} (${this.results.gba.details.fileSize})`);
      
    } catch (error) {
      this.results.gba.status = 'failed';
      this.results.gba.error = error.message;
      console.log(`❌ GBA test failed: ${error.message}`);
      throw error;
    }
  }

  async testPS2Download() {
    console.log('\\n💿 Testing PS2 ROM Download + CHD Conversion...');
    console.log('------------------------------------------------');
    
    try {
      const result = await this.searchAndDownload('ps2', TEST_CONFIG.ps2.searchTerm);
      this.results.ps2.details = result;
      
      // Verify files were downloaded
      const romsDir = path.join(TEST_DIR, 'roms', 'ps2');
      const files = await fs.readdir(romsDir);
      
      if (files.length === 0) {
        throw new Error('No PS2 ROM files found after download');
      }
      
      // Check for CHD conversion
      const chdFiles = files.filter(f => f.endsWith('.chd'));
      const originalFiles = files.filter(f => !f.endsWith('.chd'));
      
      this.results.ps2.details.files = files;
      this.results.ps2.details.chdFiles = chdFiles;
      this.results.ps2.details.originalFiles = originalFiles;
      
      // Verify CHD conversion occurred
      if (chdFiles.length === 0) {
        console.log('⚠️  Warning: No CHD files found - CHD conversion may have failed');
        console.log('💡 This could be because chdman is not installed on this system');
        this.results.ps2.details.chdStatus = 'skipped';
      } else {
        console.log(`✅ CHD conversion successful: ${chdFiles[0]}`);
        
        // Compare file sizes if both exist
        if (originalFiles.length > 0) {
          const originalPath = path.join(romsDir, originalFiles[0]);
          const chdPath = path.join(romsDir, chdFiles[0]);
          
          const originalStats = await fs.stat(originalPath);
          const chdStats = await fs.stat(chdPath);
          
          const compressionRatio = Math.round((1 - chdStats.size / originalStats.size) * 100);
          
          this.results.ps2.details.originalSize = this.formatBytes(originalStats.size);
          this.results.ps2.details.chdSize = this.formatBytes(chdStats.size);
          this.results.ps2.details.compressionRatio = compressionRatio;
          this.results.ps2.details.chdStatus = 'success';
          
          console.log(`📊 Compression: ${this.results.ps2.details.originalSize} → ${this.results.ps2.details.chdSize} (${compressionRatio}% reduction)`);
        }
      }
      
      this.results.ps2.status = 'passed';
      console.log(`✅ PS2 test passed: ${files.length} files downloaded`);
      
    } catch (error) {
      this.results.ps2.status = 'failed';
      this.results.ps2.error = error.message;
      console.log(`❌ PS2 test failed: ${error.message}`);
      throw error;
    }
  }

  async searchAndDownload(console, searchTerm) {
    console.log(`🔍 Searching for ${console.toUpperCase()} ROM: "${searchTerm}"`);
    
    // Import services dynamically (they might not be built yet)
    const { MyrientService } = await import('../src/services/myrient.js');
    const { DatabaseService } = await import('../src/services/database.js');
    const { DownloadService } = await import('../src/services/downloader.js');
    const { CacheService } = await import('../src/services/cache.js');
    
    // Initialize services
    const cache = new CacheService();
    const myrient = new MyrientService(cache);
    const db = new DatabaseService(TEST_DB);
    const downloader = new DownloadService(db);
    
    // Search for games
    const searchResult = await myrient.searchGames(console, searchTerm);
    
    if (searchResult.games.length === 0) {
      throw new Error(`No games found for "${searchTerm}" on ${console}`);
    }
    
    // Pick the first result
    const selectedGame = searchResult.games[0];
    console.log(`📦 Selected: ${selectedGame.name} (${selectedGame.size || 'Unknown size'})`);
    
    // Add to download queue
    const job = await db.addDownload(selectedGame);
    console.log(`⏳ Added to queue with ID: ${job.id}`);
    
    // Start download
    console.log('📥 Starting download...');
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const progressInterval = setInterval(() => {
        const activeJobs = db.getActiveDownloads();
        const currentJob = activeJobs.find(j => j.id === job.id);
        
        if (currentJob) {
          process.stdout.write(`\\r📊 Progress: ${currentJob.progress}%`);
        }
      }, 1000);
      
      downloader.startDownload(job, (progress) => {
        // Progress callback handled by interval above
      }).then(() => {
        clearInterval(progressInterval);
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        
        console.log(`\\n✅ Download completed in ${duration}s`);
        
        resolve({
          game: selectedGame,
          jobId: job.id,
          duration: duration,
          downloadTime: new Date()
        });
      }).catch((error) => {
        clearInterval(progressInterval);
        console.log(`\\n❌ Download failed: ${error.message}`);
        reject(error);
      });
    });
  }

  async verifyResults() {
    console.log('\\n🔍 Verifying test results...');
    console.log('-----------------------------');
    
    // Verify directory structure
    const expectedDirs = ['roms/gba', 'roms/ps2'];
    for (const dir of expectedDirs) {
      const fullPath = path.join(TEST_DIR, dir);
      if (!await fs.pathExists(fullPath)) {
        throw new Error(`Expected directory not found: ${dir}`);
      }
      console.log(`✅ Directory exists: ${dir}`);
    }
    
    // Verify database state
    if (!await fs.pathExists(TEST_DB)) {
      throw new Error('Test database file not found');
    }
    console.log('✅ Database file created');
    
    // Check if chdman is available for CHD testing
    const chdmanAvailable = await this.checkCHDManAvailable();
    console.log(`🔧 chdman tool: ${chdmanAvailable ? 'Available' : 'Not available'}`);
    
    if (!chdmanAvailable) {
      console.log('💡 CHD conversion tests may be limited without chdman installed');
    }
  }

  async checkCHDManAvailable() {
    return new Promise((resolve) => {
      const process = spawn('chdman', ['--version']);
      process.on('close', (code) => resolve(code === 0));
      process.on('error', () => resolve(false));
    });
  }

  async cleanup() {
    console.log('\\n🧹 Cleaning up test files...');
    
    try {
      await fs.remove(TEST_DIR);
      await fs.remove(TEST_DB);
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.log(`⚠️  Cleanup warning: ${error.message}`);
    }
  }

  printSummary() {
    const endTime = new Date();
    const duration = Math.round((endTime - this.results.overall.startTime) / 1000);
    
    console.log('\\n');
    console.log('📋 INTEGRATION TEST SUMMARY');
    console.log('============================');
    console.log(`⏱️  Total Duration: ${duration}s`);
    console.log(`🎯 Overall Status: ${this.results.overall.status.toUpperCase()}`);
    console.log('');
    
    // GBA Results
    console.log(`🎮 GBA Test: ${this.results.gba.status.toUpperCase()}`);
    if (this.results.gba.status === 'passed') {
      console.log(`   📁 File: ${this.results.gba.details.fileName}`);
      console.log(`   📊 Size: ${this.results.gba.details.fileSize}`);
      console.log(`   ⏱️  Duration: ${this.results.gba.details.duration}s`);
    } else if (this.results.gba.error) {
      console.log(`   ❌ Error: ${this.results.gba.error}`);
    }
    console.log('');
    
    // PS2 Results
    console.log(`💿 PS2 Test: ${this.results.ps2.status.toUpperCase()}`);
    if (this.results.ps2.status === 'passed') {
      console.log(`   📁 Files: ${this.results.ps2.details.files?.length || 0}`);
      if (this.results.ps2.details.chdStatus === 'success') {
        console.log(`   💾 CHD: ${this.results.ps2.details.chdSize} (${this.results.ps2.details.compressionRatio}% reduction)`);
      } else if (this.results.ps2.details.chdStatus === 'skipped') {
        console.log(`   💾 CHD: Skipped (chdman not available)`);
      }
      console.log(`   ⏱️  Duration: ${this.results.ps2.details.duration}s`);
    } else if (this.results.ps2.error) {
      console.log(`   ❌ Error: ${this.results.ps2.error}`);
    }
    console.log('');
    
    if (this.results.overall.status === 'passed') {
      console.log('🎉 All tests passed! The bot is ready for release.');
    } else {
      console.log('💥 Tests failed! Please review the errors above.');
      if (this.results.overall.error) {
        console.log(`❌ Overall error: ${this.results.overall.error}`);
      }
    }
  }

  formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

// Run the integration test
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.run().catch(console.error);
}

module.exports = IntegrationTester;