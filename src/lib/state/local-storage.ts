export const STORAGE_KEYS = {
  selectedSystem: 'pf_selected_system_v1',
  activeSystems: 'pf_active_systems_v1',
  checkInRhythm: 'pf_checkin_rhythm_v1',
  quickDefault: 'pf_quick_default_v1',
  experiments: 'pf_experiments_v1',
  activeNextMove: 'pf_active_next_move_v1'
} as const;

export type NextMoveRecord = {
  id: string;
  title: string;
  why: string;
  minimalVariant: string;
  confidence: number;
  lag: 0 | 1;
  createdAt: string;
  localDate: string;
  decision: 'accepted' | 'swapped' | 'skipped';
  skipReason?: 'brak-czasu' | 'zly-moment' | 'niska-wiara';
  result?: 'lepiej' | 'bez-zmian' | 'gorzej';
};

function canUseStorage() {
  return typeof window !== 'undefined';
}

export function readString(key: string): string | null {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(key);
}

export function writeString(key: string, value: string) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, value);
}

export function readBoolean(key: string, fallback = false): boolean {
  const value = readString(key);
  if (value === null) {
    return fallback;
  }
  return value === '1';
}

export function writeBoolean(key: string, value: boolean) {
  writeString(key, value ? '1' : '0');
}

export function readStringArray(key: string): string[] {
  const raw = readString(key);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function writeStringArray(key: string, values: string[]) {
  writeString(key, JSON.stringify(values));
}

export function readExperiments(): NextMoveRecord[] {
  const raw = readString(STORAGE_KEYS.experiments);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is NextMoveRecord => {
      if (typeof item !== 'object' || !item) {
        return false;
      }
      const record = item as Partial<NextMoveRecord>;
      return typeof record.id === 'string' && typeof record.title === 'string';
    });
  } catch {
    return [];
  }
}

export function writeExperiments(items: NextMoveRecord[]) {
  writeString(STORAGE_KEYS.experiments, JSON.stringify(items));
}

export function appendExperiment(item: NextMoveRecord) {
  const current = readExperiments();
  writeExperiments([item, ...current].slice(0, 250));
}

export function readActiveNextMove(): NextMoveRecord | null {
  const raw = readString(STORAGE_KEYS.activeNextMove);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || !parsed) {
      return null;
    }
    const candidate = parsed as Partial<NextMoveRecord>;
    if (typeof candidate.id !== 'string' || typeof candidate.title !== 'string') {
      return null;
    }
    return candidate as NextMoveRecord;
  } catch {
    return null;
  }
}

export function writeActiveNextMove(item: NextMoveRecord | null) {
  if (item === null) {
    if (canUseStorage()) {
      window.localStorage.removeItem(STORAGE_KEYS.activeNextMove);
    }
    return;
  }

  writeString(STORAGE_KEYS.activeNextMove, JSON.stringify(item));
}
