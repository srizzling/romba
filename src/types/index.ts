export interface Game {
  name: string;
  url: string;
  size?: string;
  console: string;
}

export interface DownloadJob {
  id: string;
  game: Game;
  status: 'queued' | 'downloading' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  completedTime?: Date;
  filePath?: string;
  error?: string;
}

export interface SearchResult {
  games: Game[];
  totalFound: number;
  searchTerm: string;
  console: string;
}

export interface MyrientDirectory {
  name: string;
  url: string;
  type: 'directory' | 'file';
  size?: string;
}