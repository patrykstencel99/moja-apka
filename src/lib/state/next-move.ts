export type NextMoveInputSignal = {
  name: string;
  type: 'BOOLEAN' | 'NUMERIC_0_10';
  booleanValue?: boolean;
  numericValue?: number;
  valenceHint?: 'positive' | 'negative' | 'neutral';
};

export type GeneratedNextMove = {
  id: string;
  title: string;
  why: string;
  minimalVariant: string;
  confidence: number;
  lag: 0 | 1;
};

const FALLBACK_MOVES: Array<Omit<GeneratedNextMove, 'id'>> = [
  {
    title: 'Zamknij dzien jednym rytuałem wyjscia',
    why: 'Stabilny koniec dnia najczesciej poprawia energie nastepnego poranka.',
    minimalVariant: '10%: 3 min bez ekranu przed snem i plan 1 priorytetu na jutro.',
    confidence: 52,
    lag: 1
  },
  {
    title: 'Utnij jeden trigger rozproszenia',
    why: 'Najmniejsza korekta w triggerze zwykle daje najwiekszy zwrot w jakosci dnia.',
    minimalVariant: '10%: wycisz 1 kanał notyfikacji na 2 godziny.',
    confidence: 49,
    lag: 0
  },
  {
    title: 'Powtorz jeden stabilizator jutro rano',
    why: 'Powtarzalnosc stabilizatora wzmacnia przewidywalnosc nastroju i energii.',
    minimalVariant: '10%: 5 minut rutyny startowej bez telefonu.',
    confidence: 56,
    lag: 1
  }
];

function makeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.round(Math.random() * 100_000)}`;
}

export function buildNextMove(params: {
  mood: number;
  energy: number;
  signals: NextMoveInputSignal[];
  variantIndex?: number;
}): GeneratedNextMove {
  const { mood, energy, signals, variantIndex = 0 } = params;

  const negatives = signals.filter(
    (signal) =>
      (signal.type === 'BOOLEAN' && signal.booleanValue && signal.valenceHint === 'negative') ||
      (signal.type === 'NUMERIC_0_10' && (signal.numericValue ?? 0) >= 7)
  );

  const positives = signals.filter(
    (signal) =>
      (signal.type === 'BOOLEAN' && signal.booleanValue && signal.valenceHint === 'positive') ||
      (signal.type === 'NUMERIC_0_10' && (signal.numericValue ?? 0) >= 6 && signal.valenceHint !== 'negative')
  );

  if (mood <= 4 || energy <= 4) {
    return {
      id: makeId(),
      title: 'Zabezpiecz jutro przez regeneracje krytyczną',
      why: 'Dzisiejszy niski stan sugeruje, że najmniejsza poprawa rytmu da najwiekszy zwrot jutro.',
      minimalVariant: '10%: ustaw godzinę odcięcia pracy i bez kofeiny po 15:00.',
      confidence: 64,
      lag: 1
    };
  }

  if (negatives.length > 0) {
    const source = negatives[variantIndex % negatives.length];

    return {
      id: makeId(),
      title: `Postaw barierę na sygnał: ${source.name}`,
      why: 'Ten sygnał najpewniej wzmacnia petle reaktywnosci i obniża jakosc kolejnego dnia.',
      minimalVariant: '10%: dodaj jedna regułę if-then, ktora odcina trigger.',
      confidence: 61,
      lag: 0
    };
  }

  if (positives.length > 0) {
    const source = positives[variantIndex % positives.length];

    return {
      id: makeId(),
      title: `Powtorz stabilizator: ${source.name}`,
      why: 'Powielanie stabilizatora zwykle buduje ciaglosc nastroju i energii.',
      minimalVariant: '10%: zaplanuj ten sygnał jako pierwszy blok jutra.',
      confidence: 58,
      lag: 1
    };
  }

  const fallback = FALLBACK_MOVES[variantIndex % FALLBACK_MOVES.length];
  return { ...fallback, id: makeId() };
}
