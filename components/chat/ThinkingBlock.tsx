'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface ThinkingBlockProps {
  breadcrumbs: string[];
  defaultOpen?: boolean;
}

/**
 * Claude-style collapsible "thinking" block. Shows the trail of tool-call
 * breadcrumbs (e.g. "Calling propose_roadmap", "Drafting page 3…"). Lightweight
 * and unobtrusive — hidden by default.
 */
export default function ThinkingBlock({ breadcrumbs, defaultOpen = false }: ThinkingBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  if (!breadcrumbs || breadcrumbs.length === 0) return null;
  return (
    <div className="rounded-xl border border-[var(--color-border,#E8E4DC)] bg-[var(--color-bg,#FAF9F6)]/60 text-xs">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[var(--color-muted,#7A756B)] hover:text-[var(--color-ink,#1F1F1C)]"
        aria-expanded={open}
      >
        <ChevronRight
          size={12}
          className={`transition-transform ${open ? 'rotate-90' : ''}`}
        />
        <span className="font-mono uppercase tracking-widest text-[10px]">
          Thinking · {breadcrumbs.length} step{breadcrumbs.length === 1 ? '' : 's'}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-3 pb-2 space-y-1"
          >
            {breadcrumbs.map((b, i) => (
              <li
                key={`${i}-${b}`}
                className="flex items-center gap-2 text-[var(--color-muted,#7A756B)]"
              >
                <span className="w-1 h-1 rounded-full bg-[var(--color-accent,#CC785C)]/70" />
                <span className="font-serif italic">{b}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
