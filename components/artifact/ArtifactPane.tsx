'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Workbook, GeneratingStep, Roadmap, StylePrefs } from '@/lib/types';
import WorkbookPreview from '../WorkbookPreview';
import { WORKBOOK_STYLES, WorkbookStyle, StyleVariant } from '@/lib/themes';
import StylePickerCard from '../chat/StylePickerCard';
import { workbookToMarkdown, workbookToText, workbookToHTMLStandalone } from '@/lib/export_utils';
import dynamic from 'next/dynamic';
const StudioView = dynamic(() => import('./StudioView'), { ssr: false });
import StyleCard from './StyleCard';
import ProgressiveStatus from '../chat/ProgressiveStatus';
import ThinkingBlock from '../chat/ThinkingBlock';
import { 
  ClipboardCheck, ArrowRight, Microchip, Search, FileText, 
  UserCheck, ShieldCheck, Sparkles, Palette,
  Check, Info, Download, FileCode
} from 'lucide-react';

interface ArtifactPaneProps {
  isVisible: boolean;
  step: GeneratingStep;
  phase?: string | null;
  breadcrumbs?: string[];
  workbook: Workbook | null;
  roadmap: Roadmap | null;
  onApproveRoadmap: () => void;
  onRejectRoadmap: () => void;
  onSelectStyle?: (style: WorkbookStyle, variant?: StyleVariant, prefs?: StylePrefs) => void;
  onUpdateWorkbook?: (workbook: Workbook) => void;
}

