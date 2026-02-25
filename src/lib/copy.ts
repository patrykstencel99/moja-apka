export const uiCopy = {
  meta: {
    description: 'Codziennie 1 check-in i 1 lepsza decyzja na jutro.'
  },
  nav: {
    brandSubtitle: 'Codzienny rytm decyzji i postepu',
    primaryAriaLabel: 'Nawigacja glowna',
    today: 'Dzisiaj',
    systems: 'Systemy',
    review: 'Przeglad',
    menu: 'Wiecej',
    experiments: 'Eksperymenty',
    settings: 'Ustawienia',
    modeLabel: 'Tryb rozwoju'
  },
  pages: {
    today: {
      eyebrow: 'Dzisiaj',
      title: 'Jedna petla dziennie. Stabilny postep co tydzien.',
      support: 'Krok 1: check-in. Krok 2: nastepny krok na jutro.'
    },
    systems: {
      eyebrow: 'Systemy startowe',
      title: 'Wybierz system, ktory wspiera Twoj wynik.',
      support: 'Najpierw sygnaly podstawowe, potem dokladniejsze pomiary.'
    },
    systemDetail: {
      eyebrow: 'System',
      support: 'Aktywuj system i przenies go do codziennego check-inu.'
    },
    systemTune: {
      eyebrow: 'Dopasowanie',
      support: 'Dostosuj typ i moment pomiaru do swojego dnia.'
    },
    review: {
      eyebrow: 'Przeglad tygodnia, miesiaca i roku',
      title: 'Sprawdz co pomaga, a co zabiera energie.',
      support: 'Im wiecej danych, tym trafniejszy kolejny test.'
    },
    experiments: {
      eyebrow: 'Dodatkowe',
      title: 'Eksperymenty',
      support: 'Historia decyzji i ich wynikow.'
    },
    settings: {
      eyebrow: 'Dodatkowe',
      title: 'Ustawienia',
      support: 'Sesja, kopia danych i prywatnosc.'
    }
  },
  login: {
    heroEyebrow: 'PatternFinder',
    heroTitle: 'Buduj stabilnosc i wyniki dzieki codziennym decyzjom.',
    heroSupport: 'Zacznij od prostego check-inu. Pierwsze konto uruchamia aplikacje.',
    fallbackSetupTitle: 'Brak odpowiedzi z backendu',
    fallbackSetupMessage: 'Nie udalo sie odczytac statusu logowania.',
    fallbackSetupSteps: ['Uruchom npm run doctor i popraw wskazane bledy.', 'Odswiez /login.'],
    noBackendResponseError: 'Brak odpowiedzi z backendu.',
    sessionStartFallbackError: 'Nie udalo sie uruchomic sesji.',
    sessionStartRetryError: 'Nie udalo sie uruchomic sesji. Sprobuj ponownie.',
    warningTitle: 'Wazne',
    launchErrorTitle: 'Nie udalo sie',
    emailLabel: 'Email',
    emailPlaceholder: 'twoj@email.com',
    passwordLabel: 'Haslo',
    passwordPlaceholder: 'Minimum 8 znakow',
    confirmPasswordLabel: 'Potwierdz haslo',
    confirmPasswordPlaceholder: 'Powtorz haslo',
    loadingLogin: 'Logowanie...',
    loadingRegister: 'Tworzenie konta...',
    ctaLogin: 'Zaloguj sie',
    ctaRegister: 'Utworz pierwsze konto',
    ctaUnavailable: 'Niedostepne',
    refreshStatus: 'Sprawdz status ponownie',
    checkingStatus: 'Sprawdzam status backendu...',
    loginHelp: 'Logowanie przez email i haslo.',
    registerHelp: 'Pierwszy uzytkownik: utworz konto email i haslo.',
    setupHelp: 'Najpierw napraw konfiguracje backendu (sekcja wyzej).'
  },
  today: {
    skipReasons: {
      noTime: 'Brak czasu',
      outsideControl: 'Poza moja kontrola',
      lowPriority: 'Niski priorytet'
    },
    sessionExpired: 'Sesja wygasla. Zaloguj sie ponownie.',
    seedLoadingInfo: 'Przygotowuje sygnaly... mozesz juz zrobic check-in.',
    seedReadyInfo: 'Sygnaly sa gotowe.',
    daySyncError: 'Nie udalo sie zsynchronizowac danych dnia.',
    offlineSavedInfo: 'Tryb offline: wpis zapisany lokalnie.',
    saveCheckinFallbackError: 'Nie udalo sie zapisac check-inu.',
    nextStepSetInfo: 'Nastepny krok ustawiony.',
    welcome: {
      title: 'Zacznij w 60 sekund.',
      subtitle: 'Ustal kierunek i wykonaj pierwszy check-in.',
      focusQuestion: 'Co chcesz ustabilizowac w tym tygodniu?',
      preferenceQuestion: 'Kiedy robisz check-in?',
      startCtaLoading: 'Przygotowuje...',
      startCta: 'Zrob pierwszy check-in',
      skipCta: 'Pomin na teraz'
    },
    seedFailed: {
      title: 'Nie udalo sie przygotowac sygnalow',
      body: 'Jesli sygnaly sie nie pojawia, odswiez strone. Check-in dziala na mood, energy i notatce.'
    },
    banners: {
      syncTitle: 'Synchronizacja',
      statusTitle: 'Status',
      errorTitle: 'Problem',
      tuneTitle: 'Gotowy na kolejny krok?',
      tuneBodyLead: 'Chcesz doprecyzowac sygnaly?',
      tuneBodyLink: '2 min w Systemach.'
    },
    dayStatus: {
      title: 'Status dnia',
      subtitle: 'Skup sie na dzialaniu, nie na konfiguracji.',
      progressLabel: 'Postep dzisiaj',
      progressHint: 'Cel: 3',
      streakLabel: 'Seria',
      levelLabel: 'Poziom'
    },
    quickCapture: {
      title: 'Szybki check-in',
      subtitle: 'Nastroj, energia, do 3 sygnalow i jedna linia notatki.',
      collapse: 'Zwin',
      expand: 'Otworz',
      startButton: 'Zrob check-in (60 s)',
      moodLabel: 'Nastroj',
      moodDescriptor: '1 = duze rozchwianie, 10 = stabilny nastroj',
      energyLabel: 'Energia',
      energyDescriptor: '1 = niski zasob, 10 = wysoka sprawczosc',
      note: 'Zapisujesz sygnal. Bez oceniania siebie.',
      journalLabel: 'Trigger - decyzja',
      journalPlaceholder: 'Trigger - decyzja (jedna linia)',
      saveButton: 'Zapisz check-in',
      booleanSubtitle: 'Szybki sygnal Tak/Nie',
      rangeSubtitle: 'Skala 0-10',
      rangeLabel: 'Wartosc'
    },
    nextStep: {
      title: 'Nastepny krok na jutro',
      pendingSubtitle: 'To hipoteza do sprawdzenia jutro.',
      waitingSubtitle: 'Pojawi sie po zapisaniu check-inu.',
      rationalePrefix: 'Na podstawie Twoich sygnalow:',
      rationaleSuffix: 'ma najwiekszy potencjal poprawy.',
      hypothesisHint: 'To hipoteza. Dobra hipoteza oszczedza czas.',
      minimalVariantPrefix: 'Wersja 10% na trudny dzien:',
      accept: 'Wybieram',
      swap: 'Pokaz inna propozycje',
      skip: 'Pomin na dzis',
      emptyState: 'Po zapisaniu check-inu zobaczysz jedna rekomendacje na jutro.'
    },
    history: {
      title: 'Historia dnia',
      subtitle: 'Dzisiejsze wpisy.',
      emptyState: 'Brak wpisow. Zacznij od jednego check-inu.'
    }
  },
  review: {
    loadError: 'Nie udalo sie pobrac danych przegladu.',
    errorTitle: 'Problem z przegladem',
    cockpitTitle: 'Przeglad: tydzien, miesiac, rok',
    cockpitSubtitle: 'To miejsce do decyzji, nie do ogladania wykresow.',
    periodWeek: 'Tydzien',
    periodMonth: 'Miesiac',
    periodYear: 'Rok',
    lowDataTitle: 'Masz malo danych, ale juz jest kierunek',
    lowDataBody:
      'Wybierz 1 sygnal ryzyka i 1 sygnal ochronny. Zbieraj codziennie mood, energy i 3 sygnaly podstawowe przez co najmniej 7 dni.',
    topGainTitle: 'Najmocniejszy sygnal na plus',
    topGainSubtitle: 'To hipoteza, ale moze szybciej doprowadzic do poprawy.',
    topRiskTitle: 'Najmocniejszy sygnal ryzyka',
    topRiskSubtitle: 'To kierunek obserwacji, nie twarda przyczynowosc.',
    noTopGain: 'Brak sygnalu na plus w tym okresie.',
    noTopRisk: 'Brak sygnalu ryzyka w tym okresie.',
    noCausalityHint: 'To nie przyczynowosc. Traktuj jako kierunek.',
    monitorCoreHint: 'Monitoruj dalej 3 sygnaly podstawowe.',
    nextTestTitle: 'Kolejny test',
    weekCardTitle: 'Tydzien',
    weekCardSubtitle: 'Stabilizujesz tydzien, nie pojedynczy dzien.',
    topOneGain: 'Top 1 na plus',
    topOneRisk: 'Top 1 ryzyko',
    noGainWeek: 'Brak sygnalu na plus. Zbieraj kolejne dni.',
    noRiskWeek: 'Brak sygnalu ryzyka. Dodaj jeden trigger binarny.',
    weekExperimentTitle: 'Eksperyment na kolejny tydzien',
    weekExperimentLink: 'Ustaw eksperyment na ten tydzien',
    monthCardTitle: 'Miesiac',
    monthCardSubtitle: 'Trajektoria: dni stabilne i niestabilne.',
    monthTriggerLabel: 'Najczestszy trigger miesiaca:',
    monthLink: 'Wybierz 1 zasade na kolejny miesiac',
    yearCardTitle: 'Rok',
    yearCardSubtitle: 'Kierunek strategiczny zamiast codziennej gonitwy.',
    yearSummaryTitle: 'Rok to 12 iteracji poprawy.',
    yearExperimentsLabel: 'Iteracje eksperymentow:',
    yearRecoveriesLabel: 'Powroty na tor po spadku:',
    backToToday: 'Wroc do Dzisiaj',
    moodLabel: 'Nastroj',
    energyLabel: 'Energia'
  },
  systems: {
    loadError: 'Nie udalo sie pobrac danych systemow.',
    activateError: 'Nie udalo sie aktywowac systemu.',
    activatedCore: 'System aktywowany (sygnaly podstawowe).',
    activatedFull: 'System aktywowany (podstawowe + rozszerzone).',
    addSignalError: 'Nie udalo sie dodac sygnalu.',
    customSignalAdded: 'Wlasny sygnal dodany.',
    bannerProblem: 'Problem',
    bannerStatus: 'Status',
    activeTitle: 'Aktywne systemy',
    activeSubtitle: 'Priorytet: 1 system. Maksymalnie 2 aktywne.',
    activeEmpty: 'Brak aktywnego systemu. Aktywuj jeden system ponizej.',
    detailsLink: 'Szczegoly',
    starterTitle: 'Systemy startowe',
    starterSubtitle: 'Najpierw sygnaly podstawowe, potem precyzja.',
    coreLabel: 'Podstawowe',
    advancedLabel: 'Rozszerzone',
    defaultsWindowLabel: 'Domyslne okno:',
    defaultsRuleLabel: 'Zasada oceny:',
    activateCore: 'Aktywuj podstawowe',
    activateFull: 'Aktywuj podstawowe + rozszerzone',
    generatorTitle: 'Generator definicji sygnalu',
    generatorSubtitle: 'Skala 0-10 ma pomagac w decyzji, nie byc ozdoba.',
    suggestionTitle: 'Sugestia',
    suggestionBodyPrefix: 'Ten sygnal wyglada bardziej na',
    suggestionBodyBoolean: 'Tak/Nie',
    suggestionBodyNumeric: 'skale 0-10',
    suggestionBodySuffix: '. Zmien typ tylko jesli to ma realny sens.',
    signalNameLabel: 'Nazwa sygnalu',
    signalNamePlaceholder: 'np. Scroll przed pierwszym blokiem pracy',
    categoryLabel: 'Kategoria',
    categoryPlaceholder: 'np. Produktywnosc',
    cadenceLabel: 'Kiedy mierzysz?',
    cadenceMorning: 'Rano',
    cadenceDay: 'W ciagu dnia',
    cadenceEvening: 'Wieczorem',
    typeLabel: 'Typ',
    typeBoolean: 'Tak/Nie (domyslnie)',
    typeNumeric: 'Skala 0-10',
    definitionLabel: 'Co znaczy "zaliczone"?',
    definitionPlaceholder: 'Tak = ... / 0-10 = ...',
    addSignalButton: 'Dodaj sygnal',
    activeSignalsCount: 'Aktywnych sygnalow w systemie:'
  },
  systemDetail: {
    activateError: 'Nie udalo sie aktywowac systemu.',
    activated: 'System aktywowany.',
    bannerProblem: 'Problem',
    bannerStatus: 'Status',
    impactSubtitle: 'Co ten system poprawia',
    coreTitle: 'Sygnaly podstawowe',
    coreSubtitle: '3 sygnaly bazowe z jasna definicja zaliczenia.',
    advancedTitle: 'Sygnaly rozszerzone',
    advancedSubtitle: '2-4 sygnaly do wlaczenia po 7 dniach.',
    cadencePrefix: 'Kiedy:',
    activateLoading: 'Aktywacja...',
    activateButton: 'Aktywuj system',
    tuneLink: 'Przejdz do dopasowania'
  },
  systemTune: {
    titlePrefix: 'Dopasowanie:',
    subtitle: 'Dopasuj typ sygnalu i moment pomiaru.',
    signalCardSubtitle: 'Dopasuj do swojego rytmu',
    typeLabel: 'Typ',
    cadenceLabel: 'Kiedy ma sens',
    cadenceMorning: 'Rano',
    cadenceDay: 'W ciagu dnia',
    cadenceEvening: 'Wieczorem',
    savedTitle: 'Zapisano lokalnie',
    savedBody: 'Konfiguracja dopracowana. W tej wersji MVP tuning jest warstwa interfejsu.',
    doneButton: 'Gotowe'
  },
  experiments: {
    title: 'Eksperymenty',
    subtitle: 'Historia nastepnego kroku i wyniki testow.',
    empty: 'Brak eksperymentow. Pierwszy wpis pojawi sie po check-inie i decyzji.',
    variantPrefix: 'Wersja 10%:',
    decisionPrefix: 'Decyzja:',
    resultBetter: 'Wynik: lepiej',
    resultNeutral: 'Wynik: bez zmian',
    resultWorse: 'Wynik: gorzej',
    lastResultPrefix: 'Ostatni wynik:'
  },
  settings: {
    exportError: 'Nie udalo sie pobrac danych do eksportu.',
    exportSuccess: 'Kopia danych wyeksportowana.',
    statusTitle: 'Status',
    accessTitle: 'Dostep',
    accessSubtitle: 'Aktualny status logowania.',
    accessBody: 'Logowanie dziala przez email i haslo. Pierwsze konto zakladasz na `/login`.',
    backupTitle: 'Kopia i eksport',
    backupSubtitle: 'Pobierz dane lokalne i check-iny.',
    backupButton: 'Eksport JSON',
    privacyTitle: 'Prywatnosc',
    privacySubtitle: 'Jak traktowac wyniki analizy.',
    privacyBody: 'Produkt nie jest narzedziem medycznym. Wnioski to hipotezy, nie przyczynowosc.',
    sessionTitle: 'Sesja',
    sessionSubtitle: 'Wylogowanie resetuje lokalny przeplyw na tym urzadzeniu.',
    logoutButton: 'Wyloguj i wyczysc sesje'
  }
} as const;

