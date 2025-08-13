import fs from 'fs-extra';
import path from 'path';
import { Game, SearchResult } from '../types/index.js';

interface CacheEntry {
  result: SearchResult;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class CacheService {
  private readonly cacheDir: string;
  private readonly defaultTTL: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(cacheDir: string = './cache') {
    this.cacheDir = cacheDir;
    this.ensureCacheDir();
  }

  private async ensureCacheDir() {
    await fs.ensureDir(this.cacheDir);
  }

  /**
   * Generate cache key from search parameters
   */
  private getCacheKey(service: string, consoleSystem: string, searchTerm: string): string {
    return `${service}_${consoleSystem}_${searchTerm.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }

  /**
   * Get cache file path
   */
  private getCacheFilePath(key: string): string {
    return path.join(this.cacheDir, `${key}.json`);
  }

  /**
   * Get cached search result if valid
   */
  async get(service: string, consoleSystem: string, searchTerm: string): Promise<SearchResult | null> {
    try {
      const key = this.getCacheKey(service, consoleSystem, searchTerm);
      const filePath = this.getCacheFilePath(key);

      if (!(await fs.pathExists(filePath))) {
        return null;
      }

      const cacheEntry: CacheEntry = await fs.readJson(filePath);
      const now = Date.now();

      // Check if cache is expired
      if (now - cacheEntry.timestamp > cacheEntry.ttl) {
        // Clean up expired cache
        await fs.remove(filePath);
        return null;
      }

      console.log(`Cache hit for ${service} ${consoleSystem} "${searchTerm}"`);
      return cacheEntry.result;

    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  /**
   * Store search result in cache
   */
  async set(service: string, consoleSystem: string, searchTerm: string, result: SearchResult, ttl?: number): Promise<void> {
    try {
      const key = this.getCacheKey(service, consoleSystem, searchTerm);
      const filePath = this.getCacheFilePath(key);

      const cacheEntry: CacheEntry = {
        result,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTTL
      };

      await fs.writeJson(filePath, cacheEntry);
      console.log(`Cached result for ${service} ${consoleSystem} "${searchTerm}" (${result.games.length} games)`);

    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  /**
   * Clear expired cache entries
   */
  async cleanup(): Promise<number> {
    try {
      await this.ensureCacheDir();
      const files = await fs.readdir(this.cacheDir);
      let deletedCount = 0;
      const now = Date.now();

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.cacheDir, file);
        
        try {
          const cacheEntry: CacheEntry = await fs.readJson(filePath);
          
          if (now - cacheEntry.timestamp > cacheEntry.ttl) {
            await fs.remove(filePath);
            deletedCount++;
          }
        } catch (error) {
          // If we can't read the file, delete it
          await fs.remove(filePath);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} expired cache entries`);
      }

      return deletedCount;

    } catch (error) {
      console.error('Cache cleanup error:', error);
      return 0;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      await fs.emptyDir(this.cacheDir);
      console.log('Cache cleared');
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}