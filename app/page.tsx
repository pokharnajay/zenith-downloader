'use client';

import React, { useState, useEffect } from 'react';
import { Link2, CheckCircle2, AlertCircle, RefreshCcw, Video, Music, Youtube, Instagram, Clock, Eye } from 'lucide-react';

enum AppStep {
  IDLE = 'IDLE',
  DOWNLOADING = 'DOWNLOADING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

interface VideoMetadata {
  title: string;
  duration: number;
  thumbnail: string | null;
  channel: string;
  viewCount: number;
  uploadDate: string | null;
}

export default function Home() {
  const [platform, setPlatform] = useState<'youtube' | 'instagram' | null>('youtube');
  const [step, setStep] = useState<AppStep>(AppStep.IDLE);
  const [url, setUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [downloadedFormat, setDownloadedFormat] = useState<string>('');
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState('');

  // Format duration from seconds to MM:SS or HH:MM:SS
  const formatDuration = (seconds: number): string => {
    if (!seconds) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Format view count
  const formatViews = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K views`;
    return `${count} views`;
  };

  // Validate YouTube URL
  const isValidYouTubeUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return (
        (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) &&
        url.length > 10
      );
    } catch {
      return false;
    }
  };

  // Fetch video metadata automatically when URL changes
  useEffect(() => {
    // Clear metadata if URL is empty
    if (!url) {
      setMetadata(null);
      setMetadataError('');
      return;
    }

    // Validate URL
    if (!isValidYouTubeUrl(url)) {
      setMetadata(null);
      return;
    }

    // Debounce: wait 500ms after user stops typing
    const timeoutId = setTimeout(async () => {
      setLoadingMetadata(true);
      setMetadataError('');

      try {
        const response = await fetch(`/api/video/info?url=${encodeURIComponent(url)}`);
        const data = await response.json();

        if (response.ok) {
          setMetadata(data);
        } else {
          setMetadataError(data.error || 'Failed to fetch video info');
          setMetadata(null);
        }
      } catch (error: any) {
        setMetadataError('Failed to fetch video info');
        setMetadata(null);
      } finally {
        setLoadingMetadata(false);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [url]);

  // Extract video title from URL or use default
  const getFilenameFromUrl = (url: string): string => {
    if (metadata?.title) {
      return metadata.title.replace(/[^a-zA-Z0-9\s]/g, '_').substring(0, 100);
    }

    try {
      const urlObj = new URL(url);
      const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop() || 'download';
      return `youtube_${videoId}`;
    } catch {
      return 'download';
    }
  };

  // Direct download
  const handleDownload = (formatId: 'video' | 'audio') => {
    if (!url) return;

    setStep(AppStep.DOWNLOADING);
    setErrorMessage('');
    setDownloadedFormat(formatId);

    const filename = getFilenameFromUrl(url);
    const downloadUrl = `/api/stream-download-v2?url=${encodeURIComponent(url)}&format_id=${formatId}&filename=${encodeURIComponent(filename)}`;

    // Trigger browser download
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Show completion after short delay
    setTimeout(() => {
      setStep(AppStep.COMPLETED);
    }, 1000);
  };

  const reset = () => {
    setStep(AppStep.IDLE);
    setUrl('');
    setErrorMessage('');
    setDownloadedFormat('');
    setMetadata(null);
    setMetadataError('');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 selection:bg-zinc-800 selection:text-white">
      

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-zinc-800/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-4">
          <p className="text-zinc-500 text-sm font-mono tracking-wide">
            HIGH PERFORMANCE DOWNLOADER
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-zinc-950 border border-zinc-800/50 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">

          {/* Platform Selector */}
          {step === AppStep.IDLE && (
            <div className="mb-6">
              <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">
                Select Platform
              </label>
              {loadingMetadata && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-zinc-600 border-t-red-600" />
                    </div>
                  )}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPlatform('youtube')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    platform === 'youtube'
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <Youtube size={20} />
                  <span className="font-semibold">YouTube</span>
                </button>

                <button
                  onClick={() => setPlatform('instagram')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    platform === 'instagram'
                      ? 'border-transparent text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                  style={
                    platform === 'instagram'
                      ? {
                          backgroundImage:
                            'linear-gradient(90deg, #515BD4, #8134AF, #DD2A7B, #FEDA77, #F58529)',
                        }
                      : {}
                  }
                >
                  <Instagram size={20} />
                  <span className="font-semibold">Instagram</span>
                </button>
              </div>
            </div>
          )}

          {/* URL Input */}
          {platform === 'youtube' && step === AppStep.IDLE && (
            <div className="space-y-4">
              <div>
                <label className="block text-zinc-300 text-sm font-semibold mb-2">
                  YouTube URL
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-red-600 transition-colors"
                  />
                </div>
                <p className="text-zinc-500 text-xs mt-2">
                  Supports all YouTube URL formats (watch, youtu.be, with playlist, timestamps, etc.)
                </p>
              </div>

              {/* Video Preview Card */}
              {metadata && !metadataError && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    {metadata.thumbnail && (
                      <div className="flex-shrink-0">
                        <img
                          src={metadata.thumbnail}
                          alt={metadata.title}
                          className="w-40 h-24 object-cover rounded-lg"
                        />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-sm line-clamp-2 mb-2">
                        {metadata.title}
                      </h3>
                      <p className="text-zinc-400 text-xs mb-2">{metadata.channel}</p>
                      <div className="flex items-center gap-4 text-zinc-500 text-xs">
                        {metadata.duration > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{formatDuration(metadata.duration)}</span>
                          </div>
                        )}
                        {metadata.viewCount > 0 && (
                          <div className="flex items-center gap-1">
                            <Eye size={12} />
                            <span>{formatViews(metadata.viewCount)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Metadata Error */}
              {metadataError && !loadingMetadata && url && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                  {metadataError}
                </div>
              )}

              {/* Quality Selection */}
              {metadata && (
                <div className="space-y-3">
                  <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                    Select Quality & Format
                  </label>

                  {/* Video Options */}
                  <button
                    onClick={() => handleDownload('video')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-red-600 rounded-lg transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-600/10 group-hover:bg-red-600/20 rounded-lg transition-colors">
                        <Video size={20} className="text-red-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-white font-semibold text-sm">Video (MP4)</div>
                        <div className="text-zinc-500 text-xs">1080p • Best quality</div>
                      </div>
                    </div>
                    <div className="text-zinc-600 group-hover:text-zinc-400 text-xs">
                      Download →
                    </div>
                  </button>

                  {/* Audio Option */}
                  <button
                    onClick={() => handleDownload('audio')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-blue-600 rounded-lg transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600/10 group-hover:bg-blue-600/20 rounded-lg transition-colors">
                        <Music size={20} className="text-blue-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-white font-semibold text-sm">Audio Only (M4A)</div>
                        <div className="text-zinc-500 text-xs">High quality • Smaller size</div>
                      </div>
                    </div>
                    <div className="text-zinc-600 group-hover:text-zinc-400 text-xs">
                      Download →
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Instagram Coming Soon */}
          {platform === 'instagram' && step === AppStep.IDLE && (
            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-semibold uppercase tracking-wider mb-2 bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      'linear-gradient(90deg, #515BD4, #8134AF, #DD2A7B, #FEDA77, #F58529)',
                  }}
                >
                  Instagram Link
                </label>
                <input
                  disabled
                  placeholder="Coming Soon..."
                  className="w-full px-4 py-3 bg-zinc-900 rounded-lg text-zinc-600 cursor-not-allowed"
                  style={{
                    border: '2px solid transparent',
                    backgroundImage:
                      'linear-gradient(#000, #000), linear-gradient(90deg, #515BD4, #8134AF, #DD2A7B, #FEDA77, #F58529)',
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                  }}
                />
              </div>

              <button
                disabled
                className="w-full px-6 py-4 text-white font-semibold rounded-lg cursor-not-allowed"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, #515BD4, #8134AF, #DD2A7B, #FEDA77, #F58529)',
                }}
              >
                Coming Soon 🎉
              </button>
            </div>
          )}

          {/* Downloading State */}
          {step === AppStep.DOWNLOADING && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-zinc-700 border-t-red-600 mb-4" />
              <p className="text-zinc-300 font-semibold">Starting download...</p>
              <p className="text-zinc-500 text-sm mt-2">
                Your browser will prompt you to save the file
              </p>
            </div>
          )}

          {/* Completed State */}
          {step === AppStep.COMPLETED && (
            <div className="text-center py-8">
              <CheckCircle2 className="mx-auto text-green-500 mb-4" size={48} />
              <p className="text-zinc-200 font-semibold text-lg mb-2">Download Started!</p>
              <p className="text-zinc-400 text-sm mb-6">
                Check your browser's download manager
              </p>
              <p className="text-zinc-500 text-xs mb-6">
                Format: {downloadedFormat === 'video' ? 'Video (MP4)' : 'Audio (M4A)'}
              </p>
              <button
                onClick={reset}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg transition-all inline-flex items-center gap-2"
              >
                <RefreshCcw size={18} />
                Download Another
              </button>
            </div>
          )}

          {/* Error State */}
          {step === AppStep.ERROR && (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
              <p className="text-zinc-200 font-semibold text-lg mb-2">Error</p>
              <p className="text-zinc-400 text-sm mb-6">{errorMessage}</p>
              <button
                onClick={reset}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg transition-all inline-flex items-center gap-2"
              >
                <RefreshCcw size={18} />
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-zinc-600 text-xs">
          <p>
            POWERED BY JP
          </p>
          {/* <p className="mt-1">
            Admin: <a href="/admin" className="text-zinc-400 hover:text-white transition-colors">Cookie Management</a>
          </p> */}
        </div>
      </div>
    </div>
  );
}
