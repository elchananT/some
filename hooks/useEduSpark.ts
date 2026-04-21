'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { chatWithCurriculumDesignerStream, generateChatTitle } from '@/lib/ai_stream';
import { runPipeline } from '@/lib/pipeline';
import { Workbook, GeneratingStep, ChatMessage, Roadmap, Conversation, BuildWorkbookArgs } from '@/lib/types';

const STORAGE_KEY = 'eduspark_conversations_v3';

export function useEduSpark() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [step, setStep] = useState<GeneratingStep>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [progress, setProgress] = useState(0);
  const [usage, setUsage] = useState<{
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    latencyMs?: number;
  } | null>(null);

  // Load conversations
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Conversation[];
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConversations(parsed);
      } catch (e) { console.error(e); }
    }
  }, []);

  // Sync current state to conversations array
  useEffect(() => {
    if (!activeConversationId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConversations(prev => {
      const updated = prev.map(c => {
        if (c.id === activeConversationId) {
          return {
            ...c,
            messages,
            workbook,
            step,
            updatedAt: Date.now()
          };
        }
        return c;
      });
      
      // Only save if something actually changed to avoid infinite loops
      const current = prev.find(c => c.id === activeConversationId);
      if (current && (current.messages !== messages || current.workbook !== workbook || current.step !== step)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      
      return updated;
    });
  }, [messages, workbook, step, activeConversationId]);

  const createNewConversation = useCallback(() => {
    const newId = uuidv4();
    const newConversation: Conversation = {
      id: newId,
      title: 'New Conversation',
      messages: [],
      workbook: null,
      step: 'idle',
      updatedAt: Date.now()
    };
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newId);
    setMessages([]);
    setWorkbook(null);
    setStep('idle');
    setRoadmap(null);
    setProgress(0);
    setInput('');
  }, []);

  const loadConversation = useCallback((conv: Conversation) => {
    setActiveConversationId(conv.id);
    setMessages(conv.messages);
    setWorkbook(conv.workbook);
    setStep(conv.step);
    setRoadmap(null);
    setProgress(conv.step === 'complete' ? 100 : 0);
    setInput('');
  }, []);

  const deleteConversation = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
        setWorkbook(null);
        setStep('idle');
      }
      return filtered;
    });
  }, [activeConversationId]);

  const startGeneration = useCallback(async (args: BuildWorkbookArgs) => {
    const started = Date.now();
    try {
      setProgress(5);
      setBreadcrumbs([]);
      // Seed an empty shell so the UI shows the workbook card immediately.
      // Preserve `stylePrefs` from any prior workbook state (set by the
      // StylePickerCard before generation starts) so the exporter can pick
      // the right locked print theme.
      const preservedStylePrefs = workbook?.stylePrefs;
      const seed: Workbook = {
        id: uuidv4(),
        title: args.title,
        subject: args.subject,
        level: args.level,
        region: args.region,
        illustrationStyle: args.illustrationStyle,
        colorPalette: args.colorPalette,
        overallStyle: args.overallStyle,
        pages: [],
        outline: 'Generated conversationally.',
        stylePrefs: preservedStylePrefs,
      };
      setWorkbook(seed);

      const { workbook: finalWorkbook } = await runPipeline(args, {
        onStage: stage => setStep(stage),
        onBreadcrumb: label => setBreadcrumbs(prev => [...prev, label]),
        onPhase: text => {
          setAgentStatus(text);
          setPhase(text);
        },
        onPageUpdate: (index, page) => {
          setWorkbook(prev => {
            if (!prev) return prev;
            const nextPages = [...prev.pages];
            while (nextPages.length <= index) nextPages.push(page);
            nextPages[index] = page;
            return { ...prev, pages: nextPages };
          });
        },
        onCoverIllustration: () => {
          /* already applied via onPageUpdate */
        },
        onVerificationReport: report => {
          setWorkbook(prev => (prev ? { ...prev, verificationReport: report } : prev));
        },
      });

      setWorkbook({ ...finalWorkbook, stylePrefs: preservedStylePrefs ?? finalWorkbook.stylePrefs });
      setProgress(100);
      setStep('complete');
      setAgentStatus(null);
      setUsage({ latencyMs: Date.now() - started });
    } catch (error) {
      console.error('Generation Error:', error);
      setAgentStatus('Error during generation.');
      setStep('idle');
    }
  }, [workbook]);

  const handleSendMessage = useCallback(async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || isTyping) return;

    let currentId = activeConversationId;
    if (!currentId) {
      const newId = uuidv4();
      const newConv: Conversation = {
        id: newId,
        title: textToSend.substring(0, 30) + (textToSend.length > 30 ? '...' : ''),
        messages: [],
        workbook: null,
        step: 'idle',
        updatedAt: Date.now()
      };
      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newId);
      currentId = newId;
    }

    const userMessage: ChatMessage = { role: 'user', text: textToSend };
    // Update local messages state immediately
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setAgentStatus('Thinking...');

    try {
      // Use the updated messages list for the stream
      const currentMessages = [...messages, userMessage];
      const generator = chatWithCurriculumDesignerStream(currentMessages, textToSend);
      
      let finalArgs: BuildWorkbookArgs | null = null;
      let finalText = "";
      let hasReceivedChunk = false;

      setPhase('Thinking…');
      setBreadcrumbs([]);

      for await (const chunk of generator) {
        hasReceivedChunk = true;
        if (chunk.type === 'status') {
           setAgentStatus(chunk.message);
           setPhase(chunk.message);
        } else if (chunk.type === 'roadmap') {
           setRoadmap(chunk.roadmap);
           setStep('roadmap_approval');
        } else if (chunk.type === 'trigger_style_selection') {
           setStep('style_selection');
        } else if (chunk.type === 'text') {
           // Accumulate deltas from streaming providers; fall back to replace for legacy single-chunk.
           if (chunk.delta) {
             finalText += chunk.text;
           } else {
             finalText = chunk.text;
           }
        } else if (chunk.type === 'tool_breadcrumb') {
           setAgentStatus(chunk.label);
           setPhase(chunk.label);
           setBreadcrumbs(prev => [...prev, chunk.label]);
        } else if (chunk.type === 'function_call') {
           finalArgs = chunk.args;
        } else if (chunk.type === 'error') {
           // Surface a calm, user-friendly message. Kind info could drive UI retry pill later.
           finalText = chunk.text;
        } else if (chunk.type === 'usage') {
           setUsage({
             model: chunk.model,
             promptTokens: chunk.promptTokens,
             completionTokens: chunk.completionTokens,
             latencyMs: chunk.latencyMs,
           });
        }
      }

      if (finalArgs) {
         const modelMsg: ChatMessage = { role: 'model', text: "Analyzing guidelines... I'm starting to build your workbook now." };
         setMessages(prev => [...prev, modelMsg]);
         startGeneration(finalArgs);
      } else if (finalText) {
         const modelMsg: ChatMessage = { role: 'model', text: finalText };
         setMessages(prev => [...prev, modelMsg]);
      } else if (!hasReceivedChunk) {
         setMessages(prev => [...prev, { role: 'model', text: "I'm sorry, I couldn't process that. Please try again." }]);
      }

      // Title generation (side effect)
      if (messages.length === 0 && currentId) {
        generateChatTitle([...messages, userMessage]).then(title => {
          setConversations(prev => prev.map(c => c.id === currentId ? { ...c, title } : c));
        });
      }

    } catch (e: any) {
      console.error("Chat Execution Error:", e);
      setMessages(prev => [...prev, { role: 'model', text: "System error. Please Refresh or try again." }]);
    } finally {
      setIsTyping(false);
      setAgentStatus(null);
      setPhase(null);
    }
  }, [input, isTyping, activeConversationId, messages, startGeneration]);

  const addExternalResource = useCallback((resource: string) => {
    handleSendMessage(`Please analyze this resource: ${resource}`);
  }, [handleSendMessage]);

  const initiateResearch = useCallback((keywords: string) => {
    handleSendMessage(`Please perform deep AI research on these keywords: ${keywords}. Find relevant educational standards, current facts, and key pedagogical concepts to integrate into the workbook.`);
  }, [handleSendMessage]);

  return {
    conversations,
    activeConversationId,
    step,
    setStep,
    messages,
    input,
    setInput,
    isTyping,
    agentStatus,
    phase,
    breadcrumbs,
    roadmap,
    setRoadmap,
    workbook,
    setWorkbook,
    progress,
    createNewConversation,
    loadConversation,
    deleteConversation,
    handleSendMessage,
    startGeneration,
    addExternalResource,
    initiateResearch,
    usage,
  };
}
