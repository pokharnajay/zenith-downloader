'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, CheckCircle2, AlertCircle, RefreshCcw, Video, Music, Folder } from 'lucide-react';

import { AppStep, VideoMetadata, DownloadProgress } from '@/lib/types';
import { fetchAnalysis, downloadVideo } from '@/lib/api';

export default function Home() {
  const [step, setStep] = useState<AppStep>(AppStep.IDLE);
  const [url, setUrl] = useState('');
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [downloadPath, setDownloadPath] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('');

  // Step 1: Analyze Link
  const handleAnalyze = async () => {
    if (!url) return;
    setStep(AppStep.FETCHING);
    setErrorMessage('');
    try {
      const { metadata: meta } = await fetchAnalysis(url);
      setMetadata(meta);
      setStep(AppStep.SELECTION);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || 'Failed to analyze video');
      setStep(AppStep.ERROR);
    }
  };

  // Step 2: Format selection - ask for download location
  const handleSelectFormat = (formatId: string) => {
    setSelectedFormat(formatId);
    // Open folder picker (using input type="file" with webkitdirectory)
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        // Get the directory path from the first file
        const filePath = files[0].webkitRelativePath;
        const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
        // In Electron or when running locally, we can get the full path
        // For now, we'll use a manual input
        const fullPath = (files[0] as any).path || '';
        const folderPath = fullPath ? fullPath.substring(0, fullPath.lastIndexOf('/')) : '';

        if (folderPath) {
          setDownloadPath(folderPath);
          startDownload(formatId, folderPath);
        } else {
          // Fallback: ask user to type the path
          setStep(AppStep.SELECTION);
          alert('Please enter the download path manually in the input field below.');
        }
      }
    };

    input.click();
  };

  // Alternative: manual path input
  const handleManualDownload = () => {
    if (!downloadPath || !selectedFormat) return;
    startDownload(selectedFormat, downloadPath);
  };

  // Step 3: Download
  const startDownload = async (formatId: string, path: string) => {
    setStep(AppStep.DOWNLOADING);
    setErrorMessage('');
    setLogs([]);
    setProgress(null);

    try {
      const stream = downloadVideo(url, formatId, path);
      for await (const update of stream) {
        setProgress(update);
        setLogs(prev => {
          const lastLog = prev[prev.length - 1];
          if (lastLog !== update.currentTask) {
            return [...prev, update.currentTask];
          }
          return prev;
        });
      }

      setLogs(prev => [...prev, "Download completed successfully."]);
      setStep(AppStep.COMPLETED);
    } catch (e: any) {
      setErrorMessage(e.message || 'Download failed');
      setStep(AppStep.ERROR);
    }
  };

  const reset = () => {
    setStep(AppStep.IDLE);
    setUrl('');
    setMetadata(null);
    setErrorMessage('');
    setProgress(null);
    setLogs([]);
    setDownloadPath('');
    setSelectedFormat('');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 selection:bg-zinc-800 selection:text-white">

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-zinc-800/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[128px]" />
      </div>

      <motion.div
        layout
        className="relative z-10 w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="text-center mb-10">
          <motion.h1
            className="text-4xl font-light tracking-tighter text-white mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Zenith
          </motion.h1>
          <motion.p
            className="text-zinc-500 text-sm font-mono tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            HIGH PERFORMANCE DOWNLOADER
          </motion.p>
        </div>

        {/* Card Container */}
        <motion.div
          className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/50 rounded-3xl p-8 shadow-2xl overflow-hidden"
          layout
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <AnimatePresence mode="wait">

            {/* 1. INPUT STEP */}
            {step === AppStep.IDLE && (
              <motion.div
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Video Link</label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                      placeholder="Paste your link here..."
                      className="w-full bg-black/50 border border-zinc-800 text-zinc-100 rounded-xl px-5 py-4 pl-12 outline-none focus:ring-2 focus:ring-zinc-700 focus:border-transparent transition-all placeholder:text-zinc-600 font-mono text-sm"
                    />
                    <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-zinc-200 transition-colors" size={20} />
                  </div>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={!url}
                  className="w-full bg-zinc-100 hover:bg-white text-black font-semibold h-14 rounded-xl transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Analyze Video
                </button>
              </motion.div>
            )}

            {/* 2. FETCHING STATE */}
            {step === AppStep.FETCHING && (
              <motion.div
                key="fetching"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <div className="relative w-16 h-16">
                   <motion.div
                      className="absolute inset-0 border-4 border-zinc-800 rounded-full"
                   />
                   <motion.div
                      className="absolute inset-0 border-4 border-t-zinc-100 border-r-transparent border-b-transparent border-l-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                   />
                </div>
                <p className="mt-6 text-zinc-400 font-mono text-sm animate-pulse">Parsing metadata...</p>
              </motion.div>
            )}

            {/* 3. SELECTION STEP */}
            {step === AppStep.SELECTION && metadata && (
              <motion.div
                key="selection"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Metadata Preview */}
                <div className="flex gap-4 items-start p-3 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
                  <img src={metadata.thumbnail} alt="thumb" className="w-24 h-16 object-cover rounded-lg opacity-80" />
                  <div className="overflow-hidden flex-1">
                    <h3 className="text-zinc-200 font-medium text-sm leading-tight mb-1 line-clamp-2">{metadata.title}</h3>
                    <span className="text-xs text-zinc-500 font-mono bg-zinc-900 px-1.5 py-0.5 rounded">{metadata.duration}</span>
                  </div>
                </div>

                {/* Download Path Input */}
                {selectedFormat && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Download Location</label>
                    <div className="relative group">
                      <input
                        type="text"
                        value={downloadPath}
                        onChange={(e) => setDownloadPath(e.target.value)}
                        placeholder="/Users/yourname/Downloads"
                        className="w-full bg-black/50 border border-zinc-800 text-zinc-100 rounded-xl px-5 py-4 pl-12 outline-none focus:ring-2 focus:ring-zinc-700 focus:border-transparent transition-all placeholder:text-zinc-600 font-mono text-sm"
                      />
                      <Folder className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-zinc-200 transition-colors" size={20} />
                    </div>
                    <button
                      onClick={handleManualDownload}
                      disabled={!downloadPath}
                      className="w-full bg-zinc-100 hover:bg-white text-black font-semibold h-14 rounded-xl transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Start Download
                    </button>
                  </div>
                )}

                {/* Download Options */}
                {!selectedFormat && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Select Format</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleSelectFormat('video')}
                        className="group relative bg-zinc-950/50 hover:bg-zinc-800/50 border border-zinc-800/50 hover:border-zinc-700 rounded-xl p-4 transition-all active:scale-[0.98]"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Video className="text-zinc-400 group-hover:text-zinc-200 transition-colors" size={32} />
                          <div className="text-center">
                            <div className="text-zinc-200 font-medium text-sm">Video</div>
                            <div className="text-zinc-500 text-xs">MP4 format</div>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => handleSelectFormat('audio')}
                        className="group relative bg-zinc-950/50 hover:bg-zinc-800/50 border border-zinc-800/50 hover:border-zinc-700 rounded-xl p-4 transition-all active:scale-[0.98]"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Music className="text-zinc-400 group-hover:text-zinc-200 transition-colors" size={32} />
                          <div className="text-center">
                            <div className="text-zinc-200 font-medium text-sm">Audio</div>
                            <div className="text-zinc-500 text-xs">MP3 format</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                <button onClick={reset} className="w-full px-6 py-3 rounded-xl bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors font-medium text-sm">
                  Back
                </button>
              </motion.div>
            )}

            {/* 4. DOWNLOADING STEP */}
            {step === AppStep.DOWNLOADING && (
              <motion.div
                key="downloading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <h3 className="text-zinc-200 font-medium">Downloading...</h3>
                  <p className="text-xs text-zinc-500 font-mono">{progress?.currentTask || 'Preparing'}</p>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress?.percentage || 0}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                  />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 text-center">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Speed</div>
                    <div className="text-zinc-200 font-mono">{progress?.speed || '--'}</div>
                  </div>
                  <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 text-center">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">ETA</div>
                    <div className="text-zinc-200 font-mono">{progress?.eta || '--'}</div>
                  </div>
                </div>

                {/* Terminal Logs */}
                <div className="bg-black/50 rounded-xl p-4 border border-zinc-800/50 max-h-32 overflow-y-auto">
                  <div className="space-y-1 font-mono text-xs">
                    {logs.map((log, i) => (
                      <div key={i} className="text-zinc-400">
                        <span className="text-zinc-600">→</span> {log}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 5. COMPLETED STEP */}
            {step === AppStep.COMPLETED && (
               <motion.div
                 key="completed"
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="flex flex-col items-center text-center py-8 space-y-6"
               >
                  <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-2">
                     <CheckCircle2 size={40} />
                  </div>

                  <div className="space-y-2">
                     <h2 className="text-2xl font-light text-white">Success!</h2>
                     <p className="text-zinc-500 text-sm max-w-xs mx-auto">
                        Your file has been saved to {downloadPath}
                     </p>
                  </div>

                  <button
                    onClick={reset}
                    className="mt-8 px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-full transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <RefreshCcw size={16} />
                    Download Another
                  </button>
               </motion.div>
            )}

             {/* ERROR STATE */}
             {step === AppStep.ERROR && (
               <motion.div
                 key="error"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="flex flex-col items-center text-center py-8"
               >
                  <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                     <AlertCircle size={32} />
                  </div>
                  <h3 className="text-zinc-200 font-medium mb-2">Something went wrong</h3>
                  <p className="text-zinc-500 text-sm mb-6 max-w-xs">
                    {errorMessage || "Failed to process your request."}
                  </p>
                  <button onClick={reset} className="text-zinc-400 hover:text-white underline text-sm">Try Again</button>
               </motion.div>
             )}

          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.div
           className="mt-8 text-center"
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.5 }}
        >
           <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
              Powered by yt-dlp
           </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
