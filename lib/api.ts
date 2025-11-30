import { AnalyzeResponse, DownloadProgress } from './types';

export const fetchAnalysis = async (url: string): Promise<AnalyzeResponse> => {
  const response = await fetch('/api/py-analyze', {
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

export async function* downloadVideo(
  url: string,
  formatId: string,
  downloadPath: string
): AsyncGenerator<DownloadProgress> {
  const response = await fetch('/api/py-download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, format_id: formatId, download_path: downloadPath }),
  });

  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  let lastPercentage = 0;
  let lastSpeed = '0 MiB/s';
  let lastEta = '--';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));

          if (data.status === 'progress') {
            lastPercentage = data.percentage;
            lastSpeed = data.speed;
            lastEta = data.eta;

            yield {
              percentage: lastPercentage,
              speed: lastSpeed,
              eta: lastEta,
              currentTask: 'Downloading video data...'
            };
          } else if (data.status === 'log') {
            yield {
              percentage: lastPercentage,
              speed: lastSpeed,
              eta: lastEta,
              currentTask: data.message
            };
          } else if (data.status === 'complete') {
            return;
          } else if (data.status === 'error') {
            throw new Error(data.message);
          }
        } catch (e) {
          console.error("Parse error", e);
        }
      }
    }
  }
}
