# Agent Orchestration (Builder / Reviewer / Integrator)

## Co to sa artefakty

W tym workflow "artefakty" to pliki w repo, ktore zostawia kazdy agent po swojej pracy:

- status zadania (`docs/agent-status/<task-id>.md`)
- diff/commit na branchu zadaniowym
- checklista gate (`qa:full`, review findings, decyzja merge)

To nie sa Codex Skills ani Codex Automations.

## Skills vs Automations vs Artefakty

- Skills: reusable instrukcje/kompetencje agenta (meta-poziom).
- Automations: harmonogram uruchamiania zadan (czas, cyklicznosc).
- Artefakty: konkretne outputy dla jednego zadania, zapisywane w repo/PR.

## Architektura pracy

1. Builder
- startuje z aktualnego `main`
- robi implementacje na branchu `codex/feat-<task-id>`
- uruchamia `npm run qa:full`
- uzupelnia `docs/agent-status/<task-id>.md`

2. Reviewer
- czyta diff i status
- robi code review (bugs, regresje, brak testow)
- aktualizuje sekcje `Reviewer` w statusie

3. Integrator
- sprawdza bramki
- merge tylko gdy: brak blockerow, zielone `qa:full`
- merge przez `--ff-only` lub PR squash po zielonym CI

## Twarde bramki merge

- `npm run qa:full` = PASS
- brak otwartych findingow P1/P0
- status zadania ma `Decision: READY`

## Minimalne komendy

```bash
git switch main
git pull --ff-only
git switch -c codex/feat-<task-id>
npm run qa:full
```

```bash
git switch main
git pull --ff-only
git merge --ff-only origin/codex/feat-<task-id>
npm run qa:full
git push origin main
```

## Konwencja task-id

Uzywaj formatu:

- `yyyy-mm-dd-<short-topic>`
- przyklad: `2026-02-26-systems-loading-states`
