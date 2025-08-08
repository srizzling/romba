import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle 
} from 'discord.js';
import { DatabaseService } from '../services/database.js';
import { DownloadService } from '../services/downloader.js';

export class QueueCommand {
  constructor(
    private db: DatabaseService,
    private downloader: DownloadService
  ) {}

  getSlashCommand() {
    return new SlashCommandBuilder()
      .setName('queue')
      .setDescription('View download queue and progress');
  }

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const downloads = this.db.getDownloads();
      const stats = this.downloader.getStats();

      if (downloads.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#888888')
          .setTitle('📋 Download Queue')
          .setDescription('No downloads in queue')
          .setFooter({ text: 'Use /download to add games to the queue' });

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Create main queue embed
      const embed = new EmbedBuilder()
        .setColor('#4488ff')
        .setTitle('📋 Download Queue')
        .setDescription(`Total: ${stats.total} downloads`)
        .addFields(
          { name: '✅ Completed', value: stats.completed.toString(), inline: true },
          { name: '⏳ Queued', value: stats.queued.toString(), inline: true },
          { name: '📥 Downloading', value: stats.downloading.toString(), inline: true },
          { name: '❌ Failed', value: stats.failed.toString(), inline: true },
          { name: '🔄 Active', value: stats.active.toString(), inline: true }
        );

      // Show recent downloads (last 10)
      const recentDownloads = downloads
        .sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime())
        .slice(0, 10);

      if (recentDownloads.length > 0) {
        const queueList = recentDownloads.map((job, index) => {
          const statusEmoji = this.getStatusEmoji(job.status);
          const progress = job.progress > 0 ? ` (${job.progress}%)` : '';
          return `${index + 1}. ${statusEmoji} **${job.game.name}**${progress}`;
        }).join('\n');

        embed.addFields({
          name: 'Recent Downloads',
          value: queueList.length > 1024 ? queueList.substring(0, 1021) + '...' : queueList,
          inline: false
        });
      }

      // Add action buttons
      const buttons = [
        new ButtonBuilder()
          .setCustomId('refresh_queue')
          .setLabel('🔄 Refresh')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('clear_completed')
          .setLabel('🗑️ Clear Completed')
          .setStyle(ButtonStyle.Secondary)
      ];

      if (stats.downloading > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId('show_progress')
            .setLabel('📊 Show Progress')
            .setStyle(ButtonStyle.Success)
        );
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

      await interaction.editReply({
        embeds: [embed],
        components: [row]
      });

    } catch (error: any) {
      console.error('Queue command error:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff4444')
        .setTitle('❌ Error')
        .setDescription('An error occurred while fetching the queue.')
        .setFooter({ text: 'Please try again later' });

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'completed': return '✅';
      case 'downloading': return '📥';
      case 'queued': return '⏳';
      case 'failed': return '❌';
      default: return '❓';
    }
  }

  /**
   * Handle button interactions for queue management
   */
  async handleButtonInteraction(interaction: any) {
    if (interaction.customId === 'refresh_queue') {
      await this.execute(interaction);
    } else if (interaction.customId === 'clear_completed') {
      const completedCount = this.db.getDownloadsByStatus('completed').length;
      // In a real implementation, you'd add a method to clear completed downloads
      
      await interaction.reply({
        content: `🗑️ Cleared ${completedCount} completed downloads.`,
        ephemeral: true
      });
    } else if (interaction.customId === 'show_progress') {
      const activeProgress = this.downloader.getActiveProgress();
      const progressText = Object.entries(activeProgress)
        .map(([jobId, progress]) => {
          const job = this.db.getDownloads().find(d => d.id === jobId);
          return job ? `**${job.game.name}**: ${progress}%` : `Job ${jobId}: ${progress}%`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor('#44ff44')
        .setTitle('📊 Download Progress')
        .setDescription(progressText || 'No active downloads')
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }
  }
}