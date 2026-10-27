# ADDENDUM PRIORITAIRE — 26 OCTOBRE 2026 — GATE DE RELEASE IMMUTABLE

**HEAD code/test vérifié :** `7e49a21c8eeb02bd963a43289c2eb29c0a504b37`, **branche autorisée uniquement** `trace-5.37.0-international-accounts-fx`. Base de ce lot `2aefb6b04787a68b7c0e9e9c76b0aa9f9de60746`. Résoudre à nouveau le vrai SHA à chaque nouvelle conversation, notamment en cas de travaux parallèles. `main` connue `02c70f50e7e51da79b77a91dde96a03c6c719909`.

Trois commits `[skip ci]` sans PR, merge, CI, déploiement ni Supabase réel :
- `e45ffa93` : **fail-fast** avant l'exécution des tests si le code candidat n'est pas digne de confiance (branche, ancêtre, historique `[skip ci]`, fichiers stables, Vercel, propreté Git).
- `66b08851` : `PROTECTED` élargi à **51 pathspecs**, couvrant les **41 scripts/styles/ressources locales du `index.html` stable 5.36.5**, autres points d'entrée, schéma/ressources et workflows. La comparaison des commits mission n'a trouvé aucune modification de ces ressources stables.
- `7e49a21c` : mémorise SHA `HEAD` avant les tests, puis compare SHA, branche et état Git final : une mutation invalide la QA.

**35/35 tests V8 exécutés**, y compris les nouveaux échecs d'intégrité avant/après les tests, sur fichiers du dépôt avec commandes Git/Node simulées. Aucune qualification PostgreSQL/PGlite, Node natif sur checkout complet, ou Safari physique. Aucun changement du moteur financier dans ce lot. Les 147 tests V8 de débit différé proviennent d'un lot précédent et n'ont pas été reroulés ici.

**Blocages :** obtenir un environnement PGlite local fictif pour les quatre suites SQL des migrations 05–12 ; aucun PGlite installé dans ce runtime. Distinction des findings SQL RLS/CAS historiques et protections candidates obligatoire. Après validation des SQL : vraie suite Node, Safari iPhone/PWA, imports, FX/Couple, parcours premium et rollback. Migration 12 **NON APPLIQUÉE** ; production **NO-GO**, progression ~58 % ±10. Ne toucher ni à `main`, ni aux données Supabase réelles.

---

# ADDENDUM PRIORITAIRE — 26 OCTOBRE 2026 — QUALIFICATION EXACTE DU HEAD ET PROTECTION DE LA BRANCHE

**Dernier HEAD code/test vérifié : `6298b3ae0dcc0ecb902e4399b600225d97767cf7`** sur `trace-5.37.0-international-accounts-fx`. Résoudre à nouveau le HEAD à toute reprise. Base au début de ce lot : `5b814d28b838d3b837d5329b7ee642db2d4aee86`, `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909`. Pas de PR, merge, workflow CI/Actions, déploiement, modification de production ni vraie base SQL ; commits `[skip ci]` uniquement.

**`9e620688` :** le release gate vérifie la base Git `6eb6c17...`, l'absence de changement des fichiers `index.html/sw.js/manifest.webmanifest/trace-version.json/v5-app-5.36.5.js/.github` depuis la base, `[skip ci]` sur chaque commit de la mission et Vercel auto-déploiement candidat `false`. Vérification GitHub réelle : 329 commits consultés depuis cette base, tous marqués `[skip ci]` et fichiers protégés non modifiés. Testés via **25/25 V8 isolés**.

**`6298b3ae` :** le script `trace-release-preflight.mjs` exige maintenant un HEAD égal au SHA exact qualifié ; aucun rapport du 24 octobre (SHA `94c613cd...`) ne valide le HEAD actuel par ascendance. Rapport natif doit compter scénarios/tests/syntaxe, rapport PG fictif doit comporter des assertions réussies et zéro finding `release-blocker`. Le rapport historique affiche `RLS-PERSONAL-SETTINGS` et `STALE-WRITE` encore ouverts. **8/8 nouveaux tests V8**. Total lot **33/33**. API Node simulée, jamais présenter comme Node CLI complet, PostgreSQL/PGlite ou Safari physique.

**NO-GO toujours obligatoire.** Prochaine priorité : récupérer un checkout complet avec PGlite isolé et exécuter toutes les suites SQL 05–12 sur données fictives, en séparant baseline historique et preuves de correction candidates CAS/RLS ; aucun GO tant que SQL, Node natif, iPhone Safari/PWA, imports/FX/Couple et rollback ne sont pas qualifiés. Aucun déploiement ni écriture Supabase réelle.

---

# ADDENDUM PRIORITAIRE — 26 OCTOBRE 2026 — DOUBLONS D'IMPORT DANS TOUT LE LOT DE PREUVES

HEAD vérifié des **trois commits de code/tests** de cette reprise : `5a06416690ff890fae7d5cd69fb03cbbbb80dd47` sur `trace-5.37.0-international-accounts-fx`; base de départ `afd56d4e7eac8b9c5b74534ef39e22d8084094fe`. Toujours résoudre le HEAD en début de prochaine conversation. Stable `main` connue `02c70f50e7e51da79b77a91dde96a03c6c719909`. Commits `[skip ci]`, aucun workflow, merge/PR, déploiement, migration hébergée ou écriture Supabase réel.

**Modifications :** `8b506189` bloque les `sourceId` et `importId` réutilisés dans le lot complet de documents carte et compte courant, y compris **au sein d'une même catégorie de relevés**. `572d32e8` refuse dans le comparateur courant les imports dupliqués malgré renommage des identifiants de document/ligne, invalide original et copie, préserve le statut public `duplicate_import`. `5a064166` refuse dans la preuve d'achat carte tout doublon de source ou d'import et expire une attestation antérieure en présence du doublon.

**Régressions : 147/147 tests V8** après ces trois commits, huit suites (32+27+27+16+9+7+12+17), code GitHub actuel et modules métiers réels, mocks des APIs Node/fs/vm. Parsing app PASS. **Ce ne sont pas des tests Node CLI natifs sur un clone, PostgreSQL/PGlite, ni Safari physique**. Aucune écriture financière. Migrations SQL 05–12 encore non exécutées en PostgreSQL ; migration12 NON APPLIQUÉE. Production **NO-GO**, estimation **~58 % ±10**.

**Prochaine étape impérative :** exécuter les 4 suites PostgreSQL/PGlite isolées sur faux foyer et les migrations candidates, sans jamais utiliser Supabase réel ; qualifier intégralité des tests natifs, iPhone Safari/PWA, PDF/CSV/OCR, retard/débit différé, Couple/FX/Patrimoine et rollback. Ne pas changer `main` ni engager de déploiement sans GO humain explicite.

---

# ADDENDUM PRIORITAIRE — 26 OCTOBRE 2026 — CONTRATS DE PREUVE DU DÉBIT DIFFÉRÉ

À la passation, le dernier HEAD **code** connu est `8def77b8d419a59ef26c8c492c5fffcec6c34f76` sur `trace-5.37.0-international-accounts-fx` (base avant ce lot `1729f45dc36ae3d977bd3e2b5c42ba1b9bd9d1c6`). Résoudre le HEAD réel sur GitHub lors de la prochaine reprise. `main` connue stable `02c70f50e7e51da79b77a91dde96a03c6c719909`. Aucun workflow CI/Actions, PR/fusion, déploiement, migration SQL, écriture Supabase réelle ; commits `[skip ci]` uniquement.

**Travaux réalisés** :
- `f47c85a9` vérifie que `sourceId` **et** `importId` ne sont pas réutilisés entre relevé carte et relevé compte courant ; demande une liste `feeIds` explicite/valide pour tous les paiements afin d'empêcher la levée accidentelle du plafond d'un règlement partiel mono-achat sans frais.
- `8def77b8` invalide les lignes de relevé typées incohérentes : `checking_debit` ne peut être un crédit, `checking_credit` ne peut être un débit, et toutes les lignes de carte `card_purchase/card_refund/card_payment/card_fee` doivent avoir un sens bancaire compatible, **y compris les autres lignes du document**.

**Tests exécutés** : **137/137 V8** après ce lot, répartis sur huit suites de débit différé/relevés (29+24+25+14+9+7+12+17). Réelles sources GitHub et modules métiers, APIs Node/fs/vm simulées. Les 207 V8 du lot précédent ne sont pas une preuve supplémentaire reroulée après ce commit. **Ni Node natif checkout complet, ni PostgreSQL/PGlite, ni Safari physique.** Migrations 05–12 non testées PostgreSQL, migration 12 NON APPLIQUÉE. Production NO-GO, progrès prudent 58 % ±10.

**Next :** récupérer un checkout local complet et un moteur PG/PGlite isolé pour les quatre suites Auth/RLS/CAS/cutover, vérifier ensuite Node natif, imports CSV/PDF/OCR, Safari iPhone, paiement différé vrai, couples/FX, rollback et coexistence clients 5.36.x. Aucune modification de `main` ni production sans GO humain explicite.

---

# ADDENDUM PRIORITAIRE — 26 OCTOBRE 2026 — PLACEMENTS ET BANQUE : DATES, COMPTES, CENTIMES

**HEAD de code/test au moment de la passation : `032e1db585917b6048eb1be8ce1ac0ce44fdacbb`**, branche `trace-5.37.0-international-accounts-fx`. Résoudre à nouveau le HEAD dans la prochaine conversation. Base avant ces deux correctifs `ad4ade07275c2b161dbea9d3b5bc86b8855007c8`. `main` inchangée `02c70f50e7e51da79b77a91dde96a03c6c719909`. Commits strictement `[skip ci]`. Zéro CI/Actions, PR, fusion, déploiement, migrations/SQL ou Supabase réel.

**Corrections :** `23422265` bloque un solde lorsque la transaction confirmée d'un placement est désormais sur un autre compte, ou lorsque la date active d'un mouvement bancaire/placement est impossible. La fiche compte présente une alerte sans lien vers un mois inexistant. `032e1db5` sécurise aussi le formulaire avant sauvegarde : date calendaire valide, valeur monétaire exacte aux centimes natifs, zéro arrondissement CAD inventé, lien bancaire réévalué pour date, compte, sens et montant. Les enregistrements existants ne sont pas modifiés automatiquement.

**Tests réellement rejoués après ce lot sur les sources GitHub : 207/207 scénarios V8** (18 activité, 38 compte, 34 monétaire, 45 legacy, 21 banque, 15 Mastercard, 19 garde-fous, 17 saisie native). Module Node/VM/DOM simulé, **ce n'est ni `node --test` natif complet ni PostgreSQL/PGlite ni Safari iPhone**. Parsing JS app complet vérifié. Migrations 05–12 jamais qualifiées sur PostgreSQL; migration 12 **NON APPLIQUÉE**. Production **NO-GO**, ~58 % ±10.

**Reprise prioritaire** : exécuter les quatre suites PostgreSQL isolées en données fictives lorsqu'un moteur et checkout complets seront accessibles, puis QA Node complète, Safari iPhone et PWA offline, finance FX/Couple, imports CSV/PDF/OCR, UX premium, scénarios de rollback et anciens clients 5.36.x ; aucune autorisation implicite pour la mise en production.

---

# ADDENDUM PRIORITAIRE — 26 OCTOBRE 2026 — LIENS BANCAIRES DE PLACEMENTS VÉRIFIÉS

HEAD du code/tests au dépôt : `f02b190fbdd478c92e6468514fad01cd3b49979a` sur **`trace-5.37.0-international-accounts-fx`** ; branche initiale de ce lot `091892c628fbe85f3ca2b2d46c9e044fd94ca47d`. Vérifier le véritable HEAD au prochain passage. `main` `02c70f50e7e51da79b77a91dde96a03c6c719909`, inchangée. Tous commits `[skip ci]`, pas de PR, merge, CI/Actions, prod, migration réelle ou Supabase hébergé.

**Modifications :** `f29385b8` — le garde `traceLinkedBankTransactionCovers` compare désormais montant bancaire natif exact, identité de compte, statut/borne temporelle et sens débit ou crédit. Il retourne `true` (lié exact), `false` (hors fenêtre/non admissible), `null` (contradiction active). Le solde devient inconnu et la fiche compte signale l'opération lorsqu'un lien confirmé est faux ; jamais inventer un double débit, neutralisation de deux flux ou taux FX. `f02b190f` — deux mouvements de placement du même compte ne peuvent revendiquer une seule jambe bancaire confirmée.

**Preuve réelle au niveau V8 :** **184/184 scénarios isolés** sur fichiers GitHub lus dans cette conversation : 18 Activity, 36 détails comptes, 34 monétaire, 45 historique CAD, 17 banque/placements, 15 Mastercard/amis et 19 garde-fous. Parsing JS V8 app réussi. Les modules Node/VM sont simulés : **ni `node --test` complet ni PostgreSQL/PGlite ni Safari iPhone exécuté**. Les migrations 05–12 et quatre suites de qualification PG restent NON testées ; migration 12 NON APPLIQUÉE. Production **NO-GO** (~58 % ±10).

**Prochaine priorité :** installer ou fournir un moteur PG/PGlite local isolé avec checkout complet pour exécuter les quatre suites SQL d'intégration et la suite Node native, puis passer à Safari iPhone, PWA, Couple/FX, PDF/CSV/OCR, sauvegarde/rollback et validation publication explicite. Respect absolu des interdits production.

---

# ADDENDUM PRIORITAIRE — 26 OCTOBRE 2026 — ACTIVITÉ MULTIDEVISES ET AFFICHAGE NATIF SÉCURISÉS

**HEAD de code/tests à la passation :** `9a0cefe79e6ff8c61bae0e50a2b3a69c3c30d744` sur `trace-5.37.0-international-accounts-fx`. Toujours résoudre le HEAD GitHub réel en début de conversation. Stable `main` vérifiée `02c70f50e7e51da79b77a91dde96a03c6c719909`. Tous commits `[skip ci]`, aucun CI/Actions, PR, merge, déploiement, modification main ou Supabase réel.

**Vrais changements :** `e0b7a9f5` — Activity EUR inclut les virements reçus CAD→EUR ; montants pending respectent la devise et la jambe bancaire du compte sélectionné. `408f7308` — les lignes confirmées `txRow` ne confondent plus `amountCAD` avec `bankAmount` EUR ; refus de présenter des données FX inconnues ou incompatibles, affichage natif au centime, destination correcte. `9a0cefe7` — trois tests sur moteur `TraceInternational` réel, isolé sans HTTP.

**Preuve vérifiée :** **175/175 tests V8** sur code GitHub final et dépendances Node/DOM simulées : Activité18, comptes34, finance34, legacy45, banque/placements10, carte/amis15, garde-fous19. Parsing app V8 OK. Aucun test Node natif complet sur checkout, PostgreSQL/PGlite exécuté ou Safari réel. Node est présent localement, mais PG/PGlite et DNS github.com sont indisponibles. Ne pas confondre tests VM avec les 4 suites SQL. **Production strictement NO-GO**, migrations 05–12 non appliquées, ~58 % ±10.

**Prochaine action** : moteur PostgreSQL/PGlite local **isolé** et checkout complet fictif, exécuter les 4 suites Auth/RLS/CAS/CSV/rollback. Puis recette iPhone Safari et PWA, imports PDF/CSV/OCR, transitions 5.36.x, Couple/FX et UI premium. Jamais toucher production ni appliquer migration12 sans GO humain.

---

# ADDENDUM PRIORITAIRE — 26 OCTOBRE 2026 — ACTIONS DE PREUVE BANCAIRE DANS ACTIVITÉ

**HEAD de code confirmé avant la mise à jour des docs :** `95b57664d3b3476e74bee254dfd3aa980539ade0`, sur `trace-5.37.0-international-accounts-fx`. Revérifier le HEAD au démarrage. `main` confirmée `02c70f50e7e51da79b77a91dde96a03c6c719909`. Uniquement commits `[skip ci]`, zéro PR/merge, CI/Actions, déploiement, SW production ou Supabase réel.

**Travail achevé :** `38dfbd13` répare les derniers harnais isolés `accountEstimate` et l'injection du mois de débit différé (10+15+19 = **44/44 tests V8**). `50f0301b` ajoute des liens tactiles sécurisés pour retrouver les transactions problématiques depuis l'alerte bancaire dans Activité, avec compte et mois ciblés ; les placements restent en lecture seule et dirigés conceptuellement vers Patrimoine. `95b57664` trie les preuves par date décroissante valide et ne crée jamais un lien pour une date impossible. Faux `calendarDate` corrigé dans la suite UX. **34/34 tests UX V8** sur le dernier code, et syntaxe V8 des fichiers app/test/release confirmée. Ce ne sont PAS des tests Node natifs complets ni Safari physique.

**Blocage prioritaire** : aucun moteur PG/PGlite local installé, aucun réseau git/npm ; exécuter les quatre suites PG migrations 05–12 sur clone fictif lorsque moteur et checkout isolé disponibles. La migration 12 reste NON APPLIQUÉE et production strictement **NO-GO** (~58 % ±10). Ensuite qualification Safari physique, sécurité RLS/CAS, flux Couple/FX, import PDF/CSV/OCR, rollback et transition 5.36.x. Aucun effacement ou modification de données bancaires réelles.

---

# ADDENDUM PRIORITAIRE — 26 OCTOBRE 2026 — QUALIFICATION JUSTIFICATIFS + PLACEMENTS