export const apiCopy = {
  common: {
    unauthorized: 'Brak dostepu.'
  },
  runtime: {
    missingDatabaseUrlTitle: 'Brak DATABASE_URL',
    missingDatabaseUrlMessage: 'Aplikacja nie zna adresu bazy danych.',
    missingDatabaseUrlSteps: [
      'Wpisz DATABASE_URL w pliku .env.',
      'Uruchom npm run prisma:push.',
      'Odswiez /login.'
    ],
    placeholderDatabaseUrlTitle: 'DATABASE_URL ma wartosc przykladowa',
    placeholderDatabaseUrlMessage: 'W .env jest domyslny adres postgresql://USER:PASSWORD@HOST:5432/patternfinder.',
    placeholderDatabaseUrlSteps: [
      'Podmien DATABASE_URL na dzialajacy adres Postgresa (Supabase/Neon/Railway).',
      'Uruchom npm run prisma:push.',
      'Odswiez /login.'
    ],
    missingSessionSecretTitle: 'Brak SESSION_SECRET',
    missingSessionSecretMessage: 'Logowanie wymaga ustawionego sekretu sesji.',
    missingSessionSecretSteps: [
      'Wpisz SESSION_SECRET w .env (dlugi losowy ciag).',
      'Zrestartuj serwer dev.',
      'Sprobuj ponownie na /login.'
    ],
    placeholderSecretWarning: 'SESSION_SECRET ma wartosc tymczasowa. Przed produkcja ustaw dlugi losowy sekret.',
    dbUnreachableTitle: 'Brak polaczenia z baza',
    dbUnreachableSteps: [
      'Sprawdz, czy DATABASE_URL wskazuje dzialajaca baze Postgres.',
      'Uruchom npm run prisma:push.',
      'Odswiez /login.'
    ],
    runtimeErrorTitle: 'Blad uruchomienia backendu',
    runtimeErrorMessage: 'Backend nie mogl sprawdzic statusu logowania.',
    runtimeErrorSteps: ['Sprawdz log serwera dev.', 'Uruchom npm run doctor i popraw wskazane bledy.']
  },
  auth: {
    passwordsMismatch: 'Hasla musza byc takie same.',
    invalidRegisterData: 'Wprowadz poprawne dane.',
    firstAccountExists: 'Pierwsze konto zostalo juz utworzone.',
    emailTaken: 'Ten email jest juz zajety.',
    createAccountFailed: 'Nie udalo sie utworzyc konta.',
    invalidLoginData: 'Podaj poprawny email i haslo.',
    firstAccountRequired: 'Najpierw utworz pierwsze konto.',
    invalidCredentials: 'Niepoprawny email lub haslo.',
    tooManyAttempts: 'Za duzo prob. Sprobuj ponownie za chwile.',
    accountTemporarilyLocked: 'Konto jest chwilowo zablokowane po wielu nieudanych probach.',
    startSessionFailed: 'Nie udalo sie uruchomic sesji.'
  },
  checkins: {
    invalidRange: 'Parametry from i to sa wymagane w formacie YYYY-MM-DD.',
    invalidPayload: 'Niepoprawne dane check-inu.',
    invalidActivities: 'Wykryto nieprawidlowe aktywnosci.',
    saveFailed: 'Nie udalo sie zapisac check-inu.'
  },
  gamification: {
    statusFailed: 'Nie udalo sie pobrac statusu postepu.'
  },
  reports: {
    invalidMonth: 'Podaj month=YYYY-MM.',
    invalidWeek: 'Podaj week=YYYY-WW.',
    monthlyFailed: 'Nie udalo sie pobrac raportu miesiecznego.',
    weeklyFailed: 'Nie udalo sie pobrac raportu tygodniowego.'
  },
  activities: {
    invalidData: 'Niepoprawne dane aktywnosci.',
    alreadyExists: 'Aktywnosc o tej nazwie juz istnieje.',
    saveFailed: 'Nie udalo sie zapisac aktywnosci.',
    invalidUpdateData: 'Niepoprawne dane.',
    notFound: 'Nie znaleziono aktywnosci.',
    updateFailed: 'Blad aktualizacji aktywnosci.',
    deleteFailed: 'Blad usuwania aktywnosci.'
  },
  focusSeed: {
    invalidData: 'Niepoprawne dane konfiguracji startowej.',
    loadFailed: 'Nie udalo sie zaladowac sygnalow.'
  },
  systems: {
    invalidData: 'Niepoprawne dane systemu.',
    notFound: 'Nie znaleziono systemu.',
    activationFailed: 'Nie udalo sie aktywowac systemu.'
  },
  profile: {
    invalidData: 'Niepoprawne dane profilu.',
    saveFailed: 'Nie udalo sie zapisac profilu.'
  }
} as const;
