import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CHDConverterService } from '../src/services/chd-converter.js';
import fs from 'fs-extra';
import { spawn } from 'child_process';

// Mock fs-extra
vi.mock('fs-extra');
const mockFs = vi.mocked(fs);

// Mock child_process
vi.mock('child_process');
const mockSpawn = vi.mocked(spawn);

describe('CHDConverterService', () => {
  let chdConverter: CHDConverterService;

  beforeEach(() => {
    chdConverter = new CHDConverterService();
    vi.clearAllMocks();
  });

  describe('isCDBasedSystem', () => {
    it('should return true for CD-based systems', () => {
      expect(chdConverter.isCDBasedSystem('psx')).toBe(true);
      expect(chdConverter.isCDBasedSystem('ps2')).toBe(true);
      expect(chdConverter.isCDBasedSystem('saturn')).toBe(true);
      expect(chdConverter.isCDBasedSystem('dreamcast')).toBe(true);
      expect(chdConverter.isCDBasedSystem('segacd')).toBe(true);
    });

    it('should return false for non-CD systems', () => {
      expect(chdConverter.isCDBasedSystem('gb')).toBe(false);
      expect(chdConverter.isCDBasedSystem('gba')).toBe(false);
      expect(chdConverter.isCDBasedSystem('nes')).toBe(false);
      expect(chdConverter.isCDBasedSystem('snes')).toBe(false);
    });

    it('should handle case insensitive input', () => {
      expect(chdConverter.isCDBasedSystem('PSX')).toBe(true);
      expect(chdConverter.isCDBasedSystem('PS2')).toBe(true);
      expect(chdConverter.isCDBasedSystem('GB')).toBe(false);
    });
  });

  describe('shouldConvertToCHD', () => {
    it('should return true for CD files on CD-based systems', () => {
      expect(chdConverter.shouldConvertToCHD('/path/game.iso', 'psx')).toBe(true);
      expect(chdConverter.shouldConvertToCHD('/path/game.bin', 'ps2')).toBe(true);
      expect(chdConverter.shouldConvertToCHD('/path/game.img', 'saturn')).toBe(true);
      expect(chdConverter.shouldConvertToCHD('/path/game.cue', 'dreamcast')).toBe(true);
    });

    it('should return false for non-CD files', () => {
      expect(chdConverter.shouldConvertToCHD('/path/game.zip', 'psx')).toBe(false);
      expect(chdConverter.shouldConvertToCHD('/path/game.7z', 'ps2')).toBe(false);
      expect(chdConverter.shouldConvertToCHD('/path/game.rom', 'saturn')).toBe(false);
    });

    it('should return false for CD files on non-CD systems', () => {
      expect(chdConverter.shouldConvertToCHD('/path/game.iso', 'gb')).toBe(false);
      expect(chdConverter.shouldConvertToCHD('/path/game.bin', 'gba')).toBe(false);
      expect(chdConverter.shouldConvertToCHD('/path/game.img', 'nes')).toBe(false);
    });

    it('should handle case insensitive file extensions', () => {
      expect(chdConverter.shouldConvertToCHD('/path/game.ISO', 'psx')).toBe(true);
      expect(chdConverter.shouldConvertToCHD('/path/game.BIN', 'ps2')).toBe(true);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(chdConverter.formatFileSize(500)).toBe('500.0 B');
      expect(chdConverter.formatFileSize(1536)).toBe('1.5 KB');
      expect(chdConverter.formatFileSize(1048576)).toBe('1.0 MB');
      expect(chdConverter.formatFileSize(1073741824)).toBe('1.0 GB');
    });

    it('should handle large file sizes', () => {
      expect(chdConverter.formatFileSize(2147483648)).toBe('2.0 GB');
      expect(chdConverter.formatFileSize(5368709120)).toBe('5.0 GB');
    });

    it('should handle zero and small sizes', () => {
      expect(chdConverter.formatFileSize(0)).toBe('0.0 B');
      expect(chdConverter.formatFileSize(1)).toBe('1.0 B');
      expect(chdConverter.formatFileSize(1023)).toBe('1023.0 B');
    });
  });

  describe('convertToCHD', () => {
    beforeEach(() => {
      // Mock successful file operations by default
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.ensureDir.mockResolvedValue();
      mockFs.stat.mockImplementation((path) => {
        if (path.includes('.chd')) {
          return Promise.resolve({ size: 500000000 } as any); // 500MB compressed
        }
        return Promise.resolve({ size: 1000000000 } as any); // 1GB original
      });
    });

    it('should return error if input file does not exist', async () => {
      mockFs.pathExists.mockResolvedValue(false);

      const result = await chdConverter.convertToCHD('/nonexistent/file.iso');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Input file not found');
    });

    it('should return error if chdman is not available', async () => {
      // Mock chdman check to fail
      const mockProcess = {
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 0); // Exit code 1 = not found
          }
        })
      };
      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await chdConverter.convertToCHD('/path/file.iso');

      expect(result.success).toBe(false);
      expect(result.error).toContain('chdman tool not found');
    });

    it('should successfully convert file when chdman is available', async () => {
      // Mock chdman version check to succeed
      let callCount = 0;
      const mockProcesses = [
        // First call: chdman version check
        {
          on: vi.fn((event, callback) => {
            if (event === 'close') {
              setTimeout(() => callback(0), 0); // Exit code 0 = success
            }
          })
        },
        // Second call: actual conversion
        {
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
          on: vi.fn((event, callback) => {
            if (event === 'close') {
              setTimeout(() => callback(0), 0); // Exit code 0 = success
            }
          })
        }
      ];

      mockSpawn.mockImplementation(() => {
        return mockProcesses[callCount++] as any;
      });

      const result = await chdConverter.convertToCHD('/path/game.iso');

      expect(result.success).toBe(true);
      expect(result.outputPath).toContain('.chd');
      expect(result.originalSize).toBe(1000000000);
      expect(result.compressedSize).toBe(500000000);
      expect(result.compressionRatio).toBe(50);
    });

    it('should handle conversion failure', async () => {
      // Mock chdman version check to succeed, conversion to fail
      let callCount = 0;
      const mockProcesses = [
        // First call: chdman version check (success)
        {
          on: vi.fn((event, callback) => {
            if (event === 'close') {
              setTimeout(() => callback(0), 0);
            }
          })
        },
        // Second call: conversion (failure)
        {
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
          on: vi.fn((event, callback) => {
            if (event === 'close') {
              setTimeout(() => callback(1), 0); // Exit code 1 = failure
            }
          })
        }
      ];

      mockSpawn.mockImplementation(() => {
        return mockProcesses[callCount++] as any;
      });

      const result = await chdConverter.convertToCHD('/path/game.iso');

      expect(result.success).toBe(false);
      expect(result.error).toContain('chdman exited with code 1');
    });

    it('should use custom output directory when provided', async () => {
      // Mock successful chdman operations
      let callCount = 0;
      const mockProcesses = [
        {
          on: vi.fn((event, callback) => {
            if (event === 'close') setTimeout(() => callback(0), 0);
          })
        },
        {
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
          on: vi.fn((event, callback) => {
            if (event === 'close') setTimeout(() => callback(0), 0);
          })
        }
      ];

      mockSpawn.mockImplementation(() => {
        return mockProcesses[callCount++] as any;
      });

      const result = await chdConverter.convertToCHD('/path/game.iso', '/custom/output');

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/custom/output/game.chd');
      expect(mockFs.ensureDir).toHaveBeenCalledWith('/custom/output');
    });
  });

  describe('cleanupOriginalFiles', () => {
    it('should not remove files when keepOriginal is true', async () => {
      await chdConverter.cleanupOriginalFiles('/path/game.bin', true);

      expect(mockFs.remove).not.toHaveBeenCalled();
    });

    it('should remove original file when keepOriginal is false', async () => {
      mockFs.remove.mockResolvedValue();

      await chdConverter.cleanupOriginalFiles('/path/game.bin', false);

      expect(mockFs.remove).toHaveBeenCalledWith('/path/game.bin');
    });

    it('should remove associated CUE file for BIN files', async () => {
      mockFs.remove.mockResolvedValue();
      mockFs.pathExists.mockResolvedValue(true);

      await chdConverter.cleanupOriginalFiles('/path/game.bin', false);

      expect(mockFs.remove).toHaveBeenCalledWith('/path/game.bin');
      expect(mockFs.remove).toHaveBeenCalledWith('/path/game.cue');
    });

    it('should handle case insensitive BIN file extensions', async () => {
      mockFs.remove.mockResolvedValue();
      mockFs.pathExists.mockResolvedValue(true);

      await chdConverter.cleanupOriginalFiles('/path/game.BIN', false);

      expect(mockFs.remove).toHaveBeenCalledWith('/path/game.BIN');
      expect(mockFs.remove).toHaveBeenCalledWith('/path/game.cue');
    });

    it('should not fail if CUE file does not exist', async () => {
      mockFs.remove.mockResolvedValue();
      mockFs.pathExists.mockResolvedValue(false);

      await chdConverter.cleanupOriginalFiles('/path/game.bin', false);

      expect(mockFs.remove).toHaveBeenCalledWith('/path/game.bin');
      expect(mockFs.remove).toHaveBeenCalledTimes(1); // Only BIN file, not CUE
    });

    it('should handle cleanup errors gracefully', async () => {
      mockFs.remove.mockRejectedValue(new Error('Permission denied'));

      // Should not throw
      await expect(chdConverter.cleanupOriginalFiles('/path/game.bin', false)).resolves.toBeUndefined();
    });
  });
});