import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEduSpark } from '../hooks/useEduSpark';

// Mocking the AI stream library
vi.mock('../lib/ai_stream', () => ({
  chatWithCurriculumDesignerStream: vi.fn(async function* () {
    yield { type: 'text', text: 'Hello! I am ready to help.' };
  }),
  generateChatTitle: vi.fn(async () => 'Test Conversation'),
}));

// Mocking the AI core library
vi.mock('../lib/ai', () => ({
  generateContentPage: vi.fn(async () => 'Mock Content'),
  generateSVGIllustration: vi.fn(async () => '<svg></svg>'),
  verifyWorkbook: vi.fn(async () => ({ score: 100, feedback: [] })),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useEduSpark Hook', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('initially starts in idle state', () => {
    const { result } = renderHook(() => useEduSpark());
    expect(result.current.step).toBe('idle');
    expect(result.current.messages).toHaveLength(0);
  });

  it('creates a new conversation', () => {
    const { result } = renderHook(() => useEduSpark());
    act(() => {
      result.current.createNewConversation();
    });
    expect(result.current.activeConversationId).not.toBeNull();
  });

  it('updates input state correctly', () => {
    const { result } = renderHook(() => useEduSpark());
    act(() => {
      result.current.setInput('Build a math workbook');
    });
    expect(result.current.input).toBe('Build a math workbook');
  });

  it('sends a message and updates messages list', async () => {
    const { result } = renderHook(() => useEduSpark());
    
    act(() => {
      result.current.setInput('Build a math workbook');
    });

    await act(async () => {
      await result.current.handleSendMessage();
    });

    // Check if user message and assistant message are present
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].text).toBe('Build a math workbook');
    expect(result.current.messages[1].text).toBe('Hello! I am ready to help.');
    expect(result.current.isTyping).toBe(false);
  });
});
