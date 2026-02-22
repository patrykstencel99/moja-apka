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

const PACK_DESCRIPTION: Record<string, string> = {
  Sen: 'Jak regeneracja i pory zasypiania wplywaja na Twoja sprawczosc nastepnego dnia.',
  Odzywianie: 'Ktore decyzje zywieniowe wspieraja stabilna energie, a ktore uruchamiaja spadki.',
  Ruch: 'Relacja miedzy obciazeniem fizycznym a koncentracja, nastrojem i snem.',
  Uzywki: 'Wplyw kofeiny i alkoholu na jakosc decyzji, rytm pracy i wieczorna regeneracje.',
  Produktywnosc: 'Sygnały, ktore prowadzily do glebokiej pracy i wysokiej jakosci wykonania.',
  Energia: 'Moment i intensywnosc fluktuacji energii w ciagu dnia.'
};

function normalize(value: string) {
  return value.toLowerCase();
}

export function describeStarterPack(category: string) {
  return PACK_DESCRIPTION[category] ?? 'Pakiet wspiera wykrywanie wzorcow miedzy decyzjami a stanem dnia.';
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
