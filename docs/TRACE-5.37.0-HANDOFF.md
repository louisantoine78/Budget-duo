## Reprise technique suivante — robustesse des catégories, sécurité RPC, contrôle CSV (24 octobre 2026)

**NO-GO.** Aucune modification de `main`, aucun déploiement et aucune lecture/écriture des données Supabase réelles. Le conteneur disponible possède Node 22 mais **aucun checkout GitHub ni résolution réseau fonctionnelle**, et PGlite/PostgreSQL serveur ne sont pas installés : les deux tests d'intégration SQL restent **non exécutés**. Les essais ont été réalisés sur le code extrait de la branche avec transports fictifs sous V8 via le connecteur GitHub (ni CLI Node natif, ni navigateur, ni PostgreSQL réel).

### Correctifs effectivement commités sur la branche internationale

1. **Reprise sans écrasement des catégories de départ :** `v5-app-5.37.0.js` vérifie d'abord les IDs existants, n'exécute que des créations `CAS` manquantes, respecte un ID créé concurremment par l'autre membre après vérification de son existence et recharge les révisions dans `traceDocRevisions`. Le bouton « Ajouter les catégories de départ manquantes » apparaît en cas de catalogue incomplet même si des catégories ou budgets existent ; action humaine et ajout seulement, jamais remise à zéro ni écrasement de catégorie renommée/archivée. Test `tests/trace-cas-category-bootstrap.test.cjs` : **8/8 scénarios réussis sous V8 avec fausse base**, dont interruption/reprise, concurrence et budget conservé.
2. **Limites serveur des RPC :** `migrations/09-trace-cas-versioned-writes.sql` refuse des collections hors des neuf familles utilisées par la candidate, refuse les suppressions physiques de comptes bancaires, patrimoine, rapprochements, importations et suivis de journées ; seules catégories, budgets, transactions et opérations d'investissement disposent de suppression conditionnée à leur révision. `tests/trace-cas-writes.integration.cjs` contient désormais **12 cas** couvrant aussi ces gardes ; **les tests SQL n'ont pas été exécutés**, et aucune migration n'a été appliquée.
3. **CSV étrangers déjà datés/ambiguës :** validation simplifiée seulement si montant original, devise d'achat et devise bancaire sont cohérents, `amountCAD` encore `null` et aucune contre-valeur FX préexistante. Refus des taux/courants contradictoires au lieu d'inventer une nouvelle conversion. `tests/trace-international-foreign-csv-confirm.test.cjs` passe à **12/12 scénarios V8 fictifs réussis** ; il faut encore jouer ce fichier avec la CLI Node et Chromium.

Commits : `b6ec63e44fb8ef161568c3a874ab25cb170e7f59`, `ce18d6970e3c2b8369fb84f01c73005b92685841`, `2195998dedb23a6ab4cb5590c8379e2278b5fb22`, `7e62e828688bc3aa75435363f7819f2bdc3b3a74`, `e31a52bc0210edbf78eeb6536707ac60d72b5124`, `f6100912b92bc79bb6dd56a168779ab9cad28a29`, `e32f274d44d25ed450b06439ab6604ede14ef629`, `2ecfb56643391ce4c4a7001d3f07166b3960b209`.

**Attention :** les quatre changements de `v5-app-5.37.0.js` depuis l'ancienne qualification invalident toujours le cache laboratoire. Il faut **régénérer** `trace-international-preview-sw.js` avec `node scripts/build-trace-preview-pwa.mjs` sur un checkout complet, puis lancer `--check`. Ne jamais modifier ce fichier généré à la main ni déployer.

### Suite prioritaire

Obtenir un checkout fictif isolé et exécuter réellement les tests Node et migrations 07/08/09 en PostgreSQL, puis corriger les défauts détectés. Requalifier le laboratoire Chromium/Safari et cache SW. Tester Auth/RLS/PostgREST/Reatime fictifs et concurrence multi-membres, protéger les écritures directes par une transition planifiée avec 5.36.5, sécuriser les autres natures internationales (carte, virements, remboursement), débit différé, FX Couple/personnel. Pas de GO sans sauvegarde/restore/rollback et recette Safari réelle.

---

## Lot suivant — validation ciblée des dépenses CSV étrangères (24 octobre 2026)

