import { BuildWorkbookArgs, ChatMessage, Roadmap, Workbook } from '@/lib/types';
import { AIProvider, ChatStreamChunk } from './types';

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

// --- Helpers to infer topic/level from a conversation ---

function inferSubject(text: string): string {
  const t = text.toLowerCase();
  if (/(math|algebra|geometry|calculus|fraction|equation)/.test(t)) return 'Mathematics';
  if (/(history|civil|world war|ancient|medieval)/.test(t)) return 'History';
  if (/(biology|cell|dna|organism|ecosystem)/.test(t)) return 'Biology';
  if (/(physics|force|energy|motion|newton)/.test(t)) return 'Physics';
  if (/(chemistry|atom|molecule|reaction)/.test(t)) return 'Chemistry';
  if (/(english|grammar|literature|shakespeare|writing|essay)/.test(t)) return 'English';
  if (/(hebrew|עברית)/.test(t)) return 'Hebrew';
  if (/(coding|programming|python|javascript|algorithm)/.test(t)) return 'Computer Science';
  return 'General Studies';
}

function inferLevel(text: string): string {
  const t = text.toLowerCase();
  const gradeMatch = t.match(/grade\s*(\d+)|(\d+)(?:st|nd|rd|th)\s*grade/);
  if (gradeMatch) return `Grade ${gradeMatch[1] || gradeMatch[2]}`;
  if (/(elementary|primary)/.test(t)) return 'Elementary';
  if (/(middle school|junior high)/.test(t)) return 'Middle School';
  if (/(high school|secondary)/.test(t)) return 'High School';
  if (/(college|university|undergrad)/.test(t)) return 'College';
  return 'High School';
}

function inferTopic(history: ChatMessage[], prompt: string): string {
  const all = [...history.map(m => m.text), prompt].join(' ').trim();
  // Take the last user prompt as the best approximation of the topic
  const latest = prompt.trim();
  return latest.length > 2 ? latest : all.slice(0, 80) || 'Sample Topic';
}

// --- Simple state detection from conversation ---

function conversationState(history: ChatMessage[]): {
  styleChosen: boolean;
  roadmapProposed: boolean;
  roadmapApproved: boolean;
} {
  const modelTexts = history.filter(h => h.role === 'model').map(h => h.text.toLowerCase());
  const userTexts = history.filter(h => h.role === 'user').map(h => h.text.toLowerCase());

  const styleOffered = modelTexts.some(t => t.includes('choose a style'));
  const styleChosen = styleOffered && userTexts.some(t =>
    /(minimal|playful|technical|elegant|science-lab|history-chronicle|literature-classic|style)/.test(t)
  );

  const roadmapProposed = modelTexts.some(t => t.includes('here is the roadmap') || t.includes('roadmap'));
  const roadmapApproved = roadmapProposed && userTexts.some(t =>
    /(approve|approved|looks good|go ahead|build it|proceed|yes)/.test(t)
  );

  return { styleChosen, roadmapProposed, roadmapApproved };
}

// --- Mock content generators ---

function mockPages(topic: string): BuildWorkbookArgs['pages'] {
  return [
    { title: `Introduction to ${topic}`, objective: `Provide an engaging overview of ${topic}.`, type: 'content' },
    { title: 'Core Concepts', objective: 'Explain the foundational ideas with examples.', type: 'content' },
    { title: 'Guided Example', objective: 'Walk through a solved example step-by-step.', type: 'content' },
    { title: 'Practice Exercises', objective: 'Reinforce understanding with 5 graded problems.', type: 'exercise' },
    { title: 'Challenge Problems', objective: 'Stretch thinking with 3 advanced problems.', type: 'exercise' },
    { title: 'Summary & Reflection', objective: 'Recap key takeaways and prompt reflection.', type: 'content' },
  ];
}

