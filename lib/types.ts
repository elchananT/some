export type PageLayout = 'single-column' | 'two-column' | 'header-focused' | 'full-width-image' | 'centered-text-with-sidebar' | 'timeline' | 'bento-grid' | 'f-pattern' | 'freeform' | 'split-screen' | 'video-focused' | 'gallery';
export type PageTheme = 'minimal' | 'playful' | 'technical' | 'elegant' | 'science-lab' | 'history-chronicle' | 'literature-classic' | 'custom';

export type BlockType = 'text' | 'image' | 'math' | 'svg' | 'exercise' | 'heading';

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  zIndex?: number;
  style?: React.CSSProperties;
}

export interface WorkbookPage {
  id: string;
  title: string;
  type: 'content' | 'exercise' | 'illustration';
  content: string; // Legacy or fallback
  blocks: ContentBlock[]; // The new block-based system
  svgCode?: string; // If it's a legacy illustration
  imageUrl?: string; // For local image injection
  layout?: PageLayout;
  theme?: PageTheme;
  customCss?: string;
}

export type PrintThemeId =
  | 'classic-textbook'
  | 'modern-workbook'
  | 'playful-kids'
  | 'exam-prep'
  | 'scientific-paper'
  | 'notebook-handwritten';

export type QuestionTypeId =
  | 'mcq'
  | 'true-false'
  | 'short-answer'
  | 'long-answer'
  | 'fill-blank'
  | 'matching'
  | 'math-workspace'
  | 'diagram-label'
  | 'code';

export type DensityId = 'light' | 'balanced' | 'dense';

export interface StylePrefs {
  theme: PrintThemeId;
  questionTypes: QuestionTypeId[];
  density: DensityId;
}

export interface Workbook {
  id: string;
  title: string;
  subject: string;
  level: string;
  region: string;
  illustrationStyle?: string;
  colorPalette?: string;
  overallStyle?: string;
  pages: WorkbookPage[];
  outline?: string;
  verificationReport?: string;
  stylePrefs?: StylePrefs;
  /** Pre-rendered print HTML twin, used for PDF/HTML export. Built from pages + stylePrefs. */
  htmlTwin?: string;
}

export interface RoadmapItem {
  title: string;
  description: string;
  agentResponsible: 'Curriculum' | 'Researcher' | 'Mathematician' | 'Linguist';
}

export interface Roadmap {
  title: string;
  summary: string;
  items: RoadmapItem[];
  estimatedComplexity: 'Low' | 'Medium' | 'High';
}

export type GeneratingStep = 'idle' | 'researching' | 'brainstorming' | 'roadmap_approval' | 'style_selection' | 'composing' | 'illustrating' | 'verifying' | 'complete';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  workbook: Workbook | null;
  step: GeneratingStep;
  updatedAt: number;
}

export interface BuildWorkbookArgs {
  title: string;
  subject: string;
  level: string;
  region: string;
  illustrationStyle: string;
  colorPalette: string;
  overallStyle?: string;
  stylePrefs?: StylePrefs;
  pages: { title: string; objective: string; type: 'content' | 'exercise' }[];
}
