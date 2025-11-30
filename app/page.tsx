'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Download, CheckCircle2, AlertCircle, Wand2, RefreshCcw } from 'lucide-react';

import { AppStep, VideoQuality, VideoMetadata } from '@/lib/types';
import { fetchAnalysis, generateSmartFilename, getDownloadUrl, triggerBrowserDownload } from '@/lib/api';
import { QualitySelector } from '@/components/QualitySelector';

export default function Home() {
  const [step, setStep] = useState<AppStep>(AppStep.IDLE);
  const [url, setUrl] = useState('');
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [qualities, setQualities] = useState<VideoQuality[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string | null>(null);
  const [filename, setFilename] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Step 1: Analyze Link
  const handleAnalyze = async () => {
    if (!url) return;
    setStep(AppStep.FETCHING);
    setErrorMessage('');
    try {
      const { metadata: meta, qualities: quals } = await fetchAnalysis(url);
      setMetadata(meta);
      setQualities(quals);
      setFilename(meta.title.replace(/[^a-zA-Z0-9]/g, '_'));
      setStep(AppStep.SELECTION);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || 'Failed to analyze video');
      setStep(AppStep.ERROR);
    }
  };

  // Gemini Smart Rename
  const handleSmartRename = async () => {
    if (!metadata) return;
    setIsRenaming(true);
    try {
      const smartName = await generateSmartFilename(metadata.title);
      setFilename(smartName);
    } catch (e) {
      console.error("Renaming failed", e);
    } finally {
      setIsRenaming(false);
    }
  };

  // Step 2: Download Process
  const handleDownload = async () => {
    if (!selectedQuality || !filename) return;
    setStep(AppStep.DOWNLOADING);
    setErrorMessage('');

    try {
      // Get download URL from Python backend
      const downloadData = await getDownloadUrl(url, selectedQuality);

      if (downloadData.needs_merge) {
        // If video needs audio merge, show a message
        setErrorMessage('This format requires audio merging which is not supported in browser. Please select a format with audio included.');
        setStep(AppStep.ERROR);
        return;
      }

      // Trigger browser download
      const downloadFilename = `${filename}.${downloadData.ext}`;
      triggerBrowserDownload(downloadData.video_url, downloadFilename);

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
    setQualities([]);
    setSelectedQuality(null);
    setFilename('');
    setErrorMessage('');
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
                  <div className="overflow-hidden">
                    <h3 className="text-zinc-200 font-medium truncate text-sm leading-tight mb-1">{metadata.title}</h3>
                    <span className="text-xs text-zinc-500 font-mono bg-zinc-900 px-1.5 py-0.5 rounded">{metadata.duration}</span>
                  </div>
                </div>

                {/* Filename Input with AI */}
                <div className="space-y-2">
                   <div className="flex justify-between items-end">
                      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Filename</label>
                      <button
                        onClick={handleSmartRename}
                        disabled={isRenaming}
                        className="text-[10px] flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                      >
                         <Wand2 size={12} />
                         {isRenaming ? 'Thinking...' : 'AI Rename'}
                      </button>
                   </div>
                   <input
                      type="text"
                      value={filename}
                      onChange={(e) => setFilename(e.target.value)}
                      className="w-full bg-black/50 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-zinc-600 font-mono text-sm"
                    />
                </div>

                {/* Quality List */}
                <div className="space-y-2">
                   <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Select Quality</label>
                   <QualitySelector
                      qualities={qualities}
                      selectedId={selectedQuality}
                      onSelect={setSelectedQuality}
                   />
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={reset} className="px-6 py-4 rounded-xl bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors font-medium text-sm">
                    Back
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={!selectedQuality || !filename}
                    className="flex-1 bg-zinc-100 hover:bg-white text-black font-semibold h-14 rounded-xl transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Download size={18} />
                    Download
                  </button>
                </div>
              </motion.div>
            )}

            {/* 4. DOWNLOADING STEP */}
            {step === AppStep.DOWNLOADING && (
              <motion.div
                key="downloading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
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
                <p className="mt-6 text-zinc-400 font-mono text-sm animate-pulse">Preparing download...</p>
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
                     <h2 className="text-2xl font-light text-white">Download Started!</h2>
                     <p className="text-zinc-500 text-sm max-w-xs mx-auto">
                        Your file should begin downloading. Check your browser&apos;s downloads.
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
              Powered by yt-dlp & Gemini
           </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
