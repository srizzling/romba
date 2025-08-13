#!/usr/bin/env node

/**
 * Simplified Discord Integration Test for Romba Bot
 * 
 * This test:
 * - Starts the actual bot process
 * - Connects to Discord
 * - Sends real slash commands
 * - Monitors responses
 * - Verifies downloads
 */

const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');

// Load environment variables
require('dotenv').config();

const TEST_DIR = path.join(process.cwd(), 'discord-test-downloads');

class SimpleDiscordTester {
  constructor() {
    this.botProcess = null;
    this.testClient = null;
  }

  async run() {
    console.log('🤖 Simplified Discord Integration Test');
    console.log('======================================');
    console.log('');

    try {
      // Validate environment
      this.validateEnvironment();
      
      // Setup test environment
      await this.setup();
      
      // Start the bot
      console.log('🚀 Starting Romba bot...');
      await this.startBot();
      
      // Give bot time to connect
      console.log('⏳ Waiting for bot to initialize...');
      await this.sleep(5000);
      
      // Connect test client
      console.log('🔗 Connecting test client...');
      await this.connectTestClient();
      
      // Run tests
      console.log('🧪 Running tests...');
      await this.runTests();
      
      // Cleanup
      await this.cleanup();
      
      console.log('\\n✅ All tests completed successfully!');
      process.exit(0);
      
    } catch (error) {
      console.error('\\n❌ Test failed:', error.message);
      await this.cleanup();
      process.exit(1);
    }
  }

  validateEnvironment() {
    if (!process.env.DISCORD_TOKEN) {
      throw new Error('Missing DISCORD_TOKEN in .env file');
    }
    if (!process.env.TEST_DISCORD_CHANNEL_ID) {
      throw new Error('Missing TEST_DISCORD_CHANNEL_ID in .env file');
    }
  }

  async setup() {
    // Clean test directory
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
    
    // Set download path for test
    process.env.DOWNLOAD_PATH = TEST_DIR;
  }

  async startBot() {
    return new Promise((resolve, reject) => {
      // Start the bot using tsx
      this.botProcess = spawn('pnpm', ['dev'], {
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let botReady = false;

      this.botProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('BOT:', output.trim());
        
        if (output.includes('Ready!') || output.includes('logged in')) {
          botReady = true;
          resolve();
        }
      });

      this.botProcess.stderr.on('data', (data) => {
        console.error('BOT ERROR:', data.toString());
      });

      this.botProcess.on('error', (error) => {
        reject(new Error(`Failed to start bot: ${error.message}`));
      });

      // Timeout if bot doesn't start
      setTimeout(() => {
        if (!botReady) {
          reject(new Error('Bot failed to start within 30 seconds'));
        }
      }, 30000);
    });
  }

  async connectTestClient() {
    this.testClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    await this.testClient.login(process.env.DISCORD_TOKEN);
    console.log('✅ Test client connected');
  }

  async runTests() {
    const channel = await this.testClient.channels.fetch(process.env.TEST_DISCORD_CHANNEL_ID);
    
    console.log('\\n📝 Test 1: Sending test message...');
    await channel.send('🧪 **Integration Test**: Testing Romba bot functionality');
    
    console.log('📝 Test 2: Testing slash command...');
    await channel.send('/download console:gba game:mario');
    
    // Wait for bot to process
    await this.sleep(3000);
    
    console.log('📝 Test 3: Checking download directory...');
    const files = await fs.readdir(TEST_DIR, { recursive: true });
    console.log('Files created:', files);
    
    if (files.length === 0) {
      throw new Error('No files were downloaded');
    }
    
    console.log('✅ Downloads verified!');
  }

  async cleanup() {
    console.log('\\n🧹 Cleaning up...');
    
    // Disconnect test client
    if (this.testClient) {
      this.testClient.destroy();
    }
    
    // Stop bot process
    if (this.botProcess) {
      this.botProcess.kill('SIGTERM');
      // Give it time to shut down gracefully
      await this.sleep(2000);
      if (!this.botProcess.killed) {
        this.botProcess.kill('SIGKILL');
      }
    }
    
    // Clean test files
    await fs.remove(TEST_DIR);
    
    console.log('✅ Cleanup completed');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the test
if (require.main === module) {
  const tester = new SimpleDiscordTester();
  tester.run().catch(console.error);
}

module.exports = SimpleDiscordTester;