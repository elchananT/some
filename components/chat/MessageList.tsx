'use client';

import React, { useRef, useEffect } from 'react';
import { Sparkles, BookOpen, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';

interface MessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
  agentStatus: string | null;
}

export default function MessageList({ messages, isTyping, agentStatus }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, agentStatus]);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 custom-scrollbar">
      <div className="space-y-8">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-60 text-center py-20 animate-fade-in">
            <BookOpen size={64} className="mb-6 text-[var(--color-ink)] opacity-50" />
            <h2 className="text-4xl font-serif italic text-[var(--color-ink)] mb-3">EduSpark</h2>
            <p className="text-lg max-w-md text-[var(--color-muted)] leading-relaxed">
              I&apos;m your educational co-pilot. Share your subject or curriculum goal, and I&apos;ll help you design and build a professional workbook.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`flex gap-3 md:gap-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border mt-1 shadow-sm transition-all hover:scale-110 ${
                m.role === 'model' 
                  ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' 
                  : 'bg-white text-[var(--color-accent)] border-[var(--color-accent)]/20'
              }`}>
                {m.role === 'model' ? <Sparkles size={18} /> : <User size={18} />}
              </div>
              
              <div className={`flex flex-col w-full ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5 opacity-40 px-1">
                  {m.role === 'user' ? 'Authorized User' : 'EduSpark Architect'}
                </span>
                
                {m.role === 'user' ? (
                  <div className="rounded-2xl px-5 py-3.5 shadow-sm bg-[var(--color-surface)] border border-[var(--color-border)] border-r-4 border-r-[var(--color-accent)] text-[var(--color-ink)] rounded-tr-none max-w-[85%]">
                    <p className="whitespace-pre-wrap text-base font-medium leading-relaxed">{m.text}</p>
                  </div>
                ) : (
                  <div className="w-full bg-white border border-[var(--color-border)] rounded-2xl p-6 md:p-10 shadow-sm ring-1 ring-black/5 min-h-[100px] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-accent)] opacity-20" />
                    <div className="prose prose-stone max-w-none prose-base md:prose-lg prose-p:leading-relaxed prose-headings:font-serif prose-pre:bg-[var(--color-sidebar)] prose-pre:text-[var(--color-ink)] prose-pre:border prose-pre:border-[var(--color-border)] animate-fade-in">
                      <ReactMarkdown>{m.text}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 md:gap-4 justify-start"
          >
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-ink)] text-white flex items-center justify-center shrink-0 border border-[var(--color-ink)] mt-1 shadow-sm animate-pulse">
              <Sparkles size={18} />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5 opacity-40 px-1">
                 Architect Drafting
              </span>
              <div className="w-full bg-white border border-[var(--color-border)] rounded-2xl p-8 shadow-sm ring-1 ring-black/5 flex flex-col gap-4 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-accent)] opacity-20" />
                <motion.div 
                  animate={{ opacity: [0.3, 0.6, 0.3] }} 
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="h-4 bg-[var(--color-sidebar)] rounded-md w-3/4" 
                />
                <motion.div 
                  animate={{ opacity: [0.3, 0.6, 0.3] }} 
                  transition={{ repeat: Infinity, duration: 2, delay: 0.4 }}
                  className="h-4 bg-[var(--color-sidebar)] rounded-md w-1/2" 
                />
                <motion.div 
                  animate={{ opacity: [0.3, 0.6, 0.3] }} 
                  transition={{ repeat: Infinity, duration: 2, delay: 0.8 }}
                  className="h-4 bg-[var(--color-sidebar)] rounded-md w-2/3" 
                />
              </div>
              {agentStatus && (
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)] ml-1 animate-pulse">
                  {agentStatus}...
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>
      <div ref={endRef} />
    </div>
  );
}
