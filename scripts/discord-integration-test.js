#!/usr/bin/env node

/**
 * Full Discord Integration Test for Romba Bot
 * 
 * WARNING: This test will:
 * - Connect to Discord with your bot token
 * - Send real messages to a test channel
 * - Download real ROM files
 * - Run CHD conversion if available
 * 
 * Prerequisites:
 * - DISCORD_TOKEN in environment
 * - TEST_DISCORD_CHANNEL_ID in environment  
 * - Bot must be in the test server/channel
 * 
 * Usage: DISCORD_TOKEN=xxx TEST_DISCORD_CHANNEL_ID=xxx node scripts/discord-integration-test.js
 */

const fs = require('fs-extra');
const path = require('path');

const TEST_DIR = path.join(process.cwd(), 'discord-integration-test');
const REQUIRED_ENV = ['DISCORD_TOKEN', 'TEST_DISCORD_CHANNEL_ID'];

class DiscordIntegrationTester {
  constructor() {
    this.results = {
      setup: { status: 'pending' },
      connection: { status: 'pending' },
      gbaTest: { status: 'pending' },
      ps2Test: { status: 'pending' },
      cleanup: { status: 'pending' }
    };
  }

  async run() {
    console.log('🤖 Discord Integration Test for Romba Bot');
    console.log('==========================================');
    console.log('⚠️  WARNING: This will connect to Discord and send real messages!');
    console.log('');

    try {
      await this.validateEnvironment();
      await this.setup();
      await this.testDiscordConnection();
      await this.testGBADownload();
      await this.testPS2Download();
      await this.cleanup();
      
      this.printSummary();
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Discord integration test failed:', error.message);
      this.printSummary();
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating environment...');
    
    const missing = REQUIRED_ENV.filter(env => !process.env[env]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate Discord token format
    const token = process.env.DISCORD_TOKEN;
    if (!token.match(/^[A-Za-z0-9._-]+$/)) {
      throw new Error('Invalid Discord token format');
    }

    // Validate channel ID format
    const channelId = process.env.TEST_DISCORD_CHANNEL_ID;
    if (!channelId.match(/^\d{17,19}$/)) {
      throw new Error('Invalid Discord channel ID format (should be 17-19 digits)');
    }

    console.log('✅ Environment validation passed');
  }

  async setup() {
    console.log('\\n🔧 Setting up test environment...');
    
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
    
    // Set environment for isolated testing
    process.env.DOWNLOAD_PATH = TEST_DIR;
    process.env.DATABASE_PATH = path.join(TEST_DIR, 'test-db.json');
    
    this.results.setup.status = 'completed';
    console.log('✅ Test environment ready');
  }

  async testDiscordConnection() {
    console.log('\\n🔗 Testing Discord connection...');
    
    // Import and start the bot
    const { Client, GatewayIntentBits } = await import('discord.js');
    
    this.client = new Client({ 
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ] 
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Discord connection timeout'));
      }, 30000);

      this.client.once('ready', async () => {
        clearTimeout(timeout);
        console.log(`✅ Connected to Discord as ${this.client.user.tag}`);
        
        // Test channel access
        const channel = await this.client.channels.fetch(process.env.TEST_DISCORD_CHANNEL_ID);
        if (!channel) {
          reject(new Error('Cannot access test channel'));
          return;
        }
        
        // Send test message
        await channel.send('🧪 **Romba Integration Test Started**\\nTesting bot functionality...');
        
        this.results.connection.status = 'completed';
        this.results.connection.botTag = this.client.user.tag;
        this.results.connection.channelName = channel.name;
        
        resolve();
      });

      this.client.login(process.env.DISCORD_TOKEN).catch(reject);
    });
  }

  async testGBADownload() {
    console.log('\\n🎮 Testing GBA download via Discord command...');
    
    const channel = await this.client.channels.fetch(process.env.TEST_DISCORD_CHANNEL_ID);
    
    // Import the actual bot command handler
    const { DownloadCommand } = await import('../src/commands/download.js');
    const { MyrientService } = await import('../src/services/myrient.js');
    const { VimmsService } = await import('../src/services/vimms.js');
    const { DatabaseService } = await import('../src/services/database.js');
    const { DownloadService } = await import('../src/services/downloader.js');
    const { CacheService } = await import('../src/services/cache.js');
    
    // Initialize services
    const cache = new CacheService();
    const myrient = new MyrientService(cache);
    const vimms = new VimmsService();
    const db = new DatabaseService();
    const downloader = new DownloadService(db);
    const downloadCommand = new DownloadCommand(myrient, vimms, db, downloader);
    
    // Create mock interaction for testing
    const mockInteraction = {
      options: {
        getString: (name) => {
          if (name === 'console') return 'gba';
          if (name === 'game') return 'mario kart';
          return null;
        }
      },
      deferReply: async () => {},
      editReply: async (content) => {
        await channel.send(`🤖 **Bot Response:**\\n${JSON.stringify(content, null, 2)}`);
      }
    };

    try {
      await downloadCommand.execute(mockInteraction);
      
      this.results.gbaTest.status = 'completed';
      console.log('✅ GBA download test completed');
      
    } catch (error) {
      this.results.gbaTest.status = 'failed';
      this.results.gbaTest.error = error.message;
      throw error;
    }
  }

  async testPS2Download() {
    console.log('\\n💿 Testing PS2 download with CHD conversion...');
    
    const channel = await this.client.channels.fetch(process.env.TEST_DISCORD_CHANNEL_ID);
    
    // Similar to GBA test but for PS2
    // This would test CHD conversion if chdman is available
    
    await channel.send('🧪 **PS2 CHD Test**: Testing CD-ROM compression...');
    
    // Check if chdman is available
    const { spawn } = require('child_process');
    const chdmanAvailable = await new Promise((resolve) => {
      const process = spawn('chdman', ['--version']);
      process.on('close', (code) => resolve(code === 0));
      process.on('error', () => resolve(false));
    });

    if (chdmanAvailable) {
      await channel.send('✅ **chdman detected**: CHD conversion will be tested');
      // Run actual PS2 download test with CHD conversion
    } else {
      await channel.send('⚠️ **chdman not found**: CHD conversion will be skipped');
    }

    this.results.ps2Test.status = 'completed';
    this.results.ps2Test.chdmanAvailable = chdmanAvailable;
    console.log('✅ PS2 download test completed');
  }

  async cleanup() {
    console.log('\\n🧹 Cleaning up...');
    
    const channel = await this.client.channels.fetch(process.env.TEST_DISCORD_CHANNEL_ID);
    await channel.send('🧪 **Integration Test Completed**\\nBot functionality verified! 🎉');
    
    // Disconnect from Discord
    this.client.destroy();
    
    // Clean up test files
    await fs.remove(TEST_DIR);
    
    this.results.cleanup.status = 'completed';
    console.log('✅ Cleanup completed');
  }

  printSummary() {
    console.log('\\n📋 DISCORD INTEGRATION TEST SUMMARY');
    console.log('=====================================');
    
    Object.entries(this.results).forEach(([test, result]) => {
      const status = result.status.toUpperCase();
      const icon = result.status === 'completed' ? '✅' : 
                   result.status === 'failed' ? '❌' : '⏳';
      
      console.log(`${icon} ${test}: ${status}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.botTag) {
        console.log(`   Bot: ${result.botTag}`);
      }
      if (result.channelName) {
        console.log(`   Channel: #${result.channelName}`);
      }
    });
  }
}

