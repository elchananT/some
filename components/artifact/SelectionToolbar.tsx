'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bold, Italic, Type, List, ListOrdered, Link, SquareCode } from 'lucide-react';

interface SelectionToolbarProps {
  onFormat: (command: string, value?: string) => void;
}

export default function SelectionToolbar({ onFormat }: SelectionToolbarProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setShow(false);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Check if the selection is within a contentEditable element
      let container = range.commonAncestorContainer as any;
      if (container.nodeType === 3) container = container.parentNode;
      
      if (container.closest('[contenteditable="true"]')) {
        setPosition({
          top: rect.top + window.scrollY - 60,
          left: rect.left + window.scrollX + rect.width / 2
        });
        setShow(true);
      } else {
        setShow(false);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={toolbarRef}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{ 
          position: 'absolute',
          top: position.top,
          left: position.left,
          transform: 'translateX(-50%)',
          zIndex: 1000
        }}
        className="flex items-center gap-1 bg-[#1a1a1a] text-white p-1.5 rounded-xl shadow-2xl border border-white/10 backdrop-blur-md"
      >
        <ToolbarButton onClick={() => onFormat('bold')} icon={<Bold size={16} />} title="Bold" />
        <ToolbarButton onClick={() => onFormat('italic')} icon={<Italic size={16} />} title="Italic" />
        <span className="w-px h-4 bg-white/10 mx-1" />
        <ToolbarButton onClick={() => onFormat('formatBlock', 'h3')} icon={<Type size={16} />} title="Heading" />
        <ToolbarButton onClick={() => onFormat('insertUnorderedList')} icon={<List size={16} />} title="Bullet List" />
        <ToolbarButton onClick={() => onFormat('insertOrderedList')} icon={<ListOrdered size={16} />} title="Numbered List" />
        <span className="w-px h-4 bg-white/10 mx-1" />
        <ToolbarButton onClick={() => {
           const url = prompt("Enter URL:");
           if (url) onFormat('createLink', url);
        }} icon={<Link size={16} />} title="Link" />
        <ToolbarButton onClick={() => {
           // Insert a placeholder for a math formula or block
           onFormat('insertHTML', '<span class="math-tex">$x^2$</span>');
        }} icon={<SquareCode size={16} />} title="Insert Math" />
      </motion.div>
    </AnimatePresence>
  );
}

function ToolbarButton({ onClick, icon, title }: { onClick: () => void, icon: React.ReactNode, title: string }) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent focus loss from the editor
        onClick();
      }}
      title={title}
      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
    >
      {icon}
    </button>
  );
}
