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
