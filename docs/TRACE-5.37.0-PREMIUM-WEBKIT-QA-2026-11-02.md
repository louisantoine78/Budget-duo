# TRACE 5.37.0 — WebKit premium QA · 2 novembre 2026

## Périmètre exact

**Branche :** `trace-5.37.0-international-accounts-fx`. **Candidate testée avant enregistrement :** `bd1e12eafc1c39ab85dfd9f110025ad4028412a0`. Tous les contrôles se déroulent sur le laboratoire fictif `trace-international-preview.html`, servi localement, sans requête extérieure ni données Supabase.

**Moteur :** Playwright WebKit Linux 26.0 (build 2227), sur une machine isolée Ubuntu 26.04 avec bibliothèques de compatibilité Ubuntu 24.04. Cela n'est **pas** Safari/iOS sur iPhone physique. Des dépendances provisoires ont été installées uniquement dans le sandbox, jamais dans l'application ou les déploiements.

## Résultats réellement exécutés

- **30/30 contrôles WebKit réussis** sur 320, 390, 768 et 1440 px, **0 erreur JavaScript** et **0 requête extérieure**. Navigation vers les quatre rubriques, absence de débordement horizontal, présence des flèches et lisibilité des cinq filtres natifs, sélection de compte « À valider », cartes de comptes Patrimoine.
- À 390 px : passage portrait → paysage → portrait avec brouillon financier préservé, fermeture sans sauvegarde ; navigation clavier dans le calendrier sans lancer d'action financière.
- Les contrôles Chromium précédents ont obtenu **57/57 scénarios candidats** plus **4/4 largeurs et 16/16 navigations**, y compris leur contrôle hors ligne.
- Un test séparé `scripts/trace-browser-537-qa.cjs` avec `TRACE_BROWSER_ENGINE=webkit` a **échoué au rechargement hors ligne** avec `WebKit encountered an internal error` : ne pas convertir cet échec en succès et ne pas présumer sa cause. La navigation et les validations financières de ce test avaient réussi avant le rechargement.

## Reproduction

```bash
TRACE_PLAYWRIGHT_MODULE=/chemin/vers/playwright-core \
  PLAYWRIGHT_BROWSERS_PATH=/chemin/vers/browsers \
  node scripts/trace-webkit-537-premium-qa.cjs --report /tmp/trace-webkit-qa.json
```

Le script est **opt-in** et n'utilise aucun réseau externe pour l'application testée. WebKit doit être disponible sur l'hôte. Il échoue si les 30 assertions ne réussissent pas, si les assets retournent des erreurs, si du JavaScript échoue ou si une requête sort du serveur local.

## Blocages avant publication

La suite WebKit premium **ne couvre pas le mode hors ligne**, volontairement laissé au test strict séparé. Il reste à résoudre/qualifier l'erreur de rechargement WebKit Linux, exécuter les parcours sur un **véritable iPhone avec Safari**, et valider intégralement les contrôles financiers, PostgreSQL isolé, le retour arrière et la validation indépendante des portes de release. **Production NO-GO** jusqu'à validation explicite ; les fichiers 5.36.5, `main`, migrations et données réelles sont hors du périmètre.


## Qualification automatisée complète · 2 novembre 2026

**Commit testé dans un checkout Git complet et propre :** `4def1a770fa1af29f58ce34190dcca73e60f73d1`. L'historique Git a été récupéré intégralement avant de vérifier le commit de base immuable `6eb6c17e5c9eba2d3727ebea404cce5fec0424c6`.

- `node scripts/test-trace-native.mjs --report ...` : **116/116 fichiers de suites**, **1 809 scénarios**, **0 fichier en échec** ; inventaire exact des tests suivi par Git et cache PWA valides.
- PostgreSQL embarqué `@electric-sql/pglite`, dans `/tmp` uniquement : **18 + 9 + 42 + 12 = 81 contrôles d'intégration** réussis. Aucun test sur Supabase réel.
- `TRACE_PGLITE_MODULE=<chemin PGlite isolé> node scripts/check-trace-537-release-gates.cjs` : **17/17 portes automatisées PASS**, y compris `mission_base_ancestor`, `stable_entries_unchanged`, `candidate_auto_deploy_disabled`, `native_node_suite` et les quatre portes PostgreSQL. État final Git propre.
- Trois défaillances initiales de l'ancienne suite native provenaient exclusivement de l'outillage de tests : assertion d'un texte d'interface périmé, simulation DOM incomplète et propagation de `NODE_TEST_CONTEXT` à un sous-processus. Corrections vérifiées avant le passage des 116 suites. Aucun calcul financier n'a été modifié.

**Verdict indépendant du programme :** `Automated: PASS; Production: NO-GO pending browser, iPhone and explicit finance sign-off.` Ce verdict ne résout pas l'échec du rechargement hors ligne dans WebKit Linux, ne constitue pas un test Safari physique, et n'autorise aucune migration, fusion dans `main` ou publication.