Code **présent dans la candidate uniquement**, pas en production. `v5-app-5.37.0.js` propose désormais une fiche de **validation humaine d'une dépense CSV simple** pour un compte étranger CAD≠devise. Le montant bancaire, la date et le compte ne sont pas modifiables dans cette fiche. Le membre sélectionne explicitement catégorie, attribution Moi/Partenaire/Couple et confirme la nature de dépense. Un taux CAD daté et sourcé est exigé, soit Banque du Canada Valet historique disponible, soit taux manuel clairement identifié ; jamais de taux 1 fictif. Les lignes ressemblant à des transactions déjà confirmées nécessitent une reconnaissance explicite et les nouvelles ressemblances bloquent si elles apparaissent pendant la revue. En cas d'échec CAS, la ligne reste `pending`.

**Nature bloquée :** les libellés de paiement de carte, virement Interac ou autres libellés ambigus sont refusés par `TraceImportGuide.safeForQuickApproval`. Les remboursements, virements, achats multi-jambes, allocations Proches et imports hors CSV étrangers restent à finaliser séparément. Ne pas déclarer l'import étranger complet.

Tests de la fonction réelle sur les fixtures fictives : **7/7 scénarios V8** avec vrai moteur `TraceInternational.resolveBooking` et transport/DOM simulés. Le fichier de test `tests/trace-international-foreign-csv-confirm.test.cjs` a été commité ; son code a été exécuté sous V8 avec modules Node simulés : **9/9 scénarios réussis**, dont 40 EUR → 64 CAD avec 1,60 CAD/EUR, date/source conservées, refus sans confirmation/taux, échec serveur sans mutation, comparaison de doublons et rejet « Virement Interac ». Le véritable référentiel `TraceMovement` et le guide `TraceImportGuide` ont été chargés séparément et vérifiés pour cette distinction. **Ni tests Node natifs ni tests Chromium/Safari réexécutés après ce lot.**

Commits : `2651903f81ed001f345767e13abfdd215277096e` (UI de validation), `630fcbd72b23e7afa3488065ba8df81d5e1d6408` (test), `d736cafb3a92d1dca1589c7bb3beee3a3d0b3ca1` (garde contre virements), `1a49264f5cc818ebe06eaa1b2ccd84385bd7ef7e` (test de garde).

**NO-GO maintenu.** Toutes les limites d'intégration PostgreSQL, droits CAS, Safari et cache laboratoire indiquées plus bas restent ouvertes. L'actif `v5-app-5.37.0.js` a encore changé ; le SW fictif doit être régénéré sur checkout local avant tout test hors ligne.

---

## Reprise du 24 octobre — lot client versionné (plus récent que le premier bloc ci-dessous)

**Risque STALE-WRITE toujours bloquant pour la sortie.** Le vrai client de la **candidate 5.37.0** est désormais raccordé aux RPC de migration 09 mais ni les migrations ni les RPC ne sont déployées dans un environnement hébergé. La branche `main`, les entrées 5.36.5, les workflows et les données Supabase réelles restent inchangés.

- `v5-app-5.37.0.js` : la lecture initiale récupère `documents.revision` et `households.settings_revision` et refuse un index incomplet ; `saveDocument`, `saveHouseholdSettings`, `removeDocument` et l'initialisation des catégories appellent les RPC CAS. Les écritures identiques d'un même navigateur sont sérialisées par ressource. Lors d'un `TRACE_WRITE_CONFLICT`, les écritures suivantes sont bloquées et un panneau accessible invite à copier les saisies non enregistrées avant un rechargement avec confirmation. Le mode laboratoire sans réseau conserve ses écritures en mémoire uniquement.
- `trace-international-1.0.0.css` : alerte de conflit au-dessus de la navigation, utilisable sur petite largeur iPhone.
- `tests/trace-cas-client.test.cjs` : huit tests de contrat client, y compris concurrent local, conflit externe, suppression CAS, réglages versionnés et démo fictive. Leur logique **a été exécutée dans un harnais V8 avec modules Node et RPC fictifs : 8/8 réussis**, **pas en Node CLI**. La syntaxe JavaScript du client et du fichier de test a été vérifiée dans V8. Les 6 scénarios préalables exécutés depuis les fonctions réelles extraites ont aussi réussi contre un serveur simulé.
- Commits supplémentaires : `2327041d12c0ac76b8ae7f639ddcb7894dc24847` (raccordement client), `121ab4fee2cfc1c2d4f9ff5d406df6aad2f0c8e6` (UI conflit), `601254894bad63dfd60d94bd95c99ef09c6c125b` (tests), `dd278839774b4aaf3bf75f9895e70e269dbc74b0` (réglages sérialisés), `34841ad0619ed5f407e2afdd96782ae4d29e1b85` (test de régression).

