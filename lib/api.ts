import { AnalyzeResponse } from './types';

export const fetchAnalysis = async (url: string): Promise<AnalyzeResponse> => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze video');
  }

  return response.json();
};

export const generateSmartFilename = async (title: string): Promise<string> => {
  const response = await fetch('/api/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    return title.replace(/[^a-zA-Z0-9]/g, '_');
  }

  const data = await response.json();
  return data.filename;
};

export interface DownloadUrlResponse {
  video_url: string;
  audio_url: string | null;
  title: string;
  ext: string;
  needs_merge: boolean;
}

export const getDownloadUrl = async (
  url: string,
  formatId: string
): Promise<DownloadUrlResponse> => {
  const response = await fetch('/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, format_id: formatId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get download URL');
  }

  return response.json();
};

export const triggerBrowserDownload = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
