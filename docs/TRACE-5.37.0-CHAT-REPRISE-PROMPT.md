# ADDENDUM PRIORITAIRE — INTÉGRITÉ FX ET PATRIMOINE (24 OCTOBRE 2026)

**Toujours résoudre le véritable HEAD GitHub avant de travailler.** Dernier HEAD de code vérifié avant cet addendum : `7adbb096b201d1840c7da5f20b06d62b8e8d465c`. Branche autorisée : `trace-5.37.0-international-accounts-fx`, jamais `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909`.

Nouveaux commits depuis le précédent handoff `32b320998b0d802a7f34f21a987e559d05806440` :
- `e8abbc556120274db5b2f1f3b30af80fd1d048dc` : un achat positif en devise étrangère valorisé 0,00 CAD après arrondi ne peut plus être confirmé.
- `f9ffc6b10e79d3453329a7402c587054be679ae5` : refus de valorisations FX infinies ou hors précision sûre.
- `7adbb096b201d1840c7da5f20b06d62b8e8d465c` : un solde natif étranger non nul ne peut être affiché comme valeur CAD zéro certaine ; retour incomplet, zéro natif réel préservé.

**78/78 vérifications ciblées V8 simulées** sur ce HEAD : 11 gardes FX, 11 tests d'intégrité monétaire, 18 CSV étrangers, 7 anciennes captures, 8 virements/cartes, 18 captures étrangères, 5 contrats **SQL statiques**. Ce n'est ni une exécution Node CLI native, ni SQL/PGlite/PostgreSQL, ni Safari/Chromium, ni test hébergé. Les migrations 07/08/09 n'ont toujours pas été exécutées et le SW de labo est périmé après changements JS. Ne pas annoncer GO.

Poursuivre sans rediscuter les décisions fonctionnelles/UX approuvées : prioriser checkout isolé + dépendances Node/PGlite, suites natives et SQL 07/08/09/RLS/CAS, reconstruction SW avec générateur puis --check, browsers/hors ligne/iPhone, finalisation étranger/différé/Couple/UX premium, sauvegarde/restauration/rollback sous autorisation. Ne pas toucher aux données Supabase réelles, ni déployer, ni main, ni CI. Commits `[skip ci]`. Voir HANDOFF et RELEASE-CHECKLIST mis à jour en tête du dépôt.

---

# ADDENDUM DE REPRISE — STATUT OCR ÉTRANGER / CAS PLACEMENTS (24 OCTOBRE 2026)

Ne pas reprendre depuis une ancienne valeur HEAD : interroger GitHub à chaque nouvelle session. Dernier HEAD de code vérifié avant cet addendum : `8b2a4e3ae931ca1afe369fdb0781b5b2049d3267`. Branche d'écriture unique : `trace-5.37.0-international-accounts-fx`. Stable `main` = `02c70f50e7e51da79b77a91dde96a03c6c719909`, à préserver impérativement.

Commits après `2ff5eab3e79c284c6b51c5e37afc48a782298f9f` :
- `a1ebbde9b7d81458f001eb51b0f132a0f31c5ba4` : les captures étrangères dont le sens bancaire OCR est un crédit (`bankDirection='in'`) sont refusées comme achat.
- `842ae604c95a9d4aaae12d2d7db4e332d1d5717c` : sécurisation proposée de `migrations/09-trace-cas-versioned-writes.sql` pour les opérations de placements, portefeuille/banque du bon propriétaire et vérification du propriétaire préexistant lors de UPDATE/DELETE ; cas PG ajoutés mais **jamais exécutés**, plus cinq tests statiques.
- `e026ee1993f82ae8f39d206df325e4e05eb3395b` : la revue asynchrone FX re-lit le compte et brouillon depuis le state courant après attente pour détecter des objets remplacés.
- `8b2a4e3ae931ca1afe369fdb0781b5b2049d3267` : fixture UI héritée corrigée ; relecture de **56/56 contrôles V8 fictifs** (51 JS fonctionnels + 5 SQL statiques).