function mockRoadmap(topic: string): Roadmap {
  return {
    title: `Workbook Plan: ${topic}`,
    summary: `A 6-page professional-grade workbook on "${topic}" mixing clear explanations with progressive exercises.`,
    estimatedComplexity: 'Medium',
    items: [
      { title: 'Research curriculum standards', description: `Align "${topic}" with common standards.`, agentResponsible: 'Researcher' },
      { title: 'Draft content pages', description: 'Write introduction, concepts, examples, and summary.', agentResponsible: 'Curriculum' },
      { title: 'Build exercises', description: 'Create practice and challenge problems with answer keys.', agentResponsible: 'Mathematician' },
      { title: 'Polish language', description: 'Ensure tone is appropriate for the target level.', agentResponsible: 'Linguist' },
    ],
  };
}

function mockContentHTML(title: string, objective: string, type: string): string {
  if (type === 'exercise') {
    return `
<section class="page">
  <header class="page-header">
    <h1>${title}</h1>
  </header>
  <div class="callout"><strong>Objective:</strong> ${objective}</div>
  
  <ol class="mc-options">
    <li class="mc-option">Define the key term introduced in this section in your own words.</li>
    <li class="mc-option">Give two real-world examples related to the topic.</li>
    <li class="mc-option">Solve: If the pattern continues, what is the next value? <span class="math">2, 4, 8, 16, \dots</span></li>
    <li class="mc-option">Explain the difference between the two main ideas presented earlier.</li>
    <li class="mc-option">Create your own example that demonstrates the concept.</li>
  </ol>

  <div class="answer-line"></div>
  <div class="answer-box" data-lines="4"></div>

  <div class="grid-2col">
    <div>
      <h3>Quick Check</h3>
      <div class="answer-line"></div>
    </div>
    <div>
      <h3>Notes</h3>
      <div class="answer-box" data-lines="2"></div>
    </div>
  </div>

  <aside class="answer-key" style="display:none">
    <strong>Answer Key:</strong>
    <ol>
      <li>Student-produced definition aligned with the lesson.</li>
      <li>Varied; accept any relevant real-world example.</li>
      <li>32 — the sequence doubles each step.</li>
      <li>Key distinction based on the section's main ideas.</li>
      <li>Student-created; grade on clarity and correctness.</li>
    </ol>
  </aside>
</section>`.trim();
  }
  return `
<section class="page">
  <header class="page-header">
    <h1>${title}</h1>
  </header>
  
  <div class="callout">
    <strong>Focus:</strong> ${objective}
  </div>

  <p>This section introduces the core ideas behind <em>${title}</em>. Students should finish this page able to describe the main concepts confidently and relate them to prior knowledge.</p>
  
  <div class="grid-2col">
    <div>
      <h3>Introduction</h3>
      <p>Exploring the foundational concepts. We use structured layout to ensure high-fidelity PDF export and deterministic styling.</p>
    </div>
    <div>
      <h3>Key Takeaways</h3>
      <ul>
        <li>Clear definition of the central concept.</li>
        <li>One concrete example that makes it tangible.</li>
        <li>A short visual cue or diagram suggestion.</li>
      </ul>
    </div>
  </div>

  <div class="figure">
    <svg width="200" height="100" viewBox="0 0 200 100">
      <rect x="10" y="10" width="180" height="80" fill="var(--color-accent)" fill-opacity="0.1" stroke="var(--color-accent)" stroke-width="2" />
      <text x="100" y="55" text-anchor="middle" font-family="serif" font-style="italic">Sample Illustration</text>
    </svg>
    <figcaption>Figure 1: Demonstration of the integrated SVG illustration system.</figcaption>
  </div>

  <p>The system supports inline math using KaTeX: <span class="math">E = mc^2</span> and complex diagrams via Mermaid.</p>
</section>`.trim();
}

function mockSVG(title: string): string {
  const safe = title.replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 40);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a1a"/>
      <stop offset="100%" stop-color="#d44d29"/>
    </linearGradient>
  </defs>
  <rect width="500" height="500" fill="#fafafa"/>
  <circle cx="250" cy="220" r="140" fill="url(#g)" opacity="0.9"/>
  <rect x="80" y="380" width="340" height="10" rx="5" fill="#1a1a1a"/>
  <text x="250" y="450" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="22" fill="#1a1a1a">${safe}</text>