**Dernier commit code/test confirmé :** `fd2ee4b297ed009cf99db14df60e4f099d41cd8e` sur `trace-5.37.0-international-accounts-fx`. Revérifier le HEAD live avant tout nouveau travail (des commits documentaires peuvent suivre). Depuis `3a9a0acb`, correctif `a2a1db79` : les liens entre opérations de placement et banques ne permettent plus à une simple pièce de relevé ou à une transaction d'avant rapprochement de masquer un vrai montant ou une alerte. Les soldes d'ouverture de fin de journée sont correctement respectés par l'encart bancaire. Test UI augmenté à 28 cas. `fd2ee4b2` aligne les harnais isolés financiers et legacy.

**Tests exécutés : 107/107 V8 sur sources GitHub** (28 UI comptes, 34 intégrité monétaire, 45 legacy CAD) avec Node/DOM/VM simulés. Pas de checkout natif `node --test`, PG/PGlite, Safari réel. Aucun moteur PG trouvé localement, pas de réseau Git HTTPS ; ne pas déclarer la release prête. Migrations 05–12 non qualifiées/non appliquées. Production **NO-GO**, ~58 % ±10. Ne jamais toucher `main`, CI/Actions, PR/merge, déploiement, SW production, Supabase réel ou transactions utilisateur ; commits uniquement `[skip ci]`.

**Suite** : qualification PostgreSQL isolée avec faux foyers pour les quatre suites, puis contrôle complet sur Safari iPhone, flux bancaires/couple/FX, import PDF/CSV, récupération/restauration et finition UX premium. Ne pas recommencer la conception.

---

# ADDENDUM — 26 OCTOBRE 2026 — REPRISE FINIE DU DIAGNOSTIC BANCAIRE

Revérifier HEAD live de `trace-5.37.0-international-accounts-fx` ; stable `main` connue `02c70f50e7e51da79b77a91dde96a03c6c719909`. Ne jamais toucher main, CI/Actions, PR/merge, PWA/SW prod, migrations hébergées, Supabase et données réelles ; chaque commit `[skip ci]`.

**Nouveau vrai correctif** `e8df42b` : dans `openTraceAccountDetail`, l'alerte FX/justificatifs n'est plus supprimée par un rapprochement récent sans solde réel ou dans la mauvaise devise. Aligner avec `accountEstimate` : date `TraceInternational.calendarDate`, `TraceInternational.exactMoney(actualBalance)`, devise native `currency||CAD`, statut confirmé. Aucune modification des données. Tests `92a0683` incluent 3 cas supplémentaires et un faux moteur `calendarDate/exactMoney`. **102/102 tests V8 vérifiés** : 23 fiche compte, 34 financiers, 45 historique CAD, vrai code GitHub avec Node/DOM simulés. Ne pas annoncer Node CLI, Safari ou PostgreSQL exécutés.

**Prochaine priorité** : moteur PG/PGlite isolé fictif, quatre suites de qualification migrations 05–12, puis tests iPhone, réconciliation/imports et dernière finition UX premium. Migration12 non appliquée et NO-GO prod. ~58 % ±10.

---

# ADDENDUM — nouveau lot : empreintes FX, auto-transferts, alertes compte

Reprendre depuis le vrai HEAD de `trace-5.37.0-international-accounts-fx`. `main` connue stable `02c70f50e7e51da79b77a91dde96a03c6c719909`, ne jamais changer. Commits `[skip ci]`, aucun PR/merge/CI/Actions, déploiement, migrations hébergées ou données Supabase réelles.

**Code livré :** `trace-international-1.0.0.js` (commit `eaaccd8`) retire l'ancien `importFingerprint` lorsque la devise banque native d'un transfert confirmé est corrigée (sans casser CAD→CAD legacy), tests `164af90`. `v5-app-5.37.0.js` (`d8828e1`) refuse les auto-transferts mal formés en valorisation de compte, tests `b52a872`. Nouveau module lecture seule `traceAccountBankProofNotice` intégré à la fiche des comptes (commits `2604cf1`, `557181e`, `175ec87`, CSS `64c1883`), diagnostic des devises natives inconnues, montants bancaires/placements sans preuves, auto-transfert, dédoublonnage des opérations placées liées. Respect date ouverture (inclusive) vs date dernier rapprochement (exclusive). Tests `55e56e5` + `21cd0eb` : 20/20 fiche compte.

**Vérification** : 275 tests/scénarios JavaScript et statiques réussis **en plusieurs lots V8** sur les sources GitHub (avec dépendances Node/DOM/RPC simulées ; certains lots avant les ultimes changements localisés UX). Deux harnais PG validés seulement syntaxiquement. Aucun véritable PostgreSQL/PGlite, aucun `node --test` sur checkout complet, aucun Safari physique, aucune donnée réelle. Production **NO-GO** et ~58 % ±10. Prochaine étape prioritaire : PG local avec 4 suites, puis recette premium iPhone, FX/Couple/legacy et rollback. SQL migrations 05–12 NON APPLIQUÉES, ne jamais déployer migration12 sans plan ancien client et autorisation explicite.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — PREUVE DE DEVISE BANQUE ET PLACEMENTS

Résoudre le HEAD GitHub de `trace-5.37.0-international-accounts-fx` à la reprise. Ne jamais toucher `main` (stable connue `02c70f50e7e51da79b77a91dde96a03c6c719909`), Supabase réel, données financières, PR, merge, CI/Actions, service worker production, déploiement. Commits `[skip ci]`. Ne PAS recommencer les choix UX/financiers validés.

**Nouveau code :** `trace-international-1.0.0.js` (`662a98a`, `d738ba8`) refuse désormais les réceptions bancaires de transferts FX sans `toBankCurrency`, ainsi que les sorties et versements banque/épargne/placements en devise étrangère sans `bankCurrency` / `investmentCurrency` explicitement attestées. Les historiques CAD→CAD sans champs devises restent admis. Les nouveaux parcours de capture manuelle et smart ajoutent les devises requises. Absence de preuve = `null`, jamais taux=1 implicite ou somme étrangère calculée sur CAD.

**Tests récents :** `tests/trace-international-money-integrity.test.cjs` nouveaux cas sources, destinations et placements; `tests/trace-international.test.cjs` fixture CAD→EUR avec EUR déclaré; `tests/trace-international-legacy-ledger.test.cjs` `7b56ff1` corrige une dépendance test `traceBudgetPostingMonth` manquante, ajoute scénario budget différé. **249/249 tests V8** exécutés sur les sources Github actuelles dans plusieurs lots : 28 money, 13 UI comptes, 27 CAS, 8 smart FX, 27 international, 10 investissements, 8 Couple, 9 épargne, 11 banque, 19 invariants, 45 legacy, 44 contrats SQL/release. Environnement de tests avec Node/VM/DOM/RPC simulés, pas de vrai `node --test` checkout, aucune exécution PG/PGlite et aucun Safari physique. Les deux harnais PG n'ont été vérifiés qu'en syntaxe JS.

**Suite** : PostgreSQL/PGlite fictif impératif migrations 05–12 et 4 suites, puis FX couple/imports/placements/UX premium iPhone, revue des documents internationaux anciens sans devises attestées (ne pas corriger automatiquement). Avancement prudent ~58 % ±10, production NO-GO.

---

# ADDENDUM — 25 OCTOBRE 2026 — COUPLE MULTIDEVISES, SITUATION GLOBALE FIABLE

Vérifier en premier le vrai HEAD live de `trace-5.37.0-international-accounts-fx` et `main` (stable connue `02c70f50e7e51da79b77a91dde96a03c6c719909`). Ne pas reprendre la conception ni réouvrir décisions UX/finances validées. Code candidat seulement, commits `[skip ci]`. Jamais PR/merge, Actions/CI, déploiement, service worker de production, Supabase réel ou données financières réelles.

**Nouveau lot commité :**
- `v5-app-5.37.0.js` `eb8bf44`, `9196905` : l'Accueil Couple FX ne publie plus `checkingCAD`, `cardDebt` ou situation nette si des centimes dépassent la précision sûre. Une somme de comptes opposée à une dette artificiellement compensée reste bloquée. Réinitialisation des alertes d'avoir carte après correction.
- `trace-international-1.0.0.js` `75ab7b5` : `snapshot` vérifie séparément sommes de comptes courants et cartes avant de publier `globalCAD`.
- `tests/trace-international-couple-home.test.cjs` `1d115b9`, `tests/trace-international-money-integrity.test.cjs` `eb408e4` : cas d'overflow, compensation, petit centime et correction d'avoir.

**Preuves exactement exécutées : 114/114 V8** sur vraies sources GitHub, avec fausses dépendances Node/DOM/RPC (22 finance, 8 Couple, 13 UI, 27 CAS, 11 release gates, 33 contrats SQL), plus parsing V8 de deux suites PG. **AUCUN** vrai PG/PGlite, Node CLI checkout complet, Safari ou backend réel. Migrations candidates 05–12, notamment cutover12, non exécutées et non autorisées. Ne pas hausser estimation de ~58 % ±10 sur cette seule preuve. Prochain chantier prioritaire : exécuter quatre suites PG isolées avec faux foyers, puis compléter FX/Couple, imports, interface premium et recette Safari. Production NO-GO.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — SOLDES COURANTS / COUPLE AU CENTIME

Résoudre le HEAD courant de `trace-5.37.0-international-accounts-fx`, seul espace de travail autorisé. Stable `main` connue `02c70f50e7e51da79b77a91dde96a03c6c719909`. Jamais Supabase réel, finance utilisateur, PR/merge/CI, Actions, déploiement, production ni modifications main. Tous commits `[skip ci]`.

**Nouveau code réel :** `v5-app-5.37.0.js` commits `5f63f9c`, `3cf397e` : `accountEstimate` refuse toute somme numériquement non sûre de transactions et investissements, vérifie chaque étape **contre le solde d'ouverture/rapprochement** pour empêcher qu'une entrée et sortie opposées cachent un dépassement intermédiaire. `bank('la'|'partner'|'couple')` contrôle chaque somme de comptes CAD, cartes et dettes, et affiche `null` au lieu de chiffres inventés. Test `tests/trace-international-money-integrity.test.cjs` `bee1bb1c` ajoute 5 scénarios fictifs extrêmes et centimes normaux.

**Résultat exact de l'exécution : 93/93 tests V8 réussis** sur vrais fichiers du dépôt (20 finances, 13 UI, 27 CAS client, 33 contrats statiques SQL) avec imports Node/DOM/RPC simulés. Deux harnais PG syntaxe V8 PASS. **Aucune** vraie exécution PostgreSQL/PGlite, Node CLI checkout complet, Safari/iPhone ou Supabase hébergé. SQL 05–12 dont bascule CAS 12 NON QUALIFIÉ/NON APPLIQUÉ. Préserver historique CAD, pas de conversion FX inventée, débit différé quarantaine, et UX premium validée. Prochaine étape stratégique : obtenir moteur PG fictif et qualifications PG/RLS puis recette Safari/flux financiers. ~58 % ±10 ; production NO-GO.

---

# ADDENDUM — 25 OCTOBRE 2026 — ALERTES ET SOLDE ACCUEIL INTERNATIONAL

