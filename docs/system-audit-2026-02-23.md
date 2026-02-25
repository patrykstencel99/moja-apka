# System Audit (2026-02-23)

## Cel

Szybki, operacyjny status projektu: co mamy, czego nie mamy, co chcemy miec i co moglibysmy dorzucic poza plan.

## Co mamy (fakty potwierdzone)

- Przechodzi pelna walidacja techniczna na aktualnym stanie `main`:
  - `npm run lint` - OK
  - `npm test` - OK
  - `npm run build` - OK
  - smoke `/today`, `/systems`, `/review` - OK (3xx redirect)
- Runtime sanity:
  - `npm run doctor` - OK
  - endpoint zdrowia: `/api/health`
- Dostepne glowne obszary produktu:
  - auth (`/login`, API `auth/*`, `session/*`)
  - daily flow (`/today`)
  - systems (`/systems`)
  - review (`/review`)
- Integracja agentow wykonana na branchu `codex/integrator-a-c-d-b` w kolejnosci `A -> C -> D -> B`.

## Czego nie mamy (braki do live)

- Potwierdzonego E2E po deployu na produkcji (login -> system -> check-in -> review).
- Twardych progow niezawodnosci (SLO/SLA + alarmy) poza bazowym health checkiem.
- Rozszerzonego pokrycia testami UI dla kluczowych interakcji dziennych (gowna logika jest glownie testowana na poziomie unit/API).

## Co chcemy miec (nastepny krok)

- Stabilny gate wydaniowy:
  - `qa:full` w CI przed merge do release brancha.
- Manualny smoke release checklist:
  - login, check-in, next move, review tydzien/miesiac/rok.
- Jasny release cadence:
  - branch integracyjny -> preview -> produkcja.

## Co moglibysmy miec (poza planem)

- Playwright E2E dla krytycznej petli dziennej i autoryzacji.
- Contract tests API (`auth`, `checkins`, `review`).
- Dashboard operacyjny (bledy, czasy odpowiedzi, alarmy retry/offline queue).

## Porzadki wykonane dzis

- Dodano automatyczny smoke: `scripts/smoke-routes.mjs`.
- Dodano skrypty:
  - `npm run smoke`
  - `npm run qa:full`
- Uporzadkowano dokumentacje wykonawcza i status integracji agentow.
- Usunieto z repo artefakt lokalny (zagniezdzone repo testowe) przez przeniesienie go poza katalog projektu.