Les résultats V8 **ne remplacent pas une exécution PGlite/PostgreSQL, Node natif, Chromium ou Safari**. Aucun test SQL n'est exécuté ici ; migration 09 reste candidat NO-GO. Aucune lecture/écriture financière Supabase réelle, aucun déploiement, CI, changement de main ou workflow. Le conteneur n'a toujours ni checkout ni DNS GitHub ni PGlite/psql ; les outils GitHub connectés fonctionnent.

Priorité : checkout isolé, Node CLI/PGlite et tests réels SQL 07/08/09 et nouveau placement CAS, restauration RLS/Auth/multisession ; reconstruire SW preview via script et --check ; finir imports/devise/différé/Couple et design premium, Chromium/Safari iPhone et backup/rollback avant toute demande GO. Ne recommencer ni la conception validée ni les correctifs acquis. HANDOFF et RELEASE-CHECKLIST en tête restent les références prioritaires. Tous commits `[skip ci]`.

---

# ADDENDUM DE REPRISE — ACHATS SUR CAPTURES ÉTRANGÈRES (24 OCTOBRE 2026)

**HEAD de code dernièrement vérifié : `59e1d451b439390e863064469342891f37ca8f91` ; résoudre le HEAD réel à chaque reprise.** La branche autorisée reste exclusivement `trace-5.37.0-international-accounts-fx` et `main` doit rester `02c70f50e7e51da79b77a91dde96a03c6c719909`. Trois commits nouveaux : `411a98349d3a8a92c461ce72caf78f8b1a7ccef6`, `aa4ce6fc6105071dfa282ab150d8a922fb29e842`, `59e1d451b439390e863064469342891f37ca8f91`.

- Un achat **ordinaire** depuis capture/OCR de compte EUR/USD/GBP/CHF peut désormais être confirmé **individuellement** par l'utilisateur après contrôle du compte, libellé, centimes natifs, nature explicite et taux CAD daté sourcé ; les autres natures étrangères restent en attente. La case de confirmation se décoche si date, montant, nom, type, sens ou devise/prix d'achat change ; les doublons et modifications concurrentes locales pendant recherche FX sont surveillés. Jamais d'invention de FX.
- Les contrôles ciblés ont été exécutés sur vrai code extrait de ce HEAD dans un **harnais V8 fictif** : 46/46 (CSV 18, statuts/capture 7, virements/cartes 8, nouvelle revue OCR étrangère 13). Aucun PostgreSQL/PGlite, Node CLI natif, Chromium, Safari, Supabase réel, CI ni déploiement. L'accès DNS GitHub au container, checkout local et PGlite restent indisponibles. Ne surtout pas transformer ces résultats en preuve de production.
- Les documents `docs/TRACE-5.37.0-HANDOFF.md` et `docs/TRACE-5.37.0-RELEASE-CHECKLIST.md` sont les vérités prioritaires ; reconstruire le service worker preview uniquement via son générateur après checkout.
- Poursuivre sans rediscuter la conception. Priorité absolue au checkout isolé, à Node / SQL 07/08/09, droits RLS, CAS et tests d'intégration ; compléter en parallèle les flux étrangers/différé et l'UX validée, puis tests PWA Chromium/Safari, sauvegarde/restore/rollback autorisés. Ne modifier ni main ni Supabase réel, ne pas lancer de CI ni déployer. Tous commits `[skip ci]`. **NO-GO inchangé.**

---

# ADDENDUM PRIORITAIRE — NOUVEAUX LOTS FX ET CARTES (24 OCTOBRE 2026)

Résous d'abord le véritable HEAD GitHub de `trace-5.37.0-international-accounts-fx` ; **dernier HEAD de code** précédant cet addendum : `bc7f5e738457d33e430e25a1599d0d766083566b`. `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` reste absolument interdite de modification.

Nouveaux commits après `0d6295d1d7b6bce1ddb6bfe4251e98589b192424` :
1. `070b8e76d64ad978937b6e23e154dd37024a4e7b` : contrôle des ressemblances bancaires refait après recherche asynchrone du taux FX sur validation CSV étrangère ; nouveaux tests de concurrence pendant l'attente.
2. `bfb38d3a03bc270e94d8e313b9a353bdd2ae0350` : `toBankCurrency` conservée sur virement depuis un compte CAD vers compte étranger ; montant reçu exact, rejet subcentime et absence de montant.
3. `0c957b0a3c10ac58252caa18ed4af5b159d7511a` : carte liée ou source courante unique si héritage, pays et devise identiques pour paiement de carte, pas de dette attribuée au mauvais compte.
4. `bc7f5e738457d33e430e25a1599d0d766083566b` : tests de paiement carte avec véritable module `TraceMovement`.

`tests/trace-international-foreign-csv-confirm.test.cjs` 18/18, `tests/trace-international-capture-confirm-guards.test.cjs` 7/7, `tests/trace-smart-cross-currency-transfer-guards.test.cjs` 8/8 : **33/33 scénarios réellement réexécutés sous V8 avec modules Node et cloud simulés** sur ce HEAD. **Aucun nouveau test Node CLI, PostgreSQL/PGlite, Chromium/Safari ou hébergé.** Aucun SQL/migration réel, aucune lecture/écriture financière Supabase, aucun déploiement, aucune modification de `main` ou des fichiers d'entrée production.

Le prochain chantier obligatoire reste : checkout fictif et dépendances → tests Node + migrations 07/08/09 réels → correction → reconstruction du SW laboratoire via script → navigateur/QA authentique → flux étrangers restants, différé, devise Couple, sauvegarde/restauration/rollback sous autorisation. **NO-GO** jusqu'aux preuves et autorisation explicite. Le HANDOFF et la RELEASE-CHECKLIST en tête du dépôt détaillent les limites.

---

# ADDENDUM DE REPRISE LE PLUS RÉCENT — CAPTURES BANCAIRES / STATUTS (24 OCTOBRE 2026)

**À lire avant le reste.** Toujours résoudre le HEAD réel de `trace-5.37.0-international-accounts-fx`, sans se fier aux anciennes valeurs. Dernier HEAD **de code** contrôlé avant cet addendum : `6bca9ab80caf1c7dfb1255db4f6285587c0dda5c`. `main` 5.36.5 doit rester à `02c70f50e7e51da79b77a91dde96a03c6c719909`.

- `650462a6c2e35199a1d230ed412ac1e54648e8a2` : validation rapide CSV étrangère strictement `pending` et protection contre les mutations locales pendant l'attente d'une cotation FX ; tests ajoutés.
- `74e823f7deee512dc7021e7f3f824fdf7b328331` : import étranger `pending` non confirmable par les validations de lot ; test de non-contournement.
- `104e2c6854f0873a2f6416b8c848bcbd209d22c9` : HANDOFF et checklist précédente à jour.
- `274414664eb480f73666b9a409437cee67dce54a` : capture/OCR de compte étranger reste en attente, aucune écriture `confirmed` par le parcours CAD ; seules les lignes `pending` sont admises par les validations de lot.
- `6bca9ab80caf1c7dfb1255db4f6285587c0dda5c` : bouton de confirmation étranger désactivé, texte explicatif ; poursuite normale des parcours CAD.
- Suites réellement rejouées sur le dernier code sous **V8 avec modules Node simulés et données fictives : 23/23** (16 CSV, 7 capture/lots/UI). Aucun nouveau test Node natif, Chromium, Safari, PGlite, PostgREST/Supabase hébergé ni CI ; **NO-GO**.
- Les fichiers `docs/TRACE-5.37.0-HANDOFF.md` et `docs/TRACE-5.37.0-RELEASE-CHECKLIST.md` précisent limites et suite. Le checkout GitHub reste inaccessible depuis le conteneur (Node v22 disponible, pas de DNS GitHub/PGlite/serveur PostgreSQL). Toujours tenter un checkout fictif autorisé pour les tests 07/08/09 et natifs ; sinon continuer le développement code/test sans invoquer de CI. `trace-international-preview-sw.js` doit être reconstruit par son script et non modifié manuellement.
- Ni `main`, ni fichiers d'entrée production 5.36.5, ni `.github/`, ni Supabase financier réel, ni pages Vercel/GitHub Pages ne doivent être modifiés. Pas de lancement de migrations réelles, aucun GO tant qu'Auth/RLS/CAS/Safari/rollback n'est pas qualifié.

