'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { VideoQuality } from '@/lib/types';
import { Check, Monitor, Film } from 'lucide-react';

interface QualitySelectorProps {
  qualities: VideoQuality[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const QualitySelector: React.FC<QualitySelectorProps> = ({ qualities, selectedId, onSelect }) => {
  return (
    <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
      {qualities.map((q) => {
        const isSelected = selectedId === q.id;
        const resHeight = parseInt(q.resolution.replace('p', '')) || 0;
        return (
          <motion.button
            key={q.id}
            onClick={() => onSelect(q.id)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`
              relative flex items-center justify-between p-4 rounded-xl border transition-all duration-200
              ${isSelected
                ? 'bg-zinc-100 border-zinc-100 text-zinc-950 shadow-lg shadow-zinc-900/20'
                : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900'}
            `}
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${isSelected ? 'bg-zinc-950/10 text-zinc-950' : 'bg-zinc-800 text-zinc-500'}`}>
                {resHeight >= 1080 ? <Monitor size={20} /> : <Film size={20} />}
              </div>
              <div className="text-left">
                <div className={`font-semibold ${isSelected ? 'text-zinc-950' : 'text-zinc-200'}`}>
                  {q.resolution} <span className="opacity-60 text-xs ml-1">• {q.fps}fps</span>
                </div>
                <div className="text-xs opacity-60 flex gap-2">
                   <span>{q.ext.toUpperCase()}</span>
                   <span>•</span>
                   <span>{q.size}</span>
                   {q.note && (
                     <>
                       <span>•</span>
                       <span className="font-medium text-emerald-500/80">{q.note}</span>
                     </>
                   )}
                </div>
              </div>
            </div>

            {isSelected && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-zinc-950"
              >
                <Check size={20} />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
