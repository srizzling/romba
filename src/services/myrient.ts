import axios from 'axios';
import * as cheerio from 'cheerio';
import { Game, MyrientDirectory, SearchResult } from '../types/index.js';

const MYRIENT_BASE_URL = 'https://myrient.erista.me';

export class MyrientService {
  
  /**
   * Get available console systems
   */
  async getConsoles(): Promise<string[]> {
    try {
      const response = await axios.get(`${MYRIENT_BASE_URL}/files/`);
      const $ = cheerio.load(response.data);
      
      const consoles: string[] = [];
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (href && href.endsWith('/') && !href.startsWith('..')) {
          const consoleName = href.replace('/', '');
          if (consoleName && !consoleName.includes('Parent Directory')) {
            consoles.push(consoleName);
          }
        }
      });
      
      return consoles.filter(console => 
        // Filter for common retro consoles
        ['Nintendo', 'Sega', 'Sony', 'Atari', 'SNK', 'NEC'].some(brand => 
          console.toLowerCase().includes(brand.toLowerCase())
        ) || 
        ['NES', 'SNES', 'N64', 'GameBoy', 'DS', 'Genesis', 'Saturn', 'Dreamcast', 
         'PlayStation', 'PSP', '32X', 'Game Gear'].some(system =>
          console.toLowerCase().includes(system.toLowerCase())
        )
      );
    } catch (error: any) {
      console.error('Error fetching consoles:', error);
      return [];
    }
  }

  /**
   * Search for games in a specific console directory
   */
  async searchGames(consoleSystem: string, searchTerm: string): Promise<SearchResult> {
    try {
      // Map common console names to actual Myrient paths
      const consoleMapping: { [key: string]: string } = {
        'gameboy': 'No-Intro/Nintendo - Game Boy',
        'gb': 'No-Intro/Nintendo - Game Boy',
        'gba': 'No-Intro/Nintendo - Game Boy Advance',
        'gbc': 'No-Intro/Nintendo - Game Boy Color',
        'nes': 'No-Intro/Nintendo - Nintendo Entertainment System',
        'snes': 'No-Intro/Nintendo - Super Nintendo Entertainment System',
        'n64': 'No-Intro/Nintendo - Nintendo 64',
        'genesis': 'No-Intro/Sega - Mega Drive - Genesis',
        'megadrive': 'No-Intro/Sega - Mega Drive - Genesis',
        'mastersystem': 'No-Intro/Sega - Master System - Mark III',
        'saturn': 'No-Intro/Sega - Saturn',
        'dreamcast': 'No-Intro/Sega - Dreamcast',
        'psx': 'Redump/Sony - PlayStation',
        'ps1': 'Redump/Sony - PlayStation',
        'playstation': 'Redump/Sony - PlayStation'
      };

      const mappedPath = consoleMapping[consoleSystem.toLowerCase()] || consoleSystem;
      const consoleUrl = `${MYRIENT_BASE_URL}/files/${mappedPath}/`;
      
      console.log(`Myrient URL: ${consoleUrl}`);
      
      const response = await axios.get(consoleUrl);
      const $ = cheerio.load(response.data);
      
      const games: Game[] = [];
      const searchLower = searchTerm.toLowerCase();
      
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        const name = $(element).text().trim();
        
        if (href && !href.startsWith('..') && name) {
          // Check if it's a ROM file (common extensions)
          const isRom = /\.(zip|7z|rar|nes|smc|sfc|n64|z64|gb|gbc|gba|nds|iso|bin|cue|md|smd|32x|gg|sms|pce|ws|wsc)$/i.test(href);
          
          // Filter out demo games and other unwanted types
          const isDemoGame = /\b(demo|sample|preview|beta|alpha|proto|prototype|trial|kiosk|test)\b/i.test(name);
          
          if (isRom && name.toLowerCase().includes(searchLower) && !isDemoGame) {
            games.push({
              name: name,
              url: consoleUrl + href,
              console: mappedPath,
              size: this.extractSize($, element)
            });
          }
        }
      });
      
      return {
        games: games.slice(0, 10), // Limit to 10 results
        totalFound: games.length,
        searchTerm,
        console: mappedPath
      };
    } catch (error: any) {
      console.error(`Error searching games for ${consoleSystem}:`, error);
      const consoleMapping: { [key: string]: string } = {
        'gameboy': 'No-Intro/Nintendo - Game Boy',
        'gb': 'No-Intro/Nintendo - Game Boy'
      };
      const mappedPath = consoleMapping[consoleSystem.toLowerCase()] || consoleSystem;
      
      return {
        games: [],
        totalFound: 0,
        searchTerm,
        console: mappedPath
      };
    }
  }

  /**
   * Browse a directory structure
   */
  async browseDirectory(path: string): Promise<MyrientDirectory[]> {
    try {
      const url = path.startsWith('http') ? path : `${MYRIENT_BASE_URL}/files/${path}`;
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      const items: MyrientDirectory[] = [];
      
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        const name = $(element).text().trim();
        
        if (href && !href.startsWith('..') && name) {
          const isDirectory = href.endsWith('/');
          items.push({
            name: name,
            url: url + (url.endsWith('/') ? '' : '/') + href,
            type: isDirectory ? 'directory' : 'file',
            size: isDirectory ? undefined : this.extractSize($, element)
          });
        }
      });
      
      return items;
    } catch (error: any) {
      console.error('Error browsing directory:', error);
      return [];
    }
  }

  private extractSize($: cheerio.CheerioAPI, element: any): string | undefined {
    // Try to extract file size from the page structure
    // This might need adjustment based on Myrient's actual HTML structure
    const parent = $(element).parent();
    const siblings = parent.siblings();
    
    // Look for size information in sibling elements or text
    for (let i = 0; i < siblings.length; i++) {
      const text = $(siblings[i]).text().trim();
      const sizeMatch = text.match(/(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)/i);
      if (sizeMatch) {
        return sizeMatch[0];
      }
    }
    
    return undefined;
  }
}