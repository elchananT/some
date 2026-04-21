'use client';

import React from 'react';
import { Menu, Plus, GraduationCap } from 'lucide-react';

interface HeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  onNewConversation: () => void;
  hasArtifact: boolean;
  layoutDirection: 'ltr' | 'rtl';
  setLayoutDirection: (dir: 'ltr' | 'rtl') => void;
}

// Intentionally minimal: hamburger + logo (desktop only) + New Chat.
// Settings moved to the Sidebar footer; provider switcher moved to the
// composer model chip; RTL toggle removed (auto-detect from text direction).
export default function Header({
  isSidebarOpen,
  setIsSidebarOpen,
  onNewConversation,
}: HeaderProps) {
  return (
    <header className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b border-[var(--color-border)] bg-white z-40 shrink-0">
      <div className="flex items-center gap-3 md:gap-4">
        <button
          id="hamburger-menu"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`p-2.5 rounded-xl transition-all active:scale-95 text-[var(--color-muted)] hover:text-[var(--color-ink)] ${isSidebarOpen ? 'bg-[var(--color-sidebar)] text-[var(--color-ink)]' : 'hover:bg-[var(--color-sidebar)]'}`}
          title={isSidebarOpen ? 'Close menu' : 'Open menu'}
          aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
        >
          <Menu size={22} strokeWidth={2} />
        </button>
        {/* Logo: desktop only (hidden on mobile to save space). */}
        <div className="hidden md:flex items-center gap-3">
          <div className="w-9 h-9 bg-[var(--color-ink)] rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/10">
            <GraduationCap size={20} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-serif italic font-black leading-none text-[var(--color-ink)]">EduSpark</h1>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-[var(--color-muted)] mt-1">Curriculum Architect</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onNewConversation}
          className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[var(--color-sidebar)] hover:bg-[var(--color-border)] border border-[var(--color-border)] rounded-xl transition-all text-xs font-bold uppercase tracking-widest text-[var(--color-ink)] active:scale-95"
          title="New conversation"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">New Chat</span>
        </button>
      </div>
    </header>
  );
}