Vérifier le HEAD live de `trace-5.37.0-international-accounts-fx`. Commits `[skip ci]` récents : `daa260b` et `0952ad4` (pas d'anciens chiffres quand dernier courant disparu/archivé) ; `ec256fc` et `140d893` (avertissements explicites si carte multidevise mal liée ou lien de règlement ambigu). **13/13 tests fake-DOM V8 exécutés sur vraie UI**, dépendances Node simulées ; aucun Safari physique et pas de suite native `node --test`. Pas de PostgreSQL/PGlite local ni d'accès DNS npm ; **SQL 05–12 NON QUALIFIÉ, migration12 NON APPLIQUÉE**. Aucune PR, merge, CI, déploiement, données Supabase réelles, modification main (stable connue `02c70f50e7e51da79b77a91dde96a03c6c719909`). Garder ~58 % ±10 et NO-GO.

Next : exécuter PG isolé fictif (4 suites), puis UI Safari et flux FX/Couple/cartes historiques, stabilité, sauvegardes/restauration. Ne pas recommencer les choix UX/UI déjà approuvés.

---

# ADDENDUM RECTIFICATIF — 25 OCTOBRE — TOTAUX SÛRS ET ARRONDIS

Derniers commits supplémentaires `41481110` (arrondi final à 2 décimales après validation des centimes sûrs, dans `trace-international-1.0.0.js`) et `5dcbf143` (test 0,10+0,20 / 0,30−0,20) sur la branche internationale, `[skip ci]`. **Bilan final corrigé : 20/20 tests V8 de ce lot** — 15 vrais scénarios financiers + 5 contrats SQL12, Node simulé. Aucun vrai PostgreSQL/PGlite, aucun Safari physique, aucune activation de migration12 ni modification main, Supabase réel. Priorité inchangée : PG fictif puis validations app.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — PROTECTION DES CENTIMES ET MIGRATION 12 EXHAUSTIVE

Au début de la prochaine conversation, vérifier le vrai HEAD sur `trace-5.37.0-international-accounts-fx`; la stable `main` connue est `02c70f50e7e51da79b77a91dde96a03c6c719909`. Continuer le développement sans reprendre les décisions fonctionnelles. Aucun deploy, PR, merge, Actions/CI, Supabase réel, migration appliquée sur environnement hébergé ou modification de `main`. Commits uniquement `[skip ci]`.

**Nouveau moteur financier** : `trace-international-1.0.0.js` refuse maintenant les centimes dépassant `Number.isSafeInteger` dans `exactMoney`, et toute source invalide dans `fxValue` ; `snapshot` affiche global CAD ou dette nette inconnus si leur somme n'est plus exprimable en centimes fiables. Distinction compte principal vs total tous comptes respectée (un autre compte non sélectionné ne rend pas le solde principal faux). Commits `d1c12094`, `da3f78b6` et tests `4838a1eb`, `39eb2b24`.

**Nouveau SQL candidat cutover 12** : suppression des droits colonne `INSERT/UPDATE` sur TOUTES les colonnes de `documents` et `UPDATE` sur TOUTES celles de `households`, via boucles `pg_attribute`. Postflight revérifie TOUTES les colonnes et les droits effectifs `anon`/`authenticated`. Cas adverse fixture grants sur `documents.created_at/updated_at`, `households.created_at` révoqués dans `tests/trace-cas-exclusive-cutover.integration.cjs` (PG non exécuté). Commits `21fd483a`, `bf96a861`, tests statiques `ebf5b97d`, `3dd4586`. Rappel impératif : migration12 refuse les écritures directes 5.36.x et restera NON APPLIQUÉE sans validation explicite.

**Vraies preuves de cette session :** 14/14 tests fonctionnels International et 5/5 contrats SQL12 exécutés via V8 avec véritables sources GitHub et imports Node simulés. JS syntax de la suite d'intégration PostgreSQL PASS. Ni `node --test` natif checkout, ni PostgreSQL/PGlite, ni Safari : NE PAS annoncer les migrations qualifiées. Documentation officielle PostgreSQL 17 consultée pour les permissions TABLE/COLUMN. Main inchangée, pas de données réelles.

**Prochain objectif** : moteur PostgreSQL/PGlite isolé avec faux comptes, exécuter migrations 05–12 et 4 suites PG, corriger les défauts réellement observés. En parallèle finir la qualification métier FX, Couple, cartes, PWA premium Safari et restaurations. Production **NO-GO**, progression indicative ~58 % ±10.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — NOUVEAU CHANTIER CAS EXCLUSIF / MIGRATION 12

**Revérifier en premier lieu le HEAD live** de `trace-5.37.0-international-accounts-fx`; main stable confirmée `02c70f50e7e51da79b77a91dde96a03c6c719909`. Enchaîner les développements sans revalidation à chaque lot mais ne jamais toucher à main, Supabase réel, comptes bancaires, PR, merge, CI/Actions, SW de production ni déploiement. Tous les commits `[skip ci]`.

**Acquis MAJEUR de ce lot :** candidate `migrations/12-trace-cas-exclusive-write-cutover.sql` (`a714bdc`, `35c8e61`) exige CAS RPC, RLS sur foyer/docs, cinq triggers 08–11, preuve CSV activée et UNIQUE avant d'enlever les droits SQL directs `INSERT,UPDATE,DELETE` sur `documents` en table/colonnes, ainsi que tout `UPDATE` direct sur `households` (nom inclus). Assertions des privilèges effectifs vérifiées dans la même transaction. Aucun JSON financier modifié. **NE PAS APPLIQUER** : les clients 5.36.x seront incompatibles sans coordination et 05–12 ne sont pas qualifiées sur vrai moteur.

**Nouvelle suite native candidate** `tests/trace-cas-exclusive-cutover.integration.cjs` créée : préflight fail-closed (10/11 absentes, perte index CSV), droits directs refusés des deux membres, RPC CAS normales encore permises, ancien/sans accès refusés, settings et index inchangés, refus renommage direct, idempotence. Quatrième suite maintenant obligatoirement incluse au gate de release `scripts/check-trace-537-release-gates.cjs` avec tests négatifs de statut. `tests/trace-cas-exclusive-cutover-contract.test.cjs` contient 5 contrats structurels.

**Tests réellement exécutés** : **71/71 V8** sur source GitHub et dépendances Node simulées (vrai adaptateur client, faux RPC, faux sous-processus, contrats SQL). Syntaxe V8 des deux harnais PGlite valide. **PAS** de `node --test` natif, pas de moteur PostgreSQL/PGlite local installé (DNS npm inaccessible), pas de test RLS/SQL réel, Realtime, Safari ou essai de restauration récente. Ne pas annoncer GO ni hausser le % sur ces seules preuves.

**Suite critique** : obtenir PostgreSQL/PGlite LOCAL avec données entièrement fictives, exécuter migrations 05–12 avec les 4 suites d'intégration, corriger les erreurs SQL natives. Faire la transition versions 5.36.x→5.37 des clients sans casse puis continuer FX, Couple, cartes, premium UX/Safari, backup/rollback/Realtime. Maintenir **NO-GO / ~58 % ±10** jusqu'aux qualifications.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — RACE CONDITION SUR LES ÉCRITURES CLIENT CAS

**Reprendre sur le HEAD actuel** de `trace-5.37.0-international-accounts-fx` (revérifier GitHub au début, ne pas réutiliser aveuglément l'ancien SHA). `main` connue stable `02c70f50e7e51da79b77a91dde96a03c6c719909`. Chaque commit `[skip ci]`. Aucune donnée Supabase réelle ni migration hébergée, aucune opération budgétaire client, aucun PR/merge/CI/workflow/déploiement, aucune mise à jour de main ni service worker de production.

**Nouveau vrai correctif client** `cfd340c1bfac99a63e97809a325c826cf8f5ea09` dans `v5-app-5.37.0.js` : `saveDocument(collection,item)` capture `JSON.parse(JSON.stringify(item))` AVANT mise en file `traceSerialWrite`, évitant qu'une mutation du même objet après l'appel modifie rétroactivement le montant, le compte, le taux ou les notes envoyées. Deux validations différées distinctes au moment du RPC : objet LIVE (peut avoir basculé différé) ET capture (intention originale). Révisions CAS et refus des écritures différées inchangés. Tests fonctionnels ajoutés `3e0016a5d94916e067f0efa04be0bb8b079ab3ae`, `2147f10837a1925f411bafbbf378b7cf4910b9be`.

**Résultat exact** : **55/55 tests V8 exécutés**, comprenant des tests de comportement réel de l'adaptateur avec faux `client.rpc` en mémoire, et contrats statiques SQL/JS. Deux écritures d'un objet avec valeurs 40 puis 41 restent 40 puis 41 malgré mutation à 900, y compris note profonde ; test d'une mutation tardive `deferredKind`, BigInt non serialisable et carte qui devient différée. **Ce n'est pas une exécution Node CLI native**, PG/PGlite, navigateur ou iPhone Safari. Le harnais d'intégration PG passe son contrôle syntaxique JS V8, MAIS les migrations 05–11 ne sont pas exécutées sur SQL.

**Prochain chantier** : tests PostgreSQL/PGlite natifs 05–11 sur base fictive, Auth/RLS/CAS, opérations historiques, index CSV et cascade différée ; puis recette réelle de l'adaptateur sur mobile Safari, contrôle des comptes France/Canada, FX, budgets historiques CAD et UX premium. Ne pas annoncer production prête. **58 % ±10, NO-GO**.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — PLACEMENTS CAS / ANCIEN COMPTE BANCAIRE

**Reprendre au vrai HEAD** de `trace-5.37.0-international-accounts-fx` (à résoudre en direct). `main` stable connue `02c70f50e7e51da79b77a91dde96a03c6c719909`. Commits `[skip ci]`, jamais PR/merge, déploiement, workflows, CI, migration Supabase hébergée, reset ou lecture/écriture de données financières réelles.

**Nouveau lot réel de code candidat** : `c20be62f388d0124b59996f7f8968d65040e5116` renforce `migrations/09-trace-cas-versioned-writes.sql`. Le CAS de modification et suppression d'`investment_operations` vérifie maintenant la propriété et le type bancaire **du document original** (`d.data.bankAccountId`, `accounts`, `owner=actor_slot`, `type=checking`) en plus des contrôles existants du nouveau document et du portefeuille d'origine. Un compte d'origine appartenant à l'autre partenaire ou supprimé refuse l'écriture et laisse l'historique inchangé. `2d2da87707fdf9b18d46ee16a5ddb0f5771cd3e2` ajoute deux fixtures PostgreSQL de régression fictives (anciennes opérations inter-partenaire ou compte bancaire manquant). `548d820edabd84dc32734fe62068c559ac4c0df6` ajoute trois tests statiques. Aucun de ces tests PostgreSQL n'a été exécuté.

**Preuve vérifiée** : **28/28** contrats statiques et lexicaux V8 passés (vrais fichiers candidats + fausses dépendances Node), et syntaxe JavaScript du test d'intégration compilée V8. Pas de `node --test` natif du checkout, pas de PostgreSQL/PGlite isolé, ni Auth/RLS/CAS natifs, navigateur ou Safari. Conteneur sans serveur PG/PGlite, git/registry DNS bloqués. Les anciens tests PG décrits dans `docs/qa/trace-5.37.0-postgresql.json` sont historiques et ne qualifient PAS migrations 08–11 actuelles.

**Prochaine étape prioritaire** : exécuter migrations 05–11 dans un clone PostgreSQL/PGlite fictif, corriger les échecs, qualifier CAS ancien/nouveau portefeuille et compte bancaire, écriture directe héritée, confidentialité/unicité CSV, cascade différée, permissions partenaire/foyer, Realtime et restauration. Ensuite poursuivre les flux financiers et UI premium déjà validés. Préserver la quarantaine différée. **NO-GO, 58 % ±10**.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — SOURCE CSV UNIQUE ET RPC FAIL-CLOSED

**Reprendre sur le vrai HEAD de** `trace-5.37.0-international-accounts-fx` ; ne pas reprendre un ancien SHA de cet addendum. `main` connue `02c70f50e7e51da79b77a91dde96a03c6c719909`. Interdiction : main, PR/merge, CI, déploiement, Supabase réel, données financières ou migrations hébergées. Tous commits `[skip ci]`.

**Nouvel acquis code CANDIDAT du 25 octobre** : migration 11 ajoute index unique partiel `trace_csv_unparsed_source_unique` sur foyer/titulaire/compte/fichier/ligne (numéro normalisé en INTEGER ; "0004" et 4 identiques), précontrôle des anciens documents incomplets, borne `accountId` 240 ; fail-closed de `trace_csv_evidence_guard_ready()` si index absent, non unique ou invalide. Commits `9de886e`, `71f0b96`, `a5f207b`. Tests PG préparés `102491f`, `97c334e`, `19fa718`, `ae8ca41`; contrats V8 `1d62ffb`, `dcf149b`.

**Dernières vérifications RÉELLES** : **20/20 contrôles V8 statiques/lexicaux** avec faux Node fs/path/assert/test sur sources GitHub, compilation syntaxique V8 du harnais. **AUCUN** PostgreSQL/PGlite, aucune migration SQL réellement compilée/appliquée, aucune suite Node CLI complète, aucun Safari. Sur ce conteneur : Node 22, `pg_config` client/dev mais **pas** de binaire `postgres`/`psql`/`initdb`, pas de PGlite, DNS npm/GitHub indisponible.

**Suite immédiate** : qualifier SQL 05–11 sur PostgreSQL/PGlite entièrement fictif avec tests `trace-cas-writes.integration.cjs`, `trace-database.integration.cjs`, `trace-personal-settings-ownership.integration.cjs`, notamment index d'unicité, collision de lignes, RLS/CAS/JWT, deux partenaires/deux foyers, suppression admin CSV+différé, restauration et Realtime. Garder débit différé en quarantaine et production NO-GO ; puis poursuivre les modules financiers et l'UX premium. **Avancement 58 % ±10**.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — INDEX UNIQUE DES LIGNES CSV BANCAIRES

**HEAD à revérifier** sur `trace-5.37.0-international-accounts-fx`. Stable `main` `02c70f50e7e51da79b77a91dde96a03c6c719909`. Aucun merge, PR, workflow, déploiement, migration hébergée, Supabase réel, reset ni donnée financière personnelle. `[skip ci]` pour chaque commit.

**Nouveau développement candidat dans migration 11 :** index unique partiel `trace_csv_unparsed_source_unique` sur foyer/owner/accountId/nom de fichier/numéro de ligne ENTIER (pour traiter 4, "04", "000004" comme même ligne), précontrôle qui refuse les preuves antérieures malformées ou les collisions au lieu de les écraser ; borne `accountId<=240`. Commits SQL `9de886e`, `71f0b96`. Tests PostgreSQL ajoutés mais NON exécutés dans `tests/trace-cas-writes.integration.cjs` : deux IDs sur même source, numéro rembourré, écriture directe, distinction ligne suivante et compte propriétaire différent (`102491f`, `97c334e`, `19fa718`). Contrats statiques `1d62ffb`.

**Niveau de preuve :** 19/19 tests V8 statiques/lexicaux réussis avec modules Node simulés ; syntaxe V8 du harnais PG réussie. **Zéro exécution SQL PostgreSQL/PGlite**, pas d'exécution native Node `node --test` sur checkout intégral ni tests navigateur/Safari. Conteneur sans moteur PG, `npm` sans DNS. Le correctif administrateur pour cascade différée de migration 10 reste candidat non qualifié.

**Étape prioritaire :** obtenir moteur PostgreSQL/PGlite local isolé fictif, exécuter 05–11 et trois suites d'intégration, vérifier index collision `23505`, ancien SQL direct, cascade admin / suppression légitime, RLS/Auth/CAS/Realtime/restore ; corriger les erreurs réelles avant release. Poursuivre ensuite les fonctionnalités financières et l'UX premium validées. **58 % ±10, NO-GO.**

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — CASCADE ADMINISTRATIVE / DÉBIT DIFFÉRÉ

**Reprise** : revérifier HEAD de `trace-5.37.0-international-accounts-fx`. Stable main `02c70f50e7e51da79b77a91dde96a03c6c719909` inchangé. Aucun merge, PR, CI, déploiement, Supabase réel, reset ni migrations exécutées sur environnement hébergé. Commits exclusivement `[skip ci]`.

**Nouveau code candidat :** migration 10 (`724ab694`) contient une exception très stricte permettant une suppression en cascade de document différé **uniquement** lorsque le foyer parent n'existe déjà plus dans la même transaction, `auth.uid()` est NULL, et `current_user=session_user='postgres'`. Refus des suppressions directes, modifications et créations différées conservé ; absence de RPC de suppression de foyer par membre. Développement non qualifié par moteur SQL : ne pas le considérer résolu.

**Tests préparés :** `4cb1c4a` (tests de cascade admin et refus direct/membre), `301e675` (même foyer fictif avec preuve CSV privée), `73a1de5` (connexion admin munie d'un JWT refusée), `d21a881` (contrats statiques migration 10). **17/17 tests statiques/lexicaux V8 sous imports Node simulés** ; JS du harnais PGlite parse sous V8. **AUCUN TEST PG/PGlite réellement exécuté**, aucun test de l'ordre des triggers ou cascade du vrai moteur, navigateur/Safari, Realtime, backup/restore. Le faux foyer a quatre documents candidats, zéro donnée réelle.

**Priorité suivante** : exécuter réellement migrations 05–11 et suites `tests/trace-cas-writes.integration.cjs`, `tests/trace-database.integration.cjs`, `tests/trace-personal-settings-ownership.integration.cjs` sur PostgreSQL/PGlite complètement fictif avec autorisations ; corriger les échecs et concevoir l'effacement membre sans privilège indu. Garder débit différé en quarantaine. Puis reprendre qualification FX, Couple, PDF/OCR, UI premium, PWA/Safari et scénarios de backup/rollback. **58 % ±10 ; NO-GO**.

---

> **Complément vérifié — 25 octobre 2026 :** commit `c8e27041a6fd02e11ebc022607ead8bf064f469a` (`[skip ci]`) : le test de suppression refusée vérifie désormais également que la ligne `household_members` et la sauvegarde `trace_v5_backups` survivent à la transaction avortée. **12/12 tests de contrat/lexique exécutés sous V8 avec `node:fs`, `node:path`, `node:assert` et `node:test` simulés, sur sources GitHub actuelles ; aucune exécution PostgreSQL ni suite Node native.** Les tests d'effacement PG restent NON exécutés et représentent un NO-GO.

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — BLOCAGE D'EFFACEMENT DES FOYERS HISTORIQUES

**HEAD à revérifier à la reprise** : ne jamais supposer le SHA de cet addendum. Branche exclusive `trace-5.37.0-international-accounts-fx`, `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909`, commits `[skip ci]`. Interdits inchangés : PR, merge, CI, déploiement, migration réelle, Supabase réel et tout reset.

**Nouveaux commits** : `c195aeeb6ba5ec43200f1bfc4ea3812919ed1e47` (test multi-foyer différé), `666c86668e8ec31a65b9473f6e9ff832e419324e` (UUID fictif SQL paramétré), `333c2c98f2ee378f46fe53034ce5b1c565ef6d08` (limites + immutabilité CSV). Dans `tests/trace-cas-writes.integration.cjs`, un quatrième utilisateur fictif crée un second foyer d'archive contenant avant migration 10 une carte EUR différée et un achat historique. **Comportement actuellement attendu à confirmer sur moteur PostgreSQL :** la suppression administrateur du foyer est refusée par `TRACE_DEFERRED_NOT_RELEASED`. C'est une **barrière produit**, PAS un test de suppression réussie. La suppression par membre est aussi non autorisée (schéma V4). Autre scénario : source CSV trop longue, nom >110, index hors plage, `rawFingerprint` / `rawTruncated` immuables.

**Preuve de cette session : compilation syntaxique V8 du fichier test seulement** ; aucune exécution PostgreSQL/PGlite, aucune confirmation des nouveaux scénarios, pas de Node CLI sur checkout complet, ni Safari. Les `98/98` V8 du lot précédent ne doivent pas être attribués à ces nouveaux scénarios. Le conteneur n'a ni Postgres/PGlite ni accès DNS GitHub. Les migrations 10/11 restent candidates et non appliquées.

**Prochaine priorité :** obtenir un PostgreSQL/PGlite isolé fictif, exécuter migrations 05–11 et les suites intégration. Qualifier un chemin d'effacement légitime *sans supprimer les protections contre la destruction d'une preuve isolée ou les écritures différées* ; qualifier aussi les accès des partenaires/foyers, CAS, RLS, Realtime, sauvegarde/restauration et rollback. Débit différé toujours en quarantaine, production **NO-GO**, progression **58 % ±10**. Continuer ensuite les fonctionnalités financières et l'UX premium déjà validées.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — INTÉGRITÉ DES PREUVES CSV LONGUES ET TEST MULTI-FOYERS

**HEAD technique AVANT commit documentaire :** `9ef4e4e37831bf235f6ffb45aa7408915551ec83`. Résoudre le vrai HEAD de `trace-5.37.0-international-accounts-fx` au début de toute prochaine mission. Stable `main` inchangée connue `02c70f50e7e51da79b77a91dde96a03c6c719909`. Aucun déploiement, merge, PR, CI, modification SW production, Supabase réel, SQL appliqué, reset, ou donnée financière personnelle manipulée. Commits `[skip ci]`.

**Travaux code candidat de cette session :**
- `cd94b0a5bd1631fd58ad76d06feafaa51ab9eeea` : `csvUnparsedRecord` refuse désormais un nom de fichier CSV dépassant 110 caractères au lieu de le tronquer silencieusement (évite des collisions avec deux noms longs ayant le même préfixe). Pour les lignes bancaires dépassant 650 caractères, conserve l'extrait à 650 mais enregistre `rawTruncated:true` et affiche un avertissement clair dans la fiche Activité → Importer : le relevé CSV original doit être vérifié avant d'attester la revue. Contrôle d'immuabilité de ce flag pendant l'UI ; tests.
- `2da832a6613a0a7727cf304a750646309aac204e` : ajoute `csvRawEvidenceFingerprint` (empreinte **NON CRYPTOGRAPHIQUE FNV-1a 64 bits**, stable et déterministe sur la chaîne UTF-16 complète de la ligne) stockée comme `rawFingerprint`. Sert uniquement à repérer des modifications accidentelles après les 650 caractères visibles. La réimportation d'une ligne longue présentant le même préfixe mais une fin modifiée est maintenant signalée comme conflit de source. **Ne pas présenter comme un hash SHA, preuve bancaire, signature, système de sécurité, garantie d'unicité, ni résistance à un adversaire.** Les documents anciens sans empreinte qui étaient tronqués demandent une revue prudente. Tests de réimport identique, divergence en fin de ligne et changement en cours de revue.
- `f49610b013e243c4038f358a8e233dbcf261ac4c`, `9ef4e4e37831bf235f6ffb45aa7408915551ec83` : enrichissent `tests/trace-cas-writes.integration.cjs` d'un test fictif : troisième utilisateur forme un **deuxième foyer indépendant**, crée un compte et une preuve CSV privée, utilisateurs du premier foyer ne peuvent ni la SELECT ni l'écrire en RPC, puis une suppression **administrative** du second foyer doit déclencher une cascade sans blocage de restauration ; fixture JSONB corrigée. **Test PostgreSQL préparé, NON exécuté.** Vérifier aussi la suppression légitime d'un foyer via RPC utilisateur : le trigger SQL 11 refuse les DELETE individuels de preuve et sa compatibilité avec les cascades autorisées demeure une porte qualité ouverte.

**Preuve actuelle : `98/98` tests V8 exécutés sur les vrais sources candidate avec modules Node, RPC, DOM et FileReader simulés.** Répartition `28` CSV FileReader, `6` comptes, `7` collisions, `5` revue partielle, `24` CAS client, `6` Accueil, `10` revue UI, `8` contrats statiques SQL, `4` lexique SQL. `tests/trace-cas-writes.integration.cjs` passe un contrôle de syntaxe JavaScript V8 seulement : **aucun SQL compilé ni exécuté**, zéro PostgreSQL/PGlite, Auth/RLS/CAS sous base native, vrai Chromium ou Safari physique. Node 22 est présent dans le conteneur mais aucun `postgres/psql/initdb` ou PGlite, DNS GitHub/npm indisponible ; GitHub connector sert uniquement aux commits sur branche. Le module `trace-sql-lexical-integrity.test.cjs` n'est pas un parseur PostgreSQL.

**Éléments de documentation externe vérifiés :** Supabase Realtime sous RLS ne garantit pas la disponibilité des valeurs complètes de `payload.old` même avec `REPLICA IDENTITY FULL`. Vérifier les comportements Realtime et les droits sur deux abonnements fictifs avant GO. Actuellement `v5-app-5.37.0.js` charge les documents par SELECT et n'a pas de gestionnaire direct `postgres_changes` dans ce fichier ; ne pas prétendre que synchronisation live est qualifiée.

**Prochain objectif INCHANGÉ :** qualification fictive complète des migrations 05–11 par `tests/trace-cas-writes.integration.cjs`, `trace-database.integration.cjs` et `trace-personal-settings-ownership.integration.cjs` sur vrai PostgreSQL/PGlite local avec deux membres ET deux foyers, JWT/RLS, DELETE en cascade / effacement légitime, cas de restauration/admin, Realtime et révisions CAS. Sans cela, NO-GO. Puis vrai navigateur, iPhone Safari, SW preview régénéré uniquement par `scripts/build-trace-preview-pwa.mjs`, PDF contrôle, transactions FR/CA/FX couple et débit différé avant GO explicite. Prioriser les vraies fonctionnalités financières sans réinitialiser les décisions et sans toucher aux budgets historiques CAD ni à `main`.

**Estimation globale qualitative inchangée : 58 % ±10 points (~42 % restant), PRODUCTION NO-GO.** Conversation longue : recommander un nouveau chat après ce point ; commencer par lire intégralement les trois documents de `docs/`.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — FIX MIGRATION SQL 11 ET COLLISION CSV BIDIRECTIONNELLE

**HEAD de code au moment de la rédaction** : `a6bd854de0a3618786d58fc056431708611a65d3`. Vérifier et utiliser le vrai HEAD de la branche `trace-5.37.0-international-accounts-fx` avant écriture. `main` stable connu `02c70f50e7e51da79b77a91dde96a03c6c719909` demeure intouché ; `[skip ci]` partout. Pas de PR, merge, CI, déploiement, PostgreSQL réel, lecture ou écriture Supabase réel.

**Défaut critique découvert par audit manuel :** `migrations/11-trace-csv-unparsed-owner-privacy.sql` contenait un littéral regex SQL non terminé près de `sourceIndex` : `'^[0-9]{1,6}` (guillemets/fin d'expression absents). **Ce fichier n'était pas exécutable tel quel.** Cause racine confirmée : `String.replace(old,newString)` interprète le jeton JavaScript `$'` dans une chaîne de remplacement comme « reste de la chaîne source », ce qui déformait le SQL. `595e66965dbfabf00e5067805beb3c0b7ebdd579` a été une première tentative de correction **défectueuse et remplacée aussitôt** ; le commit correctif final est `26dcc704446798a900aed5623479d6867d2b3a6e` reconstruit depuis le contenu antérieur par `replace(pattern,()=>replacement)` sans interpolation `$'`. La migration actuelle contient un `CASE WHEN ... ~ '^[0-9]{1,6}$' THEN ...::integer not between 2 and 1001 ELSE true END` pour refuser les index non numériques sans conversion dangereuse.

**Nouvelle barrière de test :** `71739b3da130a37a69125517cf41c1418a7f6ee2` ajoute `tests/trace-sql-lexical-integrity.test.cjs`, quatre tests contrôlant les chaînes SQL, commentaires et corps dollar-quotés des migrations candidates 07–11 ; regex `sourceIndex` strictement terminée, règle CASE validée, simulation d'une regex volontairement amputée qui DOIT faire échouer le contrôle, unicité de la policy/trigger/RPC. Ceci est un **contrôle lexical, PAS un parser PostgreSQL** et ne remplace pas l'exécution des migrations ni les tests Auth/RLS.

**Deuxième lacune corrigée (fonctionnelle) :** `4b0377016059c4366cb597fd539d18a457cab031` ajoute `csvConflictingUnparsedEvidence` côté `v5-app-5.37.0.js`. Un même fichier CSV, même compte et même numéro de ligne déjà conservé comme preuve **illisible**, même si la preuve a ensuite été marquée `reviewed`, ne peut plus être silencieusement importé comme nouvelle transaction `pending` après modification du CSV. Vérification en prévisualisation, avant lot, avant chaque transaction ; pas d'effacement de la preuve, pas de dépense/revenu fictif, avis de conflit et nouvelle revue nécessaire. 2 nouveaux cas en harnais FileReader. `a6bd854de0a3618786d58fc056431708611a65d3` met à jour l'ancien test de collision pour vérifier les deux voies (transactions et preuves non interprétées).

**QA réexécutée sur ce dernier HEAD de code : `91/91` tests V8 simulés**, répartis 24 parcours CSV end-to-end fictif, 6 compte, 7 collision, 5 import partiel, 24 CAS client, 6 Accueil, 7 revue des preuves, 8 contrat SQL statique, 4 lexique SQL. Tests exécutent les vrais sources GitHub dans V8, mais les modules Node, l'interface DOM, FileReader et les RPC sont simulés ; **aucune exécution PostgreSQL/PGlite**, aucun `node --test` depuis un checkout complet, aucun navigateur/Safari iPhone. Le test lexical prouve seulement que le bug de littéral tronqué est absent ; une syntaxe SQL valide au sens PostgreSQL et une sécurité RLS correcte restent À PROUVER sur un vrai moteur.

**Gates majeurs non atteints :** qualification sur base PGlite/PostgreSQL fictive des migrations 05–11 avec 2 membres/foyers + JWT, droits SELECT/RLS et RPC SECURITY DEFINER, trigger insert/update/delete, restauration DBA, Realtime `REPLICA IDENTITY FULL`, CAS & écritures legacy, unicité inter-sessions de source CSV ; audit d'accès, rétention/effacement des preuves, UX native Safari + offline/SW généré officiellement, Couple/FX et débit différé atomique. Le conteneur courant a Node mais n'a ni PostgreSQL/PGlite ni DNS pour clone/install. **Jamais substituer le Supabase réel au banc d'essai.**

**Avancement qualitatif maintenu 58 % ±10 points, environ 42 % restant, production NO-GO**. Les nouveaux tests évitent une régression bloquante, mais la vraie qualification reste indisponible.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — PROTECTION FAIL-CLOSED DES PREUVES CSV + RESTAURATION SQL

**HEAD technique avant mise à jour des documents :** `498ea5f99f3a47bd994a7e78a29be7d13436dca8`. La présente mise à jour documentaire créera un HEAD nouveau, à relire au démarrage. Branche de développement EXCLUSIVE : `trace-5.37.0-international-accounts-fx`; `main` référence `02c70f50e7e51da79b77a91dde96a03c6c719909`. Aucune fusion, PR, Actions, déploiement, intervention sur données réelles Supabase, ni application SQL ; tout commit `[skip ci]`.

**Objectif prioritaire de cette itération :** qualifier la confidentialité de `imports.csv_unparsed` avant production. Tentative de moteur isolé : conteneur vérifié `node v22.16.0` disponible, **aucun checkout local**, `psql`, `postgres`, `initdb`, `pg_ctl`, `@electric-sql/pglite` installés ; `git ls-remote` ne peut résoudre GitHub (DNS). Il est donc IMPOSSIBLE de revendiquer une exécution SQL native dans cette session. **Aucun accès au projet Supabase réel n'a été réalisé.** Documentation officielle Supabase consultée (skill + recherche documentaire, sans projets utilisateurs).

**Changements candidats effectifs, commits [skip ci] :**
1. `2e675a6492fcd317fd47b91dcd8d97214e6e8606` : migration `11-trace-csv-unparsed-owner-privacy.sql` autorise une maintenance/restauration sans JWT **uniquement** lorsque `current_user='postgres' AND session_user='postgres'`. Autres accès non authentifiés et utilisateur direct `authenticated` continuent à être refusés. Deux tests PGlite fictifs ajoutés pour l'administrateur et un rôle authentifié sans JWT. Attention : test SQL **non exécuté**.
2. `452f265162f8dd6b93cde2a13e58182195949ca6` : la migration 11 expose un RPC **SECURITY INVOKER**, `public.trace_csv_evidence_guard_ready()`, qui ne renvoie TRUE que si RLS est activé sur `public.documents`, la policy SELECT restrictive `trace_csv_unparsed_private_select` existe et le trigger `trace_csv_unparsed_evidence_guard` est activé. Le client 5.37 requiert maintenant `client.rpc('trace_csv_evidence_guard_ready')` avant d'enregistrer **la première preuve CSV illisible du lot**, et avant d'en clôturer une. Si RPC absent/erreur/false, l'opération sensible est refusée sans écritures ; les CSV entièrement interprétables restent importables en attente comme auparavant. Relecture du contexte bancaire après `await`, de l'extrait lors de sa clôture. Le laboratoire local fictif est exempté seulement via `internationalPreviewMode()` (pas de sauvegarde cloud). Cette sonde est un **marqueur de cutover**, pas une garantie que la RLS/Realtime ont passé des tests.
3. `e3cfdda7d23ccd70ddb87a92d3c45162db0e8611` : 6 cas V8/contrat (3 CSV, 1 revue, 2 statiques) et 1 cas PGlite préparé concernant les grants/ready. `7230365b49685b2458d1e7f30cb54d1de3550444` : 2 cas V8 supplémentaires de modification du compte et de l'extrait pendant l'attente de la sonde.
4. `498ea5f99f3a47bd994a7e78a29be7d13436dca8` : test PGlite préparé pour `trace_csv_evidence_guard_ready` en cas de trigger désactivé, policy supprimée, puis réparation par réapplication de la migration 11. **Non exécuté**.

**Résultat frais sur le HEAD de code : 85/85 scénarios V8 simulés**, huit suites utilisant les vrais fichiers 5.37.0 et les vrais tests, dépendances `node:*`, DOM, FileReader et RPC simulées. Répartition : 22 CSV FileReader, 6 contexte compte, 7 collisions, 5 lignes invalides, 24 CAS client, 6 Accueil, 7 revue CSV, 8 contrats statiques de SQL. Aucun `node --test` natif sur checkout complet, aucune base SQL/PGlite, RLS/Auth/JWT réel, navigateur Chromium, Safari iPhone ou Realtime. Les nouvelles vérifications PostgreSQL se trouvent DANS le test d'intégration mais ne sont PAS des tests passés.

**Procédure exigée dans un checkout isolé et CLEAN, sans Supabase hébergé :**
- Vérifier branche `git branch --show-current` == `trace-5.37.0-international-accounts-fx` et `git status --porcelain` propre, Node fonctionnel.
- Installer `@electric-sql/pglite` uniquement dans l'environnement fictif autorisé (ou définir `TRACE_PGLITE_MODULE` vers son chemin local réel), sans CI/Actions ni identifiants du projet réel ; pas de téléchargement possible depuis cette session.
- Exécuter `TRACE_PGLITE_MODULE=<chemin-local> node tests/trace-cas-writes.integration.cjs` et les autres tests PG `tests/trace-database.integration.cjs`, `tests/trace-personal-settings-ownership.integration.cjs`. Ne jamais substituer `execute_sql` sur Supabase réel.
- Tester intégralement: migrer les 05–11 sur données fictives ; propriétaire et partenaire du foyer, outsider, écritures directes legacy/RPC SECURITY DEFINER, révisions CAS, JWT absent, test de restauration DBA, trigger désactivé/policy supprimée et retour à FALSE, test Realtime avec abonnements de 2 utilisateurs. Corriger tout échec AVANT d'approcher la prod.
- Reconstruire SW **de prévisualisation seulement**, via `node scripts/build-trace-preview-pwa.mjs` puis `--check` sur checkout autorisé ; Safari physique, UX premium, FX/Couple, banque différée, performance, backup/restore/rollback puis GO humain restent obligatoires.

**Progression globale qualitative : 58 % ±10 points, 42 % restant, production NO-GO.** Ne pas augmenter le % uniquement pour cette sécurité supplémentaire non qualifiée. Aucun reset ni migration effective.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — CONFIDENTIALITÉ DES PREUVES CSV, MIGRATION 11 NON EXÉCUTÉE

**HEAD candidat technique avant mise à jour des documents :** `ce0fae9030c280a7d5f620b7aa2ee99c171a6b43`. Revérifier le HEAD réel à la reprise. Écritures EXCLUSIVES sur `trace-5.37.0-international-accounts-fx` ; `main` référence `02c70f50e7e51da79b77a91dde96a03c6c719909`. Tous commits `[skip ci]`. Pas de merge/PR/Actions/déploiement, accès Supabase réel, migration appliquée, suppression ni reset. 5.36.5 reste stable.

**Nouvelle migration candidate à auditer avant toute activation :** `migrations/11-trace-csv-unparsed-owner-privacy.sql`. Prérequiert 05–10 ; fichier créé à la main dans le repo car CLI et checkout natif non disponibles, **NON généré par supabase migration new / NON testé sur SQL réel**. Deux commits :
- `27c521e0a5d0fef59949cdde926c85349bcc69c9` : policy **RESTRICTIVE FOR SELECT TO authenticated** sur `public.documents`, filtrée uniquement sur `collection='imports' AND data.kind='csv_unparsed'`. Une preuve d'import CSV est censée être visible seulement pour le membre dont `data.owner` correspond à son `household_members.slot`. Les autres imports et transactions demeurent sous RLS foyer actuel. Un contournement via vue/Realtime/sauvegarde n'a pas été audité.
- `47dab520cd78f5259f75f815d0b5a479c4281eaf` : trigger `BEFORE INSERT OR UPDATE OR DELETE` sur `documents`, pour détecter les documents `csv_unparsed` anciens et nouveaux même à travers un `SECURITY DEFINER` CAS qui peut contourner RLS. Exige `auth.uid()`, slot membre, compte bancaire du même propriétaire, id/document cohérent, source CSV et limites de longueur/index ; création uniquement en `pending_review`; modification autorisée uniquement `pending_review→reviewed` avec revue attestée par son titulaire ; source, compte, propriétaire et texte bancaire immuables ; DELETE interdit aux sessions utilisateurs. Pas de réécriture de données historiques. Anciennes écritures directes des autres collections restent ouvertes tant que 09 n'est pas qualifiée/cutover. ATTENTION : aucun essai réel SQL ni preuve de comportement en restauration administrative, Realtime ou multi-session.
- `d5626c77fe2f9d9ea01e2057338c7acebec411bc` : cinq scénarios fictifs PostgreSQL ajoutés à `tests/trace-cas-writes.integration.cjs` couvrant lecture propriétaire/partenaire, forgery RPC et direct, immutabilité, clôture et suppression, idempotence migration. `86c2632a374452603e4d23a466f40f5244b64122` corrige la sérialisation JSONB d'une attaque simulée. Tests SQL **écrits, non exécutés**.
- `9a97a700f1291627b48a1fd7428f2a09e01938c7` : limite `CSV_UNPARSED_REVIEW_LIMIT=100` lignes CSV illisibles par fichier pour empêcher 100+ RPC unitaires non bornées (erreur explicite AVANT toute persistance et consigne de vérifier le mapping/fractionner), et test FileReader/DOM fictif. Le reste des lignes valides n'est pas silencieusement tronqué.
- `ce0fae9030c280a7d5f620b7aa2ee99c171a6b43` : `tests/trace-csv-evidence-server-contract.test.cjs`, six contrôles **statiques** de la migration, des tests PostgreSQL et du contrat de non-comptabilisation, sans exécution PostgreSQL.

**Preuve V8 actualisée sur vrai code candidat : `77/77` scénarios sous V8 avec mocks Node/DOM/RPC/FileReader.** Décompte `18` lecteur CSV, `6` contexte, `7` collision, `5` partiel, `24` CAS client, `6` Accueil, `5` revue des extraits, `6` contrôles statiques SQL. Ces `77` ne sont PAS des tests natifs `node --test`, une compilation SQL, une validation RLS, ni une recette Chromium/iPhone.

**Portes qualité priorisées :** PGlite/PostgreSQL fictif migrations 05–11, vérification SELECT/RPC/direct SQL et deux vrais JWT utilisateurs de foyers distincts ; sécurité du `SECURITY DEFINER`, politiques existantes, Realtime et publication `documents` avec `REPLICA IDENTITY FULL`, backup/restauration, rétention et droit d'effacement des extraits ; test des 101 lignes illisibles, batch RPC/performance, vrai FileReader/CSV, PDF de contrôle, iPhone Safari. Le SW de prévisualisation est périmé et doit être régénéré UNIQUEMENT via `scripts/build-trace-preview-pwa.mjs` et `--check` dans checkout isolé. `main`, budgets historiques CAD, Couple/FX et débit différé strictement protégés. Aucune donnée personnelle réelle utilisée.

**Estimatif global TRACE maintenu `58 % ±10` (~42 % restants), car la migration est codée mais la sécurité serveur reste complètement non qualifiée. Production NO-GO.**

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — LIGNES CSV ILLISIBLES CONSERVÉES ET REVUES

**HEAD technique avant ce commit documentaire :** `bdb16d12350ade57c9ccebf50a220bcf913c20e9`. Vérifier le HEAD réel avant prochaine écriture. Branche autorisée exclusivement `trace-5.37.0-international-accounts-fx`; `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909`. Aucun merge, PR, déploiement, action GitHub, application de migration, accès ou écriture aux données Supabase réelles. Tous commits `[skip ci]`.

**Fonctionnalité désormais intégrée dans le CODE CANDIDAT** (ni qualifiée en navigateur ni en SQL) :
- `b13297ce7baf5926c2c0183a54f56c7cc0108ac9` ajoute `csvUnparsedRecord` et `csvUnparsedSourceConflict` : après attestation explicite, chaque ligne CSV non interprétée est conservée dans la collection persistante `imports`, `kind:'csv_unparsed'`, `status:'pending_review'`, titulaire, compte, nom et index de ligne, extrait original tronqué à 650 caractères, identifiant déterministe borné à 240 caractères. Aucun `transactions` créé pour cette ligne, aucun montant`amountCAD`, aucun calendrier certifié et aucune écriture budgétaire. Le stockage des preuves non financières précède les lignes valides en attente ; interruption ultérieure ne les efface pas. Un même nom/compte/index source + autre contenu (ou ancien enregistrement financier au même endroit) bloque l'import. Rejouer le même CSV n'ajoute pas de preuve identique. Un CSV entièrement illisible peut conserver ses preuves si l'utilisateur accepte explicitement. Modification du CSS candidat, pas du style de `main`.
- `69a621f44ba2b6690f3cc4f1287457e4d5103f46` rend ces preuves visibles dans `Activité → Importer` et dans `Accueil → À faire` (comptabilisées comme **éléments** à vérifier, pas transactions), avec revue ouvrant le relevé et confirmation humaine nécessaire pour passer à `status:'reviewed'` ; la revue n'ajoute aucune transaction. Boutons adaptés mobile.
- `0215dad8ec2bcfe71852ac12a0bbd6af5acb5d11` enrichit de 6 cas le banc `tests/trace-csv-reader-flow.test.cjs`. `744fae90dec3ae9bf489ae77242f8753e4a3d938` corrige un vrai défaut détecté par ces tests : ancienne ligne bancaire dans `transactions.importFileName` vs nouvelle preuve dans `imports.sourceFileName`, collision oubliée au premier essai. `c6d7e36c44731b41315ebbf576b1fdc28f5a9751` corrige les tests d'anciens comportements et protège la revue contre modification en place après affichage. `bdb16d12350ade57c9ccebf50a220bcf913c20e9` ajoute `tests/trace-csv-unparsed-inbox.test.cjs` avec vérification d'échappement HTML, périmètre titulaire, consentement, statut revu, zéro opération et changement concurrent local.

**QUALIFICATION CIBLÉE SUR HEAD COURANT : `70/70` tests exécutés en V8**, 7 fichiers réels, véritables sources 5.37.0/International/reconciliation, dépendances Node/DOM/FileReader/RPC simulées. Détail 17 CSV lecture/enregistrement + 6 compte preview + 7 source + 5 partiel + 24 CAS + 6 Accueil + 5 revue Activity. Tests Node CLI natifs, vrai Chromium, Safari iPhone, Supabase, RLS/Auth, PGlite/PostgreSQL et migrations SQL 07–10 **NON exécutés**. Pas de checkout réseau utilisable dans ce conteneur, GitHub/npm DNS et PGlite non accessibles, SW de prévisualisation périmé (ne jamais le modifier manuellement : régénérer uniquement par `scripts/build-trace-preview-pwa.mjs` puis `--check`).

**Risques à traiter avant GO :** cette fonctionnalité prévoit la persistance d'extraits de données bancaires dans le foyer Supabase (consentement explicite affiché) : vérifier RLS, séparation des accès des membres, confidentialité, rétention/suppression et sauvegarde. Un identifiant fondé sur nom de fichier+compte+index est un garde-fou de réimportation et non une preuve d'unicité bancaire universelle. Les extraits sont limités à 650 caractères : besoin de revoir le relevé original, et de vérifier les longs noms de fichier. L'import de grand lot avec nombreuses preuves utilise actuellement une RPC par ligne ; **performance/atomicité inter-clients et limites de taille sont non qualifiées**. Aucune preuve de complétude 100 %, aucune connexion automatique au vrai PDF mensuel, aucun débit différé réel activé.

**Prochaine étape :** checkout natif isolé, tests 07–10 deux utilisateurs Auth/RLS/CAS/grants, tests de confidentialité des imports du couple et concurrence ; Chromium avec FileReader réel, OCR/PDF mensuel et longue liste, adaptation iPhone Safari ; SW de preview officiel ; Couple/FX, carte crédit/différée, patrimoine, sauvegarde/rollback. Ne pas déployer sans GO humain.

**Avancement global estimatif : 58 % ±10 points (42 % restant)** grâce au nouveau parcours utilisateur complet côté candidat, **pas grâce au seul nombre de commits/tests**. Production NO-GO.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — QUALIFICATION DU PARCOURS CSV + CONTRÔLE MENSUEL

**HEAD technique avant cette mise à jour documentaire :** `832a821f9e60a5db7cb1491a9fc865cf0b448f8e`. Revérifier le HEAD exact de la branche `trace-5.37.0-international-accounts-fx` avant reprise. Branche stable `main` de référence `02c70f50e7e51da79b77a91dde96a03c6c719909`, absolument hors périmètre. Aucun déploiement, PR, fusion, action CI, écriture financière réelle Supabase ni migration SQL appliquée. Chaque commit comporte `[skip ci]`.

**Chantier livré (tests exclusivement, code bancaire préservé) :** `tests/trace-csv-reader-flow.test.cjs` teste la chaîne réelle `FileReader → parseCsv → mappage → preview DOM → clic de validation → saveDocument pending simulé` sur le véritable `v5-app-5.37.0.js` et le vrai `trace-international-1.0.0.js`. Des fixtures CSV fictives CAD/EUR sont utilisées ; le lecteur de fichier, le DOM et les RPC sont **simulés**. Les cas couvrent les comptes CAD/EUR sans FX fictif, le réimport exact, deux achats similaires à des lignes distinctes, la collision de source, la modification des colonnes après prévisualisation, la modification de la devise pendant un lot, et la revue partielle des lignes invalides. La version initiale du test a révélé deux défauts du banc d'essai (fin de ligne source et absence de `console` dans V8), corrigés **dans le test uniquement**, sans modification bancaire de l'application.

**Passerelle contrôle mensuel :** avec le vrai moteur **lecture seule** `trace-statement-reconcile-1.0.0.js`, 3 tests supplémentaires vérifient que les achats CSV `pending` ne sont pas présentés comme `matched` confirmé, que deux lignes même date/montant restent `ambiguous`, et que les mouvements du relevé absents de TRACE apparaissent `missing`. `writes:0` et `financialChanges:0` attendus sur le moteur. Cette passerelle demeure une simulation d'intégration ; l'interface PDF mensuelle correspond à la **prévisualisation/laboratoire**, PAS à un flux de production complètement intégré.

**Commits :** `f83c7fc091333950e80819c5b232e3b17d8a5868` (harnais initial), `d687df3f1496c37025f511b1ff49e595d010d925` (correction des fixtures et erreurs simulées), `832a821f9e60a5db7cb1491a9fc865cf0b448f8e` (couverture de rapprochement mensuel sans écriture). Les trois portent `[skip ci]`.

**Preuve fraîche globale ciblée : `58/58` scénarios exécutés sous V8**, 6 fichiers de test authentiques, sources app/International/reconciliation authentiques et mocks Node/DOM/RPC : `11/11` parcours CSV complet+mensuel, `6/6` contexte de compte, `7/7` collision, `5/5` partiel, `24/24` client CAS, `5/5` Accueil. **Ne pas interpréter ces 58 comme des tests Node CLI natifs, Chromium, Safari iPhone, PostgreSQL, PGlite, Supabase ou Auth/RLS.** Réseau de checkout toujours bloqué dans le conteneur par DNS GitHub/npm ; PGlite indisponible ; Node v22.16.0 présent. Aucun `scripts/check-trace-537-release-gates.cjs` ni `tests/trace-cas-writes.integration.cjs` lancé sur un vrai checkout.

**Garde-fous et blocages inchangés :** import CSV fiable côté test candidat mais pas d'unicité inter-clients native serveur ; lignes illisibles affichées et attestées mais non persistées ; relevé mensuel PDF non prouvé exhaustif ; migration 10 de quarantaine toujours non appliquée et débit différé interdit ; métier Couple/FX prospectif, UI premium, navigateur offline et vrai Safari iPhone encore incomplets. Service worker de prévisualisation potentiellement périmé ; NE PAS éditer manuellement, uniquement `node scripts/build-trace-preview-pwa.mjs` puis `--check` sur checkout complet. Reprendre en priorité les migrations 07–10 Auth/RLS/CAS en PostgreSQL fictif et le parcours UI réel; pas de GO sans tests + sauvegarde/rollback autorisés.

**Avancement global qualitatif inchangé : 57 % (±10 points), 43 % restant. Production NO-GO.**

---

# REPRISE PRIORITAIRE — 25 OCTOBRE 2026 — LOT CSV INTÉGRITÉ DU RELEVÉ ET REVUE HUMAINE

**HEAD technique de ce lot (avant commit documentaire) :** `3c6e0707a07fbe90d172a1b1979bb03044231cef`. Résoudre le HEAD GitHub au début de la prochaine mission. Branche exclusive `trace-5.37.0-international-accounts-fx`, `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` à préserver. Aucune PR, fusion, déploiement, Actions, Supabase réel ou migration appliquée. Commits toujours `[skip ci]`.

**Lot fonctionnel terminé dans le CODE CANDIDAT (pas recette navigateur) :**
1. `67ba2cd314d7f1dc20a00562136958d6b74882f9` — prévisualisation CSV → contrôles de contexte au moment de l'enregistrement et avant **chaque** ligne : correspondance des colonnes, format date, signe, compte, titulaire, archivage, modèle bancaire, devise native, pays, carte liée. Le modèle `paymentMode:'deferred'` est interdit. Si l'état change, ne pas enregistrer de nouvelles lignes ; les lignes `pending` déjà créées restent conservées et le message invite à re-prévisualiser.
2. `352e03be722df1f3d8696e3f56b524193fde6577` — rapprochement de source physique `csvSourceRowsAtIndex` : même fichier/compte/numéro de ligne avec empreinte identique = réimportation sans doublon ; empreinte différente = **conflit**, import suspendu avant toute écriture de ce lot. Il peut s'agir d'un nouveau relevé portant le même nom, d'un export modifié ou d'une ancienne transaction changée : aucune décision bancaire automatique. UI conseille de comparer les relevés et, seulement si distincts, renommer le fichier avec la période avant réimport ; ce garde-fou demeure documentaire, pas une unicité serveur entre appareils.
3. `3c6e0707a07fbe90d172a1b1979bb03044231cef` — lignes CSV invalides restent visibles ; une importation *partielle* des lignes lisibles exige maintenant une confirmation explicite de la vérification séparée des lignes non interprétées. Les lignes invalides ne sont **pas** enregistrées en tant que documents pour l'instant : ne pas prétendre que la complétude des relevés est garantie ou que les 100 % des lignes sont persistées.

**Preuves exécutées sur le HEAD de code de ce lot :** `47/47` cas V8, cinq fichiers tests réels de la branche et vrai `v5-app-5.37.0.js` avec modules `node:fs`, `node:test`, assertions, DOM, RPC **simulés** :
- `tests/trace-csv-preview-context.test.cjs`: 6/6
- `tests/trace-csv-source-collision.test.cjs`: 7/7
- `tests/trace-csv-partial-review.test.cjs`: 5/5
- `tests/trace-cas-client.test.cjs`: 24/24
- `tests/trace-home-next-actions.test.cjs`: 5/5.

**IMPORTANT :** aucune preuve d'exécution Node CLI native depuis le checkout entier, aucun PostgreSQL/PGlite, Auth/RLS, navigateur Chromium, iPhone Safari ni service worker régénéré à ce nouveau HEAD. Le conteneur a Node 22.16 mais DNS `github.com` inaccessible et `@electric-sql/pglite` absent. Tests SQL 07/08/09/10, `node scripts/check-trace-537-release-gates.cjs`, concurrence à deux utilisateurs, vraie validation bancaire restent bloquants. Le SW de preview est **périmé** après JS modifié : régénération UNIQUEMENT par `node scripts/build-trace-preview-pwa.mjs` et `--check` dans checkout complet ; ne pas éditer manuellement.

**Suite recommandée :** qualification DB fictive et script portes, puis un vrai test d'intégration import CSV avec FileReader/DOM et données fictives, validation du conflit de fichier aux changements inter-clients, identification du relevé bancaire par lot et contrôle de toutes ses lignes, liaison au contrôle mensuel PDF, couple/FX, débit différé atomique, QA premium Chromium + iPhone, backup/restauration/rollback. Ne jamais ouvrir en production sans GO humain exprès.

**Avancement global maintenu à 57 % (approx., incertitude ±10 points).** Ce lot apporte un vrai garde-fou fonctionnel au chemin CSV mais ne qualifie pas les parcours globaux. **Production NO-GO**.

---

# REPRISE PRIORITAIRE — 25 OCTOBRE 2026 — ACCUEIL « À FAIRE » PREMIUM

**Dernier HEAD technique observé avant cette actualisation :** `362fdec5861b781391b310eadba981a46f1bfa38` (le présent commit documentaire crée un HEAD plus récent). Branche exclusivement autorisée : `trace-5.37.0-international-accounts-fx`. Stable `main` : `02c70f50e7e51da79b77a91dde96a03c6c719909`. Aucun déploiement, fusion, PR, Actions, écriture ou lecture des données Supabase réelles. Tous commits `[skip ci]`.

**Chantier UX intégré :** `9a6d3d71bdb7f69964067fc977fbd588a5984ebe` enrichit directement `renderHomeReview` dans `v5-app-5.37.0.js` avec trois boutons premium tactiles « Importer », « Rapprocher », « Rappels », qui appellent exclusivement les **parcours déjà présents** `navigate('activity'); showTab('import')`, `openReconcileSettings()`, `openNotificationSettings()`. Aucun module bancaire créé, aucun RPC depuis ces boutons, aucune modification de `index.html` stable ni de `sw.js` production. Adaptation CSS 320–430 px, focus accessible, préférence de mouvement réduit. Sans comptes, conserve la consigne de configuration et masque les actions inutilisables.

**Fiabilité de l'état « À faire » :** `362fdec5861b781391b310eadba981a46f1bfa38` empêche « Tout est à jour » lorsque `import_days.unresolvedCount` signale encore des lignes OCR. Les comptes bancaires `pending` et les lignes OCR restent des indicateurs séparés afin de ne pas compter deux fois les brouillons d'import comme transactions. Les nombres proviennent toujours des données existantes ; aucune opération n'est créée.

**Preuve actuelle après ces deux commits :** `5/5` cas du nouveau `tests/trace-home-next-actions.test.cjs` passés sous V8 en exécutant la vraie section d'Accueil, avec `node:test`, assertions, `fs`, DOM et navigateurs **simulés**. `24/24` tests client CAS de `tests/trace-cas-client.test.cjs` aussi rejoués sur le code candidat courant sous V8 avec RPC simulées, zéro échec. **Pas de vrai navigateur Chromium ni Safari iPhone, pas de Node CLI natif sur checkout complet, pas de PG/PGlite/SQL 07–10.** Le conteneur dispose de Node 22 mais pas de checkout réseau ni PGlite (`github.com` et `registry.npmjs.org` sans DNS). Le SW de preview, déjà signalé périmé, l'est toujours davantage après les modifications JS/CSS : ne pas le modifier manuellement ; utiliser uniquement `node scripts/build-trace-preview-pwa.mjs`, puis `--check` dans un checkout complet et autorisé.

**Suite ordonnée :** 1) qualification locale PG/PGlite migrations 07–10 et RLS/Auth/CAS/anciens documents/double utilisateur ; 2) vérification visuelle Chromium sur les raccourcis et états OCR (320/390/430) avec SW labo officiellement reconstruit ; 3) QA Safari iPhone et parcours réels d'imports, Couple/FX, premium ; 4) contrôles financiers, sauvegarde/restore/rollback et GO humain explicite. En absence de PG, continuer les lots isolables mais ne pas ouvrir la persistance des écritures différées.

**Avancement global maintenu 57 % qualitatif ±10 points, environ 43 % restant, production NO-GO.** Accueil « À faire » : navigation code intégrée et testée sous V8, QA visuelle/mobile et expérience installée **encore à réaliser**.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026, TYPES BANCAIRES HISTORIQUES ET PLACEMENTS

**Dernier HEAD technique :** `dfed7afab3611c84a0e31e16827f7bf5260cfa5e` ; le commit de ces documents suit. Branche d'écriture unique `trace-5.37.0-international-accounts-fx`. `main` `02c70f50e7e51da79b77a91dde96a03c6c719909` intacte. Pas de fusion, PR, CI, déploiement, Supabase réel, reset ou migrations appliquées.

**Deux correctifs supplémentaires liés à la migration candidate 10 :**
- `8323cc64d3ac333c358e660f9f11ffe4af18f23d` : détection des cartes `paymentMode:'deferred'` **même sans champ `type`**. L'interface `accountType()` reconnaît des cartes historiques par leur nom, tandis que les deux gardes exigeaient auparavant `type==='card'`. Les créations, modifications/déclassements, transactions associées, suppressions directes et mises à jour d'une ancienne carte différée typeless sont donc mises en quarantaine au client et dans le SQL candidat ; scénarios fictifs ajoutés.
- `dfed7afab3611c84a0e31e16827f7bf5260cfa5e` : ajoute `investment_operations` à la quarantaine et `bankAccountId` aux références surveillées pour qu'une écriture directe legacy ne puisse pas lier un mouvement de placement à une carte différée ancienne. Un virement vers un vrai compte courant ordinaire reste autorisé dans le contrat client, et les RPC 09 ont déjà leur contrôle propre de compte courant, mais les grants SQL directs restent en place jusqu'au cutover.

**Preuves fraîches :** `24/24` tests réels du fichier `tests/trace-cas-client.test.cjs` exécutés dans V8 sur le véritable `v5-app-5.37.0.js`, avec Node/assert/fs/RPC/DOM **simulés**. Syntaxe V8 des fichiers JS modifiés vérifiée. Scénarios PostgreSQL fictifs enrichis **mais non exécutés** ; pas de PGlite/PostgreSQL. Dans le conteneur, Node 22.16 est présent, `github.com` et `registry.npmjs.org` restent inaccessibles et PGlite absent, aucun checkout complet. Ne jamais requalifier les 24/24 comme des tests natifs Node ou PG. `node scripts/check-trace-537-release-gates.cjs` reste non exécuté dans un checkout isolé.

**Priorité de reprise :** obtenir checkout + PostgreSQL/PGlite fictif, relancer toutes les portes natives 07–10 et migrations idempotentes, rôles réels, deux utilisateurs, anciens comptes sans type, placements `bankAccountId`, blocages d'INSERT/UPDATE/DELETE directs et RPC. Inspecter le risque de droits directs sur les autres collections, `SECURITY DEFINER` et stratégie cutover/rollback. En parallèle traiter Couple/FX, imports, UX premium déjà décidée, offline/preview SW via générateur officiel, iPhone Safari, sauvegarde/rollback. Ne pas ouvrir le débit différé. **57 % qualitatif (±10), 43 % restant, production NO-GO**.

---

# MISE À JOUR PRIORITAIRE — REPRISE DU 25 OCTOBRE 2026, GARDES DIFFÉRÉS COMPLÉMENTAIRES

**HEAD de code vérifié après reprise :** `023c9130861df6c48eefb5c525ac6dbe9ce97577` ; ce bloc documentaire ajoute ensuite un nouveau HEAD à relire. Branche exclusive `trace-5.37.0-international-accounts-fx`. `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909`, sans aucune écriture. Tous commits `[skip ci]`. Aucun déploiement, merge, PR, activation CI, ni écriture/lecture financière Supabase réelle.

**Travaux réellement commités :** le client `v5-app-5.37.0.js` a été corrigé dans `removeDocument` : recherche des `imports` dans `state.smartImports`, des `import_days` dans `state.importDays`, et des `reconciliations` dans `state.reconciliations`, avant la demande de suppression. L'ancien code utilisait encore `smartImports` et `importDays` (identifiants mémoire, pas collections persistées), créant un défaut du contrôle préalable. La garde client et `migrations/10-trace-deferred-write-quarantine.sql` couvrent désormais aussi les alias internes d'allocation différée `deferredPurchaseId`, `deferredPurchaseIds`, `deferredFeeIds`, `deferredSettlementMode`, `deferredDueDate`, `deferredBankEvidence`, y compris si la carte n'est pas présente dans le cache. Champs présents même vides vérifiés au client et en SQL. Tests client et scénarios PG fictifs ajoutés ; **migration 10 toujours candidate et non appliquée**.

**Preuve fraîche et limitée :** 22/22 cas de `tests/trace-cas-client.test.cjs` réussis dans V8 en utilisant la vraie source 5.37.0 et le vrai fichier test, avec `node:fs`, `node:test`, assertions, RPC et DOM **simulés**. Syntaxe des trois fichiers JS modifiés compilée sous V8. **Ce n'est PAS une exécution Node CLI native, PG/PGlite, Auth/RLS/CAS à deux vraies sessions, Chromium ou Safari.** Le scénario ajouté à `tests/trace-cas-writes.integration.cjs` n'a pas été exécuté : PGlite absent, `github.com` et `registry.npmjs.org` non résolus depuis le conteneur, pas de checkout complet. `scripts/check-trace-537-release-gates.cjs` non lancé sur checkout. Aucune preuve d'exécution SQL 07–10.

**À faire sans attente de décision :** obtenir checkout fictif isolé + PGlite ; exécuter script portes de sortie et tests DB 07–10, permissions/anciens enregistrements/grants directs/deux utilisateurs et corriger les défaillances. Qualifier les allocations atomiques et doubles preuves serveur avant ouverture du différé. En parallèle finaliser multi-devises/Couple, imports/validation, interface premium sur les 5 onglets, SW de preview uniquement via générateur, Chromium offline, vrai iPhone Safari, sauvegarde/restauration/rollback. Production **NO-GO** jusqu'à accord exprès.

**Avancement global qualitatif maintenu 57 % (±10 points), 43 % restant** : ce durcissement améliore la sécurité candidate mais n'autorise pas d'augmentation artificielle tant que PostgreSQL et les parcours intégrés restent non qualifiés.

---

# RELAIS PRIORITAIRE — FIN DE CONVERSATION DU 25 OCTOBRE 2026 — TRACE INTERNATIONAL 5.37.0

**Branche exclusivement autorisée :** `trace-5.37.0-international-accounts-fx` sur `louisantoine78/Budget-duo`. **HEAD technique connu à vérifier avant toute modification :** `1f8ae90e94ac040a1ddd16eadb861d107ace571f` suivi du commit des présentes docs. `main` 5.36.5 demeure sur `02c70f50e7e51da79b77a91dde96a03c6c719909`. **Interdit :** écriture main, merge, PR, CI/Actions, production, déploiement, Supabase réel. Tous commits `[skip ci]`.

**Dernier chantier :** audit de la barrière d'écritures différées des RPC et de la migration SQL fictive 10. Défaut réel découvert dans `v5-app-5.37.0.js` : `traceRefuseUnqualifiedDeferredWrite` surveillait `smartImports` et `importDays`, alors que les collections CAS persistées sont `imports` et `import_days`. Commit `9ff2e6d71d939aec7c1254b7d7b8525dfd58af08` corrige la barrière pour ces vrais identifiants et ajoute des tests. Commit `455eafe7fbabf7bf222ae0e5b09a52a2e57bbb33` corrige les deux anciennes fixtures qui utilisaient encore les noms mémoire. Commit `1f8ae90e94ac040a1ddd16eadb861d107ace571f` ajoute des cas **PostgreSQL fictifs NON exécutés** montrant qu'un import, jour, rapprochement ou virement même non marqué `deferredKind` doit être refusé s'il pointe vers une ancienne carte différée.

**Preuves obtenues :** `20/20` tests du vrai code client `tests/trace-cas-client.test.cjs` réussis **dans un harnais V8 avec require/assert/RPC simulés**, pas en Node CLI ; syntaxe du test `trace-cas-writes.integration.cjs` vérifiée. État antérieur `101/101` tests V8 de relevés PDF / différé : **historique, non rejoué** ce dernier cycle. **Aucun SQL 07–10 ni PGlite/PostgreSQL exécuté.** Tentative du checkout GitHub depuis le conteneur : DNS `github.com` inaccessible. Node 22.16.0 présent, mais PGlite `@electric-sql/pglite` introuvable et `npm view` échoue sur DNS `registry.npmjs.org`. Aucune tentative de substituer un Supabase hébergé à la base fictive. Ces contraintes bloquent la qualification native/PG. Ne jamais prétendre que migrations 07–10 sont validées tant que `scripts/check-trace-537-release-gates.cjs` et `tests/trace-cas-writes.integration.cjs` ne sont réellement exécutés sur checkout isolé.

**Code actuel :** `migrations/10-trace-deferred-write-quarantine.sql` est une migration **candidate, NON APPLIQUÉE**, avec garde SQL `SECURITY DEFINER` + trigger BEFORE INSERT/UPDATE/DELETE interdisant achats, prélèvements, imports et comptes différés même par écritures directes. La migration 09 ne retire pas les anciens grants directs généraux. Le parcours PDF → preuve différée est strictement en prévisualisation et non persistable. Les vrais flux bancaires restent incomplets ; aucun GO.

**Étapes suivantes ordonnées :**
1. Acquérir un checkout isolé autorisé du HEAD candidat et l'installation locale **sans secrets** de PGlite, exécuter `node scripts/check-trace-537-release-gates.cjs`, `node tests/trace-cas-writes.integration.cjs` avec vrais utilisateurs et transactions **fictifs** ; corriger tout échec SQL 07–10 / 2 sessions Auth-RLS-CAS. Vérifier aussi migration 10 idempotente, anciennes lignes, untagged imports, direct insert/delete et comptes séparés.
2. Concevoir/valider les écritures atomiques différées avec double justificatif indépendant, dates achat/budget/débit, allocation des paiements/frais/remboursements, unicité bancaire et permissions serveur. Ne pas déverrouiller tant que la sécurité n'est pas qualifiée.
3. Terminer multi-comptes/devise personnelle et Couple, import PDF/CSV/OCR, rapprochements, design premium validé pour les 5 onglets et Safari iPhone. Reconstruire service worker **de preview uniquement par script officiel**, QA Chromium offline, sauvegarde/restauration/rollback, GO humain explicite.

**Suivi demandé :** annoncer souvent % global et % chantier. Global **57 % environ** (incertitude ±10 points) : **43 % reste**, sans avance chiffrée fictive faute de qualification PostgreSQL. **Production NO-GO.**

---

# REPRISE PRIORITAIRE — 25 OCTOBRE 2026 — QUARANTAINE DES ÉCRITURES DIFFÉRÉES

**HEAD de départ à résoudre de nouveau :** `7e9c0528d6708f149f9c05932ac1fedc4358ce84`, suivi du commit documentaire de ce lot. Seule branche modifiable : `trace-5.37.0-international-accounts-fx`; `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` intact. Tous les commits ont `[skip ci]`. Aucune production, fusion, CI/Actions, PR, accès/donnée Supabase réelle ou déploiement.

**Contexte :** la précédente reprise a créé un chemin **preview uniquement, lecture seule** pour préparer les justificatifs d'achat différé et de prélèvement après revue PDF. Les vrais `pending` différés restent **NON persistables** ; Auth/RLS/CAS/PG et validation bancaire ne sont pas terminés.

**Nouveaux commits sur la branche :**
- `c0cbdac8f4c1d467fffd1883795a2f40948656a1` : `traceRefuseUnqualifiedDeferredWrite` ajouté au client `v5-app-5.37.0.js`, sur `saveDocument` et `removeDocument`. Cartes `paymentMode:'deferred'`, achats `deferredKind`, paiements vers une carte différée connue, imports et rapprochements liés refusés avant RPC. Normal `pending→confirmed` de comptes ordinaires inchangé.
- `274fd1a82a57de5df946b2c90e2e6c04135351e6` : même contrôle relancé **dans la file CAS sérialisée** immédiatement avant RPC, empêchant une modification de compte/objet intervenue pendant l'attente d'être sauvée.
- `5a69e0e415464434fd0706a2af728dae180f2bbc` puis `7e9c0528d6708f149f9c05932ac1fedc4358ce84` : formes de transactions, allocations, règlements différés complets/partiels, `purchaseIds`, `feeIds` et champs de preuve refusés. Aucune écriture valide ne peut être autorisée en différé par ce **chemin client**.
- `a9294f634be24cdcadfc6a4d0d8b9b9b1701a59f`, `a87f15b7eab3be6cff433d84af04b87f50d6dc9b`, `932be3cdd27bb1cda114567a0c40c9e1fed06de0` : nouvelle **migration candidate non déployée `migrations/10-trace-deferred-write-quarantine.sql`**, après 09. Fonction `SECURITY DEFINER` (pour éviter les angles morts RLS), déclencheur sur **INSERT / UPDATE / DELETE** dans `public.documents` refusant les écritures différées même hors RPC, et tentative de modification/suppression des anciennes écritures différées ; couvre cartes, transactions, imports, dates d'import, rapprochements, références de comptes natifs. Tests fictifs étendus dans `tests/trace-cas-writes.integration.cjs`, y compris anciens enregistrements, suppression et relance idempotente. **MIGRATION NON EXÉCUTÉE et NON VALIDÉE SQL.**
 
**Preuves réelles ce cycle : `18/18` tests du client CAS exécutés en V8 avec RPC et Node/test simulés**, sur le code source candidate réel ; le test PostgreSQL a sa syntaxe JavaScript vérifiée par V8 et l'existence du déclencheur a été relue statiquement. **Aucun vrai PostgreSQL/PGlite 07/08/09/10**, aucune exécution `node --test` du checkout complet, aucun test RLS/concurrence navigateur, ni Safari iPhone, ni confiance bancaire. Le `101/101` V8 des suites précédentes est historique et **non rejoué** sur ce nouveau HEAD. Migration 09 garde encore les autorisations de writes directs pour compatibilité : seule la quarantaine différée est proposée par 10, pas un verrouillage CAS général.

**Avancement global estimé : 57 %, 43 % restant (incertitude ~±10 points).** On ne compte pas la validation PG comme acquise. **NO-GO production**.

**Prochain chantier prioritaire :** qualification de `tests/trace-cas-writes.integration.cjs` et migrations 07–10 sur **checkout + PGlite/PostgreSQL fictifs isolés** ; corriger les écarts SQL et exécuter deux sessions Auth/RLS/CAS. Ensuite seulement élaborer une ouverture progressive de l'écriture différée avec validation serveur de la double preuve, unicité et journal atomique, protection des frais/refunds, et retrait coordonné des grants directs. Reprendre Couple/multi-devises et UX premium, reconstruire SW de preview uniquement via générateur, QA Chromium/iPhone, backup/restore/rollback avant GO explicite.

---

# REPRISE — 25 OCTOBRE 2026 — FILTRAGE D'ACCÈS DE LA REVUE PDF DEBIT DIFFÉRÉ

Résoudre le **vrai HEAD** au démarrage. HEAD de code vérifié après ce lot : `9ac3033f428668ac6e5209d57cbbb14786c0ebcd`. Branche d'écriture unique `trace-5.37.0-international-accounts-fx`, `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` inchangé. Tous commits `[skip ci]`, zéro PR, CI, fusion, déploiement, Supabase réel.

**Avancement estimé — 57 % global, 43 % restant (incertitude ±10 points, indicative et non calculée à partir des tests).** Cet avancement n'est PAS un GO.

- `922b5b67633f83b565e0062e391b20924cf0143b` : garde `TraceDeferredStatementReviewUI.eligible(account,linkedAccounts)` permettant l'interface de préparation PDF différé uniquement pour une **carte différée** associée à un courant actif compatible propriétaire/pays/devise, ou ce compte courant avec carte différée liée. Validation à l'ouverture et à la restitution de la preuve. `TraceMonthlyStatementUI` fournit ses comptes visibles ; un compte ordinaire est exclu. Nouvelle carte FR EUR à débit différé **fictive seulement** dans `trace-international-preview-fixtures-1.0.0.js`, sans activer la création différée en production. Tests d'éligibilité et d'expiration.
- `9ac3033f428668ac6e5209d57cbbb14786c0ebcd` : correction de syntaxe async du nouveau test d'écran, `[skip ci]`.

**Preuve de ce lot : 101/101 cas ciblés V8 réussis sur 9 suites authentiques du candidat** (17 write plan + 22 intake + 12 intake et vrais modules + 9 bridge + 7 intégration staged PDF/CSV + 5 labo UI + 5 vraie preview + 18 nouveau composant PDF + 6 écran mensuel complet). Les sources sont authentiques mais `node:test`, `fs`, `vm` et DOM sont **simulés** sous V8. **Aucune suite native Node du checkout entier, PGlite/PostgreSQL 07/08/09, Auth/RLS/CAS 2 sessions, Chromium, PDF bancaire réel, ni Safari iPhone** n'a été exécutée. Le bilan historique 219/219 V8 reste historique.

Le SW de preview doit être régénéré exclusivement par `scripts/build-trace-preview-pwa.mjs` dans un checkout complet : état actuellement périmé. Le parcours PDF et la classification restent **strictement preview/local/lecture seule**, aucune permission de persister/valider les achats ou prélèvements ; n'en faire aucune publicité comme fonctionnalité de production. Prochaine priorité : runner natif et tests PG/Auth/RLS/CAS sur données fictives ; ensuite intégration prudente des vrais imports au journal `pending`, couverture FR/CA/international & Couple, flux financiers et remboursements/frais, maquettes premium, SW/offline, Safari iPhone, backup/restore/rollback avant GO exprès. **NO-GO.**

---

# REPRISE 25 OCTOBRE 2026 — ADAPTATEUR DE RELEVÉS STRUCTURÉS POUR LE DIFFÉRÉ

**HEAD à revérifier au prochain lancement :** `7fba0e68bb58f5dc33f7d591ae37e3bba7e36708` (commit de test). Branche d'écriture **exclusivement** `trace-5.37.0-international-accounts-fx`. `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` intacte ; aucun déploiement, PR, fusion, CI, Supabase réel ou modification de production.

**Nouveaux commits candidats `[skip ci]` :**
- `224f73dc08ed3aca44af437071033a8e8042693b` — ajout de `trace-deferred-statement-bridge-1.0.0.js`, pur/read-only, qui transforme les résultats de `TraceStatementEvidence.stage/reviewedRows` issus de lignes PDF/CSV **déjà structurées** en relevés de carte ou de courant utilisables par les contrôleurs existants. Toutes les lignes doivent être approuvées, classées et rattachées au snapshot intégral du document ; source physique/import, compte, devise, période, page/ligne et texte d'origine conservés. Classification achetée/débit/frais/remboursement explicite et sens cohérent. Complétude seulement **attestée localement par un humain**, pas une preuve automatique de couverture du PDF ni une authentification bancaire. `persistable:false`, `writes:0`.
- `b9e97ad965f94f0489720a6e52f15bc5fe15e1fc` — sept scénarios d'intégration croisée sur les vrais modules source : achat fictif 40 EUR, valorisation fictive 64 CAD, prélèvement 12,35 EUR, documents PDF et CSV structurés, contrôles séparés, péremption, zéro mutation.
- `176a46fc2a13884d6be4bb1e932a334c9470580b` — l'interface de **laboratoire uniquement** `trace-deferred-evidence-lab-1.0.0.js` crée désormais les deux documents en passant réellement par `TraceStatementEvidence.stage` et `TraceDeferredStatementBridge.convert`, au lieu de fabriquer directement des documents complets. Ajout du bridge aux scripts de `trace-international-preview.html`, pas à la production.
- `7fba0e68bb58f5dc33f7d591ae37e3bba7e36708` — cinq tests de parcours preview utilisant neuf vrais modules et DOM simulé.

**Preuve reproductible ce lot : 77/77 tests V8 simulant Node, fs et vm sur sept suites** (17 write-plan + 22 intake + 12 intake avec vrais modules + 9 bridge + 7 source-to-intake + 5 UI simulée + 5 preview avec neuf vrais modules). Tests localement exécutés sous V8 avec les vraies sources GitHub ; **CE NE SONT PAS des exécutions Node CLI natives**, ni PostgreSQL/PGlite, RLS/Auth/CAS, Chromium ou Safari. Un test `node --test` de 27 cas isolés du chantier précédent a été réexécuté dans le conteneur **avant** les changements UI de ce lot, il ne qualifie donc pas le nouveau HEAD. Les 219/219 V8 initiaux restent historiques.

**Important :** `trace-international-preview-sw.js` est encore potentiellement **périmé**, ne pas éditer manuellement : regénérer uniquement par `node scripts/build-trace-preview-pwa.mjs` depuis un checkout local complet, puis `--check`. Aucun vrai fichier PDF/CSV, parseur de banque, import persisté, flux `pending` ou confirmation serveur n'est livré par ce pont. Il reste à connecter l'interface des imports existants à une revue sûre, après contrôle du moteur et des permissions en PostgreSQL fictif avec deux clients ; ensuite multi-devises/Couple, frais/refunds, UX premium, PWA offline/iPhone et restauration/rollback avant GO explicite.

**NO-GO production.**

---

# ADDENDUM 25 OCTOBRE 2026 — PLAFOND DES RÈGLEMENTS PARTIELS EXCLUSIFS

Branche exclusive `trace-5.37.0-international-accounts-fx`. HEAD de code connu `1d85b2adb3bdd27b9d6f90d8fcc78a036e925046`, à revérifier. `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` intact.

En complément des associations carte/courant/`purchaseIds`, le commit `1d85b2adb3bdd27b9d6f90d8fcc78a036e925046` protège la revue locale d'un **achat unique sans frais** : chaque règlement exclusivement associé à cet achat est contrôlé au centime natif et leur somme ne peut pas excéder le montant de l'achat, y compris en plusieurs prélèvements. Toute valeur fractionnaire de centime refuse la comparaison ; paiement exactement égal au montant reste acceptable **pour comparaison seulement**. Les règlements mêlant plusieurs achats ou frais et les remboursements exigent encore une vérification complète du journal financier — ce module ne certifie PAS leur allocation. Aucune écriture `pending`, aucune confirmation, aucun changement bancaire.

**Preuves du lot :** `27/27` tests **Node natifs isolés** (22 adaptateur avec contrôleurs simulés + 5 UI avec DOM/contrôleurs simulés), syntaxe JS contrôlée ; `51/51` cas **V8 simulant Node/fs/vm** sur les vraies sources GitHub (17 write-plan, 22 adapter, 12 vraies sources en combinaison). Pas de suite complète native du repo, PostgreSQL/PGlite 07/08/09, RLS/CAS, Chromium réel, Safari iPhone, QA offline, ni Supabase réel. L'ancien total 219/219 V8 est historique et ne qualifie pas le nouveau HEAD. La preview SW est encore périmée jusqu'à reconstruction via le script officiel. **NO-GO**.

**Prochain chantier** : validation financière complète et sources réelles d'import **avec données fictives**, allocation des frais/refunds/prélèvements avec moteur différé et journal; checkout natif + SQL Auth/RLS/CAS deux clients, puis intégration UI `pending`, devises personnelles/Couple, UX premium, preview SW, Safari et rollback. Tout nouveau commit `[skip ci]`; aucune production, PR, CI, fusion, `main` ou donnée Supabase réelle.

---

# ADDENDUM 25 OCTOBRE 2026 — RÈGLE D'ASSOCIATION ACHAT / PRÉLÈVEMENT

Dernier HEAD **code** à résoudre de nouveau au démarrage : `fd1a241c7d23aa70e8fa739f098005f3b4682573`. Branche exclusive `trace-5.37.0-international-accounts-fx`; stable `main` `02c70f50e7e51da79b77a91dde96a03c6c719909` préservée.

Les commits `360ad42997a569e980d14c212d07f5f111677ff7` et `fd1a241c7d23aa70e8fa739f098005f3b4682573` consolident la jonction locale des deux justificatifs différés. Le plan `TraceDeferredWritePlan.prepare` conserve désormais `checkingAccountId` associé à la carte dès la préparation. `TraceDeferredEvidenceIntake.review` refuse toute substitution du compte courant, pièce de courant dans une autre devise, paiement non explicitement alloué à l'achat (`purchaseIds` absent/doublonné ou ne contenant pas cet achat). La modification de la répartition des achats rend l'attestation antérieure **périmée**; une nouvelle attestation locale est requise. Le règlement de plusieurs achats explicitement listés est accepté à la revue locale après renouvellement, **sans autorisation de persistance**.

**Tests de cette reprise :** `23/23` tests **Node CLI natifs isolés** sur le module adaptateur avec contrôleurs simulés (18) et l'UI de démo avec DOM/contrôleurs simulés (5). Sur le code GitHub courant, `45/45` vérifications **V8, Node/fs/vm simulés** sur trois suites (17 préparation, 18 association, 10 modules réels) ; une incohérence de snapshot a été détectée dans le test multiachats puis corrigée, pas masquée. Un parcours de clics V8 utilise les sept modules réels avec DOM simulé. **Aucun** test natif Node du dépôt complet, vrai SQL 07/08/09 PGlite/PostgreSQL, navigateur Chromium/Safari ou deux clients. Le dernier bilan historique `219/219` simulations V8 est distinct et non rejoué globalement. SW labo potentiellement périmé. Aucun GO.

**Suite prioritaire :** checkout isolé + exécution authentique du runner `scripts/check-trace-537-release-gates.cjs`, SQL/Auth/RLS/CAS sur données fictives, lien du parcours d'import PDF/CSV réel (données fictives structurées) aux deux attestations, contrôles de répartition et règlement partiel par moteur financier, devises Couple, écrans premium, régénération SW uniquement par script, Chromium offline et Safari iPhone, backup/rollback. Interdiction absolue de production/CI/main/Supabase réel/PR/fusion/déploiement. Tous nouveaux commits `[skip ci]`. **NO-GO**.

---

## Durcissement — complétude des relevés du courant (25 octobre 2026)

Le regroupement `TraceDeferredEvidenceIntake` ne marque plus deux preuves comme revues si `TraceDeferredBankReview.compare` signale un **autre document du lot bancaire invalide**, même si le prélèvement sélectionné a une attestation locale. Le champ `checkingSourcesComplete` le signale explicitement. **12/12 tests natifs Node isolés** sur l'adaptateur avec contrôleurs simulés ; 5/5 tests UI natifs isolés précédents ; 6/6 scénarios multi-modules V8 fictifs supplémentaires sur les sources réelles, ainsi qu'un clic-test V8 avec les sept modules réels (statuts initiaux, deux attestations, deux expirations). Ceci **n'est pas** un test Node intégré du dépôt, ni SQL, PG/PGlite ou Safari. Toutes les dépenses restent non persistables, NO-GO. HEAD initial de ce lot `de5782ed5299b6af4993fd93ed2f9cb06f00fe58`; aucun changement main, prod ou Supabase réel.

---

## Addendum de vérification — 25 octobre 2026

Après le circuit double preuve, `e825556372103f64d54149acd0fd5487017cc37d` ajoute `tests/trace-deferred-evidence-intake-real-modules.test.cjs` : **six scénarios sur les vraies sources** `TraceInternational`, `TraceDeferredDebit`, préparation d'achat, preuve carte, preuve courant et adaptateur. Ils sont **6/6 réussis dans un harnais V8 avec Node/fs/vm simulés** ; le fichier est présent pour sa future exécution **native Node** dans un checkout complet, mais **celle-ci n'a PAS été réalisée**. Montants 40 EUR → 64 CAD au taux fictif, deux attestations, invalidation indépendante, remboursement non accepté comme achat, impossibilité de confirmer/persister. Le SW de laboratoire est toujours périmé ; pas de PG/PGlite/Chromium/Safari ni GO. L'ancien bilan 219/219 V8 demeure historique et non rejoué sur ce nouveau HEAD.

---

# REPRISE DU 25 OCTOBRE 2026 — DEUX JUSTIFICATIFS DIFFÉRÉS EN LABORATOIRE

HEAD de départ confirmé : `dd0201f45b24a51ac61ecea9824f21fc283c2da9`. Sur la branche exclusive `trace-5.37.0-international-accounts-fx` :
- `8a71018ebb139d8905469cf1fb497cd76dd89982` : adaptateur autonome `TraceDeferredEvidenceIntake.review` réunissant les contrôles **distincts** d'achat sur relevé carte et de prélèvement sur compte courant, sans substituer une preuve à l'autre. Refus des sources physiques réutilisées, comptes/devises incompatibles et effets financiers non nuls. Toujours `persistable:false`, `confirmed:false`, `eligibleForServerConfirmation:false`.
- Lot suivant : démonstration interactive chargée **uniquement** dans `trace-international-preview.html` avec deux attestations locales séparées, chacune périmée si son propre relevé fictif change. Pas de mise à jour de `index.html` ni du service worker production.

**Preuves sur poste isolé :** 11 tests `node --test` natifs de l'adaptateur avec contrôleurs simulés, plus 5 tests `node --test` natifs de l'interface avec faux DOM/contrôleurs, soit **16/16 tests nouveaux**, et `node --check` de ces deux sources. Ce sont des tests **isolés**, pas la suite native entière du dépôt ; pas de vrais navigateurs/SQL/PGlite, pas de flux bancaire/import PDF utilisable. Le bilan historique 219/219 V8 n'a pas été rejoué ici. Le nouveau service worker de laboratoire est périmé après ajout d'assets : regénération impérative via `scripts/build-trace-preview-pwa.mjs` dans un vrai checkout avant essai PWA/offline, **jamais** par édition manuelle.

**Suite prioritaire :** parcours d'import structuré PDF/CSV avec lignes et sources réelles mais **fictives**, validation de bout en bout des modules déjà présents, écriture `pending` sous permissions CAS/RLS Auth/PostgreSQL simulées puis seulement plus tard confirmation sûre ; 07/08/09 natif PGlite, concurrence 2 clients, multi-devises/Couple, fin premium, Chromium/iPhone Safari, backup/rollback. Rien d'activé en production. **NO-GO**.

---

# ADDENDUM 25 OCT 2026 — PREUVE D'ACHAT DIFFÉRÉ VS PREUVE DU PRÉLÈVEMENT

Résoudre le HEAD de `trace-5.37.0-international-accounts-fx` au début de toute reprise, dernier HEAD de **code** connu `b0ae1129c307e59ddd62546450326ef26371b32c`. Stable `main` `02c70f50e7e51da79b77a91dde96a03c6c719909` intact. Ne pas modifier production stable, CI, données Supabase réelles, PR/fusion ou déploiement. Commits `[skip ci]`.

Depuis `7a0e6b4` : `e4dee650` normalise en toute sécurité `40,00` et `50,25` (achat devise étrangère) dans `trace-deferred-write-plan-1.0.0.js`, sous-centimes rejetés. `dc71b913` crée **`trace-deferred-purchase-evidence-1.0.0.js`**, module autonome en lecture seule de revue des lignes d'achats **carte différée** (différent de `trace-deferred-bank-review-1.0.0.js` dédié aux prélèvements du courant) : PDF/CSV **déjà structurés**, ligne source explicite, dates/compte/devise/sens/montant au centime et statuts, anti-doublons physiques/import, attestation manuelle à snapshot périmant sur changement. `b0ae1129` permet un relevé de carte mixte achats, remboursements, paiements et frais sans accepter une ligne non-achat comme preuve d'achat.

**Les modules restent autonomes et ne sont PAS câblés à l'UI ou à un flux persistable.** Même `manual_review_current` n'est qu'une vérification locale du justificatif et n'implique aucune autorisation serveur ou banque. `persistable:false`, `confirmed:false`, `createdTransactions:0`. **219/219 vérifications V8 simulées** sur neuf suites ; aucun Node CLI, vrai PostgreSQL/PGlite 07/08/09, navigateur, iPhone Safari. Environnement sans checkout ni DNS GitHub/PGlite ; runner local `scripts/check-trace-537-release-gates.cjs` non exécuté. Ne pas prétendre prêt au GO.

**Prochaines actions :** relier en labo les sources PDF/CSV carte et courant à leurs justificatifs **distincts**, introduire revue contrôlée `pending` sans écrire en production, développer l'autorisation robuste de confirmation uniquement après vrai PGlite SQL/Auth/RLS/CAS, tester concurrence et imports, fin multi-devises/Couple/debit différé et écrans premium. Regénération SW preview via script officiel en checkout isolé, browser Chromium offline, Safari iPhone, restaurations/rollback. **NO-GO**.

---

# ADDENDUM DE REPRISE — DATE BUDGÉTAIRE + DOCUMENT EN ATTENTE DIFFÉRÉ (25 OCT 2026)

Sur branche exclusive `trace-5.37.0-international-accounts-fx`, trois commits de code `[skip ci]` (HEAD de code dernier vérifié `908d46cfe40aa67b3c12c899dbc747e6a14296b4`, à re-vérifier au redémarrage). Main `02c70f50e7e51da79b77a91dde96a03c6c719909` reste intangible, pas de données Supabase réelles, PR, fusion, CI, SW prod ou déploiement.

- `445ee9642c98fcfe21b643ef78abf209ce7bd0ac` : `traceBudgetPostingMonth(t)` et `txs` utilisent le mois `budgetDate` **uniquement** pour achats différés `deferredKind:'purchase'` et remboursements différés `deferredKind:'merchant_refund'`. Transactions historiques non taguées et date bancaire `t.date` inchangées ; règlements carte toujours hors budget ; budget date manquante n'est jamais devinée.
- `7e7b2bb7b39de861bfdbba322a35f8757346249f` : revue différée de fiche carte reconnaît les achats tagués `purchase` (auparavant ils auraient été rejetés) ; marqueur inconnu verrouille la projection.
- `908d46cfe40aa67b3c12c899dbc747e6a14296b4` : nouveau module autonome `trace-deferred-write-plan-1.0.0.js` sans écriture et **non chargé dans l'interface**. Prépare une proposition candidate `pending`, `persistable:false` avec 3 dates, montant natif exact, catégorie active, propriétaire/compte lié, conversion CAD historique datée/sourcée et prix devise d'achat distinct, détection doublon sur compte/date/montant/nom natifs, répartition 100 % propriétaire et moteur `TraceDeferredDebit.simulate` sans paiement/dépense supplémentaire. Zéro écriture de base, aucun statut confirmé.

**166/166 tests V8 simulés** repassés sur sept suites. Ceci n'a PAS exécuté Node CLI, migrations PostgreSQL/PGlite 07/08/09, navigateurs ni Safari. `scripts/check-trace-537-release-gates.cjs` présent mais environnement sans checkout/PGlite. Le SW laboratoire peut être périmé après JS modifié et doit être reconstruit via script, jamais à la main.

**Prochaine étape réelle** : raccordement au flux de revue sans persister avant d'avoir validé les règles et permissions CAS en base fictive, réconciliation achat/règlement avec justificatifs, écriture `pending` puis confirmation autorisée seulement après QA, garantir budgets et répartitions Couple, dates et FX, tests natifs Node + PGlite, Chromium offline + iPhone Safari, backup/rollback. Ne pas activer le sélecteur de carte différée ou annoncer une release. **NO-GO** jusqu'à preuve et accord explicite.

---

# ADDENDUM DE REPRISE — ACHAT DIFFÉRÉ À TROIS DATES (25 OCT 2026)

**Branche exclusive :** `trace-5.37.0-international-accounts-fx`. Dernier HEAD **de code** confirmé : `d0953eda57dfc3f229f7462c64971ced8aa62992`; lire le HEAD GitHub courant à la reprise. Stable `main` `02c70f50e7e51da79b77a91dde96a03c6c719909` intangible. Ne pas modifier la production 5.36.5, les données Supabase réelles, déployer, fusionner, ouvrir PR ou lancer Actions ; tout commit candidate `[skip ci]`.

Deux commits additionnels : `898d961787667c34f5fe0e990837aebba14f3725` intègre le **simulateur d'achat différé** dans la fiche d'une carte différée personnelle avec saisie libre montant + **date achat / date budget / date prélèvement prévu** et moteur déjà présent `TraceDeferredDebit.simulate`. Le résultat est explicitement hypothétique, en devise native, sans débit bancaire ni budget CAD inventé, et sans écriture persistante. `d0953eda57dfc3f229f7462c64971ced8aa62992` corrige une régression : n'installer ces écouteurs que sur les **cartes différées du titulaire**, non sur comptes courants/cartes classiques du partenaire.

**138/138 vérifications V8 simulées** repassées sur cinq suites : 15 achats simulés, 12 échéanciers read-only, 14 détails des comptes, 84 scénarios moteur différé, 13 UX premium. **Aucun test natif Node CLI, PGlite SQL, navigateur/Safari.**

La version n'active PAS encore les comptes différés ni les écritures/achats/règlements réels. Les blocs restant importants : modèle document/catégorie/FX et import banques fiable pour achats avec 3 dates distinctes, rapprochement des prélèvements et fonds, tests postgres fictif 07/08/09 Auth/RLS/CAS deux clients, finir les parcours Couple et UI premium, SW preview régénéré via `scripts/build-trace-preview-pwa.mjs` dans checkout complet, offline Chromium et Safari iPhone, sauvegarde/restauration/rollback. `scripts/check-trace-537-release-gates.cjs` est commité mais non exécutable ici sans checkout/PGlite ; PAS de faux succès. **NO-GO** jusqu'à validation totale et autorisation explicite.

---

# ADDENDUM — INTÉGRATION READ-ONLY DU DÉBIT DIFFÉRÉ (25 OCT 2026)

Résoudre le HEAD réel de `trace-5.37.0-international-accounts-fx` à l'ouverture. Dernier HEAD **de code** connu `1f6ab1ec7dcc6bba83efca8f8d8e17374a3ff795`. Main stable `02c70f50e7e51da79b77a91dde96a03c6c719909` interdit de modification ; aucun SW prod/CI/Supabase réel/déploiement/PR/fusion. Commits `[skip ci]`.

**Avancée réelle** : branche candidat `v5-app-5.37.0.js` ajoute `traceDeferredAccountReview` dans la fiche des cartes `paymentMode:'deferred'`, utilisant le moteur `TraceDeferredDebit.simulate` déjà chargé uniquement dans la prévisualisation laboratoire. Affiche si et seulement si toutes les métadonnées sont explicites : solde natif théorique et échéances, avec règlement interne neutre budgétairement. Toutes les lignes pertinentes sont vérifiées ; un manque empêche un faux total. CSS ajouté. **12 nouveaux tests + 84 moteur existant + 14 fiches comptes + 13 UX premium = 123/123 tests sous V8 fictif**. AUCUN test Node CLI/SQL/PostgreSQL/Safari effectué.

**Ne pas surestimer** : l'activation de nouveaux comptes différés demeure explicitement désactivée ; le parcours de saisie achat/date budget/échéance et les paiements bancaires datés, rapprochements, justificatifs et écritures persistées ne sont toujours pas intégrés/qualifiés. Le moteur peut être absent d'une page : la vue affiche alors indisponible. Le SW de prévisualisation peut être périmé après modification app/CSS ; reconstruire via script générateur en checkout complet, jamais éditer à la main.

**Prochaines priorités** : vraie intégration différée sécurisée et données fictives, test native Node et SQL 07/08/09 Auth/RLS/CAS avec PGlite, couverture partage/devise Couple, QA PWA offline et Safari iPhone, backup/rollback. Toutes validations humaines avant production ; strict NO-GO.

---

# ADDENDUM — CREDIT/DÉBIT OCR TOUTES DEVISES (24 OCT 2026)

Branche d'écriture exclusive `trace-5.37.0-international-accounts-fx`. Dernier HEAD de code vérifié : `9a3fcdbc633e43eb864dbf5fa10a52520c9fbff4`; résoudre le HEAD réel lors de toute reprise. `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` à préserver. Aucun déploiement, CI, fusion, migration Supabase réel.

Le commit `9a3fcdbc633e43eb864dbf5fa10a52520c9fbff4` **corrige une incohérence financière CAD** : les captures dont l'OCR source a identifié un crédit (`bankDirection=in`) ne peuvent plus être postées comme dépenses, et un débit ne peut plus être posté comme revenu. Vérification au niveau `smartApproveDraft` et bouton UI pour CAD et comptes internationaux. L'absence de direction OCR reste inconnue. Quatre cas ajoutés et **97/97 tests V8 fictifs ciblés** réussis (dont cinq tests de forme SQL statiques). Ceci ne constitue pas une exécution de PostgreSQL, Node CLI, Safari ou vrai client.

Le runner read-only `scripts/check-trace-537-release-gates.cjs` est sur la branche mais impossible à exécuter dans l'environnement actuel (absence checkout GitHub, DNS GitHub et PGlite). NO-GO strict. Les chantiers principaux encore ouverts : intégration client du débit différé, flux multi-devises et Couple, finition des vues Accueil/Budget/Activité/Patrimoine premium, Node/PGlite SQL 07/08/09/2 clients, PWA offline, Chromium/iPhone Safari, sauvegarde/restauration/rollback et autorisation humaine explicite. Ne jamais annoncer une date précise ou un GO sans preuves. Commits `[skip ci]`.

---

# ADDENDUM — VUE COMPTES NATIVE + CAD (24 OCTOBRE 2026)

Dernier HEAD **code** vérifié au moment de cette reprise : `5d7aa719cfc976da1ddeb3140bd1c04a9c20d8c6`. Résoudre le HEAD GitHub réel à chaque nouvelle session. `main` stable = `02c70f50e7e51da79b77a91dde96a03c6c719909`, branche candidate exclusive `trace-5.37.0-international-accounts-fx`, commits `[skip ci]`.

Le nouveau commit `5d7aa719cfc976da1ddeb3140bd1c04a9c20d8c6` implémente dans l'Accueil « Tous mes comptes » les montants bancaires natifs + valeurs CAD indicatives séparées avec date/source du taux, état inconnu sans FX, et style compact mobile. Les taux manuels sont présentés honnêtement, sans confusion avec les taux Banque du Canada. Les taux en cache invalides sont redemandés via les gardes existants. Nouveau test UX 8/8 et régression bascule rapide de compte 9/9, **17/17 seulement dans V8 simulan t Node/VM**.

Le script de qualification native `scripts/check-trace-537-release-gates.cjs` est déjà commité ; mais **non exécuté réellement** : conteneur sans checkout GitHub local, DNS GitHub ni PGlite. Le SW de preview est potentiellement périmé. Les suites Node complètes, migrations PG 07/08/09, navigateur, Safari et tests multisessions manquent toujours. **NO-GO**.

Prochaine priorité: tests Node/SQL sur clone isolé avec PGlite fictif, puis régénération SW preview via script, navigateur et iPhone, poursuite flux internationaux/différé/Couple et UX premium, sauvegarde et rollback. Ne toucher ni `main` ni données Supabase réelles ni CI/déploiement sans autorisation.

---

# ADDENDUM — PROCHAINE ÉTAPE DE QUALIFICATION NATIVE TRACE 5.37.0

Dernier HEAD de **code** vérifié au départ de ce lot : `1955fbbd0418342e119f9527bbde9c44b3db0cb6`. Résoudre le HEAD réel GitHub à chaque reprise. Branche autorisée **uniquement** `trace-5.37.0-international-accounts-fx` ; stable `main` `02c70f50e7e51da79b77a91dde96a03c6c719909` intangible. Aucune modification de données Supabase réelles, déploiement, Actions, fusion, PR ou script de production.

Un véritable nouveau fichier `scripts/check-trace-537-release-gates.cjs` rassemble **les tests à lancer dans un checkout complet** : contrôle branche/snapshot Git, `node scripts/build-trace-preview-pwa.mjs --check` sans écriture, `node scripts/test-trace-native.mjs` et les trois intégrations PostgreSQL embarquées `trace-database`, `trace-personal-settings-ownership`, `trace-cas-writes`. Le runner isole l'environnement des secrets Supabase et reste NO-GO tant que tests manuels et GO explicite manquent. Dix tests V8 de ce runner ont été exécutés avec succès, **pas les vrais tests natifs**.

L'environnement de chat actuel possède Node v22 mais aucun checkout GitHub/DNS ni PGlite. C'est le blocage concret. Ne pas prétendre avoir passé une base PostgreSQL ni un navigateur. Faire fonctionner ces tests **en environnement fictif uniquement**, puis travailler les résultats avant les autres chantiers d'intégration. Un SW de preview éventuellement périmé doit être regénéré par `scripts/build-trace-preview-pwa.mjs` depuis le checkout isolé puis vérifié, jamais édité à la main. Poursuivre les fonctionnalités étrangères, débit différé, Couple, UI premium, tests iPhone, backup/rollback avant publication. Commmits `[skip ci]`, NO-GO strict.

---

# ADDENDUM DE REPRISE — DOUBLONS OCR ET AFFICHAGE DES DEVISES (24 OCTOBRE 2026)

Vérifie immédiatement le HEAD exact de `trace-5.37.0-international-accounts-fx` sur GitHub. Dernier HEAD **de code** de cette reprise : `fe29012e1e1033a92bae7014fd436089d06af0f3`; `main` stable = `02c70f50e7e51da79b77a91dde96a03c6c719909`, jamais modifiable.

Depuis `68b01a3bb1aa8a81327730502b74f7742eea889a`, trois commits :
- `465cfdcdce8605371d848b9fdee8e82c4642211d` : validité de la comparaison des doublons liée au détail de la capture et de ses semblables, attestation expirante et bouton bloqué tant qu'absence confirmation.
- `3807d3e9aa8aae8f404853f29b3723d4b3b0309b` : bouton de revue sans TraceMovement reste fail-closed ; fixtures anciennes V8 corrigées.
- `fe29012e1e1033a92bae7014fd436089d06af0f3` : cartes OCR et preuves en devise **native** EUR/USD (prévisualisation du budget CAD jamais inventée sur montant natif), comptes CAD préservés.

**93/93 vérifications sous V8 simulé** sur sources candidate (88 cas JS + 5 contrats SQL statiques) réussies après `fe29012`. Aucune exécution Node CLI, PostgreSQL, PGlite, navigateur, iPhone ou Supabase réel ; donc NO-GO. Aucun changement de `main`, assets production, workflows, CI, migration en base ni déploiement. Le conteneur ne dispose ni du checkout complet ni de PGlite ni de la résolution GitHub.

Prochaines étapes : prioriser environnement natif isolé, Node complet et SQL migrations 07/08/09 (dont restrictions placements / CAS), reconstruction SW de preview via script officiel, tests navigateur hors ligne, Safari iPhone, flux internationaux restants, différé, devise Couple et design premium. Ne recommence pas la conception validée, ne déploie pas, ne touche pas au SQL hébergé ni à la branche main. Tous commits `[skip ci]`. Lire `docs/TRACE-5.37.0-HANDOFF.md` et checklist à jour en tête.

---

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

## Addendum de reprise — 26 octobre 2026, après le lot « validation par compte »

**Toujours vérifier le HEAD GitHub réel**, puis lire `docs/TRACE-5.37.0-HANDOFF.md`, `docs/TRACE-5.37.0-PREVIEW-READINESS.md` et `docs/TRACE-5.37.0-UX-VALIDATED-GAP-AUDIT.md` : ce prompt contient aussi des repères plus anciens qui ne doivent pas remplacer la branche candidate courante.

Dernières modifications conservées : « À valider » par compte personnel actif, avec compteur et devise native, filtre périmé automatiquement réinitialisé, pagination de 40, cible tactile premium. Correction d'un **défaut de démarrage introduit dans la précédente reprise** : binder les quatre boutons d'Activité via `$$('#activityTabs .tab').forEach` et **jamais** `$('#activityTabs .tab').forEach`. Correctif effectif `403dde415889b8f5945617294df65c87feb6df52` ; anti-régression `35c1947575bb81b7afa1b1bf394352e798530ec2`.

QA effectivement refaite sur sources du candidat : **23/23 tests ciblés V8 simulés** (9 Activité, 6 clavier/démarrage binder, 8 comptes) ; **7/7 scénarios bootstrap V8 avec DOM synthétique**, le code réel de l'app et des fixtures, sans Supabase. Aucun vrai checkout Node intégral, Chromium, Safari ni PostgreSQL requalifié. Les résultats doivent rester catégorisés correctement.

Urgence niveau A : obtenir un checkout complet, exécuter `node scripts/test-trace-native.mjs`, **générer le SW uniquement par `node scripts/build-trace-preview-pwa.mjs`** puis `--check` (six modules différés nouveaux absents du SW actuel), tester navigateur réel/iPhone et demander autorisation distincte avant une nouvelle preview Vercel. La preview antérieure au SHA `2c312f00` est obsolète. **Aucun changement main, aucune migration Supabase réelle, aucun déploiement, aucun déverrouillage de `TRACE_DEFERRED_NOT_RELEASED` et production NO-GO.**

## Addendum du 26 octobre — Correctifs clavier et statut de cache honnête

Résoudre le vrai HEAD de `trace-5.37.0-international-accounts-fx` avant toute modification. À la reprise précédente, le HEAD initial était `ffbe25a0d64c7858791905c4b03eb54b94b2213b`. Le correctif clavier ultérieur `9eb0e244db06ed677976d64a96491a52890cd103` remplace `$('#activityTabs .tab')` par `$$('#activityTabs .tab')` dans `activityTabKey`, car le premier retourne un seul nœud : les tests simulent désormais correctement les deux sélecteurs.

Le contrôleur `trace-preview-pwa-1.0.0.js` contrôle par lecture `CacheStorage` la présence de tous les scripts et liens statiques actuellement déclarés, du HTML et de PDF.js/worker avant d'annoncer « hors connexion ». Il ignore les caches de production et reste non prêt si le laboratoire est incomplet. Nouveau test `tests/trace-preview-offline-readiness.test.cjs`. **À ne pas confondre avec la régénération du SW** : six modules différés sont encore absents de l'inventaire de la version commise. Faire `node scripts/build-trace-preview-pwa.mjs` puis `--check` sur un clone complet ; jamais modifier le SW à la main.

Preuves locales dans l'isolat V8, depuis vraies sources GitHub : **24/24 tests Activité**, **6/6 scénarios CacheStorage**, **7/7 bootstrap fictif**. Pas de tests Node natifs complets, vrai Chromium, Safari ni PostgreSQL dans cette reprise. Ne jamais publier sans permission explicite : `main`, Vercel, Supabase, CI et quarantaine différée restent intacts. **Production NO-GO**.


## Dernier addendum — revue des deux jambes bancaires (26 octobre, soir)

**Ne pas repartir de zéro.** Résoudre le vrai HEAD sur `trace-5.37.0-international-accounts-fx` ; le HEAD au **début** de ce dernier lot était `dd36208e0eef873918e667a378924094685b0d83`. Lire `docs/TRACE-5.37.0-HANDOFF.md` et `docs/TRACE-5.37.0-PREVIEW-READINESS.md`.

« Activité → À valider » et son raccourci comptent désormais les virements `transfer` en attente lorsqu'un **compte source OU destinataire** appartient au membre courant, sans dupliquer les lignes. Chaque compte impliqué reçoit un compteur individuel correct, mais la vue « Tous mes comptes » ne compte qu'un mouvement. En filtrant un destinataire EUR, afficher la jambe **destination** native par `TraceInternational.amountOnAccount(t,a,'destination')`, pas le montant source CAD, et signaler la preuve manquante. Une réception depuis le partenaire montre seulement les coordonnées bancaires du destinataire courant et son montant reçu. Libellés « Virement reçu/émis ». Cette amélioration concerne les **transferts seulement** ; ne pas traiter tout `toAccountId` comme un virement.

Test cible étendu à **35/35 cas V8 simulés** (dont 19 revue/FX/compteurs) et **7/7 bootstrap fictif V8** avec code candidat réel. Aucune QA Node native complète, Safari, Chromium, PGlite/PostgreSQL dans ce lot. Le dépôt n'est toujours pas clonable du conteneur (DNS GitHub). Six scripts différés manquent toujours au SW du laboratoire : générer **avec l'outil officiel** et vérifier seulement depuis un checkout complet. `main` et production inchangées ; **NO-GO**, quarantaine différée conservée, aucun déploiement ou migration réelle. Continuer les qualifications natives et visuelles avant publication.
