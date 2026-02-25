export const uiCopy = {
  meta: {
    description: 'Codzienny check-in i jedna lepsza decyzja na jutro.'
  },
  nav: {
    brandSubtitle: 'Codziennie 1 check-in. Coraz lepsze decyzje.',
    primaryAriaLabel: 'Nawigacja główna',
    today: 'Dzisiaj',
    systems: 'Systemy',
    review: 'Przegląd',
    menu: 'Więcej',
    experiments: 'Eksperymenty',
    settings: 'Ustawienia',
    modeLabel: 'Tryb wzrostu'
  },
  landing: {
    eyebrow: 'PatternFinder',
    title: '365 decyzji.',
    titleSecondaryLead: 'Jedno kliknięcie. 1095 szans na',
    titleSecondaryGreen: 'złapanie chwili',
    titleSecondaryJoiner: 'i',
    titleSecondaryRed: 'przerwanie pętli.',
    subtitle: 'Dotknij dowolny kwadrat. znajdź swój negatywny schemat i zastąp go swoim idealnym życiem.',
    dayAriaLabelTemplate: 'Wybierz dzień {day} i przejdź do logowania.'
  },
  pages: {
    today: {
      eyebrow: 'Dzisiaj',
      title: 'Jeden check-in dziennie. Stabilny progres co tydzien.',
      support: 'Najpierw zapisujesz dzisiaj, potem wybierasz kolejny krok na jutro.'
    },
    systems: {
      eyebrow: 'Systemy',
      title: 'Wybierz system, ktory pomaga dowozic wynik.',
      support: 'Zacznij od podstaw, potem dodawaj precyzje.'
    },
    systemDetail: {
      eyebrow: 'System',
      support: 'Aktywuj system i przenies go do codziennego check-inu.'
    },
    systemTune: {
      eyebrow: 'Dopasowanie',
      support: 'Dostosuj pomiar do swojego rytmu dnia.'
    },
    review: {
      eyebrow: 'Przeglad',
      title: 'Zobacz, co napedza progres, a co go hamuje.',
      support: 'Wnioski traktuj jak hipotezy do kolejnych testow.'
    },
    experiments: {
      eyebrow: 'Eksperymenty',
      title: 'Historia decyzji',
      support: 'Sprawdzaj, co dziala i wzmacniaj skuteczne ruchy.'
    },
    settings: {
      eyebrow: 'Ustawienia',
      title: 'Konto i dane',
      support: 'Zarzadzaj sesja, eksportem i prywatnoscia.'
    }
  },
  login: {
    heroEyebrow: 'PatternFinder',
    heroTitle: 'Buduj spokoj i skutecznosc przez codzienne decyzje.',
    heroSupport: 'Zacznij od prostego check-inu. Pierwsze konto uruchamia aplikacje.',
    fallbackSetupTitle: 'Brak odpowiedzi serwera',
    fallbackSetupMessage: 'Nie udalo sie odczytac statusu logowania.',
    fallbackSetupSteps: ['Uruchom npm run doctor i popraw wskazane problemy.', 'Odswiez /login.'],
    noBackendResponseError: 'Serwer nie odpowiada. Sprobuj ponownie za chwile.',
    sessionStartFallbackError: 'Nie udalo sie rozpoczac sesji.',
    sessionStartRetryError: 'Nie udalo sie rozpoczac sesji. Sprobuj ponownie.',
    warningTitle: 'Wazne',
    launchErrorTitle: 'Nie udalo sie',
    emailLabel: 'Adres e-mail',
    emailPlaceholder: 'twoj@email.com',
    passwordLabel: 'Haslo',
    passwordPlaceholder: 'Minimum 8 znakow',
    confirmPasswordLabel: 'Potwierdz haslo',
    confirmPasswordPlaceholder: 'Powtorz haslo',
    loadingLogin: 'Logowanie...',
    loadingRegister: 'Tworzenie konta...',
    ctaLogin: 'Zaloguj sie',
    ctaRegister: 'Utworz konto',
    ctaUnavailable: 'Niedostepne',
    refreshStatus: 'Sprawdz status ponownie',
    checkingStatus: 'Sprawdzam status serwera...',
    loginHelp: 'Zaloguj sie adresem e-mail i haslem.',
    registerHelp: 'To pierwsze konto. Podaj e-mail i haslo.',
    setupHelp: 'Najpierw uzupelnij konfiguracje serwera (sekcja wyzej).'
  },
  today: {
    skipReasons: {
      noTime: 'Brak czasu',
      outsideControl: 'Zly moment',
      lowPriority: 'Niski priorytet'
    },
    sessionExpired: 'Sesja wygasla. Zaloguj sie ponownie.',
    seedLoadingInfo: 'Trwa przygotowanie sygnalow.',
    seedReadyInfo: 'Sygnaly sa gotowe do check-inu.',
    daySyncError: 'Nie udalo sie pobrac danych dnia.',
    offlineSavedInfo: 'Tryb offline: wpis zapisany lokalnie.',
    syncInfoTemplate: 'Wpisy offline zsynchronizowane: {count}.',
    saveCheckinFallbackError: 'Nie udalo sie zapisac check-inu.',
    nextStepSetInfo: 'Kolejny krok zapisany.',
    welcome: {
      title: 'Start w 60 sekund.',
      subtitle: 'Ustal kierunek i wykonaj pierwszy check-in.',
      focusQuestion: 'Co chcesz najbardziej ustabilizowac w tym tygodniu?',
      preferenceQuestion: 'Kiedy najlatwiej robisz check-in?',
      startCtaLoading: 'Przygotowuje...',
      startCta: 'Zrob pierwszy check-in',
      skipCta: 'Pomin'
    },
    seedFailed: {
      title: 'Nie udalo sie przygotowac sygnalow',
      body: 'Mozesz przejsc dalej i zrobic check-in nastroju, energii oraz notatki.'
    },
    banners: {
      syncTitle: 'Synchronizacja',
      statusTitle: 'Status',
      errorTitle: 'Problem',
      tuneTitle: 'Gotowy na kolejny poziom?',
      tuneBodyLead: 'Doprecyzuj sygnaly w sekcji',
      tuneBodyLink: 'Systemy'
    },
    dayStatus: {
      title: 'Status dnia',
      subtitle: 'Skup sie na dzialaniu, nie na perfekcji.',
      progressLabel: 'Postep dzisiaj',
      progressHint: 'Cel: 3 wpisy',
      streakLabel: 'Seria',
      bestStreakHintTemplate: 'Najlepsza seria: {count}',
      levelLabel: 'Poziom',
      xpHintTemplate: 'XP: {xp}'
    },
    quickCapture: {
      title: 'Szybki check-in',
      subtitle: 'Nastroj, energia, do 3 sygnalow i jedna notatka.',
      collapse: 'Zwin',
      expand: 'Otworz',
      startButton: 'Zrob check-in (60 s)',
      moodLabel: 'Nastroj',
      moodDescriptor: '1 = duze obciazenie, 10 = duza stabilnosc',
      energyLabel: 'Energia',
      energyDescriptor: '1 = niski zasob, 10 = wysoka gotowosc',
      note: 'To tylko zapis sygnalu. Bez oceniania siebie.',
      journalLabel: 'Sytuacja i decyzja',
      journalPlaceholder: 'Jedna linia: co sie wydarzylo i co wybrales',
      saveButton: 'Zapisz check-in',
      booleanSubtitle: 'Szybki sygnal Tak/Nie',
      rangeSubtitle: 'Skala 0-10',
      rangeLabel: 'Wartosc'
    },
    nextStep: {
      title: 'Kolejny krok na jutro',
      pendingSubtitle: 'To hipoteza do sprawdzenia jutro.',
      waitingSubtitle: 'Pojawi sie po zapisaniu check-inu.',
      rationalePrefix: 'Na podstawie dzisiejszych sygnalow:',
      rationaleSuffix: 'ma teraz najwiekszy potencjal poprawy.',
      hypothesisHint: 'Potraktuj to jak test, nie jak wyrok.',
      minimalVariantPrefix: 'Wersja minimalna na trudny dzien:',
      accept: 'Wybieram',
      swap: 'Pokaz inna propozycje',
      skip: 'Pomin na dzis',
      emptyState: 'Po check-inie zobaczysz jedna konkretna rekomendacje na jutro.'
    },
    history: {
      title: 'Historia dnia',
      subtitle: 'Dzisiejsze wpisy.',
      emptyState: 'Brak wpisow. Zacznij od jednego check-inu.',
      moodShort: 'nastroj',
      energyShort: 'energia'
    },
    yearView: {
      eyebrow: 'Rok świadomych decyzji',
      title: '365 punktów skupienia.',
      subtitle: 'Jeden klik i widzisz prawdę o dniu. Każdy kwadrat to jeden dzień: czarny = brak check-inu, żółty = 1 wpis, zielony = 2+.',
      legendNone: 'Czarny: 0',
      legendSingle: 'Żółty: 1',
      legendDouble: 'Zielony: 2+',
      dayAriaLabelTemplate: 'Dzień {date}. Liczba check-inów: {count}. Otwórz szczegóły.',
      dayTitle: 'Widok dnia',
      dayEmpty: 'Brak check-inów w wybranym dniu.',
      dayStats: {
        entries: 'Liczba wpisów',
        mood: 'Średni nastrój',
        energy: 'Średnia energia'
      }
    }
  },
  review: {
    loadError: 'Nie udalo sie pobrac danych przegladu.',
    errorTitle: 'Problem z przegladem',
    cockpitTitle: 'Przeglad: tydzien, miesiac, rok',
    cockpitSubtitle: 'Tutaj wybierasz kolejny ruch na podstawie danych.',
    periodWeek: 'Tydzien',
    periodMonth: 'Miesiac',
    periodYear: 'Rok',
    lowDataTitle: 'Masz za malo danych, ale kierunek juz jest',
    lowDataBody:
      'Skup sie na codziennym check-inie. Zbieraj nastroj, energie i 3 podstawowe sygnaly przez minimum 7 dni.',
    topGainTitle: 'Najmocniejszy sygnal na plus',
    topGainSubtitle: 'To hipoteza, ktora warto przetestowac jutro.',
    topRiskTitle: 'Najmocniejszy sygnal ryzyka',
    topRiskSubtitle: 'To wskazowka, gdzie warto postawic bariere.',
    noTopGain: 'Brak sygnalu na plus w tym okresie.',
    noTopRisk: 'Brak sygnalu ryzyka w tym okresie.',
    noCausalityHint: 'To kierunek obserwacji, nie dowod przyczynowy.',
    monitorCoreHint: 'Monitoruj dalej podstawowe sygnaly.',
    lagConfidenceTemplate: 'Opoznienie: {lag} d • pewnosc: {confidence}%',
    nextTestTitle: 'Kolejny test',
    weekCardTitle: 'Tydzien',
    weekCardSubtitle: 'Budujesz powtarzalnosc, nie idealny dzien.',
    topOneGain: 'Top 1 na plus',
    topOneRisk: 'Top 1 ryzyko',
    noGainWeek: 'Brak sygnalu na plus. Zbieraj kolejne dni.',
    noRiskWeek: 'Brak sygnalu ryzyka. Dodaj jeden sygnal Tak/Nie.',
    weekExperimentTitle: 'Eksperyment na kolejny tydzien',
    weekExperimentLink: 'Przejdz do eksperymentow',
    monthCardTitle: 'Miesiac',
    monthCardSubtitle: 'Sprawdz, ile dni bylo stabilnych i ile wymagalo korekty.',
    monthTriggerLabel: 'Najczestszy wyzwalacz miesiaca:',
    monthLink: 'Wybierz jedna zasade na kolejny miesiac',
    yearCardTitle: 'Rok',
    yearCardSubtitle: 'Kierunek strategiczny zamiast gaszenia pozarow.',
    yearSummaryTitle: 'Rok to 12 iteracji poprawy.',
    yearExperimentsLabel: 'Iteracje eksperymentow:',
    yearRecoveriesLabel: 'Powroty na dobry tor:',
    backToToday: 'Wroc do Dzisiaj',
    moodLabel: 'Nastroj',
    energyLabel: 'Energia',
    trendAriaLabel: 'Trend energii',
    nextTestNoSignals: 'Plan na jutro: zrob jeden check-in i przetestuj jedna mala korekte poranka.',
    nextTestBothTemplate: 'Jutro ogranicz "{risk}" i powtorz "{gain}" w wersji minimalnej.',
    nextTestRiskTemplate: 'Jutro postaw jedna bariere dla "{risk}".',
    nextTestGainTemplate: 'Jutro utrwal "{gain}" jako pierwszy krok dnia.',
    noFrequentTrigger: 'Brak dominujacego wyzwalacza. Zbieraj dalej dane binarne.'
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
    starterSubtitle: 'Najpierw podstawy, potem precyzja.',
    metricsCoreShort: 'Podst',
    metricsAdvancedShort: 'Rozs',
    signalTypeBooleanShort: 'tak/nie',
    signalTypeNumericShort: '0-10',
    visualAltSuffix: 'wizualizacja systemu',
    coreLabel: 'Podstawowe',
    advancedLabel: 'Rozszerzone',
    defaultsWindowLabel: 'Domyslne okno:',
    defaultsRuleLabel: 'Zasada oceny:',
    activateCore: 'Aktywuj podstawowe',
    activateFull: 'Aktywuj podstawowe + rozszerzone',
    generatorTitle: 'Generator sygnalu',
    generatorSubtitle: 'Sygnal ma pomagac podejmowac decyzje.',
    suggestionTitle: 'Sugestia',
    suggestionBodyPrefix: 'Ten sygnal wyglada bardziej na',
    suggestionBodyBoolean: 'sygnal Tak/Nie',
    suggestionBodyNumeric: 'skale 0-10',
    suggestionBodySuffix: '. Zmien typ tylko wtedy, gdy to naprawde pomaga.',
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
    coreSubtitle: '3 sygnaly bazowe z jasna definicja.',
    advancedTitle: 'Sygnaly rozszerzone',
    advancedSubtitle: '2-4 sygnaly do wlaczenia po pierwszym tygodniu.',
    cadencePrefix: 'Kiedy:',
    cadenceMorning: 'Rano',
    cadenceDay: 'W ciagu dnia',
    cadenceEvening: 'Wieczorem',
    activateLoading: 'Aktywacja...',
    activateButton: 'Aktywuj system',
    tuneLink: 'Przejdz do dopasowania'
  },
  systemTune: {
    titlePrefix: 'Dopasowanie:',
    subtitle: 'Dopasuj typ sygnalu i moment pomiaru.',
    signalCardSubtitle: 'Dopasuj do swojego rytmu',
    typeLabel: 'Typ',
    typeBooleanOption: 'Tak/Nie',
    typeNumericOption: 'Skala 0-10',
    cadenceLabel: 'Kiedy ma sens',
    cadenceMorning: 'Rano',
    cadenceDay: 'W ciagu dnia',
    cadenceEvening: 'Wieczorem',
    savedTitle: 'Zapisano lokalnie',
    savedBody: 'Ustawienia sygnalow sa gotowe. Mozesz wrocic do codziennego check-inu.',
    doneButton: 'Gotowe'
  },
  experiments: {
    title: 'Eksperymenty',
    subtitle: 'Historia kolejnych krokow i wynikow testow.',
    empty: 'Brak eksperymentow. Pierwszy wpis pojawi sie po check-inie i decyzji.',
    variantPrefix: 'Wersja minimalna:',
    decisionPrefix: 'Decyzja:',
    resultBetter: 'Lepiej',
    resultNeutral: 'Bez zmian',
    resultWorse: 'Gorzej',
    lastResultPrefix: 'Ostatni wynik:'
  },
  settings: {
    exportError: 'Nie udalo sie pobrac danych do eksportu.',
    exportSuccess: 'Kopia danych wyeksportowana.',
    statusTitle: 'Status',
    accessTitle: 'Dostep',
    accessSubtitle: 'Aktualny status logowania.',
    accessBody: 'Logowanie dziala przez e-mail i haslo. Pierwsze konto zakladasz na /login.',
    backupTitle: 'Kopia i eksport',
    backupSubtitle: 'Pobierz dane lokalne i check-iny.',
    backupButton: 'Eksport JSON',
    privacyTitle: 'Prywatnosc',
    privacySubtitle: 'Jak interpretowac wyniki analizy.',
    privacyBody: 'To narzedzie wspiera decyzje. Wnioski traktuj jako hipotezy, nie diagnoze.',
    sessionTitle: 'Sesja',
    sessionSubtitle: 'Wylogowanie czysci lokalna sesje na tym urzadzeniu.',
    logoutButton: 'Wyloguj i wyczysc sesje'
  }
} as const;

export const apiCopy = {
  common: {
    unauthorized: 'Sesja wygasla lub brak dostepu. Zaloguj sie ponownie.'
  },
  runtime: {
    missingDatabaseUrlTitle: 'Brak DATABASE_URL',
    missingDatabaseUrlMessage: 'Aplikacja nie zna adresu bazy danych.',
    missingDatabaseUrlSteps: [
      'Uzupelnij DATABASE_URL w pliku .env.',
      'Uruchom npm run prisma:push.',
      'Odswiez /login.'
    ],
    placeholderDatabaseUrlTitle: 'DATABASE_URL ma wartosc przykladowa',
    placeholderDatabaseUrlMessage: 'W .env jest domyslny adres bazy i aplikacja nie moze sie polaczyc.',
    placeholderDatabaseUrlSteps: [
      'Podmien DATABASE_URL na dzialajacy adres Postgresa.',
      'Uruchom npm run prisma:push.',
      'Odswiez /login.'
    ],
    missingSessionSecretTitle: 'Brak SESSION_SECRET',
    missingSessionSecretMessage: 'Logowanie wymaga ustawionego sekretu sesji.',
    missingSessionSecretSteps: [
      'Uzupelnij SESSION_SECRET w .env (dlugi losowy ciag).',
      'Zrestartuj serwer deweloperski.',
      'Wroc do /login i sprobuj ponownie.'
    ],
    placeholderSecretWarning: 'SESSION_SECRET ma wartosc tymczasowa. Przed wdrozeniem ustaw losowy sekret.',
    dbUnreachableTitle: 'Brak polaczenia z baza',
    dbUnreachableSteps: [
      'Sprawdz, czy DATABASE_URL wskazuje dzialajaca baze Postgres.',
      'Uruchom npm run prisma:push.',
      'Odswiez /login.'
    ],
    runtimeErrorTitle: 'Blad uruchomienia serwera',
    runtimeErrorMessage: 'Serwer nie mogl sprawdzic statusu logowania.',
    runtimeErrorSteps: ['Sprawdz log serwera.', 'Uruchom npm run doctor i popraw wskazane problemy.'],
    dbUnreachableMessage: 'Brak polaczenia z baza danych. Ustaw poprawny DATABASE_URL i uruchom npm run prisma:push.'
  },
  auth: {
    passwordsMismatch: 'Hasla musza byc takie same.',
    invalidRegisterData: 'Wprowadz poprawny e-mail i haslo (minimum 8 znakow).',
    firstAccountExists: 'Pierwsze konto zostalo juz utworzone.',
    emailTaken: 'Ten adres e-mail jest juz zajety.',
    createAccountFailed: 'Nie udalo sie utworzyc konta.',
    invalidLoginData: 'Podaj poprawny e-mail i haslo.',
    firstAccountRequired: 'Najpierw utworz pierwsze konto.',
    invalidCredentials: 'Niepoprawny e-mail lub haslo.',
    tooManyAttempts: 'Za duzo prob logowania. Sprobuj ponownie za chwile.',
    accountTemporarilyLocked: 'Konto zostalo chwilowo zablokowane po wielu nieudanych probach.',
    startSessionFailed: 'Nie udalo sie rozpoczac sesji.'
  },
  checkins: {
    invalidRange: 'Parametry from i to sa wymagane w formacie YYYY-MM-DD.',
    invalidPayload: 'Niepoprawne dane check-inu.',
    invalidActivities: 'Wykryto nieprawidlowe sygnaly w check-inie.',
    saveFailed: 'Nie udalo sie zapisac check-inu.'
  },
  gamification: {
    statusFailed: 'Nie udalo sie pobrac statusu progresu.'
  },
  reports: {
    invalidMonth: 'Podaj month=YYYY-MM.',
    invalidWeek: 'Podaj week=YYYY-WW.',
    monthlyFailed: 'Nie udalo sie pobrac raportu miesiecznego.',
    weeklyFailed: 'Nie udalo sie pobrac raportu tygodniowego.',
    insufficientDataMessage: 'Za malo danych. Zbieraj check-in przez minimum 7 dni, aby zobaczyc pierwsze wnioski.',
    hypothesisMessage: 'Wnioski sa hipotezami statystycznymi, a nie dowodem przyczynowosci.'
  },
  activities: {
    invalidData: 'Niepoprawne dane sygnalu.',
    alreadyExists: 'Sygnal o tej nazwie juz istnieje.',
    saveFailed: 'Nie udalo sie zapisac sygnalu.',
    invalidUpdateData: 'Niepoprawne dane aktualizacji.',
    notFound: 'Nie znaleziono sygnalu.',
    updateFailed: 'Nie udalo sie zaktualizowac sygnalu.',
    deleteFailed: 'Nie udalo sie usunac sygnalu.'
  },
  focusSeed: {
    invalidData: 'Niepoprawne dane konfiguracji startowej.',
    loadFailed: 'Nie udalo sie przygotowac sygnalow startowych.'
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
