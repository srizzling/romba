import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CacheService } from '../src/services/cache.js';
import fs from 'fs-extra';
import path from 'path';

// Mock fs-extra
vi.mock('fs-extra');
const mockFs = vi.mocked(fs);

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockDate: any;

  beforeEach(() => {
    cacheService = new CacheService('./test-cache');
    // Mock Date.now() for consistent testing
    mockDate = vi.spyOn(Date, 'now').mockReturnValue(1000000);
    
    // Mock fs operations
    mockFs.ensureDir.mockResolvedValue();
    mockFs.pathExists.mockResolvedValue(false);
    mockFs.writeJson.mockResolvedValue();
    mockFs.readJson.mockResolvedValue({});
    mockFs.remove.mockResolvedValue();
    mockFs.emptyDir.mockResolvedValue();
    mockFs.readdir.mockResolvedValue([]);
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockDate.mockRestore();
  });

  describe('set and get', () => {
    it('should store and retrieve values', async () => {
      const testData = { 
        games: [{ name: 'Test Game', url: 'test-url', console: 'GB', size: '1MB' }],
        totalFound: 1,
        searchTerm: 'test',
        console: 'gb'
      };
      
      // Mock successful write and read
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJson.mockResolvedValue({
        result: testData,
        timestamp: 1000000,
        ttl: 24 * 60 * 60 * 1000
      });

      await cacheService.set('myrient', 'gb', 'test', testData);
      const result = await cacheService.get('myrient', 'gb', 'test');

      expect(result).toEqual(testData);
      expect(mockFs.writeJson).toHaveBeenCalled();
    });

    it('should return null for non-existent cache files', async () => {
      mockFs.pathExists.mockResolvedValue(false);

      const result = await cacheService.get('myrient', 'gb', 'nonexistent');
      expect(result).toBeNull();
    });

    it('should handle cache read errors gracefully', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJson.mockRejectedValue(new Error('Read error'));

      const result = await cacheService.get('myrient', 'gb', 'test');
      expect(result).toBeNull();
    });

    it('should handle cache write errors gracefully', async () => {
      mockFs.writeJson.mockRejectedValue(new Error('Write error'));

      const testData = { 
        games: [],
        totalFound: 0,
        searchTerm: 'test',
        console: 'gb'
      };

      // Should not throw
      await expect(cacheService.set('myrient', 'gb', 'test', testData)).resolves.toBeUndefined();
    });
  });

  describe('expiration', () => {
    it('should return null for expired entries', async () => {
      const testData = { 
        games: [{ name: 'Test Game', url: 'test-url', console: 'GB', size: '1MB' }],
        totalFound: 1,
        searchTerm: 'test',
        console: 'gb'
      };

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJson.mockResolvedValue({
        result: testData,
        timestamp: 1000000 - (25 * 60 * 60 * 1000), // 25 hours ago (expired)
        ttl: 24 * 60 * 60 * 1000
      });

      const result = await cacheService.get('myrient', 'gb', 'test');
      
      expect(result).toBeNull();
      expect(mockFs.remove).toHaveBeenCalled(); // Should clean up expired file
    });

    it('should return data for non-expired entries', async () => {
      const testData = { 
        games: [{ name: 'Test Game', url: 'test-url', console: 'GB', size: '1MB' }],
        totalFound: 1,
        searchTerm: 'test',
        console: 'gb'
      };

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJson.mockResolvedValue({
        result: testData,
        timestamp: 1000000 - (5 * 60 * 60 * 1000), // 5 hours ago (not expired)
        ttl: 24 * 60 * 60 * 1000
      });

      const result = await cacheService.get('myrient', 'gb', 'test');
      
      expect(result).toEqual(testData);
      expect(mockFs.remove).not.toHaveBeenCalled();
    });

    it('should use custom TTL when provided', async () => {
      const testData = { 
        games: [],
        totalFound: 0,
        searchTerm: 'test',
        console: 'gb'
      };
      const customTTL = 60000; // 1 minute

      await cacheService.set('myrient', 'gb', 'test', testData, customTTL);

      expect(mockFs.writeJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          result: testData,
          timestamp: 1000000,
          ttl: customTTL
        })
      );
    });
  });

  describe('cache key generation', () => {
    it('should generate consistent cache keys', async () => {
      const testData = { 
        games: [],
        totalFound: 0,
        searchTerm: 'test game',
        console: 'gb'
      };

      await cacheService.set('myrient', 'gb', 'test game', testData);

      // Should normalize the cache key
      expect(mockFs.writeJson).toHaveBeenCalledWith(
        expect.stringContaining('myrient_gb_test_game.json'),
        expect.any(Object)
      );
    });

    it('should handle special characters in search terms', async () => {
      const testData = { 
        games: [],
        totalFound: 0,
        searchTerm: 'test@game!',
        console: 'gb'
      };

      await cacheService.set('myrient', 'gb', 'test@game!', testData);

      // Special characters should be replaced with underscores
      expect(mockFs.writeJson).toHaveBeenCalledWith(
        expect.stringContaining('myrient_gb_test_game_.json'),
        expect.any(Object)
      );
    });
  });

  describe('cleanup', () => {
    it('should clean up expired cache files', async () => {
      const mockFiles = ['file1.json', 'file2.json', 'file3.txt'];
      mockFs.readdir.mockResolvedValue(mockFiles);
      
      // Mock file contents - one expired, one not
      mockFs.readJson
        .mockResolvedValueOnce({
          timestamp: 1000000 - (25 * 60 * 60 * 1000), // expired
          ttl: 24 * 60 * 60 * 1000
        })
        .mockResolvedValueOnce({
          timestamp: 1000000 - (5 * 60 * 60 * 1000), // not expired
          ttl: 24 * 60 * 60 * 1000
        });

      const deletedCount = await cacheService.cleanup();

      expect(deletedCount).toBe(1);
      expect(mockFs.remove).toHaveBeenCalledTimes(1);
    });

    it('should handle cleanup errors gracefully', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Read error'));

      const deletedCount = await cacheService.cleanup();
      expect(deletedCount).toBe(0);
    });

    it('should remove malformed cache files', async () => {
      const mockFiles = ['malformed.json'];
      mockFs.readdir.mockResolvedValue(mockFiles);
      mockFs.readJson.mockRejectedValue(new Error('JSON parse error'));

      const deletedCount = await cacheService.cleanup();

      expect(deletedCount).toBe(1);
      expect(mockFs.remove).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should clear all cache files', async () => {
      await cacheService.clear();

      expect(mockFs.emptyDir).toHaveBeenCalledWith('./test-cache');
    });

    it('should handle clear errors gracefully', async () => {
      mockFs.emptyDir.mockRejectedValue(new Error('Clear error'));

      // Should not throw
      await expect(cacheService.clear()).resolves.toBeUndefined();
    });
  });
});