**Limite nouvelle à corriger avant navigation hors ligne :** le JS et CSS du laboratoire ont changé, mais le SW généré `trace-international-preview-sw.js` conserve l'ancienne empreinte d'actifs, car cet environnement ne dispose pas d'un checkout complet et l'accès GitHub ne permet pas de reconstruire l'ensemble du cache de façon sûre. Le script `node scripts/build-trace-preview-pwa.mjs --check` doit donc **échouer tant que** `node scripts/build-trace-preview-pwa.mjs` n'a pas été exécuté sur un checkout local ; ne pas déclarer le laboratoire hors ligne qualifié sur le nouveau code. Aucune modification manuelle du SW ni déploiement.

**Ordre de reprise obligatoire :** (1) installer les dépendances de test hors du dépôt dans un environnement isolé ; lancer les deux tests SQL 08/09 avec PGlite et le test client Node natif ; corriger les anomalies réelles ; (2) régénérer et tester le SW laboratoire après toute correction JS/CSS ; (3) qualifier la migration 07/08/09 et le client avec Auth/PostgREST/Realtime fictifs à deux comptes, sans aucune donnée réelle ; (4) verrouiller les anciens droits d'écriture directe lors d'un cutover compatible 5.36.5 ; (5) fermer les imports étrangers et débit différé puis vraie recette Safari iPhone ; (6) requalifier les scripts QA et vérifier le plan de sauvegarde/rollback avant toute demande de GO.

Les 911 scénarios Node, 32 Chromium, 17 SQL fictifs et 8 Valet restent des **résultats historiques antérieurs à ce lot**. Rien dans ce travail ne les rejoue ni ne qualifie la mise en production.

---

## Mise à jour de reprise — sécurisation des écritures (24 octobre 2026, suite)

**Candidat NO-GO.** Cette section est plus récente que le bilan initial ci-dessous ; aucun changement à `main`, aucun déploiement, aucune lecture ou écriture Supabase hébergée. Commits exclusivement sur `trace-5.37.0-international-accounts-fx`, tous `[skip ci]`.

### Nouveaux fichiers de code et commits vérifiés

- `migrations/08-trace-personal-settings-owner-guard.sql` : trigger PostgreSQL défensif sur `households.settings` pour les trois cartes de soldes d'ouverture par compte, `primaryBankAccountByOwner` et `memberNicknames` ; contrôle de l'appartenance réelle via `auth.uid()` et propriétaire de `documents/accounts`. Empêche une mutation des clés personnelles de l'autre membre, y compris via un appel `SECURITY DEFINER` dont le JWT reste présent. Préserve les clés de répartition partagées. **La couverture n'est pas exhaustive sur tous les champs de settings** : auditer toute nouvelle préférence personnelle avant sortie.
- `migrations/09-trace-cas-versioned-writes.sql` : colonnes `documents.revision` et `households.settings_revision`, incrémentées par triggers serveur. RPC `trace_cas_save_document`, `trace_cas_delete_document`, `trace_cas_save_household_settings` avec comparaison de révision atomique, ID contrôlés, test d'appartenance et d'ownership explicites, `search_path` restreint et accès anonyme révoqué. Insertion `ON CONFLICT DO NOTHING` : une ligne existante n'est jamais remplacée comme une nouvelle création.
- `tests/trace-personal-settings-ownership.integration.cjs` et `tests/trace-cas-writes.integration.cjs` : scénarios de base PostgreSQL fictive prévus pour interdiction de l'écriture de l'autre, mutations personnelles autorisées, réglages partagés, doublon d'ID, écriture cliente périmée, conflit de suppression et restauration des versions.
- Commits (ordre) : `01c4b0c3e4a9f3918186fade66d7bbce837c3b79`, `b5b10258efe6e72d3ef26a61c76a76ea27b87ce8`, `4d41046848bcef158114d64eaf2ed1fd3e71864a`, `e6dd3069f6083b880bd509261ad6aac047630712`, `7cfce86bbf494ec971950fef9fdcf1fa4d0bc0cb`, `c558e9db04afe9e9d0c0c3ebc82b22a4ce97b2e8`.

