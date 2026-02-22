# PatternFinder Project Plan

## Product Direction
- Web MVP single-user, bez logowania i bez PIN.
- Fokus: szybkie dzienne check-iny + raporty wzorcow + grywalizacja.
- Pozycjonowanie: cockpit samoregulacji dla Performance Builder.

## Design Direction
- Theme: `pf-premium`.
- Archetyp: Sage 50 / Ruler 20 / Hero 20 / Creator 10.
- Ton: spokojny, konkretny, premium.
- Key visual: topograficzne fale energii.

## Scope
- Setup aktywnosci (starter packi + custom).
- Daily check-in (mood, energy, aktywnosci, journal).
- Raporty tygodniowe i miesieczne z hipotezami (nie przyczynowosc).
- Grywalizacja (streak, badge, level, leaderboard osobisty).
- PWA i offline queue.

## Design System Assets
- `src/design/tokens.css`
- `src/design/semantic.css`
- `src/components/ui/*`
- `docs/brand-foundation.md`
- `docs/design-system.md`

## Infra
- Next.js + Prisma + Supabase Postgres + Vercel.
- Wymagane ENV: `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`.
