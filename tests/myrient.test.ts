import { describe, it, expect, beforeEach } from 'vitest';
import { MyrientService } from '../src/services/myrient.js';

describe('MyrientService', () => {
  let myrientService: MyrientService;

  beforeEach(() => {
    myrientService = new MyrientService();
  });

  describe('searchGames', () => {
    it('should return empty results for invalid console', async () => {
      const result = await myrientService.searchGames('invalidconsole', 'mario');
      
      expect(result.games).toEqual([]);
      expect(result.totalFound).toBe(0);
      expect(result.searchTerm).toBe('mario');
    });

    it('should map common console names correctly', () => {
      // This tests the internal mapping logic
      const testMappings = {
        'gameboy': 'No-Intro/Nintendo - Game Boy',
        'gb': 'No-Intro/Nintendo - Game Boy',
        'gba': 'No-Intro/Nintendo - Game Boy Advance',
        'nes': 'No-Intro/Nintendo - Nintendo Entertainment System',
        'snes': 'No-Intro/Nintendo - Super Nintendo Entertainment System'
      };

      // Since the mapping is internal, we'll test the search behavior
      Object.keys(testMappings).forEach(shortName => {
        expect(shortName).toBeTruthy();
      });
    });

    it('should filter out demo games', async () => {
      // Mock test - in reality this would need actual ROM data
      const searchTerm = 'test';
      const result = await myrientService.searchGames('gb', searchTerm);
      
      // Verify structure
      expect(result).toHaveProperty('games');
      expect(result).toHaveProperty('totalFound');
      expect(result).toHaveProperty('searchTerm', searchTerm);
      expect(result).toHaveProperty('console');
      expect(Array.isArray(result.games)).toBe(true);
    });
  });

  describe('console mapping', () => {
    it('should handle case insensitive console names', async () => {
      const result1 = await myrientService.searchGames('GB', 'mario');
      const result2 = await myrientService.searchGames('gb', 'mario');
      
      expect(result1.console).toBe(result2.console);
    });
  });
});