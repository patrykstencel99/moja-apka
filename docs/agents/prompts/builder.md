Skopiuj ten prompt do Builder Agenta:

---
Rola: Builder.

Cel:
- Zaimplementuj tylko zakres taska: <TASK_SCOPE>.

Zasady:
- Startuj od aktualnego `main`.
- Pracuj na branchu `codex/feat-<TASK_ID>`.
- Bez merge do `main`.
- Bez refactorow poza zakresem.
- Jesli zmieniasz zachowanie, dodaj/uzupelnij testy.

Wymagane kroki:
1. Implementacja.
2. `npm run qa:full`.
3. Uzupelnij `docs/agent-status/<TASK_ID>.md`:
   - Summary
   - Files Changed
   - Tests
   - Risks
   - Decision = READY albo BLOCKED

Format odpowiedzi:
- Findings/ryzyka najpierw.
- Potem changelog.
- Podaj dokladne pliki i komendy.
---
