'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProgressiveStatusProps {
  /** Current phase label, e.g. "Thinking…", "Drafting page 2 of 6…", "Polishing…" */
  phase: string | null;
  className?: string;
}

/**
 * Claude-style progressive status: a single morphing one-liner with a soft pulse dot.
 * No percentages, no progress bars, no terminal text. Just a calm live caption.
 */
export default function ProgressiveStatus({ phase, className = '' }: ProgressiveStatusProps) {
  if (!phase) return null;
  return (
    <div
      className={`flex items-center gap-2.5 text-sm text-[var(--color-muted,#7A756B)] ${className}`}
      aria-live="polite"
    >
      <SoftPulseDot />
      <AnimatePresence mode="wait">
        <motion.span
          key={phase}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="font-serif italic"
        >
          {phase}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export function SoftPulseDot() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent,#CC785C)] opacity-60 animate-ping" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-accent,#CC785C)]" />
    </span>
  );
}
