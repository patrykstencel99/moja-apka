import type { StarterPack } from '@/types/domain';

export const STARTER_PACKS: StarterPack[] = [
  {
    category: 'Sen',
    activities: [
      { name: 'Dobra jakosc snu', type: 'NUMERIC_0_10' },
      { name: 'Pozne zasniecie', type: 'BOOLEAN' }
    ]
  },
  {
    category: 'Odzywianie',
    activities: [
      { name: 'Jadlem pieczywo rano', type: 'BOOLEAN' },
      { name: 'Jadlem ser', type: 'BOOLEAN' },
      { name: 'Jadlem slodycze', type: 'BOOLEAN' }
    ]
  },
  {
    category: 'Ruch',
    activities: [
      { name: 'Trening wykonany', type: 'BOOLEAN' },
      { name: 'Intensywnosc treningu', type: 'NUMERIC_0_10' }
    ]
  },
  {
    category: 'Uzywki',
    activities: [
      { name: 'Pilem alkohol', type: 'BOOLEAN' },
      { name: 'Pilem kawe wieczorem', type: 'BOOLEAN' }
    ]
  },
  {
    category: 'Produktywnosc',
    activities: [
      { name: 'Gleboka praca', type: 'BOOLEAN' },
      { name: 'Praca po planie', type: 'BOOLEAN' }
    ]
  },
  {
    category: 'Energia',
    activities: [
      { name: 'Spadek energii w poludnie', type: 'BOOLEAN' },
      { name: 'Stabilna energia', type: 'BOOLEAN' }
    ]
  }
];
