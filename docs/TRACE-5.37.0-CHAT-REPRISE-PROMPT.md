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