</svg>`;
}

// --- Provider implementation ---

async function* chatStream(
  history: ChatMessage[],
  prompt: string
): AsyncGenerator<ChatStreamChunk, void, unknown> {
  yield { type: 'status', message: 'Analyzing prompt (mock AI)...' };
  await sleep(300);

  const state = conversationState(history);
  const topic = inferTopic(history, prompt);

  // 1) If no conversation yet → greet & trigger style selection.
  if (history.length === 0 || !state.styleChosen) {
    yield { type: 'status', message: 'Drafting response...' };
    await sleep(250);
    yield { type: 'trigger_style_selection' };
    yield {
      type: 'text',
      text: `Great — I can help you build a professional workbook on **"${topic}"**.\n\nPlease choose a style from our design system options below so I can tailor the look and feel.`
    };
    return;
  }

  // 2) Style chosen but no roadmap yet → propose roadmap.
  if (!state.roadmapProposed) {
    yield { type: 'status', message: 'Researcher agent preparing the roadmap...' };
    await sleep(400);
    const rm = mockRoadmap(topic);
    yield { type: 'roadmap', roadmap: rm };
    return;
  }

  // 3) Roadmap proposed but not yet approved → ask for approval.
  if (!state.roadmapApproved) {
    // If this very message looks like approval, proceed to build.
    if (/(approve|approved|looks good|go ahead|build it|proceed|yes)/i.test(prompt)) {
      yield { type: 'status', message: 'Compiling build arguments...' };
      await sleep(300);
      const args: BuildWorkbookArgs = {
        title: `Workbook: ${topic}`,
        subject: inferSubject(topic),
        level: inferLevel(topic),
        region: 'Common Core',
        illustrationStyle: 'vector',
        colorPalette: 'Warm Earth',
        overallStyle: 'minimal',
        pages: mockPages(topic),
      };
      yield { type: 'function_call', args };
      return;
    }
    yield {
      type: 'text',
      text: 'Does the roadmap above look good? Reply **"approve"** and I will start building the workbook.'
    };
    return;
  }

  // 4) Post-build fallback chat.
  yield {
    type: 'text',
    text: `I've noted: "${prompt}". Your workbook on **${topic}** is ready — you can preview or export it from the artifact panel.`
  };
}

async function generateContentPage(
  title: string,
  objective: string,
  type: string,
  _context: string,
  _stylePrefs?: import('@/lib/types').StylePrefs
): Promise<string> {
  await sleep(120);
  return mockContentHTML(title, objective, type);
}

async function generateSVGIllustration(
  title: string,
  _description: string,
  _style?: string,
  _palette?: string
): Promise<string> {
  await sleep(120);
  return mockSVG(title);
}

async function verifyWorkbook(workbook: Workbook): Promise<string> {
  await sleep(150);
  const pageCount = workbook.pages?.length ?? 0;
  return `### Verification Report (Mock)

- **Score:** 9/10
- **Pages reviewed:** ${pageCount}
- **Tone:** Appropriate for ${workbook.level}.
- **Accuracy:** No factual issues detected in mock review.
- **Suggestion:** Consider adding a short glossary page at the end.`;
}

async function generateChatTitle(messages: ChatMessage[]): Promise<string> {
  if (!messages.length) return 'New Conversation';
  const first = messages.find(m => m.role === 'user')?.text || '';
  const words = first.replace(/\s+/g, ' ').trim().split(' ').slice(0, 5).join(' ');
  return words || 'Untitled';
}

async function critiquePage(html: string): Promise<any> {
  await sleep(100);
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const score = text.length > 200 ? 9 : 6;
  return {
    score,
    reason: score >= 8 ? 'High quality' : 'Insufficient depth',
    strengths: ['Clean semantic HTML', 'Matches objective'],
    weaknesses: score < 8 ? ['Content is too brief'] : [],
    recommendingRevision: score < 8,
    actionableFix: 'Expand on the core concept and add an interactive example.'
  };
}

export const mockProvider: AIProvider = {
  id: 'mock',
  chatStream,
  generateContentPage,
  generateSVGIllustration,
  verifyWorkbook,
  generateChatTitle,
  critiquePage,
};
