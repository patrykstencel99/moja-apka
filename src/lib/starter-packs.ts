import type { StarterSystem } from '@/types/domain';

export const STARTER_SYSTEMS: StarterSystem[] = [
  {
    id: 'stabilna-energia',
    name: 'Stabilna energia',
    category: 'Energia',
    outcome: 'Minimalizuje dzienne spadki i podnosi przewidywalnosc energii.',
    coreSignals: [
      {
        name: 'Spadek energii przed 14:00',
        type: 'BOOLEAN',
        why: 'Wychwytuje najszybszy sygnal destabilizacji dnia.',
        cadence: 'DZIEN',
        definition: 'Tak = pojawil sie wyrazny zjazd energii przed 14:00.'
      },
      {
        name: 'Pierwszy posilek do 90 min od pobudki',
        type: 'BOOLEAN',
        why: 'Pomaga stabilizowac poziom energii i koncentracji rano.',
        cadence: 'RANO',
        definition: 'Tak = pierwszy posilek byl nie pozniej niz 90 minut po pobudce.'
      },
      {
        name: 'Nawodnienie do poludnia',
        type: 'BOOLEAN',
        why: 'Redukuje ryzyko falszywego zmeczenia w pierwszej polowie dnia.',
        cadence: 'DZIEN',
        definition: 'Tak = minimum 1 litr wody wypity do 12:00.'
      }
    ],
    advancedSignals: [
      {
        name: 'Slodycze rano',
        type: 'BOOLEAN',
        why: 'Czesty trigger niestabilnej energii i hustawki glukozy.',
        cadence: 'RANO',
        definition: 'Tak = slodki produkt pojawil sie przed 11:00.'
      },
      {
        name: 'Kofeina po 15:00',
        type: 'BOOLEAN',
        why: 'Wplywa na jakosc snu i kolejny dzien.',
        cadence: 'WIECZOR',
        definition: 'Tak = kofeina pojawila sie po 15:00.'
      },
      {
        name: 'Stabilnosc energii (0-10)',
        type: 'NUMERIC_0_10',
        why: 'Precyzuje zmiennosc tylko gdy podstawowy system dziala.',
        cadence: 'WIECZOR',
        definition: '0 = skrajnie niestabilnie, 10 = energia rowna przez caly dzien.'
      }
    ],
    defaults: {
      checkWindow: 'Rano + podsumowanie wieczorem',
      scoreRule: 'Najpierw binarnie, potem skala 0-10 dla jednego sygnalu.'
    }
  },
  {
    id: 'gleboka-praca',
    name: 'Gleboka praca',
    category: 'Produktywnosc',
    outcome: 'Podnosi liczbe dni z wykonaniem kluczowej pracy bez tarcia.',
    coreSignals: [
      {
        name: '60 minut glebokiej pracy przed poludniem',
        type: 'BOOLEAN',
        why: 'Najmocniejszy predyktor dnia z realnym wynikiem.',
        cadence: 'DZIEN',
        definition: 'Tak = jeden blok min. 60 minut deep work zakonczony przed 12:00.'
      },
      {
        name: 'Plan jednego priorytetu dnia',
        type: 'BOOLEAN',
        why: 'Zmniejsza koszt przelaczania i chaos decyzyjny.',
        cadence: 'RANO',
        definition: 'Tak = przed startem dnia wybrany zostal jeden priorytet.'
      },
      {
        name: 'Notyfikacje wyciszone podczas bloku',
        type: 'BOOLEAN',
        why: 'Chroni skupienie i zmniejsza fragmentacje uwagi.',
        cadence: 'DZIEN',
        definition: 'Tak = notyfikacje byly wyciszone przez caly blok.'
      }
    ],
    advancedSignals: [
      {
        name: 'Liczba przerwan w bloku (0-10)',
        type: 'NUMERIC_0_10',
        why: 'Pokazuje jakosc ochrony skupienia.',
        cadence: 'WIECZOR',
        definition: '0 = brak przerwan, 10 = bardzo czeste przerwania.'
      },
      {
        name: 'Praca po planie',
        type: 'BOOLEAN',
        why: 'Wczesny sygnal przeciazania i utraty priorytetu.',
        cadence: 'WIECZOR',
        definition: 'Tak = praca przeciagnela sie poza plan dzienny.'
      },
      {
        name: 'Scroll przed pierwszym blokiem',
        type: 'BOOLEAN',
        why: 'Czesto obniza prawdopodobienstwo wejscia w gleboka prace.',
        cadence: 'RANO',
        definition: 'Tak = social/feed pojawil sie przed pierwszym blokiem pracy.'
      }
    ],
    defaults: {
      checkWindow: 'Rano ustalenie priorytetu + wieczorem podsumowanie wykonania',
      scoreRule: 'Domyslnie Tak/Nie; skala tylko dla jakosci skupienia.'
    }
  },
  {
    id: 'sen-bez-tarcia',
    name: 'Sen bez tarcia',
    category: 'Sen',
    outcome: 'Stabilizuje rytm zasypiania i poprawia gotowosc kolejnego dnia.',
    coreSignals: [
      {
        name: 'Godzina snu zgodna z planem',
        type: 'BOOLEAN',
        why: 'Najsilniejszy mechaniczny sygnal regeneracji.',
        cadence: 'WIECZOR',
        definition: 'Tak = zasniecie nastapilo w oknie +/- 30 minut od planu.'
      },
      {
        name: 'Brak ekranu 45 minut przed snem',
        type: 'BOOLEAN',
        why: 'Zmniejsza tarcie zasypiania i poprawia jakosc snu.',
        cadence: 'WIECZOR',
        definition: 'Tak = bez telefonu i laptopa przez ostatnie 45 minut dnia.'
      },
      {
        name: 'Poranny poziom odswiezenia (0-10)',
        type: 'NUMERIC_0_10',
        why: 'Laczy zachowania wieczorne z stanem porannym.',
        cadence: 'RANO',
        definition: '0 = brak regeneracji, 10 = pelna gotowosc po przebudzeniu.'
      }
    ],
    advancedSignals: [
      {
        name: 'Kofeina po 15:00',
        type: 'BOOLEAN',
        why: 'Czesty trigger opoznionego zasypiania.',
        cadence: 'WIECZOR',
        definition: 'Tak = kofeina pojawila sie po 15:00.'
      },
      {
        name: 'Alkohol wieczorem',
        type: 'BOOLEAN',
        why: 'Moze obnizac jakosc regeneracji mimo szybkiego zasypiania.',
        cadence: 'WIECZOR',
        definition: 'Tak = alkohol pojawil sie po 18:00.'
      },
      {
        name: 'Wybudzenia nocne (0-10)',
        type: 'NUMERIC_0_10',
        why: 'Precyzuje zrodla rozbicia energii kolejnego dnia.',
        cadence: 'RANO',
        definition: '0 = brak wybudzen, 10 = bardzo czeste wybudzenia.'
      }
    ],
    defaults: {
      checkWindow: 'Wieczorem zachowania + rano efekt',
      scoreRule: '2-3 sygnaly binarne plus maksymalnie jedna skala na start.'
    }
  }
];

export function flattenStarterSystemSignals(system: StarterSystem, includeAdvanced: boolean) {
  return includeAdvanced ? [...system.coreSignals, ...system.advancedSignals] : system.coreSignals;
}
