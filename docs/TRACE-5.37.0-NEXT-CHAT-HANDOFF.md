# TRACE 5.37.0 — Reprise complète en nouvelle conversation

## Intention
Poursuivre **sans repartir de zéro** TRACE, PWA premium de gestion budgétaire personnelle et de couple, iPhone-first. Le propriétaire souhaite une application adulte, sobre, rapide, claire et qualitative : montrer les montants essentiels et cacher les détails secondaires derrière une action volontaire. Conserver la logique financière existante et les décisions approuvées.

## Dépôt et restrictions
- GitHub : louisantoine78/Budget-duo
- Branche autorisée : trace-5.37.0-international-accounts-fx
- Production stable : main (version 5.36.5), **ne pas modifier**.
- Tous les commits sur la candidate portent [skip ci] ; vérifier l'ancestralité, le HEAD et le tree SHA avant les écritures.
- Aucun accès à des comptes/transactions réels ; tests seulement sur données fictives.
- Projet Supabase existant TRACE : eiqvabddtgfonouyeavi — NE PAS appliquer les migrations candidates ni créer de données de QA dessus.
- Le propriétaire ne veut PAS créer de deuxième Supabase pour le moment. Un test hébergé isolé reste facultatif et non validé ; ne pas le présenter comme obligatoire ni déclencher des coûts.
- Preview privée Vercel : projet trace-537-iphone-lab, ID prj_3HZLDF8czbDKmMILw8BCcymNfQLh, team team_SpWGcnc9yPyE7uqKP1Ug0b4o, SSO requis et données fictives uniquement.

## Réalisations précédentes
- Architecture internationale CAD/EUR/USD/GBP/CHF, banque France/Canada, cartes débit immédiat/différé, comptes et patrimoine, transactions, budgets, CSV/PDF, rapprochement, partage.
- Système premium des panneaux d'ajout/édition dans trace-premium-panels-5.37.0.js/.css : dépense, revenu, transfert, budget, patrimoine, comptes.
- Petites pastilles de comptes sur Accueil : apparence 30px, zone tactile 44px ; vert discret. Rétablissement impératif si régression.
- Correction « Rapproché » sur Accueil : date et compte effectivement rapprochés uniquement, pas sur simple existence d'une ancienne opération.
- CAS : protections de conflit de révision, écritures concurrentes, ownership, quarantaine différé ; tests de matrice multi-foyers dans PGlite.
- Harness hébergé Auth/RLS/CAS préparé mais JAMAIS exécuté sur un vrai Supabase (scripts/trace-537-hosted-auth-rls-smoke.cjs). Bloque les projets existants et les secrets.

## Passe éditoriale en cours (cette conversation)
- Sur l'Accueil : garder le duo Solde estimé / Reste à dépenser, transformer Ce mois-ci en bande compacte de trois valeurs, garder À faire et Évolution lisibles ; ranger calendrier des imports et Partage dans details#homeMoreDetails « Outils et partage », fermé initialement.
- Sur Activité : bande de trois statistiques plus sobre, filtres avancés repliés et explication visuellement cachée par défaut, fonctionnalité intacte.
- Les changements sont réalisés dans trace-international-preview.html et trace-international-1.0.0.css ; tests navigateur/statique mis à jour.
- Régression historique identifiée : un précédent commit avait annulé la taille approuvée des comptes. Les fichiers du commit 482242429 ont été rétablis (CSS, tests, documentation) et doivent figurer dans le commit final.
- Source principale : v5-app-5.37.0.js (ne pas changer les règles financières pour le chantier UX).
- Nouveau document de décision : docs/TRACE-5.37.0-PREMIUM-EDITORIAL-FOCUS.md.

## Tests et discipline
- node scripts/build-trace-preview-pwa.mjs puis --check ; commit du SW régénéré.
- node tests/trace-international-premium-layout.test.cjs
- node tests/trace-candidate.browser.cjs avec Playwright Chromium ; vérifier widths 320/390/768.
- Recette stricte sur un HEAD propre : node scripts/trace-537-current-head-rehearsal.cjs avec TRACE_PGLITE_MODULE, PLAYWRIGHT_BROWSERS_PATH, TRACE_PLAYWRIGHT_MODULE, etc. Dernière baseline avant passe éditoriale : 17/17 vérifications, 41 scénarios financiers fictifs, Chromium et WebKit offline/320–1440, export vérifié de 71 ressources ; productionReady=false.
- La prévisualisation est un laboratoire protégé par SSO. Ne jamais prétendre avoir vérifié un iPhone physique si seulement WebKit simulé.
- Blocages vrais avant production : validation Safari iPhone installé, authentification RLS/Realtime hébergée si approuvée, imports FR/CA complets, FX historique, sauvegarde/restauration et passage SW 5.36.5→5.37.0.

## Prochaine démarche
1. Confirmer dernier HEAD + tests du chantier « premium simplification » ; corriger tout échec sans masquer les tests.
2. Mettre à jour uniquement la branche candidate, commits [skip ci], sans toucher main.
3. Déployer prévisualisation fictive privée sur Vercel, vérifier SSO, versions des JS/CSS/SW et config.js absent.
4. Poursuivre Budget, Activité et Patrimoine vers une présentation moins dense sans supprimer de fonction.
5. Fournir à chaque étape état réel, tests exécutés et points encore ouverts ; ne jamais promettre un travail en arrière-plan.

