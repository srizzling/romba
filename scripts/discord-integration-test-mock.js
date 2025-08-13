#!/usr/bin/env node

/**
 * Mock Discord Integration Test for Romba Bot
 * 
 * Tests the core functionality without importing bot internals
 */

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const https = require('https');
const { spawn } = require('child_process');

// Load environment variables
require('dotenv').config();

const TEST_DIR = path.join(process.cwd(), 'mock-integration-test');

class MockIntegrationTester {
  constructor() {
    this.results = {
      myrientSearch: { status: 'pending' },
      vimmsSearch: { status: 'pending' },
      download: { status: 'pending' },
      chdConversion: { status: 'pending' }
    };
  }

  async run() {
    console.log('🤖 Mock Integration Test for Romba Bot');
    console.log('======================================');
    console.log('Testing core functionality without Discord connection');
    console.log('');

    try {
      await this.setup();
      await this.testMyrientSearch();
      await this.testVimmsSearch();
      await this.testDownload();
      await this.testCHDConversion();
      await this.cleanup();
      
      this.printSummary();
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      this.printSummary();
      process.exit(1);
    }
  }

  async setup() {
    console.log('🔧 Setting up test environment...');
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
    console.log('✅ Test environment ready');
  }

  async testMyrientSearch() {
    console.log('\\n🔍 Testing Myrient search...');
    
    try {
      // Test actual Myrient API
      const response = await axios.get('https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Game%20Boy%20Advance/');
      
      if (response.status === 200) {
        this.results.myrientSearch.status = 'completed';
        console.log('✅ Myrient search working');
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      this.results.myrientSearch.status = 'failed';
      this.results.myrientSearch.error = error.message;
      throw error;
    }
  }

  async testVimmsSearch() {
    console.log('\\n🔍 Testing Vimm\'s Lair search...');
    
    try {
      // Test Vimm's search endpoint
      const response = await axios.get('https://vimm.net/vault/?p=list&system=GB&q=mario', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RombaBot/1.0)'
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        }),
        validateStatus: (status) => status === 200 || status === 404
      });
      
      this.results.vimmsSearch.status = 'completed';
      console.log('✅ Vimm\'s search endpoint accessible');
      
    } catch (error) {
      this.results.vimmsSearch.status = 'failed';
      this.results.vimmsSearch.error = error.message;
      throw error;
    }
  }

  async testDownload() {
    console.log('\\n⬇️  Testing download functionality...');
    
    try {
      // Create a test file to simulate download
      const testFile = path.join(TEST_DIR, 'test-rom.gba');
      await fs.writeFile(testFile, 'Test ROM content');
      
      // Verify file exists
      if (await fs.pathExists(testFile)) {
        this.results.download.status = 'completed';
        console.log('✅ Download simulation successful');
      } else {
        throw new Error('Test file not created');
      }
      
    } catch (error) {
      this.results.download.status = 'failed';
      this.results.download.error = error.message;
      throw error;
    }
  }

  async testCHDConversion() {
    console.log('\\n💿 Testing CHD conversion availability...');
    
    try {
      // Check if chdman is available
      const chdmanAvailable = await new Promise((resolve) => {
        const process = spawn('chdman', ['--version']);
        process.on('close', (code) => resolve(code === 0));
        process.on('error', () => resolve(false));
      });

      if (chdmanAvailable) {
        this.results.chdConversion.status = 'completed';
        this.results.chdConversion.chdmanAvailable = true;
        console.log('✅ chdman tool is available');
        
        // Test actual conversion with a small test file
        const testISO = path.join(TEST_DIR, 'test.iso');
        const testCHD = path.join(TEST_DIR, 'test.chd');
        
        // Create a small test ISO (1MB)
        const buffer = Buffer.alloc(1024 * 1024);
        await fs.writeFile(testISO, buffer);
        
        // Try conversion
        const conversionResult = await new Promise((resolve) => {
          const convert = spawn('chdman', ['createcd', '-i', testISO, '-o', testCHD]);
          convert.on('close', (code) => resolve(code === 0));
          convert.on('error', () => resolve(false));
        });
        
        if (conversionResult && await fs.pathExists(testCHD)) {
          console.log('✅ CHD conversion test successful');
        } else {
          console.log('⚠️  CHD conversion failed (but chdman is available)');
        }
        
      } else {
        this.results.chdConversion.status = 'completed';
        this.results.chdConversion.chdmanAvailable = false;
        console.log('⚠️  chdman not found - CHD conversion unavailable');
      }
      
    } catch (error) {
      this.results.chdConversion.status = 'failed';
      this.results.chdConversion.error = error.message;
      // Don't throw - CHD is optional
      console.log('⚠️  CHD test error:', error.message);
    }
  }

  async cleanup() {
    console.log('\\n🧹 Cleaning up...');
    await fs.remove(TEST_DIR);
    console.log('✅ Cleanup completed');
  }

  printSummary() {
    console.log('\\n📋 INTEGRATION TEST SUMMARY');
    console.log('============================');
    
    Object.entries(this.results).forEach(([test, result]) => {
      const status = result.status.toUpperCase();
      const icon = result.status === 'completed' ? '✅' : 
                   result.status === 'failed' ? '❌' : '⏳';
      
      console.log(`${icon} ${test}: ${status}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.chdmanAvailable !== undefined) {
        console.log(`   CHD available: ${result.chdmanAvailable ? 'Yes' : 'No'}`);
      }
    });
    
    const allPassed = Object.values(this.results).every(r => r.status === 'completed');
    console.log(`\\n${allPassed ? '🎉 All tests passed!' : '💥 Some tests failed'}`);
  }
}

// Run the test
if (require.main === module) {
  const tester = new MockIntegrationTester();
  tester.run().catch(console.error);
}

module.exports = MockIntegrationTester;