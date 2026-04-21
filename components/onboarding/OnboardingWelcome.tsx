'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Cloud, HardDrive, Bot } from 'lucide-react';
import GeminiSetupStep from './GeminiSetupStep';
import OllamaSetupStep from './OllamaSetupStep';
import AnthropicSetupStep from './AnthropicSetupStep';
import { markOnboardingComplete } from '@/lib/ai/keys';
import { setActiveProviderId } from '@/lib/providers';

interface Props {
  onDone: () => void;
}

type Path = 'pick' | 'gemini' | 'ollama' | 'anthropic';

/**
 * Full-screen Claude-style welcome. Two big cards (Gemini / Ollama) plus a
 * small "demo mode" fallback link. Re-openable from the gear icon in Header.
 */
export default function OnboardingWelcome({ onDone }: Props) {
  const [path, setPath] = useState<Path>('pick');

  const useDemo = () => {
    setActiveProviderId('mock');
    markOnboardingComplete('demo');
    onDone();
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-[var(--color-bg,#FAF9F6)] flex items-center justify-center p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to EduSpark"
    >
      <AnimatePresence mode="wait">
        {path === 'pick' && (
          <motion.div
            key="pick"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-3xl flex flex-col items-center gap-10 py-10"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent,#CC785C)] flex items-center justify-center text-white">
                <Sparkles size={26} />
              </div>
              <h1 className="text-4xl md:text-5xl font-serif italic text-[var(--color-ink,#1F1F1C)] leading-tight">
                Bring your own AI
              </h1>
              <p className="text-[var(--color-muted,#7A756B)] max-w-xl">
                EduSpark never charges you for AI. Pick a provider — your key or model stays on your device, and you generate beautiful workbooks for free.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              <button
                onClick={() => setPath('gemini')}
                className="group relative text-left bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-accent,#CC785C)]/40 hover:border-[var(--color-accent,#CC785C)] rounded-3xl p-6 transition-all shadow-sm"
              >
                <span className="absolute -top-2.5 left-5 px-2 py-0.5 rounded-full bg-[var(--color-accent,#CC785C)] text-white text-[10px] font-bold uppercase tracking-widest">
                  Recommended · Free
                </span>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-bg,#FAF9F6)] flex items-center justify-center">
                    <Cloud size={20} className="text-[var(--color-accent,#CC785C)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--color-ink,#1F1F1C)]">Use Gemini</h3>
                </div>
                <p className="text-sm text-[var(--color-muted,#7A756B)] leading-relaxed">
                  Paste a free Google AI Studio key. Fast, great quality, works in any browser.
                </p>
                <span className="mt-4 inline-flex items-center text-xs font-semibold uppercase tracking-widest text-[var(--color-accent,#CC785C)] group-hover:translate-x-0.5 transition-transform">
                  Continue →
                </span>
              </button>

              <button
                onClick={() => setPath('anthropic')}
                className="group text-left bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-border,#E8E4DC)] hover:border-[var(--color-accent,#CC785C)] rounded-3xl p-6 transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-bg,#FAF9F6)] flex items-center justify-center">
                    <Bot size={20} className="text-[var(--color-accent,#CC785C)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--color-ink,#1F1F1C)]">Use Claude</h3>
                </div>
                <p className="text-sm text-[var(--color-muted,#7A756B)] leading-relaxed">
                  Use your Anthropic key — great for Claude Pro subscribers. Key stays on your device.
                </p>
                <span className="mt-4 inline-flex items-center text-xs font-semibold uppercase tracking-widest text-[var(--color-accent,#CC785C)] group-hover:translate-x-0.5 transition-transform">
                  Continue →
                </span>
              </button>

              <button
                onClick={() => setPath('ollama')}
                className="group text-left bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-border,#E8E4DC)] hover:border-[var(--color-accent,#CC785C)] rounded-3xl p-6 transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-bg,#FAF9F6)] flex items-center justify-center">
                    <HardDrive size={20} className="text-[var(--color-accent,#CC785C)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--color-ink,#1F1F1C)]">Use Ollama</h3>
                </div>
                <p className="text-sm text-[var(--color-muted,#7A756B)] leading-relaxed">
                  Run open-source models on your own machine. 100% private, no account, no keys.
                </p>
                <span className="mt-4 inline-flex items-center text-xs font-semibold uppercase tracking-widest text-[var(--color-accent,#CC785C)] group-hover:translate-x-0.5 transition-transform">
                  Continue →
                </span>
              </button>
            </div>

            <button
              onClick={useDemo}
              className="text-xs text-[var(--color-muted,#7A756B)] hover:text-[var(--color-ink,#1F1F1C)] underline underline-offset-4"
            >
              Just show me a demo (no AI, uses mock data)
            </button>
          </motion.div>
        )}

        {path === 'gemini' && (
          <motion.div
            key="gemini"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <GeminiSetupStep onDone={onDone} onBack={() => setPath('pick')} />
          </motion.div>
        )}

        {path === 'anthropic' && (
          <motion.div
            key="anthropic"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <AnthropicSetupStep onDone={onDone} onBack={() => setPath('pick')} />
          </motion.div>
        )}

        {path === 'ollama' && (
          <motion.div
            key="ollama"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <OllamaSetupStep onDone={onDone} onBack={() => setPath('pick')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
