export type BrandArchetypeWeights = {
  sage: number;
  ruler: number;
  hero: number;
  creator: number;
};

export type IcpProfile = {
  label: 'Performance Builder';
  ageRange: '25-40';
  traits: string[];
  corePain: string;
  desiredOutcome: string;
};

export type DesignTokens = {
  theme: 'pf-premium';
  palettes: {
    base: string[];
    accent: string[];
    semantic: string[];
  };
  typography: {
    ui: string;
    display: string;
    mono: string;
  };
  spacingScale: number[];
  radii: string[];
};

export type ActivityIconKey =
  | 'moon'
  | 'fork'
  | 'bolt'
  | 'dumbbell'
  | 'briefcase'
  | 'glass'
  | 'journal'
  | 'pulse';

export type ActivityValenceHint = 'positive' | 'negative' | 'neutral';
