import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '../src/services/database.js';
import { Game } from '../src/types/index.js';
import fs from 'fs-extra';
import path from 'path';

describe('DatabaseService', () => {
  let databaseService: DatabaseService;
  let testDbPath: string;

  beforeEach(async () => {
    testDbPath = path.join(__dirname, 'test-db.json');
    databaseService = new DatabaseService();
    await databaseService.init(testDbPath);
  });

  afterEach(async () => {
    // Clean up test database
    if (await fs.pathExists(testDbPath)) {
      await fs.remove(testDbPath);
    }
  });

  describe('addDownload', () => {
    it('should add a download job to the queue', async () => {
      const game: Game = {
        name: 'Super Mario Land',
        url: 'https://example.com/mario.zip',
        console: 'Game Boy',
        size: '1MB'
      };

      const job = await databaseService.addDownload(game);

      expect(job.id).toBeTruthy();
      expect(job.game).toEqual(game);
      expect(job.status).toBe('queued');
      expect(job.progress).toBe(0);
    });
  });

  describe('getDownloads', () => {
    it('should return all downloads', async () => {
      const game: Game = {
        name: 'Test Game',
        url: 'https://example.com/test.zip',
        console: 'NES',
        size: '500KB'
      };

      await databaseService.addDownload(game);
      const downloads = databaseService.getDownloads();

      expect(downloads).toHaveLength(1);
      expect(downloads[0].game.name).toBe('Test Game');
    });
  });

  describe('updateDownload', () => {
    it('should update download status', async () => {
      const game: Game = {
        name: 'Update Test',
        url: 'https://example.com/update.zip',
        console: 'SNES',
        size: '2MB'
      };

      const job = await databaseService.addDownload(game);
      const updated = await databaseService.updateDownload(job.id, {
        status: 'downloading',
        progress: 50
      });

      expect(updated?.status).toBe('downloading');
      expect(updated?.progress).toBe(50);
    });
  });

  describe('getSettings', () => {
    it('should return default settings', () => {
      const settings = databaseService.getSettings();

      expect(settings.downloadPath).toBe('./downloads');
      expect(settings.maxConcurrentDownloads).toBe(3);
    });
  });

  describe('getQueuedDownloads', () => {
    it('should return only queued downloads', async () => {
      const game1: Game = {
        name: 'Queued Game',
        url: 'https://example.com/queued.zip',
        console: 'GB',
        size: '1MB'
      };

      const game2: Game = {
        name: 'Completed Game',
        url: 'https://example.com/completed.zip',
        console: 'GB',
        size: '1MB'
      };

      const job1 = await databaseService.addDownload(game1);
      const job2 = await databaseService.addDownload(game2);
      
      await databaseService.updateDownload(job2.id, { status: 'completed' });

      const queuedDownloads = databaseService.getQueuedDownloads();
      
      expect(queuedDownloads).toHaveLength(1);
      expect(queuedDownloads[0].id).toBe(job1.id);
    });
  });
});