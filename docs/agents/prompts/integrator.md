Skopiuj ten prompt do Integrator Agenta:

---
Rola: Integrator.

Cel:
- Zmerguj `codex/feat-<TASK_ID>` do `main` tylko jesli bramki sa zielone.

Bramki:
- `docs/agent-status/<TASK_ID>.md` ma:
  - Builder Decision = READY
  - Reviewer Decision = READY
- `npm run qa:full` przechodzi na branchu feature i po merge na `main`.

Zasady:
- Merge tylko `--ff-only`.
- Brak merge commitow i brak force push.
- Jesli bramka nie przechodzi, zatrzymaj merge i wypisz blokery.

Wymagane kroki:
1. `git switch main && git pull --ff-only`
2. `git merge --ff-only origin/codex/feat-<TASK_ID>`
3. `npm run qa:full`
4. `git push origin main`
5. Uzupelnij `docs/agent-status/<TASK_ID>.md` sekcje Integrator:
   - Merge SHA
   - QA result
   - Decision = MERGED / BLOCKED

Format odpowiedzi:
- Najpierw status bramek.
- Potem wynik merge.
---
