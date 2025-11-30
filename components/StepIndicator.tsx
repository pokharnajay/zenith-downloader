import React from 'react';
import { motion } from 'framer-motion';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => {
  return (
    <div className="flex gap-2 mb-8 justify-center">
      {Array.from({ length: totalSteps }).map((_, idx) => (
        <motion.div
          key={idx}
          className={`h-1.5 rounded-full ${idx <= currentStep ? 'bg-zinc-100' : 'bg-zinc-800'}`}
          initial={false}
          animate={{
            width: idx === currentStep ? 32 : 12,
            opacity: idx <= currentStep ? 1 : 0.3
          }}
          transition={{ duration: 0.3 }}
        />
      ))}
    </div>
  );
};