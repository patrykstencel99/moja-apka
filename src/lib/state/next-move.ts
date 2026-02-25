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
    title: 'Zamknij dzien prostym rytualem konca pracy',
    why: 'Spokojny koniec dnia czesto poprawia energie kolejnego poranka.',
    minimalVariant: 'Wersja minimalna: 3 minuty bez ekranu i 1 priorytet na jutro.',
    confidence: 52,
    lag: 1
  },
  {
    title: 'Odetnij jedno glowne rozproszenie',
    why: 'Mala korekta w srodowisku czesto daje duzy efekt w jakosci dnia.',
    minimalVariant: 'Wersja minimalna: wycisz 1 kanal powiadomien na 2 godziny.',
    confidence: 49,
    lag: 0
  },
  {
    title: 'Powtorz jeden stabilizujacy ruch rano',
    why: 'Powtarzalnosc buduje stabilnosc nastroju i energii.',
    minimalVariant: 'Wersja minimalna: 5 minut porannej rutyny bez telefonu.',
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
      title: 'Zabezpiecz jutro przez regeneracje',
      why: 'Przy nizszym stanie najszybciej dziala prosty reset rytmu dnia.',
      minimalVariant: 'Wersja minimalna: ustal godzine zakonczenia pracy i bez kofeiny po 15:00.',
      confidence: 64,
      lag: 1
    };
  }

  if (negatives.length > 0) {
    const source = negatives[variantIndex % negatives.length];

    return {
      id: makeId(),
      title: `Postaw bariere na sygnal: ${source.name}`,
      why: 'Ten sygnal najpewniej pcha dzien w gorsza strone.',
      minimalVariant: 'Wersja minimalna: dodaj jedna prosta regule, ktora odcina ten wyzwalacz.',
      confidence: 61,
      lag: 0
    };
  }

  if (positives.length > 0) {
    const source = positives[variantIndex % positives.length];

    return {
      id: makeId(),
      title: `Powtorz stabilizator: ${source.name}`,
      why: 'Powtarzanie tego sygnalu zwykle wzmacnia dobry rytm dnia.',
      minimalVariant: 'Wersja minimalna: zaplanuj ten sygnal jako pierwszy blok jutra.',
      confidence: 58,
      lag: 1
    };
  }

  const fallback = FALLBACK_MOVES[variantIndex % FALLBACK_MOVES.length];
  return { ...fallback, id: makeId() };
}
