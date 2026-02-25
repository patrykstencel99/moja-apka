# PatternFinder MVP

Web MVP do codziennego logowania aktywnosci, nastroju i energii, z raportami wzorcow, grywalizacja i podstawowym wsparciem offline (PWA + kolejka check-inow).

## Stack

- Next.js App Router + TypeScript
- Prisma + Postgres
- Auth email + haslo (pierwszy user przejmuje aplikacje)
- PWA service worker + IndexedDB queue
- Vitest (unit)
- Design system oparty o tokeny i semantic theme (`pf-premium`)

## Funkcje MVP

- Logowanie email + haslo
- Setup aktywnosci: starter packi + custom aktywnosci
- Daily flow: Capture (60s) -> Decide (Next Move) -> Review
- Daily verdict + Next Move (jedna decyzja na jutro)
- Raporty week/month/year z eksperymentami i top gain/top risk
- Hipotezy mikro i makro wzorcow (lag 0/1, confidence)
- Grywalizacja: streak, XP, level, badge, osobisty leaderboard
- Offline queue: check-in zapisany bez internetu, sync po reconnect
- Metadata aktywnosci dla UX grouping: `iconKey`, `priority`, `valenceHint`

## Brand i Design docs

- `docs/brand-foundation.md`
- `docs/design-system.md`
- `docs/execution-plan-live.md` (status + roadmap + podzial na 4 agentow)
- `docs/architecture-overview.md`
- `docs/system-audit-2026-02-23.md`

## Wymagane zmienne

Skopiuj `.env.example` do `.env` i uzupelnij:

- `DATABASE_URL`
- `SESSION_SECRET`
- `APP_URL`

## Uruchomienie lokalne

```bash
npm install
npm run doctor
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run dev
```

Aplikacja: `http://localhost:3000`

### Szybka diagnostyka

Jesli `/login` pokazuje blad uruchomienia, sprawdz:

```bash
npm run doctor
```

Health endpoint:

- `GET /api/health` (200 = gotowe, 503 = brak konfiguracji runtime)

## Testy i QA

```bash
npm run test
```

Pelna walidacja (lint + test + build + smoke):

```bash
npm run qa:full
```

Sam smoke krytycznych tras:

```bash
npm run smoke
```

Smoke domyslnie sprawdza: `/today`, `/systems`, `/review`.

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
