'use client';

import React from 'react';
import { AnimatePresence } from 'motion/react';
import { useEduSpark } from '@/hooks/useEduSpark';

// Modular Components
import Sidebar from '@/components/chat/Sidebar';
import ChatContainer from '@/components/chat/ChatContainer';
import ArtifactPane from '@/components/artifact/ArtifactPane';
import Header from '@/components/layout/Header';
import OnboardingWelcome from '@/components/onboarding/OnboardingWelcome';
import ProviderTelemetry from '@/components/layout/ProviderTelemetry';
import type { WorkbookStyle, StyleVariant } from '@/lib/themes';
import { mergePalette } from '@/lib/themes';
import type { StylePrefs } from '@/lib/types';
import { readOnboardingState, hasUsableCredential } from '@/lib/ai/keys';

export default function EduSparkApp() {
  const [onboardingDone, setOnboardingDone] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const state = readOnboardingState();
    setOnboardingDone(state.completed || hasUsableCredential());
  }, []);
  const {
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
    createNewConversation,
    loadConversation,
    deleteConversation,
    handleSendMessage,
    addExternalResource,
    initiateResearch,
    usage,
  } = useEduSpark();

  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [layoutDirection, setLayoutDirection] = React.useState<'ltr' | 'rtl'>('ltr');

  const handleApproveRoadmap = () => {
    setRoadmap(null);
    setStep('composing');
    handleSendMessage("I approve the roadmap. Please proceed with building the workbook as planned.");
  };

  const handleSelectStyle = (style: WorkbookStyle, variant?: StyleVariant, prefs?: StylePrefs) => {
    setStep('idle');
    const merged = mergePalette(style.palette, variant?.paletteOverride);
    // Merged palette is currently carried in the chat message; downstream pipeline
    // (Stage 4) will thread this into BuildWorkbookArgs.colorPaletteOverride.
    void merged;

    // Persist chosen print stylePrefs on the active workbook (used by the
    // HTML/PDF exporter to pick one of the 6 locked print themes).
    if (prefs && workbook) {
      setWorkbook({ ...workbook, stylePrefs: prefs });
    }

    const variantLabel = variant ? ` · ${variant.label}` : '';
    const prefsSummary = prefs
      ? ` Theme: ${prefs.theme}; density: ${prefs.density}; question types: ${prefs.questionTypes.join(', ')}.`
      : '';
    handleSendMessage(
      `I've selected the '${style.name}${variantLabel}' style.${prefsSummary} Please proceed with this design architecture.`
    );
  };

  const handleImageUpload = (base64: string) => {
    if (!workbook) return;
    const newPage = {
      id: `user-img-${Date.now()}`,
      title: 'User Uploaded Illustration',
      type: 'illustration' as const,
      content: '<p>User provided visual asset.</p>',
      imageUrl: base64,
      theme: workbook.overallStyle as any,
      blocks: []
    };
    setWorkbook({ ...workbook, pages: [...workbook.pages, newPage] });
  };

  const hasArtifact = step !== 'idle' || workbook !== null;

  // Gate the whole app on BYOK onboarding. `null` = still loading from localStorage.
  if (onboardingDone === false) {
    return <OnboardingWelcome onDone={() => setOnboardingDone(true)} />;
  }
  if (onboardingDone === null) {
    return <div className="h-screen w-full bg-[var(--color-bg,#FAF9F6)]" aria-hidden />;
  }

  return (
    <main 
      dir={layoutDirection} 
      className={`flex h-screen w-full bg-white text-[#1a1a1a] font-sans overflow-hidden ${layoutDirection === 'rtl' ? 'flex-row-reverse' : ''}`}
    >
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewConversation={createNewConversation}
        onSelectConversation={loadConversation}
        onDeleteConversation={deleteConversation}
      />

      <div className="flex-1 flex flex-col h-full relative overflow-hidden transition-all duration-500 ease-in-out">
        <Header 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          onNewConversation={createNewConversation}
          hasArtifact={hasArtifact}
          layoutDirection={layoutDirection}
          setLayoutDirection={setLayoutDirection}
        />

        <div className="flex-1 flex overflow-hidden">
          <ChatContainer 
            messages={messages}
            isTyping={isTyping}
            agentStatus={agentStatus}
            input={input}
            setInput={setInput}
            onSendMessage={handleSendMessage}
            onImageUpload={handleImageUpload}
            onAddResource={addExternalResource}
            onInitiateResearch={initiateResearch}
            step={step}
            hasArtifact={hasArtifact}
            layoutDirection={layoutDirection}
          />

          <AnimatePresence>
            {hasArtifact && (
              <ArtifactPane 
                isVisible={hasArtifact}
                step={step}
                phase={phase}
                breadcrumbs={breadcrumbs}
                workbook={workbook}
                roadmap={roadmap}
                onApproveRoadmap={handleApproveRoadmap}
                onRejectRoadmap={() => { setRoadmap(null); setStep('idle'); }}
                onSelectStyle={handleSelectStyle}
                onUpdateWorkbook={setWorkbook}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
      <ProviderTelemetry usage={usage} />
    </main>
  );
}
