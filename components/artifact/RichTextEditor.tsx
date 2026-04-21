'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { 
  Bold, Italic, Underline as UnderlineIcon, 
  List, ListOrdered, Link as LinkIcon, 
  Undo, Redo, Sigma, Type, AlignLeft,
  AlignCenter, AlignRight, Image as ImageIcon
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  isFocused?: boolean;
}

export default function RichTextEditor({ content, onChange, isFocused }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: 'Start typing...',
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg my-4',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && isFocused) {
      editor.commands.focus();
    }
  }, [editor, isFocused]);

  if (!editor) return null;

  return (
    <div className="relative">
      {isFocused && (
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#1a1a1a] rounded-lg shadow-xl mb-2 border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            icon={<Bold size={14} />}
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            icon={<Italic size={14} />}
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            icon={<UnderlineIcon size={14} />}
          />
          <div className="w-px h-4 bg-white/10 mx-1" />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            icon={<List size={14} />}
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            icon={<ListOrdered size={14} />}
          />
          <div className="w-px h-4 bg-white/10 mx-1" />
          <ToolbarButton 
            onClick={() => {
              const url = window.prompt('URL');
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }}
            active={editor.isActive('link')}
            icon={<LinkIcon size={14} />}
          />
          <ToolbarButton 
            onClick={() => {
              const formula = window.prompt('Enter Math (LaTeX)', 'E = mc^2');
              if (formula) {
                // Basic math insertion as plain text for now, or we can use a custom node
                editor.chain().focus().insertContent(` <span class="math-tex">${formula}</span> `).run();
              }
            }}
            active={false}
            icon={<Sigma size={14} />}
          />
          <ToolbarButton 
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (readerEvent) => {
                    const src = readerEvent.target?.result as string;
                    editor.chain().focus().setImage({ src }).run();
                  };
                  reader.readAsDataURL(file);
                }
              };
              input.click();
            }}
            active={false}
            icon={<ImageIcon size={14} />}
          />
          <div className="w-px h-4 bg-white/10 mx-1" />
          <ToolbarButton 
            onClick={() => editor.chain().focus().undo().run()}
            active={false}
            icon={<Undo size={14} />}
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().redo().run()}
            active={false}
            icon={<Redo size={14} />}
          />
        </div>
      )}
      <EditorContent editor={editor} className="prose prose-sm max-w-none focus:outline-none" />
    </div>
  );
}

function ToolbarButton({ onClick, active, icon }: { onClick: () => void, active: boolean, icon: React.ReactNode }) {
  return (
    <button 
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      className={`p-1.5 rounded transition-all ${
        active ? 'bg-white text-[#1a1a1a]' : 'text-white/60 hover:text-white hover:bg-white/10'
      }`}
    >
      {icon}
    </button>
  );
}