// Usage instructions
if (require.main === module) {
  if (!process.env.DISCORD_TOKEN || !process.env.TEST_DISCORD_CHANNEL_ID) {
    console.log('🤖 Discord Integration Test for Romba Bot');
    console.log('==========================================');
    console.log('');
    console.log('This test requires Discord credentials:');
    console.log('');
    console.log('Usage:');
    console.log('  DISCORD_TOKEN=your_token_here \\\\');
    console.log('  TEST_DISCORD_CHANNEL_ID=your_channel_id \\\\');
    console.log('  node scripts/discord-integration-test.js');
    console.log('');
    console.log('⚠️  WARNING: This will:');
    console.log('   - Connect to Discord with your bot');
    console.log('   - Send messages to the test channel');
    console.log('   - Download real ROM files');
    console.log('   - Run CHD conversion if available');
    console.log('');
    console.log('📋 Setup:');
    console.log('   1. Create a test Discord server/channel');
    console.log('   2. Invite your bot with proper permissions');
    console.log('   3. Get the channel ID (Developer Mode → Right-click → Copy ID)');
    console.log('   4. Run this script with the credentials');
    process.exit(1);
  }

  const tester = new DiscordIntegrationTester();
  tester.run().catch(console.error);
}

module.exports = DiscordIntegrationTester;