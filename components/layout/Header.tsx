'use client';

import React, { useState } from 'react';
import { Menu, Plus, GraduationCap, Languages, Settings as SettingsIcon } from 'lucide-react';
import ProviderSwitcher from './ProviderSwitcher';
import SettingsPanel from './SettingsPanel';

interface HeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  onNewConversation: () => void;
  hasArtifact: boolean;
  layoutDirection: 'ltr' | 'rtl';
  setLayoutDirection: (dir: 'ltr' | 'rtl') => void;
}

export default function Header({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  onNewConversation, 
  hasArtifact,
  layoutDirection,
  setLayoutDirection
}: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <header className="px-6 py-4 flex items-center justify-between border-b border-[var(--color-border)] bg-white z-40 shrink-0">
      <div className="flex items-center gap-4">
        <button 
          id="hamburger-menu"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className={`p-2.5 rounded-xl transition-all active:scale-95 text-[var(--color-muted)] hover:text-[var(--color-ink)] ${isSidebarOpen ? 'bg-[var(--color-sidebar)] text-[var(--color-ink)]' : 'hover:bg-[var(--color-sidebar)]'}`}
          title={isSidebarOpen ? "Close Menu" : "Open Menu"}
        >
          <Menu size={22} strokeWidth={2} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[var(--color-ink)] rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/10">
            <GraduationCap size={20} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-serif italic font-black leading-none text-[var(--color-ink)]">EduSpark</h1>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-[var(--color-muted)] mt-1">Curriculum Architect</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <ProviderSwitcher />
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2.5 rounded-xl transition-all active:scale-95 text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-sidebar)]"
          title="Settings"
          aria-label="Open Settings"
        >
          <SettingsIcon size={18} />
        </button>
        <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <button 
          onClick={() => setLayoutDirection(layoutDirection === 'ltr' ? 'rtl' : 'ltr')}
          className={`flex items-center gap-2 p-2.5 rounded-xl transition-all active:scale-95 text-xs font-bold uppercase tracking-widest ${layoutDirection === 'rtl' ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'text-[var(--color-muted)] hover:bg-[var(--color-sidebar)] hover:text-[var(--color-ink)]'}`}
          title="Switch Text Direction"
        >
          <Languages size={18} />
          <span className="hidden md:inline">{layoutDirection === 'rtl' ? 'Hebrew/RTL' : 'English/LTR'}</span>
        </button>
        <button 
          onClick={onNewConversation}
          className="flex items-center gap-2.5 px-4 py-2 bg-[var(--color-sidebar)] hover:bg-[#eee] border border-[var(--color-border)] rounded-xl transition-all text-xs font-bold uppercase tracking-widest text-[var(--color-ink)] hover:text-[var(--color-ink)] active:scale-95"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">New Build</span>
        </button>
      </div>
    </header>
  );
}
