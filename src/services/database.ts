import { JSONFilePreset } from 'lowdb/node';
import { DownloadJob } from '../types/index.js';
import { randomUUID } from 'crypto';

interface DatabaseSchema {
  downloads: DownloadJob[];
  settings: {
    downloadPath: string;
    maxConcurrentDownloads: number;
  };
}

export class DatabaseService {
  private db!: Awaited<ReturnType<typeof JSONFilePreset<DatabaseSchema>>>;

  async init(dbPath: string = './romba-db.json') {
    const defaultData: DatabaseSchema = {
      downloads: [],
      settings: {
        downloadPath: './downloads',
        maxConcurrentDownloads: 3
      }
    };

    this.db = await JSONFilePreset<DatabaseSchema>(dbPath, defaultData);
    await this.db.write();
  }

  /**
   * Add a new download job to the queue
   */
  async addDownload(game: DownloadJob['game']): Promise<DownloadJob> {
    const job: DownloadJob = {
      id: randomUUID(),
      game,
      status: 'queued',
      progress: 0,
      startTime: new Date()
    };

    this.db.data.downloads.push(job);
    await this.db.write();
    
    return job;
  }

  /**
   * Update download job status
   */
  async updateDownload(id: string, updates: Partial<DownloadJob>): Promise<DownloadJob | null> {
    const job = this.db.data.downloads.find(d => d.id === id);
    if (!job) return null;

    Object.assign(job, updates);
    await this.db.write();
    
    return job;
  }

  /**
   * Get all downloads
   */
  getDownloads(): DownloadJob[] {
    return this.db.data.downloads;
  }

  /**
   * Get downloads by status
   */
  getDownloadsByStatus(status: DownloadJob['status']): DownloadJob[] {
    return this.db.data.downloads.filter(d => d.status === status);
  }

  /**
   * Get queued downloads
   */
  getQueuedDownloads(): DownloadJob[] {
    return this.getDownloadsByStatus('queued');
  }

  /**
   * Get active downloads
   */
  getActiveDownloads(): DownloadJob[] {
    return this.getDownloadsByStatus('downloading');
  }

  /**
   * Remove completed downloads older than specified days
   */
  async cleanupOldDownloads(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const initialCount = this.db.data.downloads.length;
    
    this.db.data.downloads = this.db.data.downloads.filter(job => {
      if (job.status === 'completed' && job.completedTime) {
        return new Date(job.completedTime) > cutoffDate;
      }
      return true;
    });
    
    await this.db.write();
    return initialCount - this.db.data.downloads.length;
  }

  /**
   * Get settings
   */
  getSettings() {
    return this.db.data.settings;
  }

  /**
   * Update settings
   */
  async updateSettings(updates: Partial<DatabaseSchema['settings']>): Promise<void> {
    Object.assign(this.db.data.settings, updates);
    await this.db.write();
  }
}