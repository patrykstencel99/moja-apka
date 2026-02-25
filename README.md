# PatternFinder MVP

Web MVP do codziennego logowania aktywnosci, nastroju i energii, z raportami wzorcow, grywalizacja i podstawowym wsparciem offline (PWA + kolejka check-inow).

## Stack

- Next.js App Router + TypeScript
- Prisma + Postgres
- Brak auth (single-user MVP)
- PWA service worker + IndexedDB queue
- Vitest (unit)
- Design system oparty o tokeny i semantic theme (`pf-premium`)

## Funkcje MVP

- Brak logowania (single-user mode)
- Setup aktywnosci: starter packi + custom aktywnosci
- Daily check-in: mood, energy, aktywnosci, journal
- Rekomendacja 3 wpisow dziennie + minimum 1 wpis dla streak
- Raport tygodniowy i miesieczny (Top 3 pozytywne / Top 3 negatywne)
- Hipotezy mikro i makro wzorcow (lag 0/1, confidence)
- Grywalizacja: streak, XP, level, badge, osobisty leaderboard
- Offline queue: check-in zapisany bez internetu, sync po reconnect
- Metadata aktywnosci dla UX grouping: `iconKey`, `priority`, `valenceHint`

## Brand i Design docs

- `docs/brand-foundation.md`
- `docs/design-system.md`

## Wymagane zmienne

Skopiuj `.env.example` do `.env` i uzupelnij:

- `DATABASE_URL`
- `SESSION_SECRET`
- `APP_URL`

## Uruchomienie lokalne

```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run dev
```

Aplikacja: `http://localhost:3000`

## Testy

```bash
npm run test
```

## CI (GitHub Actions)

Workflow `.github/workflows/ci.yml` uruchamia:

- lint
- test
- build

Triggery:

- `pull_request` (kazdy branch)
- `push` na `main`

Uruchomienie lokalnie (to samo co pipeline):

```bash
npm run ci
```

## Deploy (free/easy)

1. Postgres: utworz baze w Supabase Free.
2. App: wrzuc repo na GitHub i podlacz do Vercel.
3. W Vercel ustaw env vars z `.env.example`.
4. Po deployu uruchom migracje/seed jednorazowo:

```bash
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

## Disclaimer

Raporty sa hipotezami statystycznymi i nie stanowia porady medycznej.
