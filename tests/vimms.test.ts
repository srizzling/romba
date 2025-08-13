import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VimmsService } from '../src/services/vimms.js';
import { CacheService } from '../src/services/cache.js';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockAxios = vi.mocked(axios);

// Mock CacheService
vi.mock('../src/services/cache.js');
const MockCacheService = vi.mocked(CacheService);

describe('VimmsService', () => {
  let vimmsService: VimmsService;
  let mockCache: any;

  beforeEach(() => {
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
      cleanup: vi.fn()
    };
    MockCacheService.mockImplementation(() => mockCache);
    vimmsService = new VimmsService();
    vi.clearAllMocks();
  });

  describe('searchGames', () => {
    it('should return cached results when available', async () => {
      const cachedResult = {
        games: [{ name: 'Test Game', url: 'test-url', console: 'GB', size: '1MB' }],
        totalFound: 1,
        searchTerm: 'test',
        console: 'gb'
      };
      
      mockCache.get.mockResolvedValue(cachedResult);

      const result = await vimmsService.searchGames('gb', 'test');

      expect(mockCache.get).toHaveBeenCalledWith('vimms', 'gb', 'test');
      expect(result).toEqual(cachedResult);
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('should search and parse results when not cached', async () => {
      mockCache.get.mockResolvedValue(null);
      
      const mockHtml = `
        <table>
          <tr>
            <td><a href="/vault/1234">Test Game</a></td>
            <td>2.5 MB</td>
          </tr>
          <tr>
            <td><a href="/vault/5678">Another Game</a></td>
            <td>5.0 MB</td>
          </tr>
        </table>
      `;

      mockAxios.get.mockResolvedValue({
        data: mockHtml,
        status: 200
      });

      const result = await vimmsService.searchGames('gb', 'test');

      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://vimm.net/vault/?p=list&system=GB&q=test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Mozilla')
          }),
          timeout: 30000
        })
      );

      expect(result.searchTerm).toBe('test');
      expect(result.console).toBe('GB');
      expect(mockCache.set).toHaveBeenCalledWith('vimms', 'gb', 'test', result);
    });

    it('should handle no matches found message', async () => {
      mockCache.get.mockResolvedValue(null);
      mockAxios.get.mockResolvedValue({
        data: 'No matches found for your search',
        status: 200
      });

      const result = await vimmsService.searchGames('gb', 'nonexistent');

      expect(result.games).toEqual([]);
      expect(result.totalFound).toBe(0);
      expect(result.searchTerm).toBe('nonexistent');
      expect(result.console).toBe('GB');
    });

    it('should handle network errors gracefully', async () => {
      mockCache.get.mockResolvedValue(null);
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await vimmsService.searchGames('gb', 'test');

      expect(result.games).toEqual([]);
      expect(result.totalFound).toBe(0);
      expect(result.searchTerm).toBe('test');
      expect(result.console).toBe('gb');
    });

    it('should map console names correctly', async () => {
      mockCache.get.mockResolvedValue(null);
      mockAxios.get.mockResolvedValue({
        data: 'No matches found',
        status: 200
      });

      // Test various console mappings
      await vimmsService.searchGames('gb', 'test');
      expect(mockAxios.get).toHaveBeenLastCalledWith(
        expect.stringContaining('system=GB'),
        expect.any(Object)
      );

      await vimmsService.searchGames('gba', 'test');
      expect(mockAxios.get).toHaveBeenLastCalledWith(
        expect.stringContaining('system=GBA'),
        expect.any(Object)
      );

      await vimmsService.searchGames('psx', 'test');
      expect(mockAxios.get).toHaveBeenLastCalledWith(
        expect.stringContaining('system=PS1'),
        expect.any(Object)
      );

      await vimmsService.searchGames('genesis', 'test');
      expect(mockAxios.get).toHaveBeenLastCalledWith(
        expect.stringContaining('system=Genesis'),
        expect.any(Object)
      );
    });

    it('should handle case insensitive console mapping', async () => {
      mockCache.get.mockResolvedValue(null);
      mockAxios.get.mockResolvedValue({
        data: 'No matches found',
        status: 200
      });

      await vimmsService.searchGames('GB', 'test');
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('system=GB'),
        expect.any(Object)
      );

      await vimmsService.searchGames('Gb', 'test');
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('system=GB'),
        expect.any(Object)
      );
    });

    it('should handle unknown consoles gracefully', async () => {
      mockCache.get.mockResolvedValue(null);
      mockAxios.get.mockResolvedValue({
        data: 'No matches found',
        status: 200
      });

      await vimmsService.searchGames('unknown', 'test');
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('system=unknown'),
        expect.any(Object)
      );
    });

    it('should filter out advanced search links', async () => {
      mockCache.get.mockResolvedValue(null);
      
      const mockHtml = `
        <table>
          <tr>
            <td><a href="/vault/1234">Real Game</a></td>
            <td>2.5 MB</td>
          </tr>
          <tr>
            <td><a href="/vault/search">Advanced Search</a></td>
            <td>-</td>
          </tr>
        </table>
      `;

      mockAxios.get.mockResolvedValue({
        data: mockHtml,
        status: 200
      });

      const result = await vimmsService.searchGames('gb', 'test');

      // Should not include the "Advanced Search" link in results
      expect(result.games.every(game => !game.name.includes('Advanced Search'))).toBe(true);
    });

    it('should handle malformed HTML gracefully', async () => {
      mockCache.get.mockResolvedValue(null);
      mockAxios.get.mockResolvedValue({
        data: '<div>Invalid HTML structure without proper table</div>',
        status: 200
      });

      const result = await vimmsService.searchGames('gb', 'test');

      expect(result.games).toEqual([]);
      expect(result.totalFound).toBe(0);
    });

    it('should handle 404 responses from Vimms', async () => {
      mockCache.get.mockResolvedValue(null);
      mockAxios.get.mockResolvedValue({
        data: 'Page not found',
        status: 404
      });

      const result = await vimmsService.searchGames('gb', 'test');

      expect(result.games).toEqual([]);
      expect(result.totalFound).toBe(0);
    });
  });

  describe('getDownloadInfo', () => {
    it('should extract download information from vault page', async () => {
      const mockHtml = `
        <div>
          <a href="/download/1234/game-file.zip">Download Game</a>
          <div>File: game-file.zip</div>
          <div>Size: 5.2 MB</div>
        </div>
      `;

      mockAxios.get.mockResolvedValue({
        data: mockHtml,
        status: 200
      });

      const result = await vimmsService.getDownloadInfo('https://vimm.net/vault/1234');

      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://vimm.net/vault/1234',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Mozilla')
          })
        })
      );

      expect(result.downloadUrl).toBe('https://vimm.net/download/1234/game-file.zip');
    });

    it('should handle missing download link', async () => {
      mockAxios.get.mockResolvedValue({
        data: '<div>No download link found</div>',
        status: 200
      });

      const result = await vimmsService.getDownloadInfo('https://vimm.net/vault/1234');

      expect(result.downloadUrl).toBeUndefined();
      expect(result.fileName).toBe('Unknown Game');
      expect(result.size).toBe('Unknown');
    });

    it('should handle network errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await vimmsService.getDownloadInfo('https://vimm.net/vault/1234');

      expect(result.downloadUrl).toBeUndefined();
      expect(result.fileName).toBeUndefined();
      expect(result.size).toBeUndefined();
    });

    it('should handle relative download URLs', async () => {
      const mockHtml = `
        <div>
          <a href="/download/1234/game.zip">Download</a>
        </div>
      `;

      mockAxios.get.mockResolvedValue({
        data: mockHtml,
        status: 200
      });

      const result = await vimmsService.getDownloadInfo('https://vimm.net/vault/1234');

      expect(result.downloadUrl).toBe('https://vimm.net/download/1234/game.zip');
    });
  });
});