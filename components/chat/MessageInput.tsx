'use client';

import React from 'react';
import { Plus, ArrowUp, Paperclip, Link as LinkIcon, Search, ChevronDown } from 'lucide-react';
import {
  AVAILABLE_PROVIDERS,
  getActiveProviderId,
  setActiveProviderId,
  type ProviderId,
} from '@/lib/providers';
import { getModel, hasUsableCredential, setModel } from '@/lib/ai/keys';
import { modelsFor, labelForModel } from '@/lib/ai/model_catalog';

interface MessageInputProps {
  input: string;
  setInput: (val: string) => void;
  onSendMessage: (text?: string) => void;
  onImageUpload: (base64: string) => void;
  onFileUpload: (doc: any) => void;
  onAddResource: (url: string) => void;
  onInitiateResearch: (keywords: string) => void;
  isTyping: boolean;
  step: string;
}

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB max

function providerLabel(id: ProviderId): string {
  return AVAILABLE_PROVIDERS.find(p => p.id === id)?.label ?? id;
}

function modelLabel(id: ProviderId): string {
  if (id === 'mock') return 'demo';
  return labelForModel(id, getModel(id));
}

export default function MessageInput({
  input,
  setInput,
  onSendMessage,
  onImageUpload,
  onFileUpload,
  onAddResource,
  onInitiateResearch,
  isTyping,
}: MessageInputProps) {
  const [isToolMenuOpen, setIsToolMenuOpen] = React.useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = React.useState(false);
  const [activeProvider, setActiveProvider] = React.useState<ProviderId>('mock');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const toolWrapRef = React.useRef<HTMLDivElement>(null);
  const modelWrapRef = React.useRef<HTMLDivElement>(null);

  // Initialise and stay reactive to provider changes (storage + custom event).
  React.useEffect(() => {
    setActiveProvider(getActiveProviderId());
    const refresh = () => setActiveProvider(getActiveProviderId());
    window.addEventListener('storage', refresh);
    window.addEventListener('eduspark:provider-changed', refresh as EventListener);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('eduspark:provider-changed', refresh as EventListener);
    };
  }, []);

  // Auto-grow textarea up to ~8 lines.
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const max = 24 * 8 + 24;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [input]);

  // Close popovers on outside click.
  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (toolWrapRef.current && !toolWrapRef.current.contains(e.target as Node)) {
        setIsToolMenuOpen(false);
      }
      if (modelWrapRef.current && !modelWrapRef.current.contains(e.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;
    onSendMessage(input);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      if (file.size > MAX_IMAGE_BYTES) {
        alert('Image too large — 2 MB max.');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        onImageUpload(base64);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        onFileUpload({
          id: Math.random().toString(36).slice(2),
          name: file.name,
          type: 'txt',
          content
        });
      };
      reader.readAsText(file);
    } else if (file.type === 'application/pdf') {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          fullText += strings.join(' ') + '\n';
        }
        
        onFileUpload({
          id: Math.random().toString(36).slice(2),
          name: file.name,
          type: 'pdf',
          content: fullText
        });
      } catch (err) {
        console.error('PDF extraction failed:', err);
        alert('Failed to extract text from PDF.');
      }
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        
        onFileUpload({
          id: Math.random().toString(36).slice(2),
          name: file.name,
          type: 'docx',
          content: result.value
        });
      } catch (err) {
        console.error('Docx extraction failed:', err);
        alert('Failed to extract text from DOCX.');
      }
    } else {
      alert('Unsupported file type. Please upload images, TXT, PDF or DOCX.');
    }
    
    e.target.value = '';
  };

  const pickModel = (id: ProviderId, modelId: string) => {
    setActiveProviderId(id);
    if (modelId && id !== 'mock') setModel(id, modelId);
    setActiveProvider(id);
    setIsModelMenuOpen(false);
    try {
      window.dispatchEvent(new CustomEvent('eduspark:provider-changed', { detail: { id, modelId } }));
    } catch {
      /* ignore */
    }
  };

  const availableProviders = AVAILABLE_PROVIDERS.filter(
    (p) => p.id === 'mock' || hasUsableCredential(p.id)
  );

  const canSend = input.trim().length > 0 && !isTyping;

  return (
    <div className="px-4 md:px-6 pb-6 pt-2">
      <form
        onSubmit={handleSubmit}
        className="max-w-4xl mx-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm transition-all focus-within:border-[var(--color-accent)]/60 focus-within:ring-2 focus-within:ring-[var(--color-accent)]/15"
      >
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          accept="image/*,.pdf,.txt,.docx"
          onChange={handleFileChange}
        />

        {/* Top: auto-growing textarea */}
        <textarea
          id="chat-textarea"
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="w-full bg-transparent px-5 pt-4 pb-2 outline-none resize-none text-base leading-6 text-[var(--color-ink)] placeholder:text-[var(--color-muted)] custom-scrollbar"
          placeholder="Reply to EduSpark…"
          disabled={isTyping}
          style={{ minHeight: '56px', maxHeight: `${24 * 8 + 24}px` }}
        />

        {/* Bottom toolbar */}
        <div role="toolbar" className="flex items-center gap-2 px-3 pb-3 pt-1">
          {/* + attach menu */}
          <div ref={toolWrapRef} className="relative">
            <button
              id="plus-button"
              type="button"
              title="Add attachment"
              onClick={() => setIsToolMenuOpen((v) => !v)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 border ${
                isToolMenuOpen
                  ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                  : 'text-[var(--color-muted)] border-[var(--color-border)] hover:text-[var(--color-ink)] hover:bg-[var(--color-sidebar)]'
              }`}
            >
              <Plus
                size={18}
                className={isToolMenuOpen ? 'rotate-45 transition-transform' : 'transition-transform'}
              />
            </button>

            {isToolMenuOpen && (
              <div className="absolute bottom-full mb-2 left-0 bg-white border border-[var(--color-border)] rounded-2xl shadow-2xl p-2 flex flex-col gap-1 min-w-[220px] z-[60] animate-in fade-in slide-in-from-bottom-2">
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setIsToolMenuOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-sidebar)] rounded-xl transition-colors text-left"
                >
                  <Paperclip size={16} />
                  <span className="flex-1">
                    Attach file
                    <span className="block text-[11px] font-normal text-[var(--color-muted)]">
                      PDF, TXT, DOCX or Images
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = prompt('Enter a website URL to analyze:');
                    if (url) onAddResource(url);
                    setIsToolMenuOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-sidebar)] rounded-xl transition-colors text-left"
                >
                  <LinkIcon size={16} />
                  <span>Add URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const keywords = prompt(
                      "Enter research keywords (e.g. 'high school physics curriculum standards'):"
                    );
                    if (keywords) onInitiateResearch(keywords);
                    setIsToolMenuOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-sidebar)] rounded-xl transition-colors text-left"
                >
                  <Search size={16} />
                  <span>AI Research Query</span>
                </button>
              </div>
            )}
          </div>

          {/* Model picker chip */}
          <div ref={modelWrapRef} className="relative">
            <button
              id="model-chip"
              type="button"
              disabled={isTyping}
              title="Switch model"
              onClick={() => setIsModelMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-full border border-[var(--color-border)] text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-sidebar)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="truncate max-w-[180px]">
                {providerLabel(activeProvider)}
                {modelLabel(activeProvider) ? (
                  <span className="text-[var(--color-muted)]"> · {modelLabel(activeProvider)}</span>
                ) : null}
              </span>
              <ChevronDown size={14} className="text-[var(--color-muted)]" />
            </button>

            {isModelMenuOpen && (
              <div className="absolute bottom-full mb-2 left-0 bg-white border border-[var(--color-border)] rounded-2xl shadow-2xl p-2 flex flex-col gap-0.5 min-w-[260px] max-h-[360px] overflow-y-auto custom-scrollbar z-[60] animate-in fade-in slide-in-from-bottom-2">
                {availableProviders.length === 0 && (
                  <p className="p-3 text-xs text-[var(--color-muted)]">
                    No providers configured yet — open Settings from the sidebar.
                  </p>
                )}
                {availableProviders.map((p) => {
                  const activeModel = getModel(p.id);
                  const models = modelsFor(p.id);
                  return (
                    <div key={p.id} className="flex flex-col">
                      <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                        {p.label}
                      </div>
                      {models.map((m) => {
                        const isActive = p.id === activeProvider && m.id === activeModel;
                        return (
                          <button
                            key={`${p.id}:${m.id}`}
                            type="button"
                            onClick={() => pickModel(p.id, m.id)}
                            className={`flex items-center justify-between gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-colors text-left ${
                              isActive
                                ? 'bg-[var(--color-sidebar)] text-[var(--color-ink)]'
                                : 'text-[var(--color-ink)] hover:bg-[var(--color-sidebar)]'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {m.label}
                              {isActive ? (
                                <span className="text-[10px] uppercase tracking-widest text-[var(--color-accent)]">
                                  active
                                </span>
                              ) : null}
                            </span>
                            {m.badge ? (
                              <span className="text-[10px] font-normal text-[var(--color-muted)] uppercase tracking-wider">
                                {m.badge}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Send */}
          <button
            id="send-button"
            type="submit"
            title="Send message"
            disabled={!canSend}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              canSend
                ? 'bg-[var(--color-accent)] text-white shadow-md hover:scale-105 active:scale-95'
                : 'bg-[var(--color-border)] text-[var(--color-muted)]'
            }`}
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </div>
      </form>

      <p className="text-center text-[10px] text-[var(--color-muted)] mt-3 font-medium uppercase tracking-[0.2em]">
        Powered by {providerLabel(activeProvider)}
        {modelLabel(activeProvider) ? ` · ${modelLabel(activeProvider)}` : ''}
      </p>
    </div>
  );
}
