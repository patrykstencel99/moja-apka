# Architecture Overview

## Warstwy

- `src/app/*`:
  - routing App Router,
  - strony i API routes.
- `src/components/*`:
  - logika UI i interakcje,
  - podzial domenowy (`review`, `systems`, `visuals`, `ui`).
- `src/lib/*`:
  - logika domenowa i helpery (session, insights, gamification, state).
- `prisma/*`:
  - schema i seed danych.

## Krytyczna petla produktu

1. `GET /today` + komponent `TodayClient`.
2. Zapis check-in przez `POST /api/checkins`.
3. Decyzja `Next Move` i feedback dzienny.
4. Agregacje w `review` (`/api/reports/*`, `/review`).

## Obecne granice odpowiedzialnosci

- API routes trzymaja walidacje wejscia i side-effecty DB.
- `lib/*` dostarcza funkcje obliczeniowe i wspolne helpery.
- Komponenty klienckie skupiaja sie na stanie UI i flow.

## Utrzymanie porzadku (zasada)

- Nowa logika biznesowa: najpierw `src/lib/*`, potem podpiecie pod API/UI.
- Endpointy tylko do orkiestracji i walidacji, bez duzych obliczen inline.
- Testy unit dla obliczen (`src/tests/*`) i smoke dla tras krytycznych (`npm run smoke`).
