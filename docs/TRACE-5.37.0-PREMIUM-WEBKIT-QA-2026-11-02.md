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

La suite WebKit premium **ne couvre pas le mode hors ligne**, volontairement laissé au test strict séparé. Il reste à résoudre/qualifier l'erreur de rechargement WebKit Linux, exécuter les parcours sur un **véritable iPhone avec Safari**, et valider intégralement les contrôles financiers, PostgreSQL isolé, le retour arrière et la porte de release `mission_base_ancestor`. **Production NO-GO** jusqu'à validation explicite ; les fichiers 5.36.5, `main`, migrations et données réelles sont hors du périmètre.