---

# ADDENDUM PRIORITAIRE AU PROMPT — NOUVEAUX COMMITS DU 24 OCTOBRE 2026

Lis cet addendum avant le prompt intégral ci-dessous. **Le HEAD indiqué dans le prompt d'origine n'est plus le dernier.** Résous le véritable HEAD sur `trace-5.37.0-international-accounts-fx` au début de la mission et compare-le avec `main` (stable connu `02c70f50e7e51da79b77a91dde96a03c6c719909`).

Nouveaux travaux enregistrés après `fa99ffd33a6f287b37232ace10fdb756d3785927` :
- `v5-app-5.37.0.js` : initialisation des catégories de départ rendue idempotente. Avant création, lecture des IDs existants et de leurs révisions ; création seulement de ceux manquants ; en cas de conflit concurrent, vérification de l'ID au serveur ; état restauré avec révisions à jour. Bouton explicite « Ajouter les catégories de départ manquantes » même si certaines catégories/budgets existent. Aucune remise à zéro ni remplacement d'une catégorie personnalisée/archivée.
- `migrations/09-trace-cas-versioned-writes.sql` : validation d'une liste de neuf collections reconnues par le client et interdiction de supprimer physiquement les comptes bancaires, comptes d'investissement, imports, rapprochements ou journées. Les quatre collections autorisées pour la suppression sont catégories, budgets, transactions, opérations de placement. Un membre ne peut ni créer une collection arbitraire via la RPC, ni contourner l'archivage par cette RPC. Migration **jamais déployée et toujours non qualifiée en SQL**.
- `v5-app-5.37.0.js` : validation CSV étrangère rapide restreinte aux achats natifs *sans contre-valeur CAD préalable* et avec montant original/devises cohérents, pour ne pas inventer des jambes étrangères ou réécrire une preuve FX.
- Suites : `tests/trace-cas-category-bootstrap.test.cjs` **8/8 tests exécutés dans V8 avec fausse base** ; `tests/trace-international-foreign-csv-confirm.test.cjs` **12/12 dans V8, moteur financier réel extrait et faux DOM/transport** ; `tests/trace-cas-writes.integration.cjs` désormais **12 scénarios SQL écrits mais NON exécutés**. Ce ne sont pas des tests Node natifs, navigateur, PostgreSQL ou Supabase hébergé.
- Commits : `b6ec63e44fb8ef161568c3a874ab25cb170e7f59`, `ce18d6970e3c2b8369fb84f01c73005b92685841`, `2195998dedb23a6ab4cb5590c8379e2278b5fb22`, `7e62e828688bc3aa75435363f7819f2bdc3b3a74`, `e31a52bc0210edbf78eeb6536707ac60d72b5124`, `f6100912b92bc79bb6dd56a168779ab9cad28a29`, `e32f274d44d25ed450b06439ab6604ede14ef629`, `2ecfb56643391ce4c4a7001d3f07166b3960b209`, suivis des mises à jour du HANDOFF et de RELEASE-CHECKLIST.

