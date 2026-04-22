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
  // If it's a demo or general topic, give the high-fidelity Solar System version
  if (topic.toLowerCase().includes('solar system') || topic.toLowerCase() === 'sample topic') {
    return [
      { title: 'The Grand Design of Our Solar System', objective: 'Overview of the sun and the eight planets.', type: 'content' },
      { title: 'Celestial Mechanics & Gravity', objective: 'Explain orbital motion using Newtonian physics.', type: 'content' },
      { title: 'The Inner Planets', objective: 'Deep dive into Mercury, Venus, Earth, and Mars.', type: 'content' },
      { title: 'Gas Giants & Ice Giants', objective: 'Comparing Jupiter, Saturn, Uranus, and Neptune.', type: 'content' },
      { title: 'Exploration History', objective: 'Timeline of major space missions.', type: 'content' },
      { title: 'Knowledge Check: Planets', objective: 'MCQ and short answer assessment.', type: 'exercise' },
      { title: 'Calculating Planetary Weight', objective: 'Math problems using the gravity formula.', type: 'exercise' },
      { title: 'Case Study: The Voyager Golden Record', objective: 'Analyzing human outreach to the stars.', type: 'content' },
      { title: 'Glossary of Terms', objective: 'Definitions of key astronomical vocabulary.', type: 'content' },
    ];
  }

  return [
    { title: `Introduction to ${topic}`, objective: `Provide an engaging overview of ${topic}.`, type: 'content' },
    { title: 'Core Concepts', objective: 'Explain the foundational ideas with examples.', type: 'content' },
    { title: 'Guided Example', objective: 'Walk through a solved example step-by-step.', type: 'content' },
    { title: 'Practice Exercises', objective: 'Reinforce understanding with 5 graded problems.', type: 'exercise' },
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
  const t = title.toLowerCase();

  // 1. Cover Page Mock
  if (t.includes('grand design') || t.includes('introduction')) {
    return `
<section class="page">
  <div class="layout-f">
    <div class="f-top">
      <h1 style="font-size: 42pt; margin-top: 40mm;">${title}</h1>
      <p style="font-size: 18pt; opacity: 0.8; margin-top: 10mm;">Exploring the wonders of our cosmic neighborhood.</p>
    </div>
    <div class="f-body">
      <div class="grid-bento">
        <div class="bento-main">
          <h3>The Sun: Our Star</h3>
          <p>The Sun accounts for 99.86% of the mass in the Solar System. It is the gravitational anchor that holds everything in place.</p>
          <div class="takeaway">Without the Sun's energy, life on Earth would be impossible.</div>
        </div>
        <div class="bento-side">
          <strong>Quick Fact</strong>
          <p>Light takes about 8 minutes and 20 seconds to travel from the Sun to the Earth.</p>
        </div>
      </div>
    </div>
  </div>
</section>`.trim();
  }

  // 2. Math / Physics Mock (KaTeX)
  if (t.includes('gravity') || t.includes('mechanics')) {
    return `
<section class="page">
  <header class="page-header">
    <h1>${title}</h1>
  </header>
  <div class="callout"><strong>Objective:</strong> ${objective}</div>
  
  <p>Gravity is the force by which a planet or other body draws objects toward its center. Isaac Newton formulated the Law of Universal Gravitation:</p>
  
  <div class="math block">
    F = G \\frac{m_1 m_2}{r^2}
  </div>
  
  <div class="grid-2col">
    <div>
      <h3>Orbital Velocity</h3>
      <p>To stay in orbit, an object must travel at a specific speed. This is calculated as:</p>
      <span class="math">v \\approx \\sqrt{\\frac{GM}{r}}</span>
    </div>
    <div class="takeaway">
      Higher orbits require lower velocities to maintain a stable circular path.
    </div>
  </div>

  <div class="diagram">
    graph LR
      Sun((Sun)) --- Mercury
      Sun --- Venus
      Sun --- Earth
      Sun --- Mars
      style Sun fill:#f9d71c,stroke:#333
  </div>
  <p class="figure">Figure 2: Gravitational relationships in the inner solar system.</p>
</section>`.trim();
  }

  // 3. Exercises Mock (MCQ / Answer Box)
  if (type === 'exercise') {
    return `
<section class="page">
  <header class="page-header">
    <h1>${title}</h1>
  </header>
  
  <div class="question">
    <h3>1. Which planet is known as the "Red Planet"?</h3>
    <ol class="mc-options">
      <li class="mc-option">Venus - known for its thick atmosphere.</li>
      <li class="mc-option">Mars - named for its reddish appearance due to iron oxide.</li>
      <li class="mc-option">Jupiter - the largest gas giant.</li>
      <li class="mc-option">Saturn - famous for its extensive ring system.</li>
    </ol>
  </div>

  <div class="question">
    <h3>2. Describe the difference between a terrestrial planet and a gas giant.</h3>
    <div class="answer-box" data-lines="6"></div>
  </div>

  <div class="question">
    <h3>3. Solve the following:</h3>
    <p>If Earth's gravity is <span class="math">1g</span> and Mars' gravity is <span class="math">0.38g</span>, how much would a 100kg astronaut weigh on Mars?</p>
    <div class="answer-line"></div>
  </div>

  <aside class="answer-key" style="display:none">
    <strong>Answer Key:</strong>
    <ol>
      <li>B (Mars)</li>
      <li>Terrestrial planets are rocky and solid; gas giants are primarily composed of hydrogen and helium with no solid surface.</li>
      <li>38kg (100 * 0.38)</li>
    </ol>
  </aside>
</section>`.trim();
  }

  // 4. Case Study
  if (t.includes('case study')) {
    return `
<section class="page">
  <header class="page-header">
    <h1>${title}</h1>
  </header>
  <div class="case-study">
    <h3>The Voyager Golden Record</h3>
    <p>Launched in 1977, the Voyager 1 and 2 spacecraft carry a gold-plated phonograph record containing sounds and images selected to portray the diversity of life and culture on Earth.</p>
    <p>It is intended for any intelligent extraterrestrial life form, or for future humans, who may find it. The record is a "time capsule," intended to communicate a story of our world to extraterrestrials.</p>
    <div class="takeaway">Communication across the cosmos requires a universal language: science and music.</div>
  </div>
  <div class="answer-box" data-lines="4">If you were to add one song to a new Golden Record today, what would it be and why?</div>
</section>`.trim();
  }

  // 5. Glossary
  if (t.includes('glossary')) {
    return `
<section class="page">
  <header class="page-header">
    <h1>${title}</h1>
  </header>
  <dl class="glossary">
    <div class="glossary-item">
      <dt>Astronomical Unit (AU)</dt>
      <dd>The average distance from the Earth to the Sun, approximately 150 million kilometers.</dd>
    </div>
    <div class="glossary-item">
      <dt>Light-Year</dt>
      <dd>The distance light travels in one year, about 9.46 trillion kilometers.</dd>
    </div>
    <div class="glossary-item">
      <dt>Nebula</dt>
      <dd>A giant cloud of dust and gas in space, often the birthplace of stars.</dd>
    </div>
    <div class="glossary-item">
      <dt>Orbit</dt>
      <dd>The curved path of a celestial object or spacecraft around a star, planet, or moon.</dd>
    </div>
  </dl>
</section>`.trim();
  }

  // Default Fallback
  return `
<section class="page">
  <header class="page-header">
    <h1>${title}</h1>
  </header>
  <div class="layout-f">
    <div class="f-top">
      <div class="callout"><strong>Objective:</strong> ${objective}</div>
    </div>
    <div class="f-body">
      <p>This is a high-fidelity mock page for the topic of <strong>${title}</strong>. It uses standard semantic HTML as generated by the EduSpark AI engine.</p>
      <div class="grid-2col">
        <div class="bento-main">
          <h3>Central Insight</h3>
          <p>The system intelligently chooses layouts based on content density and pedagogical goals.</p>
        </div>
        <div class="takeaway">Always prioritize clarity in educational content.</div>
      </div>
    </div>
  </div>
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
        brandKit: {
          schoolName: 'EduSpark Academy',
          primaryColor: '#CC785C',
          schoolLogo: 'https://img.icons8.com/ios-filled/100/CC785C/star.png'
        }
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
