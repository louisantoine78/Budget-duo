# TRACE 5.37.0 — Financial handoff (26 October 2026)

Branch: `trace-5.37.0-international-accounts-fx`. Code HEAD: `3e53b880dc1ae6355cd3f41e386458f5502fe11d`. Stable main was `02c70f50e7e51da79b77a91dde96a03c6c719909`. Recheck both before work.

## Implemented
- `385c4080`: card repayment edit requires equal checking debit/card credit in native cents, zero fee; normal checking transfers still accept documented fees.
- `1a0c3de5`: already-confirmed inconsistent card payment blocks derived checking and card balances and produces read-only account-detail warning. Later verified reconciliation anchors remain valid. No historical rewrite.
- `3e53b880`: preserves legacy isolated account-ledger tests without a full account catalog, while explicit unresolved card repayment remains untrusted.

## Qualified, with clear limits
215/215 simulated-V8 regression scenarios after those commits: Activity 18; account detail 39; money/FX 37; CAD legacy ledger 45; bank/investments 21; Mastercard/friends 19; financial guard 19; international native-form 17. Application JavaScript parses.
These were NOT a full native Node checkout, real PostgreSQL/PGlite SQL test, or iPhone Safari test.

## Unresolved release blockers
No local PGlite/PostgreSQL package, no complete checkout and no GitHub DNS access from the container. Four PostgreSQL suites of migrations 05-12 have NOT been run. Migration 12 has NOT been applied. Required next: isolated fictional PG qualification, native Node suite, iPhone Safari/PWA, FX/couple, PDF/CSV/OCR, premium UX, restore/rollback and explicit human production authorization.

Production NO-GO. Estimated readiness remains approximately 58% ±10 points. Never change main, deploy, run GitHub Actions, or write real Supabase data. All commits must include `[skip ci]`.