Le blocage d'environnement a été diagnostiqué : container avec Node v22 disponible mais GitHub/DNS inaccessibles et pas de checkout, module PGlite ni PostgreSQL serveur. L'accès au dépôt fonctionne via le connecteur GitHub. **Ne revendique pas d'exécution des suites PostgreSQL**, ne touche pas aux données Supabase réelles et ne lance aucun déploiement/CI. La prochaine étape prioritaire est d'obtenir un checkout et des dépendances en environnement fictif autorisé, exécuter les suites SQL 07/08/09 et Node natives, corriger leurs erreurs, régénérer le SW laboratoire via son constructeur, puis poursuivre les parcours bancaires internationaux. Si toujours impossible, continuer un autre chantier code/test indépendant et tenir les preuves à jour.

**Toutes les interdictions et validations produit du prompt original restent en vigueur.** Aucune décision GO n'est justifiée.

---

# PROMPT DE REPRISE — TRACE 5.37.0 INTERNATIONAL (après travail du 24 octobre 2026)

Tu reprends la **même mission autonome de développement** de TRACE, PWA budgétaire personnelle et couple. Le projet a été conçu, développé et audité sur plusieurs jours. **Ne repars pas de zéro ; ne propose pas une nouvelle conception.** L'utilisateur souhaite achever une version premium, internationale, stable, testée et candidate à la production, uniquement lorsque les preuves de sécurité sont suffisantes. Tu es autorisé à enchaîner les lots cohérents sans demander « OK go » à chaque étape.

## Dépôt et périmètre impératif

