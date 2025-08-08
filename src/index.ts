import { 
  Client, 
  GatewayIntentBits, 
  Events, 
  REST, 
  Routes, 
  ChatInputCommandInteraction,
  ButtonInteraction,
  Interaction
} from 'discord.js';
import dotenv from 'dotenv';
import { MyrientService } from './services/myrient.js';
import { DatabaseService } from './services/database.js';
import { DownloadService } from './services/downloader.js';
import { DownloadCommand } from './commands/download.js';
import { QueueCommand } from './commands/queue.js';

// Load environment variables
dotenv.config();

class RombaBot {
  private client: Client;
  private myrient: MyrientService;
  private db: DatabaseService;
  private downloader: DownloadService;
  private downloadCommand: DownloadCommand;
  private queueCommand: QueueCommand;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    this.myrient = new MyrientService();
    this.db = new DatabaseService();
    this.downloader = new DownloadService(this.db);
    this.downloadCommand = new DownloadCommand(this.myrient, this.db, this.downloader);
    this.queueCommand = new QueueCommand(this.db, this.downloader);

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.once(Events.ClientReady, async (client) => {
      console.log(`🤖 Romba bot ready! Logged in as ${client.user.tag}`);
      
      // Initialize database
      await this.db.init();
      
      // Register slash commands
      await this.registerCommands();
      
      // Start processing queue every 30 seconds
      setInterval(() => {
        this.downloader.processQueue();
      }, 30000);
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      try {
        if (interaction.isChatInputCommand()) {
          await this.handleSlashCommand(interaction);
        } else if (interaction.isButton()) {
          await this.handleButtonInteraction(interaction);
        }
      } catch (error) {
        console.error('Interaction error:', error);
        
        const errorMessage = {
          content: '❌ An error occurred while processing your request.',
          ephemeral: true
        };

        if (interaction.isRepliable()) {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
          } else {
            await interaction.reply(errorMessage);
          }
        }
      }
    });
  }

  private async handleSlashCommand(interaction: ChatInputCommandInteraction) {
    switch (interaction.commandName) {
      case 'download':
        await this.downloadCommand.execute(interaction);
        break;
      case 'queue':
        await this.queueCommand.execute(interaction);
        break;
      case 'ping':
        await interaction.reply({
          content: `🏓 Pong! Latency: ${Date.now() - interaction.createdTimestamp}ms`,
          ephemeral: true
        });
        break;
      case 'stats':
        const stats = this.downloader.getStats();
        const settings = this.db.getSettings();
        
        await interaction.reply({
          content: `📊 **Romba Bot Stats**\n` +
                   `Total Downloads: ${stats.total}\n` +
                   `✅ Completed: ${stats.completed}\n` +
                   `⏳ Queued: ${stats.queued}\n` +
                   `📥 Active: ${stats.active}\n` +
                   `❌ Failed: ${stats.failed}\n` +
                   `📁 Download Path: ${settings.downloadPath}\n` +
                   `🔄 Max Concurrent: ${settings.maxConcurrentDownloads}`,
          ephemeral: true
        });
        break;
      default:
        await interaction.reply({
          content: '❓ Unknown command.',
          ephemeral: true
        });
    }
  }

  private async handleButtonInteraction(interaction: ButtonInteraction) {
    // Handle queue management buttons
    if (['refresh_queue', 'clear_completed', 'show_progress'].includes(interaction.customId)) {
      await this.queueCommand.handleButtonInteraction(interaction);
    }
    // Download command buttons are handled within the download command itself
  }

  private async registerCommands() {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID;
    
    if (!token || !clientId) {
      throw new Error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID environment variables');
    }

    const commands = [
      this.downloadCommand.getSlashCommand(),
      this.queueCommand.getSlashCommand(),
      {
        name: 'ping',
        description: 'Check bot latency'
      },
      {
        name: 'stats',
        description: 'Show bot statistics'
      }
    ];

    const rest = new REST({ version: '10' }).setToken(token);

    try {
      console.log('🔄 Registering slash commands...');
      
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );

      console.log('✅ Successfully registered slash commands!');
    } catch (error) {
      console.error('❌ Failed to register slash commands:', error);
    }
  }

  async start() {
    const token = process.env.DISCORD_TOKEN;
    
    if (!token) {
      throw new Error('DISCORD_TOKEN environment variable is not set');
    }

    await this.client.login(token);
  }
}

// Start the bot
const bot = new RombaBot();
bot.start().catch(error => {
  console.error('❌ Failed to start bot:', error);
  process.exit(1);
});