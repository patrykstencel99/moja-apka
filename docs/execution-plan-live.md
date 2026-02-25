# Execution Plan (Live Readiness)

## Status integracji agentow (2026-02-23)

- Kolejnosc integracji wykonana: `A -> C -> D -> B`.
- Branch integracyjny: `codex/integrator-a-c-d-b`.
- `A` i `B` wniosly zmiany do integracji.
- `C` i `D` byly juz zgodne z `main` (`already up to date`).
- Po kazdym kroku przejscie: `npm run lint`, `npm test`, smoke `/today` `/systems` `/review`.

## 1) Co juz mamy (zrobione)

- Flow dzienny `Capture -> Decide -> Review` na `/today`.
- `Next Move` po check-inie (Biere / Zamien / Nie dzis) + `Daily Verdict`.
- Starter Systems na `/systems`:
  - Stabilna energia
  - Gleboka praca
  - Sen bez tarcia
- Generator definicji sygnalu (binary-first + sugestia kiedy skala 0-10).
- Review 2x/5x/10x na `/review`:
  - tydzien (trend + heatmapa + top gain/risk),
  - miesiac (trajektoria + trigger),
  - rok (ESI + iteracje + recoveries).
- Interaktywna warstwa wizualna (`DecisionVisualStage`) + motywy SVG.
- Auth email+haslo (pierwszy user przejmuje aplikacje).
- Offline queue check-inow + sync po reconnect.
- Endpoint diagnostyczny runtime `GET /api/health`.

## 2) Czego jeszcze brakuje (must-have do live)

- Realna baza Postgres w `.env` (obecnie placeholder blokuje logowanie).
- Produkcyjny `SESSION_SECRET` (losowy i dlugi).
- Deploy preview/prod + podpiecie domeny.
- Smoke testy po deployu (login -> system -> check-in -> review).
- Monitoring i alerty (min. health check + error logging).

## 3) Lista co robimy dalej (priorytet)

1. Infra-prod: podlaczyc realny Postgres, wypchnac schema, seed.
2. Deploy pipeline: preview + production, env vars i check zdrowia.
3. QA flow: test end-to-end krytycznej petli dziennej.
4. Hardening auth/API: limity prob, bledy 503, fallback UX.
5. Analytics: eventy dla Capture/Decide/Review i decyzji Next Move.

## 4) Podzial na 4 agentow (asynchronicznie)

### Agent A: Infra & DB
- Cel: runtime gotowy lokalnie i produkcyjnie.
- Zakres:
  - `.env` i env-y produkcyjne,
  - `prisma:push` / `prisma:seed`,
  - sanity check `/api/health`.
- Branch: `codex/infra-db`.
- Worktree: `../wt-infra-db`.
- Deliverable:
  - dzialajace logowanie/rejestracja,
  - checklista env (local + prod),
  - komenda odtworzenia.

### Agent B: Deploy & Domena
- Cel: app live na domenie.
- Zakres:
  - Vercel project,
  - preview + prod deploy,
  - DNS/domain mapping,
  - rollback notes.
- Branch: `codex/deploy-domain`.
- Worktree: `../wt-deploy-domain`.
- Deliverable:
  - URL preview + URL prod,
  - status SSL/DNS,
  - instrukcja rollback.

### Agent C: Product Polish (UI/UX + motion)
- Cel: finalny szlif ICP cockpit.
- Zakres:
  - mikrokopie i states (empty/loading/error),
  - animacje sekwencji Capture -> Decide,
  - dopieszczenie kart Review.
- Branch: `codex/product-polish`.
- Worktree: `../wt-product-polish`.
- Deliverable:
  - spis zmian UI,
  - nagranie GIF/short video flow (opcjonalnie),
  - brak regresji responsive.

### Agent D: QA & Reliability
- Cel: wykrycie regresji przed live.
- Zakres:
  - testy krytycznej petli,
  - edge cases (offline, brak DB, lockout loginu),
  - raport ryzyk + decyzja go/no-go.
- Branch: `codex/qa-reliability`.
- Worktree: `../wt-qa-reliability`.
- Deliverable:
  - tabela testow pass/fail,
  - lista blockerow,
  - rekomendacja release.

## 5) Jak to podzielic technicznie (branch/worktree/chat)

1. Stworz 4 worktree:

```bash
git worktree add ../wt-infra-db -b codex/infra-db
git worktree add ../wt-deploy-domain -b codex/deploy-domain
git worktree add ../wt-product-polish -b codex/product-polish
git worktree add ../wt-qa-reliability -b codex/qa-reliability
```

2. Dla kazdego worktree odpal osobny chat Codex, z `cwd` ustawionym na ten worktree.
3. Kazdy agent robi PR do `main` (lub do brancha integracyjnego `codex/release-live`).
4. Integracja:
  - najpierw `infra-db`,
  - potem `deploy-domain`,
  - potem `product-polish`,
  - na koniec `qa-reliability` jako gate release.

## 6) Definition of Done (live)

- `GET /api/health` zwraca `200`.
- Pierwszy user potrafi zalozyc konto na `/login`.
- Flow dnia konczy sie ustawionym `Next Move`.
- Review tydzien/miesiac/rok dziala na danych z check-inow.
- Produkcja odpowiada pod Twoja domena + SSL aktywny.
