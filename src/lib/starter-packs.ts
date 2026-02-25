import type { StarterSystem } from '@/types/domain';

export const STARTER_SYSTEMS: StarterSystem[] = [
  {
    id: 'stabilna-energia',
    name: 'Stabilna energia',
    category: 'Energia',
    outcome: 'Stabilizuje energie w ciagu dnia i ulatwia dowozenie priorytetow.',
    coreSignals: [
      {
        name: 'Spadek energii przed 14:00',
        type: 'BOOLEAN',
        why: 'Szybko pokazuje, czy dzien zaczyna tracic rytm.',
        cadence: 'DZIEN',
        definition: 'Tak = pojawil sie wyrazny zjazd energii przed 14:00.'
      },
      {
        name: 'Pierwszy posilek do 90 min od pobudki',
        type: 'BOOLEAN',
        why: 'Pomaga utrzymac rowna energie i koncentracje od rana.',
        cadence: 'RANO',
        definition: 'Tak = pierwszy posilek byl nie pozniej niz 90 minut po pobudce.'
      },
      {
        name: 'Nawodnienie do poludnia',
        type: 'BOOLEAN',
        why: 'Zmniejsza ryzyko spadku energii wynikajacego z odwodnienia.',
        cadence: 'DZIEN',
        definition: 'Tak = minimum 1 litr wody wypity do 12:00.'
      }
    ],
    advancedSignals: [
      {
        name: 'Slodycze rano',
        type: 'BOOLEAN',
        why: 'Czesto uruchamia chwiejna energie i spadki koncentracji.',
        cadence: 'RANO',
        definition: 'Tak = slodki produkt pojawil sie przed 11:00.'
      },
      {
        name: 'Kofeina po 15:00',
        type: 'BOOLEAN',
        why: 'Wplywa na jakosc snu i gotowosc kolejnego dnia.',
        cadence: 'WIECZOR',
        definition: 'Tak = kofeina pojawila sie po 15:00.'
      },
      {
        name: 'Stabilnosc energii (0-10)',
        type: 'NUMERIC_0_10',
        why: 'Daje wieksza precyzje, gdy podstawy sa juz ustabilizowane.',
        cadence: 'WIECZOR',
        definition: '0 = skrajnie niestabilnie, 10 = energia rowna przez caly dzien.'
      }
    ],
    defaults: {
      checkWindow: 'Rano + podsumowanie wieczorem',
      scoreRule: 'Najpierw sygnaly Tak/Nie, potem jedna skala 0-10.'
    }
  },
  {
    id: 'gleboka-praca',
    name: 'Gleboka praca',
    category: 'Produktywnosc',
    outcome: 'Zwiksza liczbe dni z wykonanym kluczowym zadaniem.',
    coreSignals: [
      {
        name: '60 minut glebokiej pracy przed poludniem',
        type: 'BOOLEAN',
        why: 'Najmocniej wspiera dowiezienie najwazniejszego wyniku dnia.',
        cadence: 'DZIEN',
        definition: 'Tak = jeden blok min. 60 minut glebokiej pracy zakonczony przed 12:00.'
      },
      {
        name: 'Plan jednego priorytetu dnia',
        type: 'BOOLEAN',
        why: 'Zmniejsza chaos i liczbe niepotrzebnych przelaczen.',
        cadence: 'RANO',
        definition: 'Tak = przed startem dnia wybrany zostal jeden priorytet.'
      },
      {
        name: 'Notyfikacje wyciszone podczas bloku',
        type: 'BOOLEAN',
        why: 'Chroni skupienie i ogranicza rozpraszanie.',
        cadence: 'DZIEN',
        definition: 'Tak = notyfikacje byly wyciszone przez caly blok.'
      }
    ],
    advancedSignals: [
      {
        name: 'Liczba przerwan w bloku (0-10)',
        type: 'NUMERIC_0_10',
        why: 'Pokazuje, jak skutecznie chronisz skupienie.',
        cadence: 'WIECZOR',
        definition: '0 = brak przerwan, 10 = bardzo czeste przerwania.'
      },
      {
        name: 'Praca po planie',
        type: 'BOOLEAN',
        why: 'Wczesnie pokazuje przeciazenie i utrate priorytetu.',
        cadence: 'WIECZOR',
        definition: 'Tak = praca przeciagnela sie poza plan dzienny.'
      },
      {
        name: 'Scroll przed pierwszym blokiem',
        type: 'BOOLEAN',
        why: 'Czesto obniza szanse na mocny start pracy.',
        cadence: 'RANO',
        definition: 'Tak = media spolecznosciowe pojawily sie przed pierwszym blokiem pracy.'
      }
    ],
    defaults: {
      checkWindow: 'Rano ustalenie priorytetu + wieczorem podsumowanie wykonania',
      scoreRule: 'Domyslnie Tak/Nie; skala tylko dla jednego sygnalu jakosci.'
    }
  },
  {
    id: 'sen-bez-tarcia',
    name: 'Sen bez tarcia',
    category: 'Sen',
    outcome: 'Stabilizuje zasypianie i zwieksza poranna gotowosc.',
    coreSignals: [
      {
        name: 'Godzina snu zgodna z planem',
        type: 'BOOLEAN',
        why: 'Jeden z najmocniejszych sygnalow regeneracji.',
        cadence: 'WIECZOR',
        definition: 'Tak = zasniecie nastapilo w oknie +/- 30 minut od planu.'
      },
      {
        name: 'Brak ekranu 45 minut przed snem',
        type: 'BOOLEAN',
        why: 'Ulatwia zasypianie i poprawia jakosc snu.',
        cadence: 'WIECZOR',
        definition: 'Tak = bez telefonu i laptopa przez ostatnie 45 minut dnia.'
      },
      {
        name: 'Poranny poziom odswiezenia (0-10)',
        type: 'NUMERIC_0_10',
        why: 'Laczy wieczorne decyzje z porannym samopoczuciem.',
        cadence: 'RANO',
        definition: '0 = brak regeneracji, 10 = pelna gotowosc po przebudzeniu.'
      }
    ],
    advancedSignals: [
      {
        name: 'Kofeina po 15:00',
        type: 'BOOLEAN',
        why: 'Czesto opoznia zasypianie.',
        cadence: 'WIECZOR',
        definition: 'Tak = kofeina pojawila sie po 15:00.'
      },
      {
        name: 'Alkohol wieczorem',
        type: 'BOOLEAN',
        why: 'Moze obnizac regeneracje mimo szybkiego zasypiania.',
        cadence: 'WIECZOR',
        definition: 'Tak = alkohol pojawil sie po 18:00.'
      },
      {
        name: 'Wybudzenia nocne (0-10)',
        type: 'NUMERIC_0_10',
        why: 'Pomaga namierzyc zrodla slabego startu kolejnego dnia.',
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