### Niveau de preuve — NE PAS CONFONDRE

- **Présence du code : oui**, fichiers récupérés à nouveau sur GitHub.
- **Contrôles statiques exécutés : 26 / 26 réussis** dans un runtime JavaScript V8, dont compilation syntaxique des deux nouveaux tests. Cela ne valide ni leur exécution Node, ni SQL, ni les triggers.
- **Tests d'intégration PostgreSQL des nouvelles migrations : NON EXÉCUTÉS** pendant cette reprise : le conteneur ne dispose ni de PGlite, ni de la copie du dépôt et l'accès GitHub est uniquement via le connecteur. Scripts exécutables sur un checkout isolé disposant de `@electric-sql/pglite@0.4.5` :
  `TRACE_PGLITE_MODULE=/chemin/pglite node tests/trace-personal-settings-ownership.integration.cjs`
  et `TRACE_PGLITE_MODULE=/chemin/pglite node tests/trace-cas-writes.integration.cjs`.
- **Chromium/Safari/Cloud sur les nouveaux commits : non exécutés**. Les résultats historiques (911 scénarios Node, 32 Chromium, 17 SQL fictifs) décrits ci-dessous ne constituent pas des tests de ces migrations.
- **Aucun SQL de migration appliqué**, ni à la production ni à un environnement Supabase hébergé.

### Séquence impérative avant fermeture des risques

1. Qualifier 08/09 en PostgreSQL fictif avec deux sessions, owner/partner/anon/étranger, migration idempotente et refus de mutation sur compte de l'autre.
2. **Raccorder le vrai client 5.37.0** à la lecture des deux compteurs de révision, aux RPC, à la reprise explicite des conflits, aux mises à jour hors ligne et à la suppression conditionnelle ; garantir la compatibilité de toutes les procédures d'import, édition et création de foyer.
3. Après validation et plan de transition clients 5.36.5, supprimer les privilèges d'écriture directe qui permettent aujourd'hui de contourner les RPC. La migration 09 **ne les retire pas volontairement** et ne ferme donc pas seule `STALE-WRITE`.
4. Vérifier en Supabase **fictif et explicitement autorisé** les RPC exposées, les politiques RLS, le comportement HTTP PostgREST, Auth, Realtime et deux clients simultanés. Aucun test PGlite ne démontre ces propriétés hébergées.
5. Avant toute publication : recette Safari iPhone, validation des imports étrangers, débit différé, référence budgétaire personnelle/Couple, sauvegarde réelle autorisée et restauration isolée, procédure de rollback sans perte d'écritures FX, et décision explicite GO/NO-GO.

Les anciens rapports de qualification doivent être rejoués après le futur raccordement UI. **Ne pas présenter le SQL candidat comme un correctif en production.**

---

# TRACE 5.37.0 International — reprise opérationnelle

État de la mission du 24 octobre 2026. **NO-GO production.** Le développement et la qualification locale ont avancé ; les barrières financières et iPhone ci-dessous restent ouvertes. Lire ce résumé avant les chronologies anciennes. Ne pas reprendre la conception.

## Git et périmètre autorisé

- Dépôt `louisantoine78/Budget-duo`, seule branche modifiable : `trace-5.37.0-international-accounts-fx`.
- HEAD initial de mission vérifié sur GitHub : `6eb6c17e5c9eba2d3727ebea404cce5fec0424c6`.
- Dernier lot de code : `94c613cd4e1c547a38671083c1da773967bded70`. Le commit documentaire suivant ne peut pas contenir sa propre SHA : résoudre le HEAD réel.
- `main` vérifiée à nouveau : `02c70f50e7e51da79b77a91dde96a03c6c719909`, stable 5.36.5.
- `index.html`, `sw.js`, `manifest.webmanifest`, `trace-version.json`, `v5-app-5.36.5.js` et `.github/` inchangés depuis le début de mission. Déploiement automatique de la candidate désactivé par `vercel.json`.
- Commits `[skip ci]`. Aucune PR, fusion, exécution Actions, réactivation PickPoint ou livraison Vercel. Aucun accès aux données financières Supabase réelles, aucune ressource externe créée.
- Le laboratoire `trace-international-preview.html` utilise exclusivement des fixtures, une CSP `connect-src 'none'` et une sauvegarde mémoire perdue au rechargement. Son PWA ne constitue pas la PWA financière de production.
- L'utilisateur autorise l'enchaînement autonome des lots réversibles et des commits, sans nouvelle validation intermédiaire. Toute publication ou modification d'un environnement réel demande son autorisation explicite. Les anciennes consignes « une conversation = un seul lot » sont remplacées par cette mission.

