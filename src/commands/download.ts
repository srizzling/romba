import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import { MyrientService } from '../services/myrient.js';
import { DatabaseService } from '../services/database.js';
import { DownloadService } from '../services/downloader.js';

export class DownloadCommand {
  constructor(
    private myrient: MyrientService,
    private db: DatabaseService,
    private downloader: DownloadService
  ) {}

  getSlashCommand() {
    return new SlashCommandBuilder()
      .setName('download')
      .setDescription('Download a retro game from Myrient')
      .addStringOption(option =>
        option.setName('console')
          .setDescription('Console system')
          .setRequired(true)
          .addChoices(
            { name: '🎮 Game Boy', value: 'gb' },
            { name: '🎨 Game Boy Color', value: 'gbc' },
            { name: '⚡ Game Boy Advance', value: 'gba' },
            { name: '🕹️ NES (Nintendo Entertainment System)', value: 'nes' },
            { name: '🎯 SNES (Super Nintendo)', value: 'snes' },
            { name: '🎮 Nintendo 64', value: 'n64' },
            { name: '🦔 Genesis/Mega Drive', value: 'genesis' },
            { name: '🎪 Master System', value: 'mastersystem' },
            { name: '🪐 Saturn', value: 'saturn' },
            { name: '🌙 Dreamcast', value: 'dreamcast' },
            { name: '💿 PlayStation', value: 'psx' }
          )
      )
      .addStringOption(option =>
        option.setName('game')
          .setDescription('Game name to search for')
          .setRequired(true)
      );
  }

  async execute(interaction: ChatInputCommandInteraction) {
    const consoleSystem = interaction.options.getString('console', true).toLowerCase();
    const gameName = interaction.options.getString('game', true);

    await interaction.deferReply();

    try {
      // Search for games
      const searchResult = await this.myrient.searchGames(consoleSystem, gameName);
      
      console.log(`Search result for ${consoleSystem} "${gameName}":`, searchResult);

      if (searchResult.games.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#ff4444')
          .setTitle('❌ No Games Found')
          .setDescription(`No games found for "${gameName}" on ${consoleSystem}`)
          .setFooter({ text: 'Try different search terms or console name' });

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Pagination setup
      const gamesPerPage = 2; // 2 games + prev + next + cancel = 5 buttons max
      let currentPage = 0;
      const maxPages = Math.ceil(searchResult.games.length / gamesPerPage);

      const createEmbed = (page: number) => {
        const start = page * gamesPerPage;
        const end = start + gamesPerPage;
        const gamesToShow = searchResult.games.slice(start, end);
        
        const embed = new EmbedBuilder()
          .setColor('#4488ff')
          .setTitle(`🎮 Search Results for "${gameName}"`)
          .setDescription(`Found ${searchResult.totalFound} games on ${consoleSystem}`)
          .setFooter({ text: `Page ${page + 1}/${maxPages} • Showing ${start + 1}-${Math.min(end, searchResult.games.length)} of ${searchResult.totalFound}` });

        gamesToShow.forEach((game, index) => {
          embed.addFields({
            name: `${start + index + 1}. ${game.name}`,
            value: game.size ? `Size: ${game.size}` : 'Size: Unknown',
            inline: true
          });
        });

        return { embed, gamesToShow };
      };

      // Create initial embed
      const { embed, gamesToShow } = createEmbed(currentPage);
      console.log(`Games to show: ${gamesToShow.length}`, gamesToShow);

      // Only create buttons if we have games to show
      if (gamesToShow.length === 0) {
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const createButtons = (page: number, games: any[]) => {
        const buttons = games.map((_, index) => 
          new ButtonBuilder()
            .setCustomId(`download_${page}_${index}`)
            .setLabel(`${page * gamesPerPage + index + 1}`)
            .setStyle(ButtonStyle.Primary)
        );

        // Add navigation buttons
        if (page > 0) {
          buttons.push(
            new ButtonBuilder()
              .setCustomId(`prev_${page}`)
              .setLabel('◀️ Previous')
              .setStyle(ButtonStyle.Secondary)
          );
        }

        if (page < maxPages - 1) {
          buttons.push(
            new ButtonBuilder()
              .setCustomId(`next_${page}`)
              .setLabel('Next ▶️')
              .setStyle(ButtonStyle.Secondary)
          );
        }

        // Add cancel button
        buttons.push(
          new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('❌')
            .setStyle(ButtonStyle.Danger)
        );

        return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
      };

      const row = createButtons(currentPage, gamesToShow);

      const response = await interaction.editReply({
        embeds: [embed],
        components: [row]
      });

      // Handle button interactions with pagination
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000 // 5 minutes timeout
      });

      collector.on('collect', async (buttonInteraction) => {
        const customId = buttonInteraction.customId;

        if (customId === 'cancel') {
          await buttonInteraction.update({
            content: '❌ Download cancelled.',
            embeds: [],
            components: []
          });
          collector.stop();
          return;
        }

        // Handle navigation
        if (customId.startsWith('next_')) {
          currentPage++;
          const { embed: newEmbed, gamesToShow: newGamesToShow } = createEmbed(currentPage);
          const newRow = createButtons(currentPage, newGamesToShow);
          
          await buttonInteraction.update({
            embeds: [newEmbed],
            components: [newRow]
          });
          return;
        }

        if (customId.startsWith('prev_')) {
          currentPage--;
          const { embed: newEmbed, gamesToShow: newGamesToShow } = createEmbed(currentPage);
          const newRow = createButtons(currentPage, newGamesToShow);
          
          await buttonInteraction.update({
            embeds: [newEmbed],
            components: [newRow]
          });
          return;
        }

        // Handle game selection
        if (customId.startsWith('download_')) {
          const [, pageStr, indexStr] = customId.split('_');
          const page = parseInt(pageStr);
          const index = parseInt(indexStr);
          const gameIndex = page * gamesPerPage + index;
          const selectedGame = searchResult.games[gameIndex];

          if (!selectedGame) {
            await buttonInteraction.update({
              content: '❌ Invalid selection.',
              embeds: [],
              components: []
            });
            collector.stop();
            return;
          }

          // Add to download queue
          const job = await this.db.addDownload(selectedGame);

          const successEmbed = new EmbedBuilder()
            .setColor('#44ff44')
            .setTitle('✅ Added to Download Queue')
            .setDescription(`**${selectedGame.name}** has been queued for download`)
            .addFields(
              { name: 'Console', value: selectedGame.console, inline: true },
              { name: 'Job ID', value: job.id, inline: true },
              { name: 'Status', value: job.status, inline: true }
            )
            .setFooter({ text: 'Use /queue to check download progress' });

          await buttonInteraction.update({
            embeds: [successEmbed],
            components: []
          });

          // Start processing the queue
          this.downloader.processQueue();
          collector.stop();
        }
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
          await interaction.editReply({
            content: '⏰ Selection timed out. Please try the command again.',
            embeds: [],
            components: []
          });
        }
      });

    } catch (error: any) {
      console.error('Download command error:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff4444')
        .setTitle('❌ Error')
        .setDescription('An error occurred while searching for games.')
        .setFooter({ text: 'Please try again later' });

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
}