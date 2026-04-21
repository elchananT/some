'use client';

import React from 'react';
import { motion } from 'motion/react';
import { History, Plus, MessageSquare, Trash2, X, Settings as SettingsIcon } from 'lucide-react';
import { Conversation } from '@/lib/types';
import SettingsPanel from '@/components/layout/SettingsPanel';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conv: Conversation) => void;
  onDeleteConversation: (e: React.MouseEvent, id: string) => void;
  onNewConversation: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
}: SidebarProps) {
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  return (
    <motion.aside
      initial={false}
      animate={{ 
        width: isOpen ? 300 : 0,
        opacity: isOpen ? 1 : 0 
      }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="h-full bg-[var(--color-sidebar)] border-r border-[var(--color-border)] flex flex-col overflow-hidden whitespace-nowrap z-50 shrink-0"
    >
      <div className="p-6 flex flex-col h-full w-[300px]">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <History size={20} className="text-[var(--color-muted)]" />
            <h2 className="text-xl font-serif italic text-[var(--color-ink)]">History</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--color-sidebar)] rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 py-3 mb-6 bg-[var(--color-ink)] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-all transform active:scale-95 shadow-md group"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform" /> 
          <span>New Chat</span>
        </button>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 -mx-2 px-2">
          {conversations.length === 0 && (
            <div className="text-center py-20 opacity-30 text-sm italic">
              No history found
            </div>
          )}
          {conversations.map((conv, i) => (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelectConversation(conv)}
              className={`group p-3 rounded-xl cursor-pointer transition-all border flex items-center justify-between gap-3 ${
                activeConversationId === conv.id
                  ? 'bg-[var(--color-sidebar)] border-transparent shadow-sm'
                  : 'border-transparent hover:bg-[var(--color-sidebar)]'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare
                  size={16}
                  className={`shrink-0 ${activeConversationId === conv.id ? 'text-[var(--color-accent)]' : 'opacity-40'}`}
                />
                <div className="flex flex-col overflow-hidden">
                  <span className={`text-sm truncate ${activeConversationId === conv.id ? 'font-semibold text-[var(--color-ink)]' : 'font-medium text-[var(--color-ink)]'}`}>
                    {conv.title}
                  </span>
                  <span className="text-[10px] text-[var(--color-muted)] font-medium">
                    {new Date(conv.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => onDeleteConversation(e, conv.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Footer: Settings entry (header no longer carries one). */}
        <div className="pt-4 mt-2 border-t border-[var(--color-border)]">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-sidebar)] transition-colors"
          >
            <SettingsIcon size={16} className="text-[var(--color-muted)]" />
            <span>Settings</span>
            <span className="ml-auto text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
              API keys · tools
            </span>
          </button>
        </div>
      </div>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </motion.aside>
  );
}