## Livré dans la candidate et effectivement vérifié

1. Accueil : solde principal natif et carte liée, boutons de consultation distincts du principal officiel, confirmation du changement, accès comptes/détails/Activité. Les totaux incomplets restent inconnus. Ordre des sept blocs et cinq onglets conservés.
2. Budget : trois familles, anneau de consommation, pourcentage consommé distinct de la part des dépenses, dépassement, graphique prévu/réel compact, douze mois et liens de catégorie. Contraste de la carte Disponible réparé.
3. Comptes : création, nom/pays, devise verrouillée lorsqu'il existe un historique ou un solde, réassociation des cartes, archivage/réactivation sans suppression, historique filtrable des comptes archivés et consultation Couple en lecture seule dans l'interface.
4. Montants natifs et FX : centimes stricts, montants absents jamais convertis en zéro, devises des deux jambes vérifiées, taux datés et sourcés, frais de virement inclus sans deuxième dépense. Le formulaire premium conservait mal les champs internationaux : panne réelle corrigée dans le navigateur.
5. Épargne liée CAD/EUR/USD/GBP/CHF : ouvertures et mouvements natifs, dépôts/retraits neutres au budget, montants réellement reçus en cas de change, valorisation datée indicative et total incomplet si donnée manquante. CELI historique conservé.
6. PDF mensuel : véritables actifs locaux `pdfjs-dist@6.4.299`, licence Apache 2.0, intégrité npm/SHA-256, worker local sous CSP stricte ; fixtures FR/CA multipages et PDF raster. Propositions et lignes non interprétées visibles, revue humaine et comparaison sans écriture. Repli manuel maintenu.
7. CSV : toutes les propositions consultables, détails des opérations ressemblantes en devise du compte, lignes invalides visibles, achats identiques conservés, réimport identique idempotent, statut à vérifier sans effet financier.
8. PWA du laboratoire : manifeste et portée distincts, 62 actifs statiques en cache, rechargement complet et extraction PDF sans réseau dans Chromium ; aucun relevé utilisateur ni réponse Supabase en cache.
9. Sauvegarde : utilitaire JSON local avec inventaire, SHA-256 et refus d'écrasement ; restauration JSON et sauvegarde physique éprouvées dans deux instances PostgreSQL fictives.
10. Permissions : migration candidate 07 préparée et testée localement, protégeant les documents `accounts`/`investment_accounts` par propriétaire tout en conservant la lecture Couple. **Non appliquée sur Supabase.**

## Preuves actuelles, sans additionner les niveaux

| Niveau | Résultat réellement exécuté | Limite |
|---|---|---|
| Syntaxe Node | 46 fichiers | JavaScript uniquement |
| Suites natives | 54 fichiers, 911 scénarios rapportés, 0 échec ; dont suite historique 5.36.5 | Plusieurs tests utilisent encore des dépendances ou DOM simulés |
| Navigateur | 32 scénarios Chromium 153, vrais DOM/scripts/worker PDF et rechargement hors ligne | Données fictives en mémoire ; ni Safari ni persistance cloud |
| Base | 17 contrôles PGlite 0.4.5 / PostgreSQL 17.5 WASM | Auth fictive, transport HTTP remplacé, pas Supabase hébergé/Realtime |
| Source FX publique | 8 contrôles HTTPS Valet EUR/USD/GBP/CHF, jour ouvré et week-end historiques | Pas un taux actuel ni un test CORS Safari |
| Production | **Non qualifiée** | Aucun déploiement |

Rapports complets et empreintes : [`qa/TRACE-5.37.0-QUALIFICATION.json`](qa/TRACE-5.37.0-QUALIFICATION.json). Commandes, risques, recette iPhone et rollback : [`TRACE-5.37.0-WORK-VALIDATION.md`](TRACE-5.37.0-WORK-VALIDATION.md). Contrôle local : `node scripts/trace-release-preflight.mjs` ; sortie **2 attendue = NO-GO**, aucune action externe.

## Prochains lots prioritaires

