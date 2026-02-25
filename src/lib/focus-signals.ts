import { ActivityType, CheckInPreference, UserFocus } from '@prisma/client';

export type QuickSignalTemplate = {
  name: string;
  category: string;
  type: ActivityType;
  isStarter?: boolean;
};

export const FOCUS_LABEL: Record<UserFocus, string> = {
  ENERGY: 'Energia',
  FOCUS: 'Skupienie',
  SLEEP: 'Sen'
};

export const CHECKIN_PREFERENCE_LABEL: Record<CheckInPreference, string> = {
  MORNING: 'Rano',
  EVENING: 'Wieczorem',
  LATER: 'Ustawie pozniej'
};

export const QUICK_SIGNALS_BY_FOCUS: Record<UserFocus, QuickSignalTemplate[]> = {
  ENERGY: [
    {
      name: 'Spadek energii przed 14:00',
      category: 'Energia',
      type: ActivityType.BOOLEAN,
      isStarter: true
    },
    {
      name: 'Pierwszy posilek do 90 min od pobudki',
      category: 'Energia',
      type: ActivityType.BOOLEAN,
      isStarter: true
    },
    {
      name: 'Nawodnienie do poludnia',
      category: 'Energia',
      type: ActivityType.BOOLEAN,
      isStarter: true
    }
  ],
  FOCUS: [
    {
      name: '60 min glebokiej pracy przed poludniem',
      category: 'Produktywnosc',
      type: ActivityType.BOOLEAN,
      isStarter: true
    },
    {
      name: 'Plan jednego priorytetu dnia',
      category: 'Produktywnosc',
      type: ActivityType.BOOLEAN,
      isStarter: true
    },
    {
      name: 'Powiadomienia wyciszone podczas bloku',
      category: 'Produktywnosc',
      type: ActivityType.BOOLEAN,
      isStarter: true
    }
  ],
  SLEEP: [
    {
      name: 'Brak ekranu 45 min przed snem',
      category: 'Sen',
      type: ActivityType.BOOLEAN,
      isStarter: true
    },
    {
      name: 'Godzina snu zgodna z planem',
      category: 'Sen',
      type: ActivityType.BOOLEAN,
      isStarter: true
    },
    {
      name: 'Poranne odswiezenie',
      category: 'Sen',
      type: ActivityType.NUMERIC_0_10,
      isStarter: true
    }
  ]
};
