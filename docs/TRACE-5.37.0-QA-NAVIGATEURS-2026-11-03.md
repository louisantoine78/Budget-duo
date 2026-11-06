# TRACE 5.37.0 — Qualification navigateur et SQL, 3 novembre 2026

## Périmètre reproductible
- Dépôt : louisantoine78/Budget-duo, branche trace-5.37.0-international-accounts-fx.
- Code de l'application réellement testé : 4308940a358b9dfb0d2823d583108fb899793d02.
- Sandbox Vercel isolé : clone exact de ce commit, aucune donnée personnelle, aucune configuration Supabase, aucune opération de production.
- Le service worker du seul laboratoire a été régénéré par `node scripts/build-trace-preview-pwa.mjs` et vérifié avec `--check`. Le laboratoire exporté comprenait 72 fichiers fictifs.
- Les scripts navigateur avaient été adaptés dans le sandbox pour remplacer des assertions périmées sur des pastilles cachées par de vrais contrôles des listes natives, puis sont enregistrés avec ce rapport.

## Exécutions effectives
- PostgreSQL/PGlite fictif : les quatre suites `trace-database.integration`, `trace-personal-settings-ownership.integration`, `trace-cas-writes.integration`, `trace-cas-exclusive-cutover.integration` ont réussi, code de sortie 0. Aucune base hébergée n'a été jointe.
- Chromium PWA `scripts/trace-browser-537-qa.cjs` : PASS à 320/390/768/1440 px, 16 transitions, refus du débit différé, importations/budget fictifs, rechargement PWA hors ligne à 390 px et accès à Activité ; erreurs 0.
- WebKit Linux PWA, même commande avec `TRACE_BROWSER_ENGINE=webkit` : premier essai arrêté sur un délai tactile `locator.tap` à 320 px ; second essai PASS à 320/390/768/1440 px, 16 transitions, recharge hors ligne 390 px et erreurs 0. Ce premier délai ne doit pas être effacé du suivi.
- `scripts/trace-webkit-537-premium-qa.cjs` : 30/30 contrôles PASS, 0 erreur JavaScript, 0 requête extérieure, 4 tailles d'écran. Ce test premium ne teste pas le hors-ligne.
- `tests/trace-candidate.browser.cjs` : **64 scénarios financiers Chromium PASS**, incluant comptes CAD/EUR, FX fictif, dépenses, partages, cartes, virements, épargne, import CSV, PDF hors ligne et contrôle des doublons.
- `tests/trace-manual-native-deferred-release.test.cjs` : 3/3 assertions PASS sur le code de protection différée et le DOM natif.
- Les anciennes assertions invalides étaient liées à un changement voulu du formulaire (native selects plutôt que pastilles), à un champ montant bancaire désormais secondaire et à la casse des titres. L'ordre du refus différé a été corrigé dans le code de l'app ; les assertions vérifient désormais le comportement réel.

## Restent bloquants — production NO-GO
1. Rejouer la qualification complète exacte sur le nouveau commit et figer l'empreinte du candidat.
2. Recette iPhone physique Safari : saisie, clavier, VoiceOver, rotation, installation et suspension/réveil de PWA.
3. Auth/RLS/PostgREST et CAS contre un **nouveau projet Supabase QA fictif**, avec consentement aux éventuels coûts. Aucun hosted smoke n'a été fait ici.
4. Validation des taux quotidiens réels Banque du Canada de bout en bout (le laboratoire ne contient que des cours fictifs).
5. Sauvegarde cohérente des données réelles, restauration isolée/rollback et migration 5.36.5 → 5.37.0.
6. Accord explicite de déploiement ; jamais de fusion automatique vers main.

La réussite de Chromium et WebKit Linux ne signifie pas Safari sur un véritable iPhone.