1. **Écritures concurrentes et réglages personnels en base.** Reproduction locale : un membre peut encore modifier le solde d'ouverture du partenaire dans `households.settings` ; deux écritures de clients périmés perdent une modification. La migration 07 seule ne ferme pas ces failles. Protéger les clés personnelles et introduire une vérification atomique de version avec interface de conflit, en préservant les réglages et règlements partagés.
2. **Validation/édition internationale des imports.** Un CSV EUR est bien enregistré en attente, mais la fiche de validation étrangère reste bloquée ; ne pas annoncer un import étranger complet. Finaliser les natures carte/virement/remboursement et les répartitions natives/figées. Édition descriptive des dépenses étrangères confirmées déjà protégée.
3. **Débit différé intégré.** Simulateur, frais, remboursement et règlements partiels testés isolément ; pas branchés au journal persistant. La création `deferred` reste désactivée. Raccorder achat/date budgétaire/échéance/débits/allocation de règlements/import sans deuxième dépense.
4. **Devise budgétaire personnelle et devise Couple.** Le compte principal EUR change la trésorerie affichée ; les budgets et partages restent CAD. Le paramétrage de la référence personnelle/Couple n'est pas terminé. Définir et matérialiser un changement prospectif sans recalcul historique, conformément aux validations existantes.
5. **Imports quotidiens et recette cloud.** Le CSV et le PDF mensuel ne certifient pas les parcours captures/OCR et PDF quotidiens. Le module bancaire hérité référence encore des CDN ; la CSP du labo les bloque. Ne pas élargir la CSP pour faire disparaître un échec. Qualifier sur fichiers fictifs représentatifs.
6. **Safari iPhone/PWA financière/Supabase isolé.** Aucun vrai iPhone disponible. Auth/RLS hébergées, synchronisation à deux clients, file d'écritures hors ligne et cache de production à qualifier sur environnement fictif explicitement autorisé. Ne jamais brancher le labo aux données réelles.
7. **Sortie.** Sauvegarde réelle fraîche et restauration isolée, migration qualifiée, freeze des écritures et rollback compatible avec les nouveaux enregistrements FX. Le retour brut à 5.36.5 après écritures internationales n'est pas démontré sûr.

## Commits de la mission

Tous sur la candidate avec `[skip ci]`. La présente consolidation ajoute ensuite un commit documentaire.

| SHA | Lot |
|---|---|
| `a4a442cbf252650902d0b733dafefeeea7ee1b13` | test(trace): repair native regression harnesses and add complete local QA runner |
| `93ecf7a26f363d9eaaa19197ab7d32c4a25e8f36` | feat(trace): integrate audited local PDF.js and verify premium candidate in Chromium |
| `dd615ee9c671cde67ea5cfdef67025396cb7cb25` | fix(trace): preserve native cents, dated FX evidence and working international entry forms |
| `b82ab0deacf4521a14bf6226ffe231ddc05c3ffb` | feat(trace): finish budget progress, FX transfer fees and persisted-workflow qualification |
| `30a46ce0f7724bc090432b013574fb827f0bb6cd` | feat(trace): complete native-currency savings and truthful wealth/FX previews |
| `8e28f77bf07cb82005e8eee6afa49b63b3cbea65` | feat(trace): finish account settings, card reassociation and reversible archival |
| `b26e8b96aac9f869c173f00e5b8888364cf70e4e` | feat(trace): isolate fictional PWA cache and verify offline local PDF extraction |
| `11c4891afc9762763bb2b26750ac93b9565338bb` | feat(trace): verify portable snapshots and restore fictitious PostgreSQL data |
| `5758cf29b6f1e8710901a444fd1ed7b24f103731` | feat(trace): inspect every CSV proposal and compare native bank matches |
| `699bf5778e949153f2ff050d69392ebd3bfadcab` | fix(trace): prepare account ownership RLS guards and expose remaining data conflicts |
| `94c613cd4e1c547a38671083c1da773967bded70` | test(trace): verify public historical FX quotes and clarify laboratory PDF activation |

## Invariants à préserver

Soldes bancaires natifs ; taux traçable date/source et jamais 1 par défaut ; montants au centime ; `pending` distinct de `confirmed` ; paiement carte et transferts internes sans double dépense ; historique CAD figé ; remboursements selon leur nature et allocations conservées ; pas de réinitialisation, suppression automatique de doublon ou lecture des données réelles. Cinq onglets : Accueil — Budget — + — Activité — Patrimoine. Épargne puis Placements puis Patrimoine net. Identité TRACE validée conservée.
