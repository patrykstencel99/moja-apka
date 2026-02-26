# Samouczek Intuicja (v1) - rollout i monitoring

## Zakres
- Tutorial key: `intuicja_core`
- Wersja: `TUTORIAL_VERSION` (v1 = `1`)
- Core flow: `Today -> Systems -> Review`
- Stan i eventy trzymane w tabelach: `TutorialProgress`, `TutorialEvent`

## Flagi
- `NEXT_PUBLIC_TUTORIAL_ENABLED`
- `TUTORIAL_ROLLOUT_PERCENT`
- `TUTORIAL_VERSION`

Przyklad stage rollout:
1. Stage 0: `NEXT_PUBLIC_TUTORIAL_ENABLED=true`, `TUTORIAL_ROLLOUT_PERCENT=0`
2. Stage 1: `TUTORIAL_ROLLOUT_PERCENT=10`
3. Stage 2: `TUTORIAL_ROLLOUT_PERCENT=50`
4. Stage 3: `TUTORIAL_ROLLOUT_PERCENT=100`

## Endpointy
- `GET /api/tutorial/state`
- `POST /api/tutorial/start`
- `POST /api/tutorial/step-complete`
- `POST /api/tutorial/skip`
- `POST /api/tutorial/complete`
- `POST /api/tutorial/restart`

## Monitoring
Dzienny funnel lokalnie:

```bash
npm run tutorial:funnel -- 14
```

Raport pokazuje per dzien i wersje:
- started
- shown
- stepCompleted
- skipped
- completed
- restarted
- completionRate

## Manual QA przed podniesieniem rollout
1. Nowe konto: autostart na `/today` po login/register.
2. Przejscie core: check-in -> aktywacja systemu -> review loaded -> complete.
3. Global skip i wznowienie przez restart w `/settings`.
4. Brak blokowania akcji UI przy aktywnym companion.
5. Zachowanie po odswiezeniu strony (stan z DB + cache).
