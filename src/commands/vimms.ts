import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import { VimmsService } from '../services/vimms.js';
import { DatabaseService } from '../services/database.js';
import { DownloadService } from '../services/downloader.js';

export class VimmsCommand {
  constructor(
    private vimms: VimmsService,
    private db: DatabaseService,
    private downloader: DownloadService
  ) {}

  getSlashCommand() {
    return new SlashCommandBuilder()
      .setName('vm')
      .setDescription('Download a retro game from Vimm\'s Lair (alternative source)')
      .addStringOption(option =>
        option.setName('console')
          .setDescription('Console system')
          .setRequired(true)
          .addChoices(
            { name: '🎮 Game Boy', value: 'gameboy' },
            { name: '🎨 Game Boy Color', value: 'gbc' },
            { name: '⚡ Game Boy Advance', value: 'gba' },
            { name: '📱 Nintendo DS', value: 'ds' },
            { name: '📱 Nintendo 3DS', value: '3ds' },
            { name: '🕹️ NES (Nintendo Entertainment System)', value: 'nes' },
            { name: '🎯 SNES (Super Nintendo)', value: 'snes' },
            { name: '🎮 Nintendo 64', value: 'n64' },
            { name: '🦔 Genesis/Mega Drive', value: 'genesis' },
            { name: '🎪 Master System', value: 'mastersystem' },
            { name: '🪐 Saturn', value: 'saturn' },
            { name: '🌙 Dreamcast', value: 'dreamcast' },
            { name: '💿 PlayStation', value: 'psx' },
            { name: '💽 PlayStation 2', value: 'ps2' },
            { name: '💾 PlayStation 3', value: 'ps3' },
            { name: '📀 PlayStation Portable', value: 'psp' }
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
      // Search for games on Vimm's Lair
      const searchResult = await this.vimms.searchGames(consoleSystem, gameName);
      
      console.log(`Vimm's search result for ${consoleSystem} "${gameName}":`, searchResult);

      if (searchResult.games.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#ff4444')
          .setTitle('❌ No Games Found')
          .setDescription(`No games found for "${gameName}" on ${consoleSystem} at Vimm's Lair`)
          .setFooter({ text: 'Try different search terms or use /my for Myrient search' });

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Pagination setup (same as Myrient command)
      const gamesPerPage = 2; 
      let currentPage = 0;
      const maxPages = Math.ceil(searchResult.games.length / gamesPerPage);

      const createEmbed = (page: number) => {
        const start = page * gamesPerPage;
        const end = start + gamesPerPage;
        const gamesToShow = searchResult.games.slice(start, end);
        
        const embed = new EmbedBuilder()
          .setColor('#9932cc') // Purple for Vimm's Lair
          .setTitle(`🏛️ Vimm's Lair Results for "${gameName}"`)
          .setDescription(`Found ${searchResult.totalFound} games on ${consoleSystem}\n⚠️ *Alternative source - may be slower*`)
          .setFooter({ text: `Page ${page + 1}/${maxPages} • Showing ${start + 1}-${Math.min(end, searchResult.games.length)} of ${searchResult.totalFound}` });

        gamesToShow.forEach((game, index) => {
          embed.addFields({
            name: `${start + index + 1}. ${game.name}`,
            value: `Vault: ${game.vaultId || 'Unknown'} • Size: ${game.size || 'Unknown'}`,
            inline: true
          });
        });

        return { embed, gamesToShow };
      };

      // Create initial embed
      const { embed, gamesToShow } = createEmbed(currentPage);

      if (gamesToShow.length === 0) {
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const createButtons = (page: number, games: any[]) => {
        const buttons = games.map((_, index) => 
          new ButtonBuilder()
            .setCustomId(`vimms_download_${page}_${index}`)
            .setLabel(`${page * gamesPerPage + index + 1}`)
            .setStyle(ButtonStyle.Primary)
        );

        // Add navigation buttons
        if (page > 0) {
          buttons.push(
            new ButtonBuilder()
              .setCustomId(`vimms_prev_${page}`)
              .setLabel('◀️ Previous')
              .setStyle(ButtonStyle.Secondary)
          );
        }

        if (page < maxPages - 1) {
          buttons.push(
            new ButtonBuilder()
              .setCustomId(`vimms_next_${page}`)
              .setLabel('Next ▶️')
              .setStyle(ButtonStyle.Secondary)
          );
        }

        // Add cancel button
        buttons.push(
          new ButtonBuilder()
            .setCustomId('vimms_cancel')
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

      // Handle button interactions (similar to Myrient command)
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000 // 5 minutes timeout
      });

      collector.on('collect', async (buttonInteraction) => {
        const customId = buttonInteraction.customId;

        if (customId === 'vimms_cancel') {
          await buttonInteraction.update({
            content: '❌ Download cancelled.',
            embeds: [],
            components: []
          });
          collector.stop();
          return;
        }

        // Handle navigation
        if (customId.startsWith('vimms_next_')) {
          currentPage++;
          const { embed: newEmbed, gamesToShow: newGamesToShow } = createEmbed(currentPage);
          const newRow = createButtons(currentPage, newGamesToShow);
          
          await buttonInteraction.update({
            embeds: [newEmbed],
            components: [newRow]
          });
          return;
        }

        if (customId.startsWith('vimms_prev_')) {
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
        if (customId.startsWith('vimms_download_')) {
          const [, , pageStr, indexStr] = customId.split('_');
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

          // Show processing message for Vimm's Lair
          await buttonInteraction.update({
            content: '🏛️ Preparing download from Vimm\'s Lair...',
            embeds: [],
            components: []
          });

          try {
            // Get actual download info from vault page
            const downloadInfo = await this.vimms.getDownloadInfo(selectedGame.url);
            
            if (!downloadInfo.downloadUrl) {
              await buttonInteraction.editReply({
                content: '❌ Could not find download link for this game.',
                embeds: [],
                components: []
              });
              collector.stop();
              return;
            }

            // Update game object with actual download URL
            selectedGame.url = downloadInfo.downloadUrl;
            selectedGame.name = downloadInfo.fileName || selectedGame.name;
            selectedGame.size = downloadInfo.size || selectedGame.size;

            // Add to download queue
            const job = await this.db.addDownload(selectedGame);

            const successEmbed = new EmbedBuilder()
              .setColor('#9932cc')
              .setTitle('✅ Added to Download Queue')
              .setDescription(`**${selectedGame.name}** has been queued for download from Vimm's Lair`)
              .addFields(
                { name: 'Console', value: selectedGame.console, inline: true },
                { name: 'Source', value: 'Vimm\'s Lair', inline: true },
                { name: 'Job ID', value: job.id, inline: true },
                { name: 'Status', value: job.status, inline: true }
              )
              .setFooter({ text: 'Use /queue to check download progress' });

            await buttonInteraction.editReply({
              content: null,
              embeds: [successEmbed],
              components: []
            });

            // Start processing the queue
            this.downloader.processQueue();
            collector.stop();

          } catch (error) {
            console.error('Vimm\'s Lair download error:', error);
            await buttonInteraction.editReply({
              content: '❌ Failed to prepare download from Vimm\'s Lair.',
              embeds: [],
              components: []
            });
            collector.stop();
          }
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
      console.error('Vimm\'s Lair command error:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff4444')
        .setTitle('❌ Error')
        .setDescription('An error occurred while searching Vimm\'s Lair.')
        .setFooter({ text: 'Try /my command for Myrient instead' });

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
}