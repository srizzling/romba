import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { Game, SearchResult } from '../types/index.js';
import { CacheService } from './cache.js';

const VIMMS_BASE_URL = 'https://vimm.net';

export class VimmsService {
  private cache = new CacheService();
  
  /**
   * Search for games on Vimm's Lair
   */
  async searchGames(consoleSystem: string, searchTerm: string): Promise<SearchResult> {
    // Check cache first
    const cachedResult = await this.cache.get('vimms', consoleSystem, searchTerm);
    if (cachedResult) {
      return cachedResult;
    }
    try {
      // Map common console names to Vimm's system names
      const consoleMapping: { [key: string]: string } = {
        'gameboy': 'GB',
        'gb': 'GB',
        'gba': 'GBA', 
        'gbc': 'GBC',
        'nes': 'NES',
        'snes': 'SNES',
        'n64': 'N64',
        'genesis': 'Genesis',
        'megadrive': 'Genesis',
        'mastersystem': 'SMS',
        'saturn': 'Saturn',
        'dreamcast': 'Dreamcast',
        'psx': 'PS1',
        'ps1': 'PS1',
        'ps2': 'PS2',
        'ps3': 'PS3',
        'psp': 'PSP',
        'ds': 'DS',
        'nds': 'DS',
        '3ds': '3DS'
      };

      const mappedConsole = consoleMapping[consoleSystem.toLowerCase()] || consoleSystem;
      
      // Vimm's search URL structure
      const searchUrl = `${VIMMS_BASE_URL}/vault/?p=list&system=${mappedConsole}&q=${encodeURIComponent(searchTerm)}`;
      
      console.log(`Vimm's URL: ${searchUrl}`);
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RombaBot/1.0)'
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        }),
        timeout: 30000,
        validateStatus: function (status) {
          return status === 200 || status === 404; // Accept both 200 and 404 (Vimm's returns 404 for searches)
        }
      });
      
      console.log(`Vimm's response status: ${response.status}`);
      console.log(`Vimm's response data length: ${response.data.length}`);
      
      // Check for "no matches found" message
      if (response.data.includes('No matches found')) {
        console.log('No matches found message detected');
        return {
          games: [],
          totalFound: 0,
          searchTerm,
          console: mappedConsole
        };
      }
      
      const $ = cheerio.load(response.data);
      const games: Game[] = [];
      
      // Parse Vimm's Lair search results
      // Results are in table rows with vault links
      let foundRows = 0;
      $('tr').each((index, element) => {
        foundRows++;
        const $row = $(element);
        const gameLink = $row.find('a[href*="/vault/"]').first();
        const gameName = gameLink.text().trim();
        const gameUrl = gameLink.attr('href');
        
        if (gameName && gameUrl && !gameName.includes('Advanced Search')) {
          console.log(`Found game: ${gameName} at ${gameUrl}`);
          
          // Extract vault ID from URL (e.g., /vault/12345)
          const vaultId = gameUrl.match(/\/vault\/(\d+)/)?.[1];
          
          // Check if it's a demo, prototype, or unlicensed 
          // Vimm's uses .redBorder class for D (Demo), P (Prototype), U (Unlicensed) indicators
          const hasIndicators = $row.find('.redBorder').length > 0;
          const rowText = $row.text();
          const isDemoOrProto = hasIndicators && 
            (rowText.includes('Demo') || rowText.includes('Prototype') || rowText.includes('Unlicensed') ||
             gameName.toLowerCase().includes('demo') || gameName.toLowerCase().includes('prototype'));
          
          // Extract region and version info from table cells
          const cells = $row.find('td');
          let region = 'Unknown';
          let version = '1.0';
          
          if (cells.length >= 3) {
            // Second column typically contains region flags/info
            const regionCell = $(cells[1]);
            const flagImg = regionCell.find('img.flag');
            if (flagImg.length > 0) {
              region = flagImg.attr('title') || 'Unknown';
            }
            
            // Third column typically contains version
            const versionCell = $(cells[2]);
            const versionText = versionCell.text().trim();
            if (versionText && versionText !== '-' && versionText !== '') {
              version = versionText;
            }
          }
          
          console.log(`  - Demo/Proto: ${isDemoOrProto}, Region: ${region}, Version: ${version}, Vault ID: ${vaultId}`);
          
          // Skip demos, prototypes, and unlicensed games (similar to Myrient filter)
          if (!isDemoOrProto) {
            games.push({
              name: gameName,
              url: `${VIMMS_BASE_URL}${gameUrl}`,
              console: mappedConsole,
              size: 'Unknown', // Vimm's doesn't show size in search
              vaultId: vaultId, // Store for later download processing
              region: region,
              version: version
            });
          }
        }
      });
      
      console.log(`Found ${foundRows} total rows, ${games.length} valid games`);
      
      // Deduplicate and prioritize games
      const deduplicatedGames = this.deduplicateAndPrioritize(games);
      
      const result = {
        games: deduplicatedGames.slice(0, 10), // Limit results
        totalFound: deduplicatedGames.length,
        searchTerm,
        console: mappedConsole
      };
      
      // Cache the result
      await this.cache.set('vimms', consoleSystem, searchTerm, result);
      
      return result;
      
    } catch (error: any) {
      console.error(`Error searching Vimm's Lair for ${consoleSystem}:`, error.message);
      
      return {
        games: [],
        totalFound: 0,
        searchTerm,
        console: consoleSystem
      };
    }
  }

  /**
   * Get available console systems from Vimm's Lair
   */
  async getConsoles(): Promise<string[]> {
    try {
      const response = await axios.get(`${VIMMS_BASE_URL}/vault/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RombaBot/1.0)'
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        }),
        timeout: 30000
      });
      
      const $ = cheerio.load(response.data);
      const consoles: string[] = [];
      
      // Extract console list from Vimm's dropdown or navigation
      $('select[name="system"] option, .systemList a').each((_, element) => {
        const consoleName = $(element).text().trim();
        const value = $(element).attr('value') || consoleName;
        
        if (value && value !== '' && !consoles.includes(value)) {
          consoles.push(value);
        }
      });
      
      return consoles.filter(console => console.length > 0);
    } catch (error: any) {
      console.error('Error fetching Vimm\'s Lair consoles:', error.message);
      return [];
    }
  }

  /**
   * Extract download information from a vault page
   */
  async getDownloadInfo(vaultUrl: string): Promise<{ downloadUrl?: string; fileName?: string; size?: string }> {
    try {
      const response = await axios.get(vaultUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RombaBot/1.0)'
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        }),
        timeout: 30000
      });
      
      const $ = cheerio.load(response.data);
      
      // Find download link (this will need adjustment based on Vimm's structure)
      const downloadLink = $('a[href*="download"], .downloadButton').first().attr('href');
      const fileName = $('.gameTitle, h1').first().text().trim();
      const fileSize = $('.fileSize, .size').first().text().trim();
      
      return {
        downloadUrl: downloadLink ? `${VIMMS_BASE_URL}${downloadLink}` : undefined,
        fileName: fileName || 'Unknown Game',
        size: fileSize || 'Unknown'
      };
      
    } catch (error: any) {
      console.error('Error getting Vimm\'s Lair download info:', error.message);
      return {};
    }
  }

  /**
   * Deduplicate games and prioritize by region preference and highest version
   */
  private deduplicateAndPrioritize(games: Game[]): Game[] {
    // Region priority: Australia, USA, Europe, Japan, then others
    const regionPriority = ['Australia', 'USA', 'Europe', 'Japan'];
    
    // Group games by normalized name (remove version-specific suffixes)
    const gameGroups = new Map<string, Game[]>();
    
    for (const game of games) {
      // Normalize game name by removing common version indicators and region codes
      let normalizedName = game.name
        .replace(/\s*\([^)]*\)$/g, '') // Remove parenthetical suffixes like (SLES-52968)
        .replace(/\s*-\s*[^-]*$/g, '') // Remove dash suffixes
        .trim();
      
      if (!gameGroups.has(normalizedName)) {
        gameGroups.set(normalizedName, []);
      }
      gameGroups.get(normalizedName)!.push(game);
    }
    
    const deduplicatedGames: Game[] = [];
    
    // For each group, pick the best version
    for (const [gameName, gameList] of gameGroups) {
      // Sort by region preference first, then by version (highest first)
      const bestGame = gameList.sort((a, b) => {
        // First priority: region preference
        const aRegionIndex = regionPriority.indexOf(a.region || 'Unknown');
        const bRegionIndex = regionPriority.indexOf(b.region || 'Unknown');
        
        const aRegionPriority = aRegionIndex === -1 ? 999 : aRegionIndex;
        const bRegionPriority = bRegionIndex === -1 ? 999 : bRegionIndex;
        
        if (aRegionPriority !== bRegionPriority) {
          return aRegionPriority - bRegionPriority;
        }
        
        // Second priority: version (higher is better)
        const aVersion = this.parseVersion(a.version || '1.0');
        const bVersion = this.parseVersion(b.version || '1.0');
        
        return bVersion - aVersion; // Descending order (higher version first)
      })[0];
      
      deduplicatedGames.push(bestGame);
    }
    
    // Sort final results by game series order (Burnout, Burnout 2, Burnout 3, etc.)
    return deduplicatedGames.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  /**
   * Parse version string into numeric value for comparison
   */
  private parseVersion(version: string): number {
    // Handle versions like "1.0", "1.01", "2002-08-31" (dates), etc.
    if (version.includes('-')) {
      // It's a date, treat as high priority
      return 9999;
    }
    
    const parts = version.split('.').map(p => parseInt(p) || 0);
    // Convert to decimal: 1.01 -> 1.01, 1.1 -> 1.1, 1.0 -> 1.0
    return parts[0] + (parts[1] || 0) / 100 + (parts[2] || 0) / 10000;
  }
}