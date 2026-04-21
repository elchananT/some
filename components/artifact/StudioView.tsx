'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Draggable from 'react-draggable';
import { 
  Type, Image as ImageIcon, Sparkles, Trash2, 
  Move, Plus, Download, FileCode, Check, 
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  MousePointer2, Hand, Layers, Palette, FileText
} from 'lucide-react';
import { Workbook, WorkbookPage, ContentBlock, BlockType, PageLayout } from '@/lib/types';
import { workbookToHTMLStandalone, workbookToMarkdown, workbookToText } from '@/lib/export_utils';
import html2pdf from 'html2pdf.js';
import RichTextEditor from './RichTextEditor';

interface StudioViewProps {
  workbook: Workbook;
  onUpdateWorkbook: (workbook: Workbook) => void;
  onExit: () => void;
}

export default function StudioView({ workbook, onUpdateWorkbook, onExit }: StudioViewProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [editMode, setEditMode] = useState<'edit' | 'preview'>('edit');
  const isEditMode = editMode === 'edit';
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTool, setActiveTool] = useState<'select' | 'hand' | 'text' | 'image'>('select');

  const page = workbook.pages[currentPageIndex];
  const printRef = useRef<HTMLDivElement>(null);

  const handleUpdatePage = (updates: Partial<WorkbookPage>) => {
    const newPages = [...workbook.pages];
    newPages[currentPageIndex] = { ...newPages[currentPageIndex], ...updates };
    onUpdateWorkbook({ ...workbook, pages: newPages });
  };

  const handleUpdateBlock = (blockId: string, updates: Partial<ContentBlock>) => {
    const newPages = [...workbook.pages];
    const pageToUpdate = { ...newPages[currentPageIndex] };
    pageToUpdate.blocks = pageToUpdate.blocks.map(b => 
      b.id === blockId ? { ...b, ...updates } : b
    );
    newPages[currentPageIndex] = pageToUpdate;
    onUpdateWorkbook({ ...workbook, pages: newPages });
  };

  const handleReorderBlocks = (blockId: string, direction: 'up' | 'down') => {
    const blocks = [...(page.blocks || [])];
    const index = blocks.findIndex(b => b.id === blockId);
    if (index === -1) return;

    if (direction === 'up' && index < blocks.length - 1) {
      [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
    } else if (direction === 'down' && index > 0) {
      [blocks[index], blocks[index - 1]] = [blocks[index - 1], blocks[index]];
    }

    // Refresh z-indices based on order
    const updatedBlocks = blocks.map((b, i) => ({ ...b, zIndex: i + 1 }));
    handleUpdatePage({ blocks: updatedBlocks });
  };

  const handleAddPage = () => {
    const newPage: WorkbookPage = {
      id: `page-${Date.now()}`,
      title: 'Untitled Page',
      type: 'content',
      content: '<p>New page content...</p>',
      blocks: [],
      layout: 'single-column',
      theme: workbook.overallStyle as any
    };
    onUpdateWorkbook({
      ...workbook,
      pages: [...workbook.pages, newPage]
    });
    setCurrentPageIndex(workbook.pages.length);
  };

  const handleAddBlock = (type: BlockType) => {
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}`,
      type,
      content: type === 'text' ? 'New text block' : type === 'heading' ? 'Heading' : '',
      x: 50,
      y: 50,
      w: type === 'heading' ? 400 : 200,
      zIndex: (page.blocks?.length || 0) + 1
    };
    
    const newPages = [...workbook.pages];
    const pageToUpdate = { ...newPages[currentPageIndex] };
    pageToUpdate.blocks = [...(pageToUpdate.blocks || []), newBlock];
    newPages[currentPageIndex] = pageToUpdate;
    onUpdateWorkbook({ ...workbook, pages: newPages });
    setSelectedBlockId(newBlock.id);
  };

  const handleDeleteBlock = (id: string) => {
    const newPages = [...workbook.pages];
    const pageToUpdate = { ...newPages[currentPageIndex] };
    pageToUpdate.blocks = pageToUpdate.blocks.filter(b => b.id !== id);
    newPages[currentPageIndex] = pageToUpdate;
    onUpdateWorkbook({ ...workbook, pages: newPages });
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    const element = document.createElement('div');
    element.innerHTML = workbookToHTMLStandalone(workbook);
    
    const opt = {
      margin: 10,
      filename: `${workbook.title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsExporting(false);
    });
  };

  const handleExportHTML = () => {
    const html = workbookToHTMLStandalone(workbook);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workbook.title.toLowerCase().replace(/\s+/g, '_')}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#fafafa] flex flex-col font-sans text-[#1a1a1a]">
      {/* Top Bar */}
      <header className="h-16 border-b border-[#e5e5e5] bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onExit}
            className="p-2 hover:bg-[#f0f0f0] rounded-xl transition-all active:scale-95 text-[#8e8e8e] hover:text-[#1a1a1a]"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold truncate max-w-[200px]">{workbook.title}</h1>
            <p className="text-[10px] font-bold text-[#d44d29] uppercase tracking-widest">EduSpark Studio v2.0</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#f0f0f0] p-1 rounded-xl">
           <button 
             onClick={() => setEditMode('edit')}
             className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
               editMode === 'edit' ? 'bg-white text-[#1a1a1a] shadow-sm' : 'text-[#8e8e8e] hover:text-[#1a1a1a]'
             }`}
           >
             Edit
           </button>
           <button 
             onClick={() => setEditMode('preview')}
             className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
               editMode === 'preview' ? 'bg-white text-[#1a1a1a] shadow-sm' : 'text-[#8e8e8e] hover:text-[#1a1a1a]'
             }`}
           >
             Preview
           </button>
        </div>

        {/* Studio Tools */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#1a1a1a] p-1.5 rounded-2xl shadow-xl border border-white/10 text-white/50">
          <ToolButton 
            active={activeTool === 'select'} 
            onClick={() => setActiveTool('select')} 
            icon={<MousePointer2 size={18} />} 
          />
          <ToolButton 
            active={activeTool === 'hand'} 
            onClick={() => setActiveTool('hand')} 
            icon={<Hand size={18} />} 
          />
          <div className="w-px h-6 bg-white/10 mx-1" />
          <ToolButton 
            active={activeTool === 'text'} 
            onClick={() => handleAddBlock('text')} 
            icon={<Type size={18} />} 
          />
          <ToolButton 
            active={activeTool === 'image'} 
            onClick={() => handleAddBlock('image')} 
            icon={<ImageIcon size={18} />} 
          />
          <ToolButton 
            active={false}
            onClick={() => handleAddBlock('heading')}
            icon={<Palette size={18} />}
          />
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportHTML}
            className="flex items-center gap-2 px-4 py-2 border border-[#e5e5e5] rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#f5f5f5] transition-all"
          >
            <FileCode size={16} /> HTML
          </button>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-all shadow-lg shadow-black/10"
          >
            <Download size={16} /> PDF
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Pages Sidebar */}
        <aside className="w-64 border-r border-[#e5e5e5] bg-white flex flex-col shrink-0">
          <div className="p-4 border-b border-[#e5e5e5] flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#ababab]">Pages ({workbook.pages.length})</h3>
            <button 
              onClick={handleAddPage}
              className="p-1 px-2 bg-[#f0f0f0] rounded-lg text-[10px] font-bold hover:bg-[#e0e0e0] transition-colors"
            >
              + New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {workbook.pages.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setCurrentPageIndex(i)}
                className={`w-full group p-3 rounded-2xl flex items-center gap-3 transition-all ${
                  currentPageIndex === i ? 'bg-[#1a1a1a] text-white shadow-lg' : 'hover:bg-[#f5f5f5]'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                  currentPageIndex === i ? 'bg-white/10' : 'bg-[#f0f0f0]'
                }`}>
                  {i + 1}
                </div>
                <span className="text-xs font-bold truncate flex-1 text-left">{p.title}</span>
                {currentPageIndex === i && <Check size={14} className="text-[#d44d29]" />}
              </button>
            ))}
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 relative bg-[#eee] p-12 overflow-auto custom-scrollbar flex justify-center items-start">
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1a1a1a 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          
          <div 
            className={`bg-white shadow-[0_40px_100px_rgba(0,0,0,0.1)] relative p-[25mm] origin-top transition-all duration-500 overflow-hidden ${
              page.layout === 'two-column' ? 'w-[420mm] grid grid-cols-2 gap-[25mm]' : 
              page.layout === 'split-screen' ? 'w-[420mm] grid grid-cols-2' :
              'w-[210mm]'
            } ${page.layout === 'full-width-image' ? 'p-0' : 'p-[25mm]'} min-h-[297mm]`}
            style={{ 
              fontFamily: 'Inter, sans-serif'
            }}
          >
            {/* Page Header */}
            {page.layout !== 'full-width-image' && (
              <div className={`mb-12 border-b-2 border-[#1a1a1a] pb-6 flex items-end justify-between ${page.layout === 'header-focused' ? 'flex-col items-center text-center border-b-0 py-12' : ''}`}>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#ababab] tracking-[0.2em] uppercase mb-1">0{currentPageIndex + 1}</span>
                  <h1 className={`${page.layout === 'header-focused' ? 'text-6xl mb-4' : 'text-4xl'} font-serif italic text-[#1a1a1a] leading-none`}>{page.title}</h1>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-[0.3em] text-[#d44d29] ${page.layout === 'header-focused' ? 'mt-4' : ''}`}>{page.type}</span>
              </div>
            )}

            {/* Block Base Layer (Legacy Content) */}
            {!page.blocks?.length && (
              <div className="prose prose-stone max-w-none" dangerouslySetInnerHTML={{ __html: page.content }} />
            )}

            {/* Blocks Layer */}
            {page.blocks?.map((block) => (
              <CanvasBlock 
                key={block.id}
                block={block}
                isEditMode={isEditMode}
                isSelected={selectedBlockId === block.id}
                activeTool={activeTool}
                onSelect={() => setSelectedBlockId(block.id)}
                onUpdate={(updates) => handleUpdateBlock(block.id, updates)}
                onDelete={() => handleDeleteBlock(block.id)}
              />
            ))}

            {/* Page Footer */}
            <div className="absolute bottom-[25mm] left-[25mm] right-[25mm] border-top border-[#eee] pt-6 flex justify-between items-center opacity-40">
              <span className="text-[9px] font-bold uppercase tracking-widest">{workbook.title}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest">EduSpark Protocol &middot; Page 0{currentPageIndex + 1}</span>
            </div>
          </div>
        </main>

        {/* Inspector Sidebar */}
        <aside className="w-80 border-l border-[#e5e5e5] bg-white flex flex-col shrink-0">
          <div className="p-4 border-b border-[#e5e5e5]">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#ababab]">Inspector</h3>
          </div>
          <div className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar">
            {selectedBlockId ? (
              <div className="space-y-6 animate-fade-in">
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Element Properties</span>
                    <span className="text-[9px] bg-[#f0f0f0] px-2 py-1 rounded font-mono">#{selectedBlockId.split('-')[1]}</span>
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababab]">Position</label>
                    <div className="grid grid-cols-2 gap-2">
                       <div className="bg-[#f9f9f9] p-3 rounded-xl border border-[#e5e5e5] flex flex-col">
                          <span className="text-[9px] text-[#ababab] font-bold mb-1">X Cursor</span>
                          <span className="text-sm font-mono">{Math.round(page.blocks?.find(b => b.id === selectedBlockId)?.x || 0)}px</span>
                       </div>
                       <div className="bg-[#f9f9f9] p-3 rounded-xl border border-[#e5e5e5] flex flex-col">
                          <span className="text-[9px] text-[#ababab] font-bold mb-1">Y Cursor</span>
                          <span className="text-sm font-mono">{Math.round(page.blocks?.find(b => b.id === selectedBlockId)?.y || 0)}px</span>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababab]">Hierarchy</label>
                    <div className="flex gap-1">
                       <button 
                         onClick={() => handleReorderBlocks(selectedBlockId, 'down')}
                         className="flex-1 bg-[#f0f0f0] p-2 rounded-xl text-[10px] font-bold hover:bg-[#e0e0e0] flex items-center justify-center gap-2"
                       >
                         <ChevronLeft size={14} className="-rotate-90" /> Bring Back
                       </button>
                       <button 
                         onClick={() => handleReorderBlocks(selectedBlockId, 'up')}
                         className="flex-1 bg-[#1a1a1a] text-white p-2 rounded-xl text-[10px] font-bold hover:bg-[#333] flex items-center justify-center gap-2"
                       >
                         <ChevronRight size={14} className="-rotate-90" /> Bring Front
                       </button>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababab]">Layer Stack</label>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar bg-[#f9f9f9] p-2 rounded-xl border border-[#e5e5e5]">
                       {[...(page.blocks || [])].reverse().map((b, i) => (
                          <div 
                            key={b.id}
                            draggable
                            className={`p-2 rounded-lg text-[10px] font-bold flex items-center justify-between group ${
                              selectedBlockId === b.id ? 'bg-[#1a1a1a] text-white shadow-md' : 'hover:bg-white/60 text-[#444]'
                            }`}
                            onClick={() => setSelectedBlockId(b.id)}
                          >
                             <div className="flex items-center gap-2">
                                <Layers size={10} className="opacity-40" />
                                <span className="truncate max-w-[120px]">{b.type === 'text' ? (b.content?.replace(/<[^>]+>/g, '') || 'Empty text') : b.type}</span>
                             </div>
                             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); handleReorderBlocks(b.id, 'down'); }} className="p-1 hover:bg-white/20 rounded"><Check size={10} className="rotate-180" /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleReorderBlocks(b.id, 'up'); }} className="p-1 hover:bg-white/20 rounded"><Check size={10} /></button>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababab]">Page Layout</label>
                   <div className="grid grid-cols-2 gap-2">
                      <LayoutOption 
                        active={page.layout === 'single-column'} 
                        onClick={() => handleUpdatePage({ layout: 'single-column' })} 
                        label="Single Column" 
                      />
                      <LayoutOption 
                        active={page.layout === 'two-column'} 
                        onClick={() => handleUpdatePage({ layout: 'two-column' })} 
                        label="Two Column" 
                      />
                      <LayoutOption 
                        active={page.layout === 'header-focused'} 
                        onClick={() => handleUpdatePage({ layout: 'header-focused' })} 
                        label="Header Focus" 
                      />
                      <LayoutOption 
                        active={page.layout === 'full-width-image'} 
                        onClick={() => handleUpdatePage({ layout: 'full-width-image' })} 
                        label="Full Width Image" 
                      />
                      <LayoutOption 
                        active={page.layout === 'split-screen'} 
                        onClick={() => handleUpdatePage({ layout: 'split-screen' })} 
                        label="Split Screen" 
                      />
                      <LayoutOption 
                        active={page.layout === 'freeform'} 
                        onClick={() => handleUpdatePage({ layout: 'freeform' })} 
                        label="Freeform Canvas" 
                      />
                   </div>
                </div>

                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 gap-4 py-10">
                   <MousePointer2 size={40} />
                   <p className="text-sm italic px-4">Select an element to adjust its curriculum properties or change the page layout above.</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Floating Status */}
      <AnimatePresence>
        {isExporting && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 z-[200]"
          >
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-xs font-bold uppercase tracking-widest">Rendering Digital Master...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LayoutOption({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`p-3 rounded-xl border text-[10px] font-bold text-left transition-all ${
        active 
          ? 'bg-[#1a1a1a] text-white border-[#1a1a1a] shadow-lg shadow-black/10' 
          : 'bg-white text-[#444] border-[#e5e5e5] hover:border-[#1a1a1a]'
      }`}
    >
      {label}
    </button>
  );
}

function ToolButton({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`p-2.5 rounded-xl transition-all active:scale-90 ${
        active ? 'bg-white text-[#1a1a1a]' : 'hover:bg-white/10 text-white/60 hover:text-white'
      }`}
    >
      {icon}
    </button>
  );
}

interface CanvasBlockProps {
  block: ContentBlock;
  isEditMode: boolean;
  isSelected: boolean;
  activeTool: string;
  onSelect: () => void;
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onDelete: () => void;
}

function CanvasBlock({ block, isEditMode, isSelected, activeTool, onSelect, onUpdate, onDelete }: CanvasBlockProps) {
  const nodeRef = React.useRef(null);
  
  return (
    <Draggable
      nodeRef={nodeRef}
      disabled={!isEditMode || activeTool !== 'select'}
      defaultPosition={{ x: block.x, y: block.y }}
      onStop={(e, data) => onUpdate({ x: data.x, y: data.y })}
      bounds="parent"
    >
      <div 
        ref={nodeRef}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        className={`absolute p-4 cursor-move group ${
          isSelected ? 'ring-2 ring-[#d44d29] bg-[#d44d29]/5' : 'hover:ring-1 hover:ring-[#ababab]'
        }`}
        style={{ 
          zIndex: block.zIndex,
          width: block.w || 'auto',
          ...block.style
        }}
      >
        {isEditMode && isSelected && (
          <div className="absolute -top-10 left-0 flex items-center gap-1 bg-[#1a1a1a] p-1 rounded-lg shadow-xl animate-fade-in whitespace-nowrap">
             <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-red-400 hover:text-red-300">
               <Trash2 size={14} />
             </button>
             <div className="w-px h-4 bg-white/10 mx-1" />
             <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 text-white/80 hover:text-white">
               <Maximize2 size={14} />
             </button>
          </div>
        )}

        {block.type === 'text' && (
          <RichTextEditor 
            content={block.content}
            isFocused={isSelected && isEditMode}
            onChange={(content) => onUpdate({ content })}
          />
        )}
        {block.type === 'heading' && (
          <h2 
            contentEditable={isEditMode}
            suppressContentEditableWarning
            onBlur={(e) => onUpdate({ content: e.currentTarget.innerHTML })}
            className="text-2xl font-serif italic font-bold outline-none min-w-[100px]"
            dangerouslySetInnerHTML={{ __html: block.content }}
          />
        )}
        {block.type === 'image' && (
          <div className="flex flex-col gap-2 relative">
             {block.content ? (
               <img src={block.content} className="max-w-full rounded-xl pointer-events-none" alt="Block content" />
             ) : (
               <div className="bg-[#f5f5f5] border-2 border-dashed border-[#e5e5e5] p-12 rounded-xl flex flex-col items-center justify-center gap-3 text-[#ababab]">
                  <ImageIcon size={32} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-center">Click to Upload Image</span>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          onUpdate({ content: event.target?.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
               </div>
             )}
          </div>
        )}
      </div>
    </Draggable>
  );
}