export default function ArtifactPane({
  isVisible,
  step,
  phase,
  breadcrumbs,
  workbook,
  roadmap,
  onApproveRoadmap,
  onRejectRoadmap,
  onSelectStyle,
  onUpdateWorkbook
}: ArtifactPaneProps) {
  const [isExportMenuOpen, setIsExportMenuOpen] = React.useState(false);
  const [isStudioOpen, setIsStudioOpen] = React.useState(false);

  const handleExport = (format: 'md' | 'txt' | 'html') => {
    if (!workbook) return;
    
    let content = '';
    let mimeType = 'text/plain';
    let ext = format;

    if (format === 'md') {
      content = workbookToMarkdown(workbook);
    } else if (format === 'txt') {
      content = workbookToText(workbook);
    } else if (format === 'html') {
      content = workbookToHTMLStandalone(workbook);
      mimeType = 'text/html';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workbook.title.toLowerCase().replace(/\s+/g, '_')}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: '100%', opacity: 1 }}
      className="flex-1 bg-[#F5F5F3] h-full relative overflow-y-auto border-l border-[#e5e5e5]"
    >
      <div className="h-full flex flex-col">
        {step === 'roadmap_approval' && roadmap ? (
          <div className="flex-1 flex items-center justify-center p-8 md:p-12">
            <RoadmapApproval 
              roadmap={roadmap} 
              onApprove={onApproveRoadmap} 
              onReject={onRejectRoadmap} 
            />
          </div>
        ) : step === 'style_selection' ? (
          <div className="flex-1 flex items-start justify-center p-6 md:p-10 overflow-y-auto">
             <StylePickerCard
                onSubmit={(prefs) => {
                  // Match the prefs.theme to a WORKBOOK_STYLES entry for backward
                  // compatibility with the existing chat handler.
                  const style = WORKBOOK_STYLES[0];
                  onSelectStyle?.(style, undefined, prefs);
                }}
             />
          </div>
        ) : workbook ? (
          <div className="relative flex-1 flex flex-col overflow-hidden">
            <WorkbookPreview workbook={workbook} />
            
            {isStudioOpen && onUpdateWorkbook && (
              <StudioView 
                workbook={workbook} 
                onUpdateWorkbook={onUpdateWorkbook} 
                onExit={() => setIsStudioOpen(false)} 
              />
            )}

            {step === 'complete' && (
              <div className="absolute bottom-10 right-10 z-[70] flex items-center gap-4">
                <button 
                  onClick={() => setIsStudioOpen(true)}
                  className="bg-[#d44d29] text-white px-8 py-5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group"
                >
                  <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
                  <span className="text-xs font-black uppercase tracking-[0.2em]">Open Studio</span>
                </button>

                <div className="relative">
                   <button 
                     onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                     className="bg-[#1a1a1a] text-white p-5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center gap-3 group"
                   >
                     <Download size={24} className="group-hover:rotate-12 transition-transform" />
                     <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">Export</span>
                   </button>

                   <AnimatePresence>
                     {isExportMenuOpen && (
                       <motion.div 
                         initial={{ opacity: 0, scale: 0.9, y: 10 }}
                         animate={{ opacity: 1, scale: 1, y: 0 }}
                         exit={{ opacity: 0, scale: 0.9, y: 10 }}
                         className="absolute bottom-full mb-4 right-0 bg-white border border-[#e5e5e5] rounded-[30px] shadow-2xl p-3 flex flex-col gap-2 min-w-[220px]"
                       >
                         <button 
                           onClick={() => handleExport('html')}
                           className="flex items-center gap-4 p-4 text-sm font-bold text-[#1a1a1a] hover:bg-[#f5f5f5] rounded-2xl transition-all group"
                         >
                           <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                             <FileCode size={20} />
                           </div>
                           <div className="flex flex-col items-start translate-y-0.5">
                             <span>Digital PDF/HTML</span>
                             <span className="text-[10px] opacity-40 font-mono">Killer format</span>
                           </div>
                         </button>

                         <button 
                           onClick={() => handleExport('md')}
                           className="flex items-center gap-4 p-4 text-sm font-bold text-[#1a1a1a] hover:bg-[#f5f5f5] rounded-2xl transition-all group"
                         >
                           <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                             <FileCode size={20} />
                           </div>
                           <div className="flex flex-col items-start translate-y-0.5">
                             <span>Markdown</span>
                             <span className="text-[10px] opacity-40 font-mono">.md format</span>
                           </div>
                         </button>

                         <button 
                           onClick={() => handleExport('txt')}
                           className="flex items-center gap-4 p-4 text-sm font-bold text-[#1a1a1a] hover:bg-[#f5f5f5] rounded-2xl transition-all group"
                         >
                           <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all">
                             <FileText size={20} />
                           </div>
                           <div className="flex flex-col items-start translate-y-0.5">
                             <span>Plain Text</span>
                             <span className="text-[10px] opacity-40 font-mono">.txt format</span>
                           </div>
                         </button>
                       </motion.div>
                     )}
                   </AnimatePresence>
                </div>
              </div>
            )}
            
            {step !== 'complete' && step !== 'idle' && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-surface,#FFFFFF)]/90 backdrop-blur-md shadow-xl border border-[var(--color-border,#E8E4DC)] px-6 py-4 rounded-3xl flex flex-col gap-2 min-w-[320px] max-w-[480px]">
                <ProgressiveStatus phase={phase ?? humanizeStep(step)} />
                {breadcrumbs && breadcrumbs.length > 0 && (
                  <ThinkingBlock breadcrumbs={breadcrumbs} />
                )}
              </div>
            )}
          </div>
        ) : step !== 'complete' && step !== 'idle' ? (
          <div className="flex-1 flex items-center justify-center p-12">
             <div className="w-full max-w-md bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-border,#E8E4DC)] rounded-3xl p-10 flex flex-col items-center gap-6 shadow-sm">
                <h2 className="text-2xl font-serif italic text-[var(--color-ink,#1F1F1C)] text-center">
                   {humanizeStep(step)}
                </h2>
                <ProgressiveStatus phase={phase ?? humanizeStep(step)} />
                {breadcrumbs && breadcrumbs.length > 0 && (
                  <div className="w-full">
                    <ThinkingBlock breadcrumbs={breadcrumbs} defaultOpen />
                  </div>
                )}
             </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center p-12">
             <div className="w-24 h-24 rounded-3xl border-2 border-dashed border-[#ababab] flex items-center justify-center mb-6">
                <FileText size={32} />
             </div>
             <h3 className="text-xl font-serif italic">Artifact Standby</h3>
             <p className="max-w-xs text-sm mt-2">The workbook visualization will appear here once the planning phase is complete.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function RoadmapApproval({ roadmap, onApprove, onReject }: { roadmap: Roadmap; onApprove: () => void; onReject: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="w-full max-w-2xl bg-white rounded-[40px] shadow-2xl border border-[#e5e5e5] p-10 flex flex-col gap-8 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#d44d29]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px] pointer-events-none" />
      
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 bg-[#1a1a1a] rounded-[22px] flex items-center justify-center text-white shadow-xl shadow-black/10">
          <ClipboardCheck size={28} />
        </div>
        <div>
          <h2 className="text-3xl font-serif italic text-[#1a1a1a]">{roadmap.title}</h2>
          <div className="flex items-center gap-3 mt-1.5 font-sans">
             <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8e8e8e]">Execution Blueprint</span>
             <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter shadow-sm ${
               roadmap.estimatedComplexity === 'High' ? 'bg-red-50 text-red-600' : 
               roadmap.estimatedComplexity === 'Medium' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
             }`}>
                {roadmap.estimatedComplexity} Complexity
             </span>
          </div>
        </div>
      </div>

      <div className="relative">
        <p className="text-base leading-relaxed text-[#5c5751] italic bg-[#f9f9f9] p-6 rounded-2xl border-l-[6px] border-[#d44d29]/10">
          &quot;{roadmap.summary}&quot;
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#ababab]">Strategic Items</h3>
          <div className="h-px flex-1 bg-[#eee] ml-4" />
        </div>
        <div className="grid gap-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
          {roadmap.items.map((item, i) => (
            <div key={i} className="group p-5 bg-[#fafafa] border border-[#e5e5e5] rounded-3xl flex items-center justify-between hover:border-[#d44d29]/20 hover:bg-white transition-all duration-300">
              <div className="flex gap-5 items-center">
                 <div className="w-12 h-12 rounded-2xl bg-white border border-[#eee] flex items-center justify-center text-[#1a1a1a] group-hover:scale-110 group-hover:shadow-lg transition-all shadow-sm">
                    {item.agentResponsible === 'Mathematician' && <Microchip size={20} className="text-[#a8a298]" />}
                    {item.agentResponsible === 'Researcher' && <Search size={20} className="text-[#a8a298]" />}
                    {item.agentResponsible === 'Curriculum' && <FileText size={20} className="text-[#a8a298]" />}
                    {item.agentResponsible === 'Linguist' && <UserCheck size={20} className="text-[#a8a298]" />}
                 </div>
                 <div>
                    <h4 className="text-sm font-bold text-[#1a1a1a] group-hover:text-[#d44d29] transition-colors">{item.title}</h4>
                    <p className="text-xs text-[#8e8e8e] mt-0.5">{item.description}</p>
                 </div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                 <ShieldCheck size={16} className="text-[#d44d29]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 flex gap-6">
         <button 
           onClick={onReject}
           className="px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#8e8e8e] hover:text-[#1a1a1a] hover:bg-[#eee] rounded-2xl transition-all"
         >
           Refine Path
         </button>
         <button 
           onClick={onApprove}
           className="flex-1 bg-[#1a1a1a] text-white py-5 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-[#333] transition-all transform active:scale-[0.98] shadow-2xl shadow-black/20 group"
         >
           Initialize Build <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
         </button>
      </div>
    </motion.div>
  );
}

function humanizeStep(step: GeneratingStep): string {
  switch (step) {
    case 'researching': return 'Researching sources…';
    case 'brainstorming': return 'Brainstorming the outline…';
    case 'roadmap_approval': return 'Drafting the roadmap…';
    case 'style_selection': return 'Preparing style options…';
    case 'composing': return 'Drafting pages…';
    case 'illustrating': return 'Crafting illustrations…';
    case 'verifying': return 'Reviewing pedagogy…';
    default: return 'Working…';
  }
}

function StyleGallery({ onSelect }: { onSelect: (style: WorkbookStyle, variant?: StyleVariant) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-5xl bg-[var(--color-surface,#FFFFFF)] rounded-3xl shadow-sm border border-[var(--color-border,#E8E4DC)] p-8 flex flex-col gap-6 relative overflow-hidden"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[var(--color-accent,#CC785C)] rounded-2xl flex items-center justify-center text-white">
          <Palette size={22} />
        </div>
        <div>
          <h2 className="text-2xl font-serif italic text-[var(--color-ink,#1F1F1C)]">Pick a visual style</h2>
          <p className="text-xs text-[var(--color-muted,#7A756B)] mt-1">Tap a card, then choose a Warm, Cool, or Bold variant.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[560px] overflow-y-auto pr-2 custom-scrollbar">
        {WORKBOOK_STYLES.map((style) => (
          <StyleCard
            key={style.id}
            style={style}
            onSelect={(s, v) => onSelect(s, v)}
          />
        ))}
      </div>

      <div className="bg-[var(--color-bg,#FAF9F6)] p-4 rounded-2xl border border-[var(--color-border,#E8E4DC)] flex items-center gap-3">
        <Info size={16} className="text-[var(--color-muted,#7A756B)]" />
        <p className="text-xs text-[var(--color-muted,#7A756B)]">All styles include optimized Hebrew typography and print-safe color margins.</p>
      </div>
    </motion.div>
  );
}
