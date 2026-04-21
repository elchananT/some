'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Download, ChevronLeft, ChevronRight, CheckCircle2, ShieldCheck, 
  AlertCircle, Edit3, Save, Bold, Italic, Underline, List, 
  ListOrdered, Heading2, Columns2, Square, Layout, Palette, 
  Smile, Cpu, Star, Type, Sparkles
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Workbook, PageLayout, PageTheme } from '@/lib/types';
import SVGIllustration from './SVGIllustration';
import { exportToPDF, exportToDocx } from '@/lib/export';
import SelectionToolbar from './artifact/SelectionToolbar';

// Extend Window to avoid TS errors for external scripts
declare global {
  interface Window {
    renderMathInElement?: any;
    mermaid?: any;
  }
}

export default function WorkbookPreview({ workbook: initialWorkbook }: { workbook: Workbook }) {
  const [workbook, setWorkbook] = useState<Workbook>(initialWorkbook);
  const [activeTab, setActiveTab] = useState<'preview' | 'report'>('preview');
  const [isExporting, setIsExporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Pass the workbook directly so the exporter can render the clean,
      // print-optimized HTML (one A4 page per workbook page) instead of
      // screenshotting the live editor DOM.
      await exportToPDF(workbook, `${workbook.title.replace(/\s+/g, '_')}_Workbook.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDocx = async () => {
    setIsExporting(true);
    await exportToDocx(workbook);
    setIsExporting(false);
  };

  const handleContentChange = (pageId: string, newContent: string) => {
    setWorkbook(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === pageId ? { ...p, content: newContent } : p)
    }));
  };

  const handleTitleChange = (pageId: string, newTitle: string) => {
    setWorkbook(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === pageId ? { ...p, title: newTitle } : p)
    }));
  };

  const updatePageSetting = (pageId: string, key: 'layout' | 'theme' | 'customCss', value: any) => {
    setWorkbook(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === pageId ? { ...p, [key]: value } : p)
    }));
  };

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  // Run render engines whenever workbook changes or is mounted
  useEffect(() => {
    if (typeof window !== 'undefined') {
       if (window.renderMathInElement) {
         try {
           window.renderMathInElement(document.getElementById('workbook-container'), {
             delimiters: [
               {left: '$$', right: '$$', display: true},
               {left: '$', right: '$', display: false},
               {left: '\\(', right: '\\)', display: false},
               {left: '\\[', right: '\\]', display: true}
             ],
             throwOnError: false
           });
         } catch (e) {
           console.error("Katex error", e);
         }
       }
       if (window.mermaid) {
         try {
           window.mermaid.initialize({startOnLoad: false, theme: 'neutral'});
           window.mermaid.run({ querySelector: '.mermaid' });
         } catch (e) {
           console.error("Mermaid error", e);
         }
       }
    }
  }, [workbook, activeTab]);

  return (
    <div className="flex w-full h-full bg-bg font-sans text-ink overflow-hidden">
      {/* Left Sidebar: Navigation */}
      <aside className="w-64 border-r border-border bg-white p-6 flex flex-col shrink-0">
        <div className="mb-10">
          <h1 className="text-xs font-semibold uppercase tracking-widest text-ink">Workbook</h1>
        </div>
        <nav className="space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-3 px-2">Outline</h2>
            <ul className="space-y-1">
              {workbook.pages.map((page, i) => (
                <li 
                  key={page.id} 
                  className={`px-2 py-1.5 rounded-md text-sm transition-colors ${i === 0 ? 'bg-bg text-ink font-medium' : 'text-muted hover:bg-bg/50'}`}
                >
                  {page.title}
                </li>
              ))}
            </ul>
          </div>
        </nav>
        <div className="mt-auto pt-6 border-t border-border flex flex-col gap-2">
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-2 bg-ink text-white text-xs font-medium rounded-md hover:bg-black transition-all disabled:opacity-50"
            >
              Export PDF
            </button>
        </div>
      </aside>

        {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-white">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between z-10 shrink-0">
          <div className="flex gap-2">
            <TabButton active={activeTab === 'preview'} onClick={() => setActiveTab('preview')} label="Preview" />
            <TabButton active={activeTab === 'report'} onClick={() => setActiveTab('report')} label="Report" />
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setIsEditing(!isEditing)} className={`text-xs ${isEditing ? 'text-accent font-semibold' : 'text-muted'}`}>
                {isEditing ? 'Stop Editing' : 'Edit Mode'}
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 flex justify-center custom-scrollbar">
          {isEditing && <SelectionToolbar onFormat={handleFormat} />}
          {activeTab === 'preview' ? (
            <div id="workbook-container" className="space-y-12 pb-12 w-full max-w-[750px]">
              {workbook.pages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-[500px] text-center border-2 border-dashed border-border rounded-xl">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4"/>
                    <h3 className="text-xl font-medium">Generating Workbook...</h3>
                    <p className="text-muted text-sm mt-2 max-w-sm">EduSpark is currently writing and formatting the pages based on your specifications. They will appear here momentarily.</p>
                </div>
              )}
              {workbook.pages.map((page, index) => {
                const themeClasses: Record<string, string> = {
                  minimal: 'bg-white text-ink border-border',
                  playful: 'bg-yellow-50 text-blue-900 border-yellow-200 shadow-yellow-100',
                  technical: 'bg-slate-900 text-slate-100 border-slate-700 font-mono',
                  elegant: 'bg-stone-50 text-stone-900 border-stone-200 italic font-serif',
                  'science-lab': 'bg-[#f0fdff] text-slate-800 border-cyan-300 shadow-md [background-size:20px_20px] [background-image:linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)]',
                  'history-chronicle': 'bg-[#f4ebd8] text-[#5c4033] border-[#8b5a2b] border-double border-4 shadow-xl font-serif',
                  'literature-classic': 'bg-[#fdfbf7] text-[#2b2b2b] border-[#e2d5c5] font-serif tracking-wide shadow-md',
                  custom: 'bg-white text-ink border-dashed border-2 border-accent',
                };
                
                const themeClass = themeClasses[page.theme || 'minimal'] || themeClasses.minimal;

                return (
                  <div 
                    key={page.id} 
                    id={`page-container-${page.id}`}
                    className={`workbook-page relative p-12 rounded-lg transition-all duration-300 ${page.layout === 'full-width-image' ? 'px-0 pt-0' : 'border shadow-sm'} ${themeClass}`}
                  >
                    {page.theme === 'custom' && page.customCss && (
                      <style dangerouslySetInnerHTML={{ __html: `#page-container-${page.id} { ${page.customCss} }` }} />
                    )}
                    {isEditing && (
                      <div className="absolute -top-12 right-0 flex items-center gap-2 bg-white border border-border shadow-md p-1.5 rounded-lg z-20 text-xs text-muted">
                        <select 
                          value={page.layout || 'single-column'} 
                          onChange={(e) => updatePageSetting(page.id, 'layout', e.target.value)}
                          className="bg-transparent border-none outline-none appearance-none px-2 cursor-pointer font-medium hover:text-ink"
                        >
                          <option value="single-column">Single Column</option>
                          <option value="two-column">Two Columns</option>
                          <option value="header-focused">Header Focused</option>
                          <option value="full-width-image">Full-Width Image</option>
                          <option value="centered-text-with-sidebar">Centered + Sidebar</option>
                          <option value="timeline">Timeline</option>
                          <option value="bento-grid">Bento Grid</option>
                          <option value="f-pattern">F-Pattern</option>
                        </select>
                        <span className="w-px h-4 bg-border"></span>
                        <select 
                          value={page.theme || 'minimal'} 
                          onChange={(e) => updatePageSetting(page.id, 'theme', e.target.value)}
                          className="bg-transparent border-none outline-none appearance-none px-2 cursor-pointer font-medium hover:text-ink"
                        >
                          <option value="minimal">Minimal Theme</option>
                          <option value="playful">Playful</option>
                          <option value="technical">Technical</option>
                          <option value="elegant">Elegant</option>
                          <option value="science-lab">Science Lab</option>
                          <option value="history-chronicle">History Chronicle</option>
                          <option value="literature-classic">Literature Classic</option>
                          <option value="custom">Custom Style</option>
                        </select>
                      </div>
                    )}

                    {isEditing && page.theme === 'custom' && (
                      <div className="mb-6 relative z-10 mx-12 mt-12 bg-slate-900 rounded-lg p-3 shadow-inner">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Layout size={12}/> Custom CSS (applied to page container)</label>
                        <textarea 
                          className="w-full bg-slate-950 text-green-400 font-mono text-xs p-3 rounded border border-slate-800 outline-none focus:border-green-500 transition-colors"
                          rows={3}
                          value={page.customCss || ''}
                          onChange={(e) => updatePageSetting(page.id, 'customCss', e.target.value)}
                          placeholder="e.g. background-color: #fce4ec; color: #880e4f; border: 2px solid #f06292;"
                        />
                      </div>
                    )}

                    {page.type === 'illustration' ? (
                       <div className={`flex flex-col items-center ${page.layout === 'full-width-image' ? 'rounded-t-lg overflow-hidden' : ''}`}>
                          <h2 className={`font-serif mb-8 ${page.layout === 'full-width-image' ? 'text-2xl pt-12 text-center absolute z-30 bg-white/80 px-6 py-2 rounded-full mt-4 backdrop-blur-sm' : 'text-4xl'}`}>
                            {page.title}
                          </h2>
                          {page.imageUrl ? (
                            <img src={page.imageUrl} alt={page.title} className={`${page.layout === 'full-width-image' ? 'w-full object-cover max-h-[600px]' : 'max-w-md w-full rounded-xl shadow-lg border border-border/20'}`} />
                          ) : (
                            page.svgCode && <SVGIllustration svgCode={page.svgCode} className={`${page.layout === 'full-width-image' ? 'w-full object-cover max-h-[400px]' : 'max-w-md w-full'}`} />
                          )}
                       </div>
                    ) : (
                      <div className={`${page.layout === 'header-focused' ? 'text-center' : ''} ${page.layout === 'full-width-image' ? 'px-12 pt-8' : ''}`}>
                        <h2 
                          className={`font-semibold mb-6 ${page.layout === 'header-focused' ? 'text-4xl italic mb-10' : 'text-2xl'} ${isEditing ? 'border border-dashed border-accent/30 p-2 rounded' : ''}`}
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onBlur={(e) => handleTitleChange(page.id, e.currentTarget.textContent || '')}
                        >
                          {page.title}
                        </h2>
                        
                        <div className={`
                          ${page.layout === 'two-column' ? 'grid grid-cols-1 md:grid-cols-2 gap-8' : ''}
                          ${page.layout === 'centered-text-with-sidebar' ? 'flex flex-col md:flex-row gap-8' : ''}
                          ${page.layout === 'timeline' ? 'pl-6 border-l-2 border-accent/30 relative' : ''}
                          ${page.layout === 'bento-grid' ? 'grid grid-cols-2 md:grid-cols-3 gap-4 grid-flow-dense' : ''}
                          ${page.layout === 'f-pattern' ? 'flex flex-col gap-10' : ''}
                        `}>
                          <div 
                            className={`
                                ${isEditing ? 'border border-dashed border-accent/30 p-4 rounded min-h-[100px] outline-none' : ''} 
                                prose max-w-none ${page.theme === 'technical' ? 'prose-invert' : ''} 
                                ${page.layout === 'centered-text-with-sidebar' ? 'flex-1' : ''}
                                ${page.layout === 'bento-grid' ? 'col-span-2 row-span-2 bg-white/50 p-6 rounded-3xl shadow-sm' : ''}
                            `}
                            contentEditable={isEditing}
                            suppressContentEditableWarning
                            onBlur={(e) => handleContentChange(page.id, e.currentTarget.innerHTML)}
                            dangerouslySetInnerHTML={{ __html: page.content }} 
                          />

                          {/* Block Renderer (if any) */}
                          {page.blocks && page.blocks.length > 0 && (
                            <div className="mt-8 pt-8 border-t border-[#eee] relative min-h-[300px]">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#d44d29] mb-4 opacity-50">Studio Components Layer</div>
                                {page.blocks.map((block) => (
                                  <div 
                                    key={block.id}
                                    className="mb-4 p-4 border border-[#eee] rounded-xl bg-[#fafafa]"
                                    style={{ ...block.style }}
                                  >
                                    {block.type === 'heading' && <h3 className="text-xl font-serif italic mb-2">{block.content}</h3>}
                                    {block.type === 'text' && <div dangerouslySetInnerHTML={{ __html: block.content }} />}
                                    {block.type === 'image' && block.content && <img src={block.content} className="max-w-full rounded-lg" alt="" />}
                                  </div>
                                ))}
                            </div>
                          )}

                          {page.layout === 'bento-grid' && (
                             <>
                               <div className="bg-[#d44d29]/5 p-4 rounded-2xl border border-[#d44d29]/10 flex flex-col justify-center items-center text-center">
                                  <Sparkles size={20} className="text-[#d44d29] mb-2" />
                                  <p className="text-[10px] font-bold uppercase">Key Concept</p>
                               </div>
                               <div className="bg-ink/5 p-4 rounded-2xl border border-border flex flex-col justify-center">
                                  <p className="text-xs italic opacity-60">Professional researchers curated this section for academic rigor.</p>
                               </div>
                             </>
                          )}
                          {(page.layout === 'two-column' || page.layout === 'centered-text-with-sidebar') && (
                            <div className={`
                              ${page.layout === 'two-column' ? 'border-l border-border pl-8' : 'w-1/3 bg-black/5 p-6 rounded-xl'} 
                              opacity-70 text-sm flex items-start flex-col gap-4
                            `}>
                              {isEditing ? (
                                <div className="p-4 border-dashed border-2 border-border/50 text-center w-full rounded-lg text-muted">
                                  + Sidebar Content Area
                                </div>
                              ) : (
                                <div className="italic">
                                  Supplementary notes, key takeaways, or references can appear in this sidebar area.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="absolute bottom-4 left-0 right-0 px-12 flex justify-between opacity-20 text-[10px] uppercase tracking-widest font-mono pointer-events-none z-10">
                       <span>{workbook.subject}</span>
                       <span>Page {index + 1}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="w-full max-w-[700px] p-8 border border-border rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-6">Verification Report</h3>
              <div className="prose max-w-none">
                 <ReactMarkdown>{workbook.verificationReport || "Generating report..."}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function LogCard({ title, content }: { title: string, content: string }) {
  return (
    <div className="p-5 bg-bg rounded-2xl border border-border/50">
      <div className="text-[10px] uppercase font-bold text-muted mb-2 tracking-widest">{title}</div>
      <p className="text-xs text-[#5C5751] leading-relaxed italic">{content}</p>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${active ? 'bg-[#5A5A40] text-white shadow-md' : 'hover:bg-gray-100 opacity-50'}`}
    >
      {label}
    </button>
  );
}

function MetaItem({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold opacity-40">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
