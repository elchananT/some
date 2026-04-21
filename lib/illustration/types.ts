export type IllustrationResult =
  | { kind: 'svg'; svg: string }
  | { kind: 'image'; src: string; source: 'imagen' | 'pollinations' };

export interface IllustrationRequest {
  title: string;
  description: string;
  style?: string;
  palette?: string;
}

export interface Illustrator {
  name: 'svg' | 'imagen' | 'pollinations';
  available(): boolean | Promise<boolean>;
  generate(req: IllustrationRequest): Promise<IllustrationResult | null>;
}
