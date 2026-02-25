import type { ActivityIconKey, ActivityValenceHint } from '@/types/brand';

export type ActivityUiMeta = {
  iconKey: ActivityIconKey;
  priority: number;
  valenceHint: ActivityValenceHint;
};

const CATEGORY_ICON: Record<string, ActivityIconKey> = {
  Sen: 'moon',
  Odzywianie: 'fork',
  Ruch: 'dumbbell',
  Uzywki: 'glass',
  Produktywnosc: 'briefcase',
  Energia: 'bolt'
};

const SYSTEM_DESCRIPTION: Record<string, string> = {
  'Stabilna energia': 'System pod stabilna energie i mniejsza zmiennosc dnia.',
  'Gleboka praca': 'System pod regularne bloki glebokiej pracy i mniejszy koszt rozproszen.',
  'Sen bez tarcia': 'System pod latwiejsze zasypianie i wyzsza regeneracje.'
};

function normalize(value: string) {
  return value.toLowerCase();
}

export function describeStarterSystem(name: string) {
  return SYSTEM_DESCRIPTION[name] ?? 'System wspiera wykrywanie wzorcow miedzy decyzjami a stanem dnia.';
}

export function inferActivityMeta(activity: { name: string; category: string }): ActivityUiMeta {
  const normalized = normalize(activity.name);

  let iconKey = CATEGORY_ICON[activity.category] ?? 'pulse';
  let priority = 60;
  let valenceHint: ActivityValenceHint = 'neutral';

  if (normalized.includes('sen') || normalized.includes('spa')) {
    iconKey = 'moon';
    priority = 88;
  }
  if (normalized.includes('trening') || normalized.includes('ruch')) {
    iconKey = 'dumbbell';
    priority = 84;
  }
  if (normalized.includes('energia')) {
    iconKey = 'bolt';
    priority = 90;
  }
  if (normalized.includes('praca') || normalized.includes('gleboka')) {
    iconKey = 'briefcase';
    priority = 78;
  }
  if (normalized.includes('alkohol') || normalized.includes('slodycze') || normalized.includes('pozne')) {
    valenceHint = 'negative';
    priority = Math.max(priority, 82);
  }
  if (normalized.includes('stabilna') || normalized.includes('gleboka')) {
    valenceHint = 'positive';
    priority = Math.max(priority, 74);
  }

  return {
    iconKey,
    priority,
    valenceHint
  };
}

export function decorateActivity<T extends { name: string; category: string }>(activity: T): T & ActivityUiMeta {
  return {
    ...activity,
    ...inferActivityMeta(activity)
  };
}
