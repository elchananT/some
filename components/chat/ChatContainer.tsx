'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { ChatMessage, GeneratingStep } from '@/lib/types';

interface ChatContainerProps {
  messages: ChatMessage[];
  isTyping: boolean;
  agentStatus: string | null;
  input: string;
  setInput: (val: string) => void;
  onSendMessage: (text?: string) => void;
  onImageUpload: (base64: string) => void;
  onAddResource: (url: string) => void;
  onInitiateResearch: (keywords: string) => void;
  step: GeneratingStep;
  hasArtifact: boolean;
  layoutDirection: 'ltr' | 'rtl';
}

export default function ChatContainer({
  messages,
  isTyping,
  agentStatus,
  input,
  setInput,
  onSendMessage,
  onImageUpload,
  onAddResource,
  onInitiateResearch,
  step,
  hasArtifact,
  layoutDirection
}: ChatContainerProps) {
  return (
    <div className={`flex flex-col h-full transition-all duration-500 ease-in-out ${hasArtifact ? 'w-[450px]' : 'flex-1'} ${layoutDirection === 'rtl' ? 'border-l border-[var(--color-border)]' : 'border-r border-[var(--color-border)]'}`}>
      <MessageList 
        messages={messages}
        isTyping={isTyping}
        agentStatus={agentStatus}
      />
      <MessageInput 
        input={input}
        setInput={setInput}
        onSendMessage={onSendMessage}
        onImageUpload={onImageUpload}
        onAddResource={onAddResource}
        onInitiateResearch={onInitiateResearch}
        isTyping={isTyping}
        step={step}
      />
    </div>
  );
}
