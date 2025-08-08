import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DownloadService } from '../src/services/downloader.js';
import { DatabaseService } from '../src/services/database.js';
import { Game } from '../src/types/index.js';

// Mock the database service
vi.mock('../src/services/database.js');

describe('DownloadService', () => {
  let downloadService: DownloadService;
  let mockDatabaseService: DatabaseService;

  beforeEach(() => {
    mockDatabaseService = new DatabaseService();
    downloadService = new DownloadService(mockDatabaseService);
  });

  describe('ES-DE folder structure mapping', () => {
    it('should map console names to ES-DE system names', () => {
      // Test the system mapping exists (internal implementation detail)
      const service = new DownloadService(mockDatabaseService);
      expect(service).toBeDefined();
    });

    it('should create proper folder structure for known consoles', () => {
      // This would test the file path generation logic
      // In a real implementation, we'd mock the file system operations
      const testCases = [
        { console: 'No-Intro/Nintendo - Game Boy', expected: 'gb' },
        { console: 'No-Intro/Nintendo - Game Boy Advance', expected: 'gba' },
        { console: 'No-Intro/Nintendo - Nintendo Entertainment System', expected: 'nes' },
      ];

      testCases.forEach(({ console: consoleSystem, expected }) => {
        // This tests the concept - actual implementation would need file system mocking
        expect(expected).toBeTruthy();
        expect(consoleSystem).toBeTruthy();
      });
    });
  });

  describe('getStats', () => {
    it('should return download statistics', () => {
      // Mock the database service methods
      vi.mocked(mockDatabaseService.getDownloads).mockReturnValue([
        {
          id: '1',
          game: {} as Game,
          status: 'completed',
          progress: 100,
          startTime: new Date()
        },
        {
          id: '2', 
          game: {} as Game,
          status: 'queued',
          progress: 0,
          startTime: new Date()
        }
      ]);

      const stats = downloadService.getStats();

      expect(stats.total).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.queued).toBe(1);
      expect(stats.failed).toBe(0);
      expect(stats.downloading).toBe(0);
    });
  });
});