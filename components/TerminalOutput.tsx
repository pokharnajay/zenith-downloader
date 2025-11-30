'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface TerminalOutputProps {
  logs: string[];
}

export const TerminalOutput: React.FC<TerminalOutputProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="w-full bg-black/40 border border-zinc-800 rounded-lg p-4 font-mono text-xs h-48 overflow-y-auto backdrop-blur-sm">
      <div className="flex flex-col gap-1">
        {logs.map((log, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-zinc-400 break-all"
          >
            <span className="text-zinc-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
            {log}
          </motion.div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};
