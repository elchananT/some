'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, ArrowRight } from 'lucide-react';
import type { StylePrefs, PrintThemeId, QuestionTypeId, DensityId, DifficultyId, AccessibilityId } from '@/lib/types';
import { PRINT_THEMES, QUESTION_TYPES } from '@/lib/generation/print_themes';

interface StylePickerCardProps {
  onSubmit: (prefs: StylePrefs) => void;
  onSkip?: () => void;
}

const DENSITY_OPTIONS: { id: DensityId; label: string; hint: string }[] = [
  { id: 'light', label: 'Light', hint: 'lots of whitespace' },
  { id: 'balanced', label: 'Balanced', hint: 'recommended' },
  { id: 'dense', label: 'Dense', hint: 'more per page' },
];

const DIFFICULTY_OPTIONS: { id: DifficultyId; label: string; hint: string }[] = [
  { id: 'basic', label: 'Basic', hint: 'simple vocabulary' },
  { id: 'intermediate', label: 'Intermediate', hint: 'grade level' },
  { id: 'advanced', label: 'Advanced', hint: 'academic depth' },
];

export default function StylePickerCard({ onSubmit, onSkip }: StylePickerCardProps) {
  const [theme, setTheme] = useState<PrintThemeId>('modern-workbook');
  const [density, setDensity] = useState<DensityId>('balanced');
  const [difficulty, setDifficulty] = useState<DifficultyId>('intermediate');
  const [accessibility, setAccessibility] = useState<AccessibilityId>('standard');
  const [qtypes, setQtypes] = useState<QuestionTypeId[]>([
    'mcq',
    'short-answer',
    'fill-blank',
  ]);

  const toggleQtype = (id: QuestionTypeId) =>
    setQtypes(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const canSubmit = qtypes.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-4xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-8 md:p-10 shadow-sm"
    >
      <div className="mb-6">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          Step 2 · Design
        </span>
        <h2 className="text-2xl md:text-3xl font-serif italic text-[var(--color-ink)] mt-1">
          How should your workbook look?
        </h2>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Pick a visual style, the question formats you want, and how dense each page should feel. We&apos;ll bake these into the final PDF.
        </p>
      </div>

      {/* Visual style */}
      <section className="mb-8">
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-muted)] mb-3">
          Visual style
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PRINT_THEMES.map(t => {
            const selected = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`group relative text-left rounded-2xl border p-4 transition-all ${
                  selected
                    ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20 bg-[var(--color-sidebar)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/40 bg-white'
                }`}
              >
                {selected && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
                <div
                  className="h-16 rounded-lg mb-3 border border-[var(--color-border)] flex items-center justify-center overflow-hidden"
                  style={{ background: t.bg }}
                >
                  <div
                    className="w-full h-2 mx-3 rounded"
                    style={{ background: t.accent, opacity: 0.7 }}
                  />
                </div>
                <div className="text-sm font-semibold text-[var(--color-ink)]">{t.label}</div>
                <div className="text-[11px] text-[var(--color-muted)] leading-snug mt-0.5">
                  {t.blurb}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Question types */}
      <section className="mb-8">
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-muted)] mb-3">
          Question types <span className="text-[var(--color-accent)] normal-case">· pick any</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {QUESTION_TYPES.map(q => {
            const selected = qtypes.includes(q.id);
            return (
              <button
                key={q.id}
                onClick={() => toggleQtype(q.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all ${
                  selected
                    ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                    : 'bg-white text-[var(--color-ink)] border-[var(--color-border)] hover:border-[var(--color-accent)]/50'
                }`}
              >
                {q.label}
                <span className={`ml-1.5 text-[10px] ${selected ? 'opacity-60' : 'opacity-40'}`}>
                  {q.hint}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Density */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-muted)] mb-3">
              Page density
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {DENSITY_OPTIONS.map(d => {
                const selected = density === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setDensity(d.id)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                      selected
                        ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20 bg-[var(--color-sidebar)]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/40 bg-white'
                    }`}
                  >
                    <div className="text-xs font-semibold text-[var(--color-ink)]">{d.label}</div>
                    <div className="text-[10px] text-[var(--color-muted)] leading-tight">{d.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-muted)] mb-3">
              Difficulty level
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTY_OPTIONS.map(d => {
                const selected = difficulty === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setDifficulty(d.id)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                      selected
                        ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20 bg-[var(--color-sidebar)]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/40 bg-white'
                    }`}
                  >
                    <div className="text-xs font-semibold text-[var(--color-ink)]">{d.label}</div>
                    <div className="text-[10px] text-[var(--color-muted)] leading-tight">{d.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Accessibility */}
      <section className="mb-8 p-4 rounded-2xl border border-[var(--color-border)] bg-white/50">
        <label className="flex items-center gap-4 cursor-pointer group">
           <div className="relative inline-flex items-center">
             <input
               type="checkbox"
               className="sr-only peer"
               checked={accessibility === 'dyslexia-friendly'}
               onChange={(e) => setAccessibility(e.target.checked ? 'dyslexia-friendly' : 'standard')}
             />
             <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-accent)]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
           </div>
           <div>
             <span className="text-sm font-semibold text-[var(--color-ink)]">Dyslexia-friendly theme</span>
             <p className="text-xs text-[var(--color-muted)]">Uses OpenDyslexic font and increased line spacing for better readability</p>
           </div>
        </label>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
        {onSkip ? (
          <button
            onClick={onSkip}
            className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
          >
            Skip — use defaults
          </button>
        ) : (
          <span />
        )}
        <button
          disabled={!canSubmit}
          onClick={() => onSubmit({ theme, density, questionTypes: qtypes, difficulty, accessibility })}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-[0.15em] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
        >
          Build workbook
          <ArrowRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}
