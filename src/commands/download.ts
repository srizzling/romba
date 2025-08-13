import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder,
  ComponentType
} from 'discord.js';
import { MyrientService } from '../services/myrient.js';
import { VimmsService } from '../services/vimms.js';
import { DatabaseService } from '../services/database.js';
import { DownloadService } from '../services/downloader.js';
import { Game } from '../types/index.js';

interface ExtendedGame extends Game {
  source: string;
}

export class DownloadCommand {
  constructor(
    private myrient: MyrientService,
    private vimms: VimmsService,
    private db: DatabaseService,
    private downloader: DownloadService
  ) {}

  getSlashCommand() {
    return new SlashCommandBuilder()
      .setName('download')
      .setDescription('Download a retro game from available sources')
      .addStringOption(option =>
        option.setName('console')
          .setDescription('Console system')
          .setRequired(true)
          .addChoices(
            { name: '🎮 Game Boy', value: 'gb' },
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
      // Search both sources in parallel
      const [myrientResult, vimmsResult] = await Promise.allSettled([
        this.myrient.searchGames(consoleSystem, gameName),
        this.vimms.searchGames(consoleSystem, gameName)
      ]);

      const allGames: ExtendedGame[] = [];
      let myrientGames: ExtendedGame[] = [];
      let vimmsGames: ExtendedGame[] = [];

      // Process Myrient results
      if (myrientResult.status === 'fulfilled' && myrientResult.value.games.length > 0) {
        myrientGames = myrientResult.value.games.map(game => ({
          ...game,
          source: 'Myrient'
        }));
        allGames.push(...myrientGames);
      }

      // Process Vimm's results
      if (vimmsResult.status === 'fulfilled' && vimmsResult.value.games.length > 0) {
        vimmsGames = vimmsResult.value.games.map(game => ({
          ...game,
          source: 'Vimm\'s Lair'
        }));
        allGames.push(...vimmsGames);
      }

      if (allGames.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#ff4444')
          .setTitle('❌ No Games Found')
          .setDescription(`No games found for "${gameName}" on ${consoleSystem.toUpperCase()} in any source.`)
          .addFields(
            { name: '🔍 Myrient', value: myrientResult.status === 'rejected' ? 'Error' : `${myrientGames.length} games`, inline: true },
            { name: '🔍 Vimm\'s Lair', value: vimmsResult.status === 'rejected' ? 'Error' : `${vimmsGames.length} games`, inline: true }
          )
          .setFooter({ text: 'Try a different search term or console' });

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Limit to 2 games per page for button UI
      const gamesPerPage = 2;
      const maxPages = Math.ceil(allGames.length / gamesPerPage);
      let currentPage = 0;

      const createEmbed = (page: number) => {
        const start = page * gamesPerPage;
        const gamesToShow = allGames.slice(start, start + gamesPerPage);

        const embed = new EmbedBuilder()
          .setColor('#00ff88')
          .setTitle(`🎮 Search Results for "${gameName}"`)
          .setDescription(`Found ${allGames.length} games across all sources`)
          .addFields(
            { name: '📚 Sources', value: `Myrient: ${myrientGames.length} | Vimm's: ${vimmsGames.length}`, inline: false }
          )
          .setFooter({ text: `Page ${page + 1} of ${maxPages} • Select a game to download` });

        gamesToShow.forEach((game, index) => {
          const gameNum = start + index + 1;
          const regionInfo = game.region ? ` (${game.region})` : '';
          const versionInfo = game.version && game.version !== '1.0' ? ` v${game.version}` : '';
          const sizeInfo = game.size && game.size !== 'Unknown' ? ` - ${game.size}` : '';
          
          // Add download URL if available
          const downloadUrl = game.url ? `\n🔗 [Direct Download](${game.url})` : '';
          
          embed.addFields({
            name: `${gameNum}. ${game.name}${regionInfo}${versionInfo}`,
            value: `📦 Source: ${game.source}${sizeInfo}${downloadUrl}`,
            inline: false
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

      const createButtons = (page: number, games: ExtendedGame[]) => {
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

      const message = await interaction.editReply({
        embeds: [embed],
        components: [row]
      });

      // Create button collector
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000 // 60 seconds
      });

      collector.on('collect', async (buttonInteraction) => {
        const [action, ...params] = buttonInteraction.customId.split('_');

        if (action === 'cancel') {
          await buttonInteraction.update({
            content: '❌ Download cancelled.',
            embeds: [],
            components: []
          });
          collector.stop();
          return;
        }

        if (action === 'prev' || action === 'next') {
          currentPage = action === 'next' ? currentPage + 1 : currentPage - 1;
          const { embed: newEmbed, gamesToShow: newGamesToShow } = createEmbed(currentPage);
          const newRow = createButtons(currentPage, newGamesToShow);
          
          await buttonInteraction.update({
            embeds: [newEmbed],
            components: [newRow]
          });
          return;
        }

        if (action === 'download') {
          const page = parseInt(params[0]);
          const index = parseInt(params[1]);
          const selectedGame = allGames[page * gamesPerPage + index];

          await buttonInteraction.update({
            content: `📥 Preparing download for **${selectedGame.name}**...`,
            embeds: [],
            components: []
          });

          try {
            // For Vimm's games, we need to get the actual download info
            if (selectedGame.source === 'Vimm\'s Lair' && selectedGame.vaultId) {
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
            }

            // Add to download queue
            const job = await this.db.addDownload(selectedGame);

            const successEmbed = new EmbedBuilder()
              .setColor('#00ff88')
              .setTitle('✅ Added to Download Queue')
              .setDescription(`**${selectedGame.name}** has been queued for download`)
              .addFields(
                { name: '🕹️ Console', value: selectedGame.console, inline: true },
                { name: '📚 Source', value: selectedGame.source, inline: true },
                { name: '🆔 Job ID', value: job.id, inline: true },
                { name: '📊 Status', value: job.status, inline: true }
              )
              .setFooter({ text: 'Use /queue to check download progress' });

            if (selectedGame.region) {
              successEmbed.addFields({ name: '🌍 Region', value: selectedGame.region, inline: true });
            }
            if (selectedGame.version && selectedGame.version !== '1.0') {
              successEmbed.addFields({ name: '📦 Version', value: selectedGame.version, inline: true });
            }

            await buttonInteraction.editReply({
              content: null,
              embeds: [successEmbed],
              components: []
            });

            // Start processing the queue
            this.downloader.processQueue();
            collector.stop();

          } catch (error) {
            console.error('Download preparation error:', error);
            await buttonInteraction.editReply({
              content: '❌ Failed to prepare download.',
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
      console.error('Download command error:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff4444')
        .setTitle('❌ Error')
        .setDescription('An error occurred while searching for games.')
        .addFields(
          { name: 'Error Details', value: error.message || 'Unknown error' }
        )
        .setFooter({ text: 'Please try again later' });

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
}