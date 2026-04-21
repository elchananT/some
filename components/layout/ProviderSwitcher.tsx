'use client';

import React, { useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';
import {
  AVAILABLE_PROVIDERS,
  getActiveProviderId,
  setActiveProviderId,
  ProviderId,
} from '@/lib/providers';

export default function ProviderSwitcher() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ProviderId>('mock');

  useEffect(() => {
    setActive(getActiveProviderId());
  }, []);

  const current = AVAILABLE_PROVIDERS.find(p => p.id === active) ?? AVAILABLE_PROVIDERS[0];

  const handleChange = (id: ProviderId) => {
    setActiveProviderId(id);
    setActive(id);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 p-2.5 rounded-xl transition-all active:scale-95 text-xs font-bold uppercase tracking-widest text-[#8e8e8e] hover:bg-[#f0f0f0] hover:text-[#1a1a1a]"
        title="Switch AI engine"
      >
        <Cpu size={18} />
        <span className="hidden md:inline">AI: {current.label}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 mt-2 w-64 bg-white border border-[#e5e5e5] rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#ababab] border-b border-[#f0f0f0]">
              AI Engine
            </div>
            {AVAILABLE_PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => handleChange(p.id)}
                className={`w-full text-left px-3 py-2.5 hover:bg-[#f9f9f9] transition ${
                  p.id === active ? 'bg-[#f0f0f0]' : ''
                }`}
              >
                <div className="text-sm font-bold text-[#1a1a1a]">{p.label}</div>
                <div className="text-xs text-[#8e8e8e]">{p.hint}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
