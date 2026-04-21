export interface ColorPalette {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export type VariantKey = 'warm' | 'cool' | 'bold';

export interface StyleVariant {
  key: VariantKey;
  label: string;
  paletteOverride: Partial<ColorPalette>;
}

export interface WorkbookStyle {
  id: string;
  name: string;
  description: string;
  palette: ColorPalette;
  illustrationStyle: 'vector' | 'watercolor' | 'sketch' | 'blueprint' | 'minimal' | 'technical';
  fontFamily: 'serif' | 'sans' | 'mono';
  variants?: StyleVariant[];
}

/**
 * Default Warm / Cool / Bold variant overrides — applied on top of each style's
 * base palette so we get 3 live-rendered previews per style without authoring
 * 30 hand-tuned palettes.
 */
export const DEFAULT_VARIANTS: StyleVariant[] = [
  { key: 'warm', label: 'Warm', paletteOverride: { accent: '#CC785C', secondary: '#FDF6EF' } },
  { key: 'cool', label: 'Cool', paletteOverride: { accent: '#4A6FA5', secondary: '#F0F4F9' } },
  { key: 'bold', label: 'Bold', paletteOverride: { accent: '#1F1F1C', secondary: '#F4F4F1' } },
];

export function mergePalette(base: ColorPalette, override?: Partial<ColorPalette>): ColorPalette {
  if (!override) return base;
  return { ...base, ...override };
}

export function getVariants(style: WorkbookStyle): StyleVariant[] {
  return style.variants && style.variants.length > 0 ? style.variants : DEFAULT_VARIANTS;
}

export const WORKBOOK_STYLES: WorkbookStyle[] = [
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean lines, high whitespace, and a focus on clarity. Perfect for professional training.',
    illustrationStyle: 'minimal',
    fontFamily: 'sans',
    palette: {
      name: 'Clean Arctic',
      primary: '#1a1a1a',
      secondary: '#f5f5f5',
      accent: '#3b82f6',
      background: '#ffffff',
      text: '#111827'
    }
  },
  {
    id: 'classic-academia',
    name: 'Classic Academia',
    description: 'Traditional serif typography with sophisticated, muted tones. Ideal for history and literature.',
    illustrationStyle: 'sketch',
    fontFamily: 'serif',
    palette: {
      name: 'Oxford Ink',
      primary: '#2d3436',
      secondary: '#f1f2f6',
      accent: '#636e72',
      background: '#fdfbf7',
      text: '#2d3436'
    }
  },
  {
    id: 'vibrant-learning',
    name: 'Vibrant Learning',
    description: 'Bold colors and energetic layouts designed for student engagement and younger learners.',
    illustrationStyle: 'vector',
    fontFamily: 'sans',
    palette: {
      name: 'Neon Pulse',
      primary: '#1a1a1a',
      secondary: '#fef3c7',
      accent: '#f59e0b',
      background: '#fffbeb',
      text: '#1a1a1a'
    }
  },
  {
    id: 'the-laboratory',
    name: 'The Laboratory',
    description: 'A technical, precise look with blueprint-style aesthetics. Best for STEM and technical guides.',
    illustrationStyle: 'blueprint',
    fontFamily: 'mono',
    palette: {
      name: 'Technical Blue',
      primary: '#0f172a',
      secondary: '#f1f5f9',
      accent: '#0ea5e9',
      background: '#f8fafc',
      text: '#0f172a'
    }
  },
  {
    id: 'forest-retreat',
    name: 'Forest Retreat',
    description: 'Calming earthy tones and organic textures. Great for biology, environment, or wellness.',
    illustrationStyle: 'watercolor',
    fontFamily: 'serif',
    palette: {
      name: 'Earthy Sage',
      primary: '#2d3a31',
      secondary: '#ecf3f0',
      accent: '#5a7d65',
      background: '#f9fbf9',
      text: '#2d3a31'
    }
  },
  {
    id: 'dark-technical',
    name: 'Midnight Intel',
    description: 'High-contrast dark mode with neon accents. Professional, tech-focused, and modern.',
    illustrationStyle: 'technical',
    fontFamily: 'mono',
    palette: {
      name: 'Cyber Noir',
      primary: '#000000',
      secondary: '#1a1a1a',
      accent: '#00ff41',
      background: '#050505',
      text: '#ffffff'
    }
  },
  {
    id: 'sunset-horizon',
    name: 'Sunset Horizon',
    description: 'Warm gradients and a soft, welcoming feel. Good for creative subjects and arts.',
    illustrationStyle: 'watercolor',
    fontFamily: 'sans',
    palette: {
      name: 'Golden Hour',
      primary: '#431407',
      secondary: '#fff7ed',
      accent: '#f97316',
      background: '#fffaf5',
      text: '#431407'
    }
  },
  {
    id: 'royal-heritage',
    name: 'Royal Heritage',
    description: 'Deep purples and golds for a sense of prestige and importance.',
    illustrationStyle: 'sketch',
    fontFamily: 'serif',
    palette: {
      name: 'Regal Gold',
      primary: '#2e1065',
      secondary: '#faf5ff',
      accent: '#d4af37',
      background: '#fdfaff',
      text: '#2e1065'
    }
  },
  {
    id: 'industrial-loft',
    name: 'Industrial Loft',
    description: 'Raw, gritty textures with a focus on structure and urban design.',
    illustrationStyle: 'blueprint',
    fontFamily: 'mono',
    palette: {
      name: 'Concrete Grey',
      primary: '#18181b',
      secondary: '#f4f4f5',
      accent: '#71717a',
      background: '#fafafa',
      text: '#18181b'
    }
  },
  {
    id: 'playful-pastel',
    name: 'Playful Pastel',
    description: 'Soft, candy-colored palette for early childhood education.',
    illustrationStyle: 'watercolor',
    fontFamily: 'sans',
    palette: {
      name: 'Cotton Candy',
      primary: '#1a1a1a',
      secondary: '#f0f9ff',
      accent: '#ffb3ba',
      background: '#fffafe',
      text: '#1a1a1a'
    }
  }
];