- Repository : `louisantoine78/Budget-duo`.
- **SEULE** branche modifiable : `trace-5.37.0-international-accounts-fx`.
- Avant la reprise, **résous les HEAD réels** de GitHub. Dernier HEAD de code + HANDOFF précédant le présent fichier : `2799f5a39cdcdad43ac9b22476e04f3178991a8a`.
- `main` stable 5.36.5, SHA `02c70f50e7e51da79b77a91dde96a03c6c719909`, doit rester strictement inchangée.
- Références prioritaires : `docs/TRACE-5.37.0-HANDOFF.md` (lire en tête ; sections les plus récentes d'abord), `docs/TRACE-5.37.0-UX-VALIDATED-GAP-AUDIT.md`, `docs/TRACE-5.37.0-INTERNATIONAL-AUDIT.md`, `docs/TRACE-5.37.0-RELEASE-CHECKLIST.md`, `docs/TRACE-5.37.0-WORK-VALIDATION.md` et `docs/qa/TRACE-5.37.0-QUALIFICATION.json`.
- Inspecter le code/tests **avant modification** et préserver tous les comportements 5.36.5.

## Interdictions sans exception

1. Aucun changement/fusion/PR vers `main`, aucun déploiement GitHub Pages, Vercel Preview ou production sans autorisation explicite.
2. Ne lire, écrire, supprimer ni analyser **aucune donnée financière réelle Supabase**. N'utiliser que des bases et transactions fictives et isolées ; ne pas déployer les migrations sur Supabase réel.
3. Ne pas activer/modifier les GitHub Actions ni les rapports automatisés PickPoint ; ne pas déclencher de CI payante ou non autorisée.
4. Chaque commit uniquement sur la branche autorisée avec **`[skip ci]`**.
5. Aucune réinitialisation financière, suppression automatique de doublon, migration historique destructive, recalcul rétroactif d'un budget ou taux FX inventé (jamais 1 par défaut).
6. Aucun service payant ou ressource externe créé sans validation. La sauvegarde réelle, la restauration isolée, la migration et le rollback doivent être autorisés et prouvés avant publication.

## Expérience et règles déjà validées

- Design TRACE : vert profond, tons clairs chaleureux, cartes et ombres discrètes, montants lisibles, animations modérées, iPhone Safari prioritaire.
- Exactement 5 onglets : **Accueil — Budget — + — Activité — Patrimoine** (« Patrimoine » sur une ligne).
- Accueil, ordre impératif : Solde estimé / Disponible budget / Ce mois-ci / À faire / Budget en direct / Évolution / Partage raccourci. Solde premium : consultation d'autres comptes distincte de la sélection officielle du principal, confirmation du changement, dettes de cartes liées et conversions uniquement sourcées.
- Comptes : CAD/EUR/USD/GBP/CHF extensibles, devise native, pays, type immédiat/crédit/différé, comptes moi/couple, compte principal, archivage et historiques.
- Budget : trois familles revenu/fixes/variables, prévu-réel-progressions/dépassements, « Mon année en clair », 12 mois.
- Activité : historique journalier, filtres, imports, statuts pending/confirmed, Partage/Proches, avances et remboursements.
- Patrimoine : Épargne puis Placements puis Patrimoine net consolidé, devises natives.
- Comptabilité : débit immédiat = débit compte et budget ; crédit = dette carte + budget, puis paiement carte hors budget ; différé = achat/date budgétaire/date débit/règlements partiels sans double dépense ; transferts épargne et intercomptes hors budget, montants reçus/débités/frais conservés, répartition Moi/Couple/Proches sans recomptage ; historiques et taux datés/source figés.

## Ce qui avait été qualifié avant la dernière reprise

Selon le HANDOFF : présentation premium de base, 5 onglets, comptes avec consultation/principal, budget, épargne internationale, CSV en attente avec revue de doublons, PDF.js 6.4.299 véritable et extraction FR/CA locale, laboratoire PWA fictif hors ligne, sauvegardes/restaurations PostgreSQL fictives, migration candidate 07 RLS comptes/placements et taux Banque du Canada historiques. Anciennes preuves : 54 suites Node / 911 scénarios, 32 Chromium, 17 SQL fictifs et 8 HTTP Valet, **sur des commits antérieurs aux travaux décrits ensuite**. Pas de Safari réel ni Supabase hébergé qualifié.

## Développements réalisés lors de la reprise du 24 octobre (code GitHub enregistré)

### Lot A — sécurité serveur candidate

- `migrations/08-trace-personal-settings-owner-guard.sql` : trigger RLS auxiliaire/propriétaire des clés personnelles `households.settings` (soldes/dates/modes d'ouverture par compte, principal et diminutifs par membre).
- `migrations/09-trace-cas-versioned-writes.sql` : colonnes `documents.revision` et `households.settings_revision`, triggers incrémentaux, RPC CAS de création/mise à jour/suppression et réglages avec refus `TRACE_WRITE_CONFLICT`, authentification, propriété des comptes et `search_path` restreint.
- `tests/trace-personal-settings-ownership.integration.cjs`, `tests/trace-cas-writes.integration.cjs` : tests PGlite fictifs écrits **mais NON EXÉCUTÉS** dans le runtime de cette reprise, dépourvu de PGlite/checkout.
- **Important** : migration 09 ne révoque pas encore les écritures directes pour conserver la compatibilité des clients 5.36.5. Les RPC ne sont pas une sécurité complète jusqu'au cutover validé. Migrations jamais appliquées à une base hébergée.

### Lot B — client CAS et conflit

- `v5-app-5.37.0.js` : lecture des révisions avec refus des métadonnées absentes, remplacement des écritures directes centrales par RPC versionnées, file de sauvegardes par ressource, blocage des écritures après conflit, avertissement visible avec rechargement confirmé.
- `trace-international-1.0.0.css` : UI de conflit premium adaptée aux petits écrans.
- `tests/trace-cas-client.test.cjs` : huit scénarios client. **8/8 ont réussi lors d'une exécution du code de test sous V8 avec modules Node et transport cloud fictifs**, pas en Node CLI, PostgreSQL, Safari ou Supabase hébergé.
- Une correction ultérieure reconstruit les réglages au moment d'une écriture sérialisée pour éviter d'écraser les modifications récentes du même appareil.

### Lot C — dépense CSV étrangère

- Une validation volontairement **limitée aux dépenses simples importées en CSV sur un compte non-CAD**, depuis la fiche « À vérifier », existe dans `v5-app-5.37.0.js`.
- Montant natif/date/compte figés, choix catégorie et Moi/Partenaire/Couple, confirmation expresse de la nature, quote CAD Banque du Canada datée ou saisie manuelle datée/sourcée, vérification des lignes ressemblantes, CAS avant passage `confirmed`. L'achat fictif 40 EUR à 1,60 produit 64 CAD sans modifier les 40 EUR.
- `TraceImportGuide.safeForQuickApproval` bloque les libellés ambigus, virements Interac et paiements de carte. Les autres natures et Proches restent en attente ; **NE PAS déclarer les imports internationaux terminés**.
- `tests/trace-international-foreign-csv-confirm.test.cjs` : **9/9 scénarios réussis sous V8 avec modules Node et DOM/transport simulés** ; aucun nouveau test Chromium, Safari ou PostgreSQL.

### Preuves, limites et SHA

Consulter impérativement le début du HANDOFF mis à jour, qui contient tous les SHA des lots. Dernier HEAD avant ce prompt : `2799f5a39cdcdad43ac9b22476e04f3178991a8a`; résoudre le SHA du commit du présent prompt et tout HEAD ultérieur.

Les nouveaux scripts JS sont syntaxiquement compilés sous V8. La comparaison GitHub a confirmé, pour les 12 commits précédents, **aucun changement dans** `index.html`, `sw.js`, `manifest.webmanifest`, `trace-version.json`, `v5-app-5.36.5.js`, `.github/` ou `main`.

**Blocage additionnel de cache :** le fichier généré `trace-international-preview-sw.js` est **périmé** après modification des assets JS/CSS. Il faut exécuter sur un checkout local complet : `node scripts/build-trace-preview-pwa.mjs`, puis `node scripts/build-trace-preview-pwa.mjs --check`. Ne pas modifier le SW à la main ; ne pas présenter les anciens 32 scénarios Chromium comme des tests du nouveau code.

## Suite obligatoire — sans nouvel « OK go »

1. Exécuter dans un checkout isolé Node natif + `@electric-sql/pglite@0.4.5` tous les tests anciens et nouveaux. Tester et corriger SQL 08/09 **réellement**, notamment fonctions `SECURITY DEFINER`, RLS, droits des deux membres, concurrence, triggers et suppression. Pas de lecture du vrai projet Supabase.
2. Régénérer le cache laboratoire, vérifier les licences/intégrités PDF.js, exécuter les tests de navigateur isolé (Chromium si disponible), puis test offline après reconstruction des actifs. Rendre compte des tests réellement exécutés, pas simplement présents.
3. Valider les RPC dans un environnement Supabase *fictif séparé*, seulement si explicitement autorisé, avec Auth/PostgREST/RLS/Realtime à deux clients ; planifier et prouver un cutover retirant les écritures directes sans bloquer la stable.
4. Finaliser, par lots testables, les validations étrangères restantes (revenus, remboursements commerçants/proches, virements/cartes, allocations), les flux de captures/OCR/PDF quotidien et le contrôle mensuel PDF.
5. Brancher le moteur différé sur le journal réel, avec dates et paiements partiels, sans double comptage. Devise personnelle et Couple indépendantes/prospectives avec historique figé.
6. Faire la recette réelle Safari iPhone et l'expérience PWA installée, conservation des données, hors ligne/retour réseau, conflits, migrations et régressions 5.36.5.
7. Sauvegarde réelle fraîche **sous autorisation**, restauration isolée, plan de gel/rollback compatible avec de nouvelles écritures FX. Checklist GO/NO-GO avec preuves puis autorisation explicite avant fusion/publication.

Les changements doivent s'enchaîner sans solliciter un accord après chaque lot déjà validé. Commencer par vérifier GitHub et les documents, inspecter le code, lancer les tests possibles et avancer sur des corrections effectives ; si l'environnement ne permet pas une dépendance, passer à un chantier indépendant. À chaque bilan significatif : fichiers, commits exacts, tests **effectivement** lancés et niveaux de preuve, bugs corrigés, limites, NO-GO/GO. Surveiller la longueur de la conversation et préparer un nouveau prompt complet si nécessaire.
