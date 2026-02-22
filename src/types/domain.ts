export type ActivityKind = 'BOOLEAN' | 'NUMERIC_0_10';

export type ActivityDefinitionUi = {
  id: string;
  name: string;
  category: string;
  type: ActivityKind;
  iconKey?: string;
  priority?: number;
  valenceHint?: 'positive' | 'negative' | 'neutral';
};

export type StarterPack = {
  category: string;
  activities: Array<{
    name: string;
    type: ActivityKind;
  }>;
};

export type InsightDirection = 'positive' | 'negative';

export type Insight = {
  factor: string;
  metric: 'mood' | 'energy' | 'combined';
  direction: InsightDirection;
  confidence: number;
  lag: 0 | 1;
  window: 'weekly' | 'monthly';
  effect: number;
  explanation: string;
};

export type MacroPattern = {
  title: string;
  description: string;
  confidence: number;
};
