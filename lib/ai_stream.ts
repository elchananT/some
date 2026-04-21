import { ChatMessage } from './types';
import { getProvider } from './providers';
import type { ChatStreamChunk } from './providers/types';
import { compactIfNeeded } from './memory';
import { classifyError } from './ai/errors';

export async function* chatWithCurriculumDesignerStream(
  history: ChatMessage[],
  prompt: string
): AsyncGenerator<ChatStreamChunk, void, unknown> {
  const provider = getProvider();
  try {
    // Auto-compact long conversations so we never blow the provider's context window.
    const compacted = await compactIfNeeded(history, provider);
    yield* provider.chatStream(compacted, prompt);
  } catch (error: unknown) {
    console.error('chatWithCurriculumDesignerStream error:', error);
    const c = classifyError(error);
    yield { type: 'error', kind: c.kind, text: c.userMessage };
  }
}

export async function generateChatTitle(messages: ChatMessage[]): Promise<string> {
  try {
    return await getProvider().generateChatTitle(messages);
  } catch {
    return 'Untitled Conversation';
  }
}
