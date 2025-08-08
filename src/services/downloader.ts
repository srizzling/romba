import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { DownloadJob } from '../types/index.js';
import { DatabaseService } from './database.js';
import * as ProgressBar from 'progress';

export class DownloadService {
  private activeDownloads = new Map<string, AbortController>();
  
  // ES-DE system name mapping for folder structure
  private readonly systemMapping: { [key: string]: string } = {
    'No-Intro/Nintendo - Game Boy': 'gb',
    'No-Intro/Nintendo - Game Boy Color': 'gbc', 
    'No-Intro/Nintendo - Game Boy Advance': 'gba',
    'No-Intro/Nintendo - Nintendo Entertainment System': 'nes',
    'No-Intro/Nintendo - Super Nintendo Entertainment System': 'snes',
    'No-Intro/Nintendo - Nintendo 64': 'n64',
    'No-Intro/Sega - Mega Drive - Genesis': 'megadrive',
    'No-Intro/Sega - Master System - Mark III': 'mastersystem',
    'No-Intro/Sega - Saturn': 'saturn',
    'No-Intro/Sega - Dreamcast': 'dreamcast',
    'Redump/Sony - PlayStation': 'psx',
    'Redump/Sony - PlayStation 2': 'ps2',
    'Redump/Sony - PlayStation Portable': 'psp'
  };
  
  constructor(private db: DatabaseService) {}

  /**
   * Start downloading a job
   */
  async startDownload(job: DownloadJob, onProgress?: (progress: number) => void): Promise<void> {
    if (this.activeDownloads.has(job.id)) {
      throw new Error('Download already in progress');
    }

    const abortController = new AbortController();
    this.activeDownloads.set(job.id, abortController);

    try {
      await this.db.updateDownload(job.id, {
        status: 'downloading',
        progress: 0,
        startTime: new Date()
      });

      const settings = this.db.getSettings();
      const fileName = path.basename(new URL(job.game.url).pathname);
      
      // Map console name to ES-DE system name
      const systemName = this.systemMapping[job.game.console] || job.game.console.toLowerCase().replace(/[^a-z0-9]/g, '');
      const filePath = path.join(settings.downloadPath, 'roms', systemName, fileName);

      // Ensure directory exists
      await fs.ensureDir(path.dirname(filePath));

      // Download file with progress tracking
      const response = await axios({
        method: 'GET',
        url: job.game.url,
        responseType: 'stream',
        signal: abortController.signal
      });

      const totalLength = parseInt(response.headers['content-length'] || '0');
      let downloadedLength = 0;

      const writer = fs.createWriteStream(filePath);
      
      response.data.on('data', (chunk: Buffer) => {
        downloadedLength += chunk.length;
        const progress = totalLength > 0 ? Math.round((downloadedLength / totalLength) * 100) : 0;
        
        // Update database progress
        this.db.updateDownload(job.id, { progress });
        
        // Notify progress callback
        if (onProgress) {
          onProgress(progress);
        }
      });

      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
        response.data.on('error', reject);
      });

      // Mark as completed
      await this.db.updateDownload(job.id, {
        status: 'completed',
        progress: 100,
        completedTime: new Date(),
        filePath
      });

      this.activeDownloads.delete(job.id);

    } catch (error) {
      // Mark as failed
      await this.db.updateDownload(job.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      this.activeDownloads.delete(job.id);
      throw error;
    }
  }

  /**
   * Cancel a download
   */
  async cancelDownload(jobId: string): Promise<boolean> {
    const controller = this.activeDownloads.get(jobId);
    if (!controller) {
      return false;
    }

    controller.abort();
    this.activeDownloads.delete(jobId);

    await this.db.updateDownload(jobId, {
      status: 'failed',
      error: 'Cancelled by user'
    });

    return true;
  }

  /**
   * Process the download queue
   */
  async processQueue(): Promise<void> {
    const settings = this.db.getSettings();
    const activeCount = this.activeDownloads.size;
    
    if (activeCount >= settings.maxConcurrentDownloads) {
      return; // Max concurrent downloads reached
    }

    const queuedJobs = this.db.getQueuedDownloads();
    const availableSlots = settings.maxConcurrentDownloads - activeCount;
    const jobsToStart = queuedJobs.slice(0, availableSlots);

    for (const job of jobsToStart) {
      this.startDownload(job).catch(error => {
        console.error(`Download failed for ${job.game.name}:`, error);
      });
    }
  }

  /**
   * Get download statistics
   */
  getStats() {
    const downloads = this.db.getDownloads();
    return {
      total: downloads.length,
      completed: downloads.filter(d => d.status === 'completed').length,
      failed: downloads.filter(d => d.status === 'failed').length,
      queued: downloads.filter(d => d.status === 'queued').length,
      downloading: downloads.filter(d => d.status === 'downloading').length,
      active: this.activeDownloads.size
    };
  }

  /**
   * Get active download progress
   */
  getActiveProgress(): { [jobId: string]: number } {
    const progress: { [jobId: string]: number } = {};
    const activeJobs = this.db.getActiveDownloads();
    
    for (const job of activeJobs) {
      progress[job.id] = job.progress;
    }
    
    return progress;
  }
}