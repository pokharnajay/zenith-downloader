'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, CheckCircle2, AlertCircle, RefreshCcw, Video, Music, Youtube, Instagram } from 'lucide-react';

import { AppStep, VideoMetadata, DownloadProgress } from '@/lib/types';
import { fetchAnalysis, downloadVideo } from '@/lib/api';

export default function Home() {
  const [platform, setPlatform] = useState<'youtube' | 'instagram' | null>('youtube'); // Default to YouTube
  const [step, setStep] = useState<AppStep>(AppStep.IDLE);
  const [url, setUrl] = useState('');
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [fileId, setFileId] = useState<string>('');
  const [downloadedFilename, setDownloadedFilename] = useState<string>('');

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

  // Step 2: Format selection and start download DIRECTLY
  const handleSelectFormat = (formatId: string) => {
    // Trigger immediate download via direct stream URL
    const filename = (metadata?.title || 'download').replace(/[^a-zA-Z0-9\s]/g, '_');
    const downloadUrl = `/api/stream-download?url=${encodeURIComponent(url)}&format_id=${formatId}&filename=${encodeURIComponent(filename)}`;

    // Create hidden link and click it to trigger browser download
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Show completion message
    setStep(AppStep.COMPLETED);
    setDownloadedFilename(filename);
  };

  // Legacy functions kept for compatibility but not used
  const startDownload = async (formatId: string) => {
    // Not used anymore - direct download via handleSelectFormat
  };

  const handleSaveFile = async () => {
    // Not used anymore - download happens automatically
  };

  const reset = () => {
    setStep(AppStep.IDLE);
    setUrl('');
    setMetadata(null);
    setErrorMessage('');
    setProgress(null);
    setLogs([]);
    setFileId('');
    setDownloadedFilename('');
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
                {/* Platform Selector */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Choose Platform</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPlatform('youtube')}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                        platform === 'youtube'
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <Youtube size={20} />
                      YouTube
                    </button>
                    <button
                      onClick={() => setPlatform('instagram')}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                        platform === 'instagram'
                          ? 'text-white'
                          : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                      style={platform === 'instagram' ? {
                        backgroundImage: 'linear-gradient(90deg, #515BD4, #8134AF, #DD2A7B, #FEDA77, #F58529)'
                      } : {}}
                    >
                      <Instagram size={20} />
                      Instagram
                    </button>
                  </div>
                </div>

                {/* URL Input - Only for YouTube */}
                {platform === 'youtube' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Video Link</label>
                      <div className="relative group">
                        <input
                          type="text"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                          placeholder="Paste YouTube link here..."
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
                  </>
                )}

                {/* Instagram Coming Soon */}
                {platform === 'instagram' && (
                  <>
                    <div className="space-y-2">
                      <label
                        className="text-xs font-semibold uppercase tracking-wider ml-1 bg-clip-text text-transparent"
                        style={{
                          backgroundImage: 'linear-gradient(90deg, #515BD4, #8134AF, #DD2A7B, #FEDA77, #F58529)'
                        }}
                      >
                        Instagram Link
                      </label>
                      <div className="relative group">
                        <input
                          type="text"
                          disabled
                          placeholder="Coming Soon..."
                          className="w-full bg-black/50 text-[#FEDA77] rounded-xl px-5 py-4 pl-12 outline-none cursor-not-allowed font-mono text-sm"
                          style={{
                            border: '2px solid transparent',
                            backgroundImage: 'linear-gradient(#000, #000), linear-gradient(90deg, #515BD4, #8134AF, #DD2A7B, #FEDA77, #F58529)',
                            backgroundOrigin: 'border-box',
                            backgroundClip: 'padding-box, border-box'
                          }}
                        />
                        <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-[#DD2A7B]" size={20} />
                      </div>
                    </div>

                    <button
                      disabled
                      className="w-full opacity-50 cursor-not-allowed text-white font-semibold h-14 rounded-xl flex items-center justify-center gap-2"
                      style={{
                        backgroundImage: 'linear-gradient(90deg, #515BD4, #8134AF, #DD2A7B, #FEDA77, #F58529)'
                      }}
                    >
                      Coming Soon 🎉
                    </button>
                  </>
                )}
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

                {/* Download Options */}
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

                <button onClick={reset} className="w-full px-6 py-3 rounded-xl bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors font-medium text-sm">
                  Back
                </button>
              </motion.div>
            )}

            {/* 4. DOWNLOADING STEP - Not used with new direct streaming */}

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
                     <h2 className="text-2xl font-light text-white">Download Started!</h2>
                     <p className="text-zinc-500 text-sm max-w-xs mx-auto">
                        Your browser should start downloading the file automatically. Check your downloads folder!
                     </p>
                  </div>

                  <div className="flex flex-col gap-3 w-full">
                    <button
                      onClick={reset}
                      className="px-6 py-3 rounded-xl bg-white text-black hover:bg-zinc-100 transition-colors font-medium text-sm"
                    >
                      Download Another Video
                    </button>
                  </div>
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
