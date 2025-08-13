import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

export interface CHDConversionResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
}

export class CHDConverterService {
  private readonly CD_BASED_SYSTEMS = ['psx', 'ps2', 'saturn', 'dreamcast', 'segacd'];
  private readonly CD_EXTENSIONS = ['.bin', '.iso', '.img', '.cue'];

  /**
   * Check if a system requires CHD conversion for optimal storage
   */
  isCDBasedSystem(systemName: string): boolean {
    return this.CD_BASED_SYSTEMS.includes(systemName.toLowerCase());
  }

  /**
   * Check if a file should be converted to CHD
   */
  shouldConvertToCHD(filePath: string, systemName: string): boolean {
    if (!this.isCDBasedSystem(systemName)) {
      return false;
    }

    const ext = path.extname(filePath).toLowerCase();
    return this.CD_EXTENSIONS.includes(ext);
  }

  /**
   * Convert CD image to CHD format using chdman
   */
  async convertToCHD(inputPath: string, outputDir?: string): Promise<CHDConversionResult> {
    try {
      // Check if input file exists
      if (!await fs.pathExists(inputPath)) {
        return {
          success: false,
          error: `Input file not found: ${inputPath}`
        };
      }

      // Check if chdman is available
      const chdmanAvailable = await this.checkCHDManAvailable();
      if (!chdmanAvailable) {
        return {
          success: false,
          error: 'chdman tool not found. Please install MAME tools for CHD conversion.'
        };
      }

      // Determine output path
      const inputDir = path.dirname(inputPath);
      const outputDirectory = outputDir || inputDir;
      const baseName = path.basename(inputPath, path.extname(inputPath));
      const outputPath = path.join(outputDirectory, `${baseName}.chd`);

      // Ensure output directory exists
      await fs.ensureDir(outputDirectory);

      // Get original file size
      const originalStats = await fs.stat(inputPath);
      const originalSize = originalStats.size;

      // Run chdman conversion
      const result = await this.runCHDConversion(inputPath, outputPath);
      
      if (!result.success) {
        return result;
      }

      // Get compressed file size and calculate ratio
      const compressedStats = await fs.stat(outputPath);
      const compressedSize = compressedStats.size;
      const compressionRatio = Math.round((1 - compressedSize / originalSize) * 100);

      return {
        success: true,
        outputPath,
        originalSize,
        compressedSize,
        compressionRatio
      };

    } catch (error) {
      return {
        success: false,
        error: `CHD conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if chdman tool is available in the system
   */
  private async checkCHDManAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('chdman', ['--version']);
      
      process.on('close', (code) => {
        resolve(code === 0);
      });
      
      process.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Run the actual CHD conversion using chdman
   */
  private async runCHDConversion(inputPath: string, outputPath: string): Promise<CHDConversionResult> {
    return new Promise((resolve) => {
      const ext = path.extname(inputPath).toLowerCase();
      const args = this.getCHDManArgs(inputPath, outputPath, ext);
      
      console.log(`🔄 Converting to CHD: chdman ${args.join(' ')}`);
      const process = spawn('chdman', args);
      
      let stderr = '';
      let stdout = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ CHD conversion completed: ${outputPath}`);
          resolve({ success: true, outputPath });
        } else {
          const error = `chdman exited with code ${code}. Error: ${stderr}`;
          console.error(`❌ CHD conversion failed: ${error}`);
          resolve({ success: false, error });
        }
      });
      
      process.on('error', (error) => {
        const errorMsg = `Failed to spawn chdman: ${error.message}`;
        console.error(`❌ CHD conversion error: ${errorMsg}`);
        resolve({ success: false, error: errorMsg });
      });
    });
  }

  /**
   * Get appropriate chdman arguments based on file type
   */
  private getCHDManArgs(inputPath: string, outputPath: string, extension: string): string[] {
    const baseArgs = ['createcd', '-i', inputPath, '-o', outputPath];
    
    // Add specific options based on file type
    switch (extension) {
      case '.cue':
        // CUE files are ideal for chdman as they contain track information
        return baseArgs;
      
      case '.bin':
      case '.iso':
      case '.img':
        // For raw images, we might need to specify additional parameters
        return [...baseArgs, '-f'];
      
      default:
        return baseArgs;
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Clean up original files after successful CHD conversion
   */
  async cleanupOriginalFiles(originalPath: string, keepOriginal: boolean = false): Promise<void> {
    if (keepOriginal) {
      return;
    }

    try {
      // Remove the original file
      await fs.remove(originalPath);
      console.log(`🗑️  Removed original file: ${originalPath}`);
      
      // If it's a BIN file, also try to remove associated CUE file
      if (path.extname(originalPath).toLowerCase() === '.bin') {
        const cuePath = originalPath.replace(/\.bin$/i, '.cue');
        if (await fs.pathExists(cuePath)) {
          await fs.remove(cuePath);
          console.log(`🗑️  Removed associated CUE file: ${cuePath}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Failed to cleanup original files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}