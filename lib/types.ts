export interface VideoQuality {
  id: string;
  resolution: string;
  fps: number;
  ext: string;
  size: string;
  note?: string;
}

export enum AppStep {
  IDLE = 'idle',
  FETCHING = 'fetching',
  SELECTION = 'selection',
  DOWNLOADING = 'downloading',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface DownloadProgress {
  percentage: number;
  speed: string;
  eta: string;
  currentTask: string;
  fileId?: string;
}

export interface VideoMetadata {
  title: string;
  thumbnail: string;
  duration: string;
}

export interface AnalyzeResponse {
  metadata: VideoMetadata;
  qualities: VideoQuality[];
  video_id?: string;
}
