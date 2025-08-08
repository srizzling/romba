import axios from 'axios';
import * as cheerio from 'cheerio';
import { Game, SearchResult } from '../types/index.js';

const VIMMS_BASE_URL = 'https://vimm.net';

export class VimmsService {
  
  /**
   * Search for games on Vimm's Lair
   */
  async searchGames(consoleSystem: string, searchTerm: string): Promise<SearchResult> {
    try {
      // Map common console names to Vimm's system names
      const consoleMapping: { [key: string]: string } = {
        'gameboy': 'GameBoy',
        'gb': 'GameBoy',
        'gba': 'GameBoyAdvance', 
        'gbc': 'GameBoyColor',
        'nes': 'NES',
        'snes': 'SNES',
        'n64': 'Nintendo64',
        'genesis': 'Genesis',
        'megadrive': 'Genesis',
        'mastersystem': 'MasterSystem',
        'saturn': 'Saturn',
        'dreamcast': 'Dreamcast',
        'psx': 'PlayStation',
        'ps1': 'PlayStation'
      };

      const mappedConsole = consoleMapping[consoleSystem.toLowerCase()] || consoleSystem;
      
      // Vimm's search URL structure
      const searchUrl = `${VIMMS_BASE_URL}/vault/?p=list&system=${mappedConsole}&q=${encodeURIComponent(searchTerm)}`;
      
      console.log(`Vimm's URL: ${searchUrl}`);
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RombaBot/1.0)'
        }
      });
      
      const $ = cheerio.load(response.data);
      const games: Game[] = [];
      
      // Parse Vimm's Lair search results
      // Note: This will need to be adjusted based on actual HTML structure
      $('.searchResultTable tr').each((index, element) => {
        if (index === 0) return; // Skip header row
        
        const $row = $(element);
        const gameLink = $row.find('a[href*="/vault/"]').first();
        const gameName = gameLink.text().trim();
        const gameUrl = gameLink.attr('href');
        
        if (gameName && gameUrl) {
          // Extract vault ID from URL (e.g., /vault/12345)
          const vaultId = gameUrl.match(/\/vault\/(\d+)/)?.[1];
          
          games.push({
            name: gameName,
            url: `${VIMMS_BASE_URL}${gameUrl}`,
            console: mappedConsole,
            size: 'Unknown', // Vimm's doesn't show size in search
            vaultId: vaultId // Store for later download processing
          });
        }
      });
      
      return {
        games: games.slice(0, 10), // Limit results
        totalFound: games.length,
        searchTerm,
        console: mappedConsole
      };
      
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
        }
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
        }
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
}