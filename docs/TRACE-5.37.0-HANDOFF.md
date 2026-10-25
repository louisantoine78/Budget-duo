## Addendum de vérification — 25 octobre 2026

Après le circuit double preuve, `e825556372103f64d54149acd0fd5487017cc37d` ajoute `tests/trace-deferred-evidence-intake-real-modules.test.cjs` : **six scénarios sur les vraies sources** `TraceInternational`, `TraceDeferredDebit`, préparation d'achat, preuve carte, preuve courant et adaptateur. Ils sont **6/6 réussis dans un harnais V8 avec Node/fs/vm simulés** ; le fichier est présent pour sa future exécution **native Node** dans un checkout complet, mais **celle-ci n'a PAS été réalisée**. Montants 40 EUR → 64 CAD au taux fictif, deux attestations, invalidation indépendante, remboursement non accepté comme achat, impossibilité de confirmer/persister. Le SW de laboratoire est toujours périmé ; pas de PG/PGlite/Chromium/Safari ni GO. L'ancien bilan 219/219 V8 demeure historique et non rejoué sur ce nouveau HEAD.

---

## Lot du 25 octobre 2026 — circuit double preuve d'achat et de prélèvement en labo

- Code : `8a71018ebb139d8905469cf1fb497cd76dd89982` + commit laboratoire de cette entrée. `trace-deferred-evidence-intake-1.0.0.js` relie les contrôleurs existants sans les fusionner, empêche la réutilisation d'une même pièce physique carte/courant et toute conversion d'une attestation en écriture.
- `trace-deferred-evidence-lab-1.0.0.js` propose **uniquement dans la preview fictive** un affichage à deux colonnes : achat carte 40 EUR, prélèvement partiel courant 12,35 EUR, deux attestations manuelles, expirations indépendantes quand les sources changent. Sources PDF/CSV **préalablement structurées et fabriquées pour le laboratoire**, pas de parser ni connexion bancaire.
- **Tests réellement exécutés avec Node 22.16.0 dans un répertoire isolé** : 11 nouveaux scénarios adaptateur + 5 interface, **16/16**, mais dépendances/données et DOM simulés ; vérifications syntaxiques des 2 JS. Ce n'est pas la suite native complète, ni l'exécution réelle des anciens modules ensemble, ni une recette navigateur, ni PGlite/PostgreSQL/RLS.
- Suite historique 219/219 V8 (9 suites) documentée au HEAD initial, **non rejouée**. Pas de tests réels SQL 07/08/09, Safari, Chromium offline, deux clients, ni rollback.
- Après ajout des assets à `trace-international-preview.html`, le SW de laboratoire est **périmé** : ne pas utiliser la preview offline avant construction par `scripts/build-trace-preview-pwa.mjs` et `--check` dans un checkout complet ; aucune génération manuelle, aucun SW de production.
- Pas de création de compte différé activée, aucune sauvegarde `pending`, aucune confirmation, aucune mutation d'argent. Aucune donnée Supabase réelle, aucun `main`, PR/fusion/CI/deploiement modifiés. **NO-GO**.

**À faire ensuite :** connecter les imports PDF/CSV structurés et les fiches de validation réelles de la candidate, empêcher doublon/confirm concurrent côté serveur, tester en SQL/Auth/RLS/CAS fictifs (07/08/09), finir multi-devises/Couple et écrans premium, tester Safari iPhone, restaurations et rollback ; validation explicite avant production.

---

## Lot du 25 octobre 2026 — rapprochement du justificatif d'achat différé (distinct du prélèvement)

**Trois commits de code sur `trace-5.37.0-international-accounts-fx` seulement (tous `[skip ci]`) :**
- `e4dee650b760ea12fcc7a92069c09792e0333805` : le module `TraceDeferredWritePlan.prepare` accepte désormais les montants à virgule français dans `fields.amount` et `fields.purchaseAmount` (ex. `40,00 EUR` et `50,25 USD`), comme le formulaire différé, en normalisant **avant** `resolveBooking`. Pas de sous-centime, notation exponentielle, ni conversion FX implicite.
- `dc71b9136388bd9181e129832d04ce7f308325a1` : nouveau module pur `trace-deferred-purchase-evidence-1.0.0.js` et suite `tests/trace-deferred-purchase-evidence.test.cjs`. `TraceDeferredPurchaseEvidence.review` compare un **plan de dépense différée `pending`, non persistable** à une ligne précisément **sélectionnée** d'un relevé de **carte** source structuré, et surtout **pas** à la ligne de prélèvement bancaire du compte courant (déjà traitée séparément par `trace-deferred-bank-review-1.0.0.js`). Valide source PDF/CSV complètement structurée, identité source/version/compte/carte, devise native, date achat, sens débit, montant au centime, statut confirmé, unicité des lignes et des importations physiques, détection de plusieurs achats possibles et des revendications concurrentes. Une correspondance parfaite reste `needs_human_review` ; un reçu utilisateur exact et à jour donne seulement `manual_review_current`, toujours **`persistable:false`, `confirmed:false`, `createdTransactions:0`**, sans Auth/banque/PGlite certifiée. Jeton de snapshot JSON **non cryptographique**, périmé si justificatif entier, version source, plan ou sélection évolue ; la revérification serveur est impérative plus tard.
- `b0ae1129c307e59ddd62546450326ef26371b32c` : support des relevés de carte **mixtes** contenant achats, remboursements, paiements et frais, sans jamais permettre de choisir une ligne non-achats comme preuve de dépense. Contrôles de calendrier/date cohérents par type de ligne.

**Validation : 219/219 vérifications V8 fictives sur 9 suites** : 17 préparation, 23 revue achat, 27 revue règlement bancaire distincte, 12 date budgétaire, 14 revue échéances, 15 simulation achat, 14 détail comptes, 84 moteur différé, 13 UX premium. Ce sont des exécutions de tests sources sous V8 avec Node/VM/FS mockés ; **aucun** `node --test` natif, PostgreSQL/PGlite migrations 07/08/09, navigateur, Safari ni multi-session. L'environnement container a Node 22 mais ni checkout GitHub, ni accès DNS github.com, ni PGlite local ; les scripts de qualification dans `scripts/check-trace-537-release-gates.cjs` demeurent non exécutés.

**Limite de livraison impérative :** le nouveau contrôleur d'achat est **autonome, non branché à l'interface candidate ni à la preview PWA**, et ne peut ni créer de document ni marquer un achat comme confirmé. Il demande des sources de relevé structurées PDF/CSV et une sélection explicite de ligne. Un reçu `manual_review_current` est un état local insuffisant pour autoriser une écriture financière. Ne pas prétendre que le parcours d'import/revue complet est utilisable. Ne pas activer `deferred` dans le sélecteur de cartes.

**Suite prioritaires :** raccorder en laboratoire fictif les imports/relevés carte structurés aux preuves d'achat et les prélèvements aux preuves de règlement distinctes ; valider ensuite la sauvegarde `pending` et la transition `confirmed` sous Auth/RLS/CAS en PostgreSQL fictif, revérification serveur / unicité source / concurrence à deux clients. Qualifier toutes les opérations multi-devises/Couple/frais/refunds et les vues premium ; régénérer le service worker de preview via `node scripts/build-trace-preview-pwa.mjs` dans checkout isolé, `--check`, tests Chromium offline et iPhone Safari ; backup/rollback avant toute proposition de GO. `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` et code prod/Supabase réels intacts. **NO-GO absolu**.

---

## Lot du 25 octobre 2026 — séparation de la date budgétaire et préparation d'écriture différée

**3 commits de code uniquement sur `trace-5.37.0-international-accounts-fx` :**
- `445ee9642c98fcfe21b643ef78abf209ce7bd0ac` : sélection du mois budgétaire par `budgetDate` pour achats explicitement `deferredKind:'purchase'` et remboursements `deferredKind:'merchant_refund'` ; les opérations historiques non taguées restent dans leur ancien mois `date`. Aucun changement de date bancaire, ni nouvelle dépense lors du transfert de règlement. Une date budgétaire malformée n'est jamais remplacée implicitement par une autre date.
- `7e7b2bb7b39de861bfdbba322a35f8757346249f` : la revue read-only `traceDeferredAccountReview` reconnaît désormais le même marqueur explicite `deferredKind:'purchase'` ; les marqueurs inconnus sont refusés plutôt que comptés comme achats.
- `908d46cfe40aa67b3c12c899dbc747e6a14296b4` : nouveau moteur pur `trace-deferred-write-plan-1.0.0.js`, méthode `TraceDeferredWritePlan.prepare`. Il prépare un **document de transaction candidat, inexportable vers la base par ce module**, au statut strict `pending`, `persistable:false` / `confirmed:false`, et n'a **aucune fonction d'écriture**. Entrées obligatoires : carte différée + compte courant lié/autorisé/même devise+pays, titulaire, libellé, identifiant unique, montant exact natif, date achat, date budget, date prévue du débit et catégorie de dépense active. `TraceInternational.resolveBooking` exige taux CAD daté/sourcé pour compte EUR/USD/GBP/CHF (jamais taux 1 inventé, jamais zéro CAD d'arrondi), conservation de la devise de l'achat et du montant original ; avertissement doublon bancaire sur même compte/date/libellé/montant natif. `TraceDeferredDebit.simulate` valide le contrat d'échéance avec achat fictif, **sans règlement ni écriture**, et l'objet renvoie les effets **uniquement si confirmé ultérieurement**. Répartition personnelle 100 % du titulaire, pas d'appropriation de compte partenaire.

**Portée :** préparation du schéma et de la validation backend, mais **aucune saisie de transaction différée enregistrable**, aucun appel CAS/SQL et aucune modification de la vraie base ou de `main`. Le nouveau module n'est pas encore câblé à l'UI ou au service worker, il est autonome et testable : ne pas annoncer « débit différé activé ». La fonction read-only précédente et le simulateur restent disponibles dans la candidate laboratoire. Les cartes différées restent non activables dans les contrôles d'ajout de compte.

**Tests du lot : 166/166 vérifications sous V8 fictif** sur sept suites : 14 préparation document, 12 date budgétaire, 14 revue compte différé, 15 achat simulé, 14 détails comptes, 84 moteur différé, 13 parcours premium. Simulations réelles du code repo dans un environnement **Node/VM/FS mocké**, ce n'est pas Node CLI natif, PGlite ni Safari. L'outil `scripts/check-trace-537-release-gates.cjs` est toujours non exécuté faute de checkout local complet et PGlite dans cet environnement.

**Avant tout GO :** étendre la prise en compte `budgetDate` à tous les widgets de période applicables, construire une édition/revue documentée, créer la transition `pending` → `confirmed` sous CAS/RLS/auth et justification bancaire fiable, gérer règlements/frais/remboursements avec preuves, tests PostgreSQL **fictifs** 07/08/09 et multi-client, PWA Chromium offline/iPhone Safari, régénérer SW laboratoire par générateur (la modification du JS de l'app a pu périmer son cache), sauvegarde/rollback. Aucune production, Supabase réel, fusion, PR ni workflows CI. **NO-GO.**

---

## Lot du 25 octobre 2026 — simulateur d'achat différé à trois dates

**Nouveaux commits sur la seule branche `trace-5.37.0-international-accounts-fx` :**
- `898d961787667c34f5fe0e990837aebba14f3725` — `feat(trace): add three-date deferred purchase simulator in card details without ledger writes [skip ci]`.
- `d0953eda57dfc3f229f7462c64971ced8aa62992` — `fix(trace): bind deferred simulator only on owned deferred-card details [skip ci]`.

**Fonctionnel :** `v5-app-5.37.0.js` contient `traceDeferredPurchaseProjection`, `traceDeferredPurchaseForm` et `bindTraceDeferredPurchaseForm`, appelés depuis `openTraceAccountDetail` uniquement pour les cartes différées du titulaire courant, actives. La fiche de compte peut **simuler un achat hypothétique et non enregistré** avec quatre champs à renseigner : montant natif au centime, **date d'achat**, **date d'impact budgétaire**, **date prévue de prélèvement**. Les trois dates restent indépendantes et explicites, sans valeur inventée. Le simulateur utilise le moteur strict existant `TraceDeferredDebit.simulate` avec un **achat fictif isolé** et aucun transfert. Il affiche le mois budget natif, la dette théorique propre à cet achat, la date du prélèvement **prévu** et indique que le compte courant n'a été **ni débité ni modifié**. La sortie ne représente jamais la dette globale ni une réelle opération bancaire ; aucune conversion CAD sans taux historique sourcé. Aucune donnée de l'utilisateur n'est lue par la simulation au-delà du compte/courant lié et aucune transaction n'est créée.

**Validation UX et sécurité :** date calendrier stricte, date de prélèvement non antérieure à achat/date budget, devises/pays/propriétaires du duo banque-carte cohérents, saisie `40,00` ou `40.00`, maximum deux décimales, échec fermé sans moteur ou compte courant lié. Tout changement de saisie invalide la projection précédente. L'interface est responsive iPhone via `trace-international-1.0.0.css`. Le nouvel écouteur du formulaire a été limité aux cartes `paymentMode:'deferred'` détenues par `me`, pour ne pas affecter les comptes courants/cartes de crédit/compte du partenaire (régression détectée et corrigée avant validation).

**Tests ciblés sur le dernier code : 138/138 passés dans un harnais V8 fictif**, soit `tests/trace-deferred-purchase-forecast.test.cjs` 15/15, `tests/trace-deferred-account-readonly-integration.test.cjs` 12/12, `tests/trace-international-account-details.test.cjs` 14/14 (async exécutés), `tests/trace-international-deferred-debit.test.cjs` 84/84, `tests/trace-international-premium-layout.test.cjs` 13/13. **Attention : aucun Node CLI natif, vraie base PostgreSQL/PGlite, navigateur Chromium, Safari ni client iPhone n'a été exécuté.**

**Périmètre encore ouvert / NO-GO :** ces changements ajoutent un **parcours de simulation** et une revue read-only existante, mais **pas le stockage des achats différés ni la clôture du prélèvement**. La création des cartes différées demeure désactivée. Avant activation, il faut concevoir/vérifier le schéma et les écritures réelles dans PostgreSQL **fictif** avec CAS/RLS/auth, intégrer les imports/relevés, la séparation date achat/budget/débit réel, les remboursements, les frais, les transferts sans double comptage, la reprise de données sans migration risquée, puis tests Node et navigateur et iPhone Safari. `scripts/check-trace-537-release-gates.cjs` est prêt mais bloqué ici faute checkout complet/PGlite. Régénérer le SW preview avec `node scripts/build-trace-preview-pwa.mjs` puis `--check` exclusivement sur checkout de laboratoire ; ne pas éditer le SW à la main.

**Aucune modification de `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909`, de production 5.36.5, workflows/Actions, Supabase réel, PR/fusion ou déploiement.** Aucun GO ou calendrier de publication à promettre tant que le périmètre précédent manque.

---

## Lot du 25 octobre 2026 — raccordement lecture seule du débit différé

**Commit de code : `1f6ab1ec7dcc6bba83efca8f8d8e17374a3ff795`**, uniquement `trace-5.37.0-international-accounts-fx`, message `[skip ci]` ; `main` stable et production inchangées.

Avancement fonctionnel sur **un chantier encore inachevé**, sans activer les écritures dangereuses :

- Dans `v5-app-5.37.0.js`, nouveau `traceDeferredAccountReview(card)` branché à `openTraceAccountDetail` **seulement** pour les cartes `paymentMode === 'deferred'`. Il exploite le moteur existant `TraceDeferredDebit.simulate` déjà chargé dans `trace-international-preview.html` (laboratoire fictif). Il affiche, si les métadonnées sont explicitement complètes, dette native théorique, échéances dépassées, état de chaque lot, montant restant et montant réglé, sans créer de transaction ni modifier de budget/solde. CSS dédié compact dans `trace-international-1.0.0.css`.
- L'adaptateur lit les transactions existantes, ne retient que les achats natifs confirmés avec `date`, `budgetDate` et `dueDate` renseignées, les frais `deferredKind:'card_fee'` avec échéance, remboursements `deferredPurchaseId` et transferts courant→carte avec `deferredPurchaseIds`, `deferredFeeIds` et **vrai montant reçu** `toBankAmount`. Les justificatifs des règlements partiels sont délégués au moteur strict. Aucun calendrier de prélèvement, taux FX ni paiement de carte inventé. Un seul mouvement pertinent incomplet rend l'ensemble **non projetable**, pour éviter un faux solde.
- Le module est **délibérément absent des assets production stables** ; l'absence du moteur déclenche « Analyse indisponible », jamais une valeur inventée. L'activation des nouvelles cartes `deferred` dans l'interface demeure **désactivée** ; aucune écriture ni migration réelle n'est autorisée. Il s'agit d'une **intégration d'affichage read-only du candidat/labo**, pas d'une fonctionnalité de débit différé pleinement opérationnelle.
- Nouveau `tests/trace-deferred-account-readonly-integration.test.cjs` : **12 scénarios V8** réussis sur le code candidat et le vrai moteur de simulation (achat EUR 40, virement confirmé, remboursement, absence date/solde/compte/currency, absence module, carte crédit classique, erreur engine, intégration à la fiche). Régressions V8 fictives validées : **84** scénarios moteur différé existant, **14** tests compte/compte principal (async exécutés), **13** tests ordre/UX premium ; **123/123 contrôles V8 au total** dans ces quatre suites, pas des tests natifs Node/PG/browser.

**Étapes indispensables avant GO :** (1) achever le vrai schéma et les formulaires achat différé avec dates achat/budget/échéance et preuve d'import de règlement ; (2) relier correctement chaque ligne bancaire à un lot, frais/remboursements, sous garde de non-double comptage ; (3) autoriser les créations de cartes différées seulement APRÈS tests solides ; (4) reconstruire le SW du labo via `node scripts/build-trace-preview-pwa.mjs` depuis checkout complet (modification app+CSS = cache de preview potentiellement périmé), Node natif, PGlite migrations 07/08/09 Auth/RLS/CAS deux clients, Chromium hors ligne et Safari iPhone, backup/restore/rollback et GO humain explicite.

**NO-GO inchangé.** Le conteneur de chat n'a ni checkout Github ni PGlite ; seules simulations V8 ont été possibles. Aucun `main`, `index.html`, `sw.js`, GitHub Actions, données Supabase réelles, PR, fusion, déploiement ou migration en base.

---

## Lot du 24 octobre — sens bancaire immuable sur tous les comptes

**Dernier commit de code : `9a3fcdbc633e43eb864dbf5fa10a52520c9fbff4`.** Branche exclusive `trace-5.37.0-international-accounts-fx`, message `[skip ci]`, main et production intacts.

**Problème financier identifié puis corrigé :** la validation des captures OCR étrangères refusait déjà un crédit du relevé déguisé en dépense, mais une capture **CAD** avec une direction bancaire connue `bankDirection:'in'` pouvait, dans certains cas, être requalifiée en `expense` puis comptabilisée en sortie. Inversement un débit CAD pouvait être classé comme revenu. Le garde d'enregistrement `smartApproveDraft` compare désormais, pour **CAD comme pour EUR/USD**, le sens immuable `bankDirection` capturé et le sens bancaire attendu d'après la nature du mouvement, et refuse toute contradiction **avant toute écriture**. L'interface `trace-smart-inbox-3.5.0.js` applique le même contrôle au bouton : message explicite « Sens bancaire incompatible · À vérifier ». Une direction OCR inconnue reste soumise aux contrôles déjà présents et n'est pas inventée.

**Tests effectifs :** ajout de quatre scénarios CAD au fichier `tests/trace-international-foreign-capture-approval.test.cjs`, dont contrôle refus crédit→dépense, débit→revenu, acceptation dépense CAD avec débit cohérent, verrouillage UI. **97/97 vérifications ciblées V8 fictives** sur neuf suites après commit : 22 OCR étranger+CAD, 8 consentement doublons, 7 montants UI, 7 vieux gardes de capture, 18 CSV, 8 carte/virement, 11 garde FX au centime, 11 intégrité monétaire, 5 **SQL statiques**. Ces contrôles simulent Node, DOM et persistance ; ils ne sont ni des tests Node CLI réels ni du PostgreSQL/PGlite/Chromium/Safari.

**État de release : NO-GO.** Les parcours débit différé sont toujours isolés du client utilisable, la conception UI premium n'est pas entièrement intégrée, les migrations 07/08/09 doivent être testées en SQL réel fictif (RLS/Auth/CAS, deux clients), le SW labo est à régénérer avec son script et à tester offline/Chromium, iPhone Safari et restauration/rollback manquent. Le runner `scripts/check-trace-537-release-gates.cjs` existe mais ne peut toujours pas être exécuté dans cette conversation faute de checkout local/GitHub DNS/PGlite. Ne pas annoncer de calendrier artificiellement précis ni de production imminente sans preuves. Aucun déploiement/merge/PR, modification de `main`, workflows ou Supabase financier réel.

**Suite :** prioriser l'intégration du débit différé, audit des écritures bancaires réelles et de la devise Couple, parcours premium ; parallèlement établir checkout isolé pour lancer gates natives et SQL, puis tests Safari et rollback. Toute écriture GitHub reste candidate `[skip ci]`.

---

## Lot du 24 octobre — détail des comptes : devises natives + CAD indicatif

**Commit de code `5d7aa719cfc976da1ddeb3140bd1c04a9c20d8c6`**, uniquement sur `trace-5.37.0-international-accounts-fx`, `[skip ci]`. Cette reprise travaille sur les fonctionnalités visuelles approuvées, pas seulement sur les protections comptables.

- `trace-international-ui-1.0.0.js` : la section de l'Accueil « Voir tous mes comptes et ma trésorerie globale » affiche chaque solde dans la **devise native bancaire**, plus, pour chaque compte étranger valorisable, la **contre-valeur CAD indicative** distincte avec date et source de la cotation. Aucune conversion fictive ou conversion implicite 1:1. Si taux indisponible, invalide, solde inconnu ou montant non représentable, affichage d'une conversion à vérifier plutôt que d'une somme trompeuse. Les données textuelles de source des taux sont échappées dans le HTML.
- Si un taux présent dans le cache est inutilisable pour valoriser un solde natif connu, la demande de taux historique est maintenant déclenchée, sous réserve des gardes de requête déjà présents dans `requestInternationalRates`. Les soldes natifs manquants ne déclenchent pas de requête FX inutile. Le libellé précise qu'un taux peut venir de la Banque du Canada **ou d'une saisie manuelle**.
- `trace-international-1.0.0.css` : affichage lisible sur écran étroit en deux niveaux hiérarchiques : nom/devise native et petite ligne de conversion, montant natif maintenu à droite.
- Nouveau `tests/trace-international-home-native-cad-conversion.test.cjs` : 8/8 tests V8 fictifs sur le **vrai moteur FX** + UI (EUR 40 -> CAD 64 à taux fictif 1,60, date/source, taux manquant/invalide, zéro natif, texte malveillant échappé, autre titulaire exclu, solde inconnu, structure responsive). Régression `tests/trace-home-account-switch.test.cjs` : 9/9 V8 réussis, y compris bascule de compte sans changement du principal. **17/17 tests de ces deux suites sous V8 mock Node/VM, pas dans Node CLI natif.**

**Statut toujours NO-GO :** aucun checkout complet utilisable dans le conteneur, DNS GitHub indisponible, PGlite/PostgreSQL absent ; seules lectures/commits GitHub connectés et simulations V8 isolées possibles ici. Aucune migration SQL 07/08/09 réellement lancée, aucune suite native complète, aucun Chromium/Safari ou iPhone réel. Toute modification du JS de laboratoire peut périmer le service worker de preview : reconstruire via `node scripts/build-trace-preview-pwa.mjs` puis `--check` dans un checkout de laboratoire avant tests PWA.

**Prochaines étapes :** (1) obtention du checkout isolé, exécution `node scripts/check-trace-537-release-gates.cjs`, Node natif, PGlite/Auth/RLS/CAS fictifs, (2) remise à jour SW preview exclusivement via le générateur et tests Chromium/iPhone, (3) fin des flux de débit différé, imports étrangers, devise personnelle/Couple, Accueil/Activité/Patrimoine premium et contrôles de réconciliation, (4) sauvegarde/restauration/rollback et validation GO avec autorisation explicite. `main`, code de prod 5.36.5, workflows et données Supabase réelles intacts.

---

## Nouvelle étape — unifier les tests natifs et les portes NO-GO (24 octobre 2026)

**Commit de code : `1955fbbd0418342e119f9527bbde9c44b3db0cb6`** sur `trace-5.37.0-international-accounts-fx`, avec `[skip ci]`. Deux fichiers ajoutés :
- `scripts/check-trace-537-release-gates.cjs` : point d'entrée local **en lecture seule** pour qualification automatisée, lancé depuis un clone complet et exclusivement sur la branche autorisée, avec `node scripts/check-trace-537-release-gates.cjs`. Vérifie d'abord la branche et si le snapshot Git est propre ; lance `node scripts/build-trace-preview-pwa.mjs --check` (jamais le générateur en mode écriture), `node scripts/test-trace-native.mjs`, vérifie la disponibilité de PGlite local puis exécute exactement trois suites isolées : `tests/trace-database.integration.cjs`, `tests/trace-personal-settings-ownership.integration.cjs` et `tests/trace-cas-writes.integration.cjs`. Aucune installation de dépendances, connexion distante, CI, migration sur Supabase ou déploiement. Les variables transmises aux sous-processus sont limitées à PATH/HOME/temp et `TRACE_PGLITE_MODULE` ; les secrets Supabase et NODE_OPTIONS sont exclus. Tout défaut = échec automatique.
- `tests/trace-537-release-gates.test.cjs` : dix cas de **simulation V8** réussis (branche main interdite, variables d'environnement, absence de module PGlite, cache périmé, échec Node/PG, snapshot Git sale, absence d'écriture SW/CI, non-production même si automatisation verte). Ces tests ne prouvent **PAS** que les suites Node ou SQL ont réellement tourné.

**Blocage d'exécution vérifié dans l'environnement de cette conversation** : Node v22.16.0 disponible, mais pas de checkout `.git` de TRACE dans le conteneur, résolution de `github.com` indisponible et `@electric-sql/pglite` absent. Les outils GitHub permettent uniquement la lecture/écriture de fichiers sur la branche. Donc les trois intégrations SQL et la suite native Node **restent non exécutées**. Aucun rapport fictif de succès ne doit masquer ce blocage.

**Pour effectuer la prochaine qualification en checkout isolé :** récupérer la branche autorisée sans altérer `main`, mettre à disposition PGlite local (module `@electric-sql/pglite` ou `TRACE_PGLITE_MODULE` explicite), exécuter le script ci-dessus. Le générateur SW reste délibérément extérieur au gate en lecture seule ; si son `--check` échoue, régénérer le SW **uniquement** dans le labo, contrôler son diff avant de requalifier. Le verdict `automatedPassed:true` ne peut jamais se substituer aux contrôles manuels Chromium hors ligne, Safari iPhone, finances, débit différé, sauvegarde/restauration/rollback et GO explicite.

Le `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` doit rester inchangé. Aucun SQL sur données réelles, PR/fusion, CI, SW production ou déploiement autorisé.

---

## Lot du 24 octobre — consentement de doublons et affichage natif des captures

**Production : NO-GO.** Nouveaux commits depuis le HANDOFF `68b01a3bb1aa8a81327730502b74f7742eea889a`, exclusivement sur `trace-5.37.0-international-accounts-fx`, tous `[skip ci]` :

1. **`465cfdcdce8605371d848b9fdee8e82c4642211d`** : `trace-smart-inbox-3.5.0.js` attache désormais l'attestation « Deux opérations distinctes » à une signature de la capture (date, nom, montant, nature) et des mouvements comparés (id, statut, nature de l'évidence, montant). Toute modification significative ou changement des ressemblances invalide la case précédemment cochée. Le bouton de confirmation reste désactivé tant qu'une ressemblance n'a pas été personnellement comparée. Le blocage d'une transaction déjà enregistrée demeure. Les natures `legacyOnly` sont interdites dans l'UI. Huit tests ciblés ont été ajoutés dans `tests/trace-smart-duplicate-review-consent.test.cjs`.
2. **`3807d3e9aa8aae8f404853f29b3723d4b3b0309b`** : le bouton « Confirmer » se verrouille sans erreur si le module des natures `TraceMovement` n'est pas initialisé. Les anciennes fixtures V8 d'interface ont été mises en cohérence avec le vrai contrat de ce module. Les huit suites V8 pertinentes ont été repassées.
3. **`fe29012e1e1033a92bae7014fd436089d06af0f3`** : `rowForm` affiche les montants OCR dans la devise **native du compte** (EUR/USD, pas un faux `CAD`) y compris en extraction de date inconnue et preuve OCR suggérée. `synchronizeRow` ne présente plus une prévisualisation du budget en CAD calculée à tort depuis le montant EUR/USD sans FX vérifié. Pour une opération étrangère, il affiche le montant natif et signale que la contre-valeur CAD n'est calculée qu'au taux historique daté lors de la confirmation. Les comptes historiques CAD conservent leur présentation existante. Sept tests ajoutés `tests/trace-smart-foreign-native-amount-ui.test.cjs`.

### Validation effective

**93/93 vérifications ciblées sous V8 isolé**, réparties sur deux lots réexécutés après le dernier commit de code : **88 simulations/cas JavaScript** sur les vraies sources du candidat et moteurs financiers avec Node/FS/DOM/transports fictifs, plus **5 contrôles SQL purement statiques** sur la migration 09 candidate. Suites : doublons 8, UI native 7, anciens statuts capture 7, OCR étranger 18, FX centime 11, intégrité monétaire 11, CSV étranger 18, virements/cartes 8, garde SQL statique 5.

**Ce n'est pas du Node CLI natif, ni SQL/PGlite/PostgreSQL réel, ni des tests navigateur/Chromium/Safari ou multi-clients.** Un nouveau parcours OCR dans Safari n'est donc pas qualifié. Le conteneur a Node v22 mais aucun checkout local, aucun DNS GitHub et aucune dépendance PGlite : les scripts `scripts/test-trace-native.mjs`, l'intégration SQL 07/08/09 et la génération SW ne peuvent toujours pas y être exécutés. Ne pas considérer `93/93` comme certification ni lancer production.

**Protections préservées :** `main` stable 5.36.5 et code de production intacts, aucun accès ou écriture Supabase financière réelle, aucune CI, fusion, PR, migration hébergée ou déploiement, aucun changement des workflows.

**Suite obligatoire :** checkout complet fictif et Node/PGlite, véritables migrations SQL 07/08/09 et test deux sessions/CAS/RLS, run `node scripts/test-trace-native.mjs`; régénérer `trace-international-preview-sw.js` exclusivement par `node scripts/build-trace-preview-pwa.mjs` puis `--check`, tester hors ligne Chromium/Safari natif iPhone, compléter parcours étrangers/différé/Couple/UX premium, sauvegarde/restauration/rollback sous autorisation explicite.

---

## Lot du 24 octobre — intégrité FX zéro CAD et patrimoine non valorisable

**NO-GO production maintenu.** Après le HEAD documentaire `32b320998b0d802a7f34f21a987e559d05806440`, trois commits de code ont été ajoutés sur la SEULE branche `trace-5.37.0-international-accounts-fx`, tous `[skip ci]` :

1. **`e8abbc556120274db5b2f1f3b30af80fd1d048dc`** : `TraceInternational.resolveBooking` refuse désormais une dépense bancaire native non nulle dont le taux CAD historique (même sourcé) conduirait après arrondi à **0,00 CAD** ; jamais de sous-évaluation artificielle du budget ou de taux de change inventé. Suite `tests/trace-international-fx-zero-budget-guard.test.cjs` ajoutée, avec exemples fictifs EUR 0,01 et EUR 40 -> CAD 64.
2. **`f9ffc6b10e79d3453329a7402c587054be679ae5`** : `TraceInternational.fxValue` refuse toute contre-valeur infinie ou hors précision entière sûre du centime, plutôt que d'inscrire un faux chiffre de patrimoine. Les soldes CAD/étrangers normaux restent utilisables.
3. **`7adbb096b201d1840c7da5f20b06d62b8e8d465c`** : `TraceInternational.snapshot` distingue un solde étranger réellement égal à zéro de la conversion d'un solde non nul arrondie à zéro. Le second cas rend la valorisation globale **incomplète**, sans chiffre patrimonial faussement précis. Le zéro réel reste traité comme zéro.

### Preuve et limites

Les **78/78 tests ciblés** ont été exécutés sans échec dans un harnais **V8 avec Node, FS, VM, DOM et transports simulés**, sur les vraies sources du candidat et les vrais moteurs FX/mouvements :
- `trace-international-fx-zero-budget-guard.test.cjs` : 11
- `trace-international-money-integrity.test.cjs` : 11
- `trace-international-foreign-csv-confirm.test.cjs` : 18
- `trace-international-capture-confirm-guards.test.cjs` : 7
- `trace-smart-cross-currency-transfer-guards.test.cjs` : 8
- `trace-international-foreign-capture-approval.test.cjs` : 18
- `trace-cas-investment-ownership-static.test.cjs` : 5 (**contrôles statiques SQL, aucun SQL exécuté**).

Ces 78 vérifications **ne sont pas des tests Node CLI natifs**, ni PostgreSQL/PGlite, RLS/Auth, Chromium, Safari ou deux clients en conditions réelles. Le conteneur fournit Node v22, mais **ni checkout du dépôt, ni accès DNS GitHub, ni PGlite/psql**. Ne pas annoncer des tests natifs ni un GO.

`main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` préservée ; aucun déploiement, fusion, workflow/CI ni données Supabase réelles touchés. Les assets JS du laboratoire ayant changé, `trace-international-preview-sw.js` **reste périmé** : régénérer uniquement via `node scripts/build-trace-preview-pwa.mjs` depuis un checkout complet avant tout test PWA/offline. L'intégration SQL 07/08/09 et le nouveau scénario sur `investment_operations` n'ont toujours **pas** été exécutés.

### Priorités suivantes

1. Accéder à un checkout isolé avec Node et PGlite/PostgreSQL fictif ; exécuter le script local `scripts/test-trace-native.mjs` et les tests PG 07/08/09, RLS/Auth/CAS deux sessions, corriger les échecs avant toute décision.
2. Recréer le SW labo par son générateur et `--check`; tester hors ligne, Chromium, puis Safari iPhone.
3. Terminer les autres parcours bancaires internationaux, débit différé relié, devise Couple, UX premium et vérifications sauvegarde-restauration/rollback, toujours avec autorisation avant les étapes touchant les données réelles.

---

## Lot du 24 octobre — sécurité OCR débit/crédit, placement CAS et synchronisation FX

**NO-GO inchangé.** Depuis `2ff5eab3e79c284c6b51c5e37afc48a782298f9f`, quatre nouveaux commits ont été enregistrés uniquement sur `trace-5.37.0-international-accounts-fx`, avec `[skip ci]` :

1. **`a1ebbde9b7d81458f001eb51b0f132a0f31c5ba4`** : la revue d'une capture étrangère d'achat rejette désormais explicitement une source OCR marquée `bankDirection:'in'`. Le test du sens bancaire existe également dans l'interface : un crédit entrant ne peut plus être qualifié à tort de dépense, même si l'attestation a été cochée. Une direction inconnue garde la revue individuelle explicite ; les achats montrés comme `out` restent possibles.
2. **`842ae604c95a9d4aaae12d2d7db4e332d1d5717c`** : durcissement de la migration candidate `09-trace-cas-versioned-writes.sql` : les RPC CAS `investment_operations` vérifient que le portefeuille natif appartient au membre, que le compte bancaire éventuel est un courant lui appartenant, que l'opération préexistante appartient à son portefeuille lors d'une modification ou suppression. Nouveau scénario fictif d'intégration ajouté dans `tests/trace-cas-writes.integration.cjs` (à exécuter réellement en PGlite/PostgreSQL) et cinq tests de contrat SQL purement statiques dans `tests/trace-cas-investment-ownership-static.test.cjs`. **Le SQL 09 modifié n'a PAS été exécuté contre une base et n'est pas qualifié.** Les écritures directes héritées demeurent autorisées, en attente d'un cutover explicitement validé.
3. **`e026ee1993f82ae8f39d206df325e4e05eb3395b`** : après l'attente du taux FX d'une capture étrangère, la signature de preuve relit l'objet compte et le brouillon **depuis le state courant**, plutôt que de se limiter à une référence avant synchronisation ; changement ou remplacement pendant l'attente => refus sans comptabilisation.
4. **`8b2a4e3ae931ca1afe369fdb0781b5b2049d3267`** : ancien simulateur d'interface complété avec `dataset.bankDirection`, puis reprise des cinq suites pertinentes.

### Qualification exacte de ce lot

- **51/51 tests financiers ciblés exécutés sous V8** avec vraies fonctions JS extraites du candidat et vrais modules FX, natures de mouvement et guide bancaire, mais faux Node, DOM et transports : CSV étranger **18**, captures / statuts **7**, virements et paiements de carte **8**, captures étrangères **18**.
- **5/5 tests statiques** exécutés sous le même V8 et vérifiant la présence des gardes SQL `investment_operations`. **Total : 56/56 contrôles V8**, mais seulement 51 sont des simulations de chemins financiers JS ; les 5 autres ne sont pas des tests SQL.
- **Aucun test Node CLI natif, aucune exécution PGlite/PostgreSQL, aucune authentification/Supabase hébergé, ni Chromium, Safari iPhone ou test de concurrence réseau sur ce HEAD.** Le conteneur possède Node v22 mais ne dispose pas de DNS GitHub/checkout et PGlite ou PostgreSQL sont absents. Ne pas transposer les 56 tests à ces catégories.
- Aucun changement de `main`, du client de production 5.36.5, des workflows ou de Supabase financier réel, aucune migration appliquée, CI ni déploiement.

### Prochaines étapes impératives

1. Récupérer un checkout isolé, dépendances Node et PGlite fictifs ; exécuter et corriger les migrations **07, 08 et 09** et les suites natives, y compris le nouveau test sur les opérations de placement ; vérifier RLS/Auth, rôles, droits, CAS et deux sessions.
2. **Reconstruire** `trace-international-preview-sw.js` via `node scripts/build-trace-preview-pwa.mjs`, puis `--check`, hors ligne/Chromium et Safari iPhone. Ne jamais éditer le SW généré à la main.
3. Terminer les flux étrangers non encore couverts, le débit différé, devise perso/Couple et l'UX premium validée. Vérifier sauvegarde/restauration/rollback avec autorisation explicite avant toute mise en production.
4. Aucun GO avant preuves réelles et autorisation.

---

## Lot du 24 octobre — premier achat OCR étranger confirmé sous revue (laboratoire uniquement)

**NO-GO production.** Après `fbfcba597f71c8ec88173941ddb2fca0fa05de20`, les commits suivants existent uniquement sur `trace-5.37.0-international-accounts-fx`, avec `[skip ci]` :

- `411a98349d3a8a92c461ce72caf78f8b1a7ccef6` : au lieu de bloquer toute capture provenant d'un compte non-CAD, `smartApproveDraft` admet **uniquement une dépense ordinaire explicitement revue**, avec `foreignNatureConfirmed=true`, titulaire du compte conforme, libellé non ambigu, montant bancaire à centimes exacts, montant d'achat d'origine si autre devise, cotation CAD datée avec source (historique ou manuelle). Les transferts, paiements de carte, remboursements, crédits ambigus et autres mouvements étrangers ne peuvent toujours pas être confirmés via ce parcours. `trace-smart-inbox-3.5.0.js` ajoute une case d'attestation au sein de la carte étrangère et une activation conditionnelle de sa confirmation. Instantané des transactions, brouillons, compte et preuve revérifié après cotation asynchrone ; écriture rejetée sans mutation locale si l'état a changé.
- `aa4ce6fc6105071dfa282ab150d8a922fb29e842` : tests anciens recalés sur le nouveau texte ; le bouton protège aussi les comptes sans titulaire reconnu, identité courante absente ou ancien module `TraceImportGuide` incomplet. Suite ancienne de capture rétablie.
- `59e1d451b439390e863064469342891f37ca8f91` : la case d'attestation étrangère se décoche automatiquement après modification de la date, du libellé, du montant, de la nature, du sens de mouvement, de la devise ou du montant d'achat d'origine ; retour immédiat à l'état non confirmable.

**Exécution de tests sur le HEAD de code `59e1d45` : 46/46 réussis dans un harnais V8 isolé, avec modules Node, FS/DOM et écriture simulés, mais moteur FX, référentiel des natures et guide bancaire réels extraits de GitHub :** 18 CSV étranger, 7 statut/capture, 8 transferts et paiements carte, 13 capture étrangère. La dernière suite comprend EUR 40 -> CAD 64 avec taux fictif explicite 1,60, taux historique fictif 1,55, refus si consentement absent, FX manquant, libellé de paiement de carte, virement, écriture CAS rejetée, mutation d'une autre opération ou du compte pendant cotation, changement de devise d'achat sans prix d'origine. Une vérification d'interface vérifie également l'invalidation du consentement au changement de la preuve.

**Limites formelles :** aucun test Node CLI natif, navigateur (Chromium/Safari iPhone), base PostgreSQL/PGlite, RLS/Auth, Supabase hébergé ou simultanéité à deux sessions sur le HEAD final ; les 46 tests fictifs ne les remplacent pas. Aucun fichier `main`, production 5.36.5, workflows, service réel, SQL hébergé ni CI touché. Le SW de preview est périmé après modification des JS ; reconstruire impérativement depuis le script officiel avant tout contrôle PWA. Aucune mise en production, aucun lancement de migration.

**Priorités suivantes :** obtenir checkout local complet et PGlite isolé, exécuter suites Node et SQL migrations 07/08/09 avec concurrence réelle, réexécuter tests Chromium et hors ligne après génération service worker, compléter les autres natures étrangères, débit différé, compte/devise Couple et écrans premium, puis tests Safari iPhone, sauvegarde/restauration/rollback sous autorisation et GO explicite.

---

## Reprise suivante — protection FX, paiements carte et transfert bancaire natif (24 octobre 2026)

**Statut : NO-GO.** Les correctifs suivants ont été enregistrés sur `trace-5.37.0-international-accounts-fx`, avec `[skip ci]`, après le HEAD documentaire `0d6295d1d7b6bce1ddb6bfe4251e98589b192424` :

- `070b8e76d64ad978937b6e23e154dd37024a4e7b` : dans la validation individuelle CSV étrangère, nouvelle comparaison complète des mouvements bancaires similaires après l'attente d'une cotation FX. Une opération qui apparaît ou change de montant/statut pendant l'attente interdit la confirmation. **18/18 scénarios V8 fictifs** dans la suite CSV.
- `bfb38d3a03bc270e94d8e313b9a353bdd2ae0350` : les captures d'un compte source CAD qui représentent un virement vers un autre compte conservent `toBankAmount` ET `toBankCurrency` du destinataire. Montant crédité à centimes exacts pour une devise différente, jamais un montant reconstruit depuis `amountCAD`. Refus de saisies fractionnaires ou manquantes, sans écriture financière.
- `0c957b0a3c10ac58252caa18ed4af5b159d7511a` : paiement de carte par capture limité au courant correspondant à la carte, de même devise et pays. Si la carte historique n'est pas explicitement liée, le compte courant de règlement doit être unique ; plusieurs comptes plausibles sont bloqués. Cela empêche les remboursements imputés à une mauvaise dette sans empêcher le cas CAD historique non ambigu.
- `bc7f5e738457d33e430e25a1599d0d766083566b` : tests des transferts et paiements de carte raccordés au vrai module `trace-movement-5.36.0.js` (source extraite sous V8), conservant `card_repayment` et aucun impact revenu/dépense.

**Preuve globale réexécutée sur le HEAD de code `bc7f5e7` : 33/33 tests V8 fictifs, zéro échec** — 18 scénarios CSV étranger, 7 capture/statut/interface, 8 virements/paiements de carte. Les suites testent le code candidat et les modules FX/mouvements réels avec DOM, transport et modules Node simulés. Ceci n'est **PAS** une exécution Node CLI, PGlite/PostgreSQL, Chromium, Safari, Supabase hébergé ni un test à deux clients. Les suites Node 911 / Chromium 32 / SQL 17 antérieures ne sont pas réattribuées à ces commits.

Les fichiers de production `index.html`, `sw.js`, `manifest.webmanifest`, `trace-version.json`, `v5-app-5.36.5.js` et les workflows sont inchangés. Aucune lecture/écriture des données Supabase réelles, aucun déploiement ni CI. `main` connu stable `02c70f50e7e51da79b77a91dde96a03c6c719909`.

**Prochaine porte bloquante :** retrouver un checkout isolé avec Node, PGlite 0.4.5, exécuter et corriger réellement migrations SQL 07/08/09 et suites natives ; reconstruire le SW laboratoire avec son script puis `--check`, qualifier Chromium/hors ligne et Safari iPhone. Fermer ensuite les flux étrangers restants, devises personnelles/Couple, différé connecté et préproduction sous sauvegarde/restore/rollback autorisés. Les captures de compte source non-CAD restent explicitement en attente : cette protection n'est pas leur finalisation. Ne proposer aucun GO.

---

## Lot suivant — captures internationales en attente et statut de validation strict (24 octobre 2026)

**NO-GO conservé.** Commits de code : `274414664eb480f73666b9a409437cee67dce54a` et `6bca9ab80caf1c7dfb1255db4f6285587c0dda5c` ; base : `104e2c6854f0873a2f6416b8c848bcbd209d22c9`. Seule la branche `trace-5.37.0-international-accounts-fx` a été modifiée, commits `[skip ci]`. `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` inchangée. Aucune CI, fusion, PR, deployment ou donnée Supabase réelle.

### Modifications effectives

1. **`v5-app-5.37.0.js` — captures / OCR étrangers :** `smartApproveDraft` refuse la confirmation financière directe d'une capture provenant d'un compte non-CAD tant qu'un parcours de revue internationale n'est pas qualifié. Le brouillon et sa preuve restent `pending`, sans création d'opération `confirmed` ni conversion inventée. Les comptes CAD continuent à accéder au circuit existant.
2. **Statuts de lot sûrs :** `TraceBankBridge.quickFinalizeApproved` et `openImportBatchReview` ne prennent plus que les lignes `pending` (et non tout statut différent de `confirmed`). Une ligne ignorée, déjà traitée ou reçue ne peut pas être rouverte et confirmée par le lot. Les garde-fous étrangers du lot précédent restent en place.
3. **`trace-smart-inbox-3.5.0.js` — interface cohérente :** le bouton « Confirmer l'opération » est désactivé sur compte étranger avec libellé « À vérifier · devise étrangère » ; un texte visible précise que la preuve est conservée et que l'opération n'a pas encore d'impact financier. Comportement CAD inchangé.
4. **`tests/trace-international-capture-confirm-guards.test.cjs` :** sept scénarios couvrent le rejet EUR/USD sans écriture, la continuation CAD, la non-réactivation des statuts ignorés/terminés/reçus et le bouton de revue. Résultat **7/7 sous V8 simulant les modules Node** ; l'ancienne suite CSV a été rejouée dans le même environnement : **16/16**. Total **23/23 V8 fictifs**, à distinguer de Node CLI, Chromium, PostgreSQL ou Safari, qui n'ont pas été exécutés sur ce HEAD. La syntaxe V8 des fichiers modifiés a été contrôlée.
   
### Blocages et suite

Container Node v22 présent, mais aucun checkout local, DNS GitHub inaccessible, ni PGlite/serveur PostgreSQL : aucun test SQL 07/08/09 ou Node natif n'a été exécuté ici. Le SW `trace-international-preview-sw.js` reste périmé après modification des assets. Régénérer seulement avec `node scripts/build-trace-preview-pwa.mjs` puis `--check` sur checkout complet ; ne pas éditer à la main. Les imports étrangers OCR restent volontairement **non validables**, ce qui est une protection temporaire et **non une fonctionnalité achevée**.

Priorité : checkout fictif + dépendances, exécution et correction tests SQL/Node, PWA hors ligne et Chromium, puis implémentation d'une revue individuelle OCR étrangère avec montants natifs, FX datée, nature et doublons vérifiés, sans revalidation automatique ni effet rétroactif ; poursuivre différé, devise Couple, Safari natif et sauvegarde/rollback sous autorisation.

---

## Lot de reprise autonome — verrouillage des validations étrangères (24 octobre 2026)

**NO-GO maintenu.** Deux corrections de code ont été enregistrées sur la SEULE branche `trace-5.37.0-international-accounts-fx` avec `[skip ci]` : `650462a6c2e35199a1d230ed412ac1e54648e8a2` et `74e823f7deee512dc7021e7f3f824fdf7b328331`. `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` n'a pas été modifiée. Aucun SQL hébergé, aucune CI, aucun déploiement ni données financières réelles consultées.

- `v5-app-5.37.0.js` : l'approbation rapide d'une dépense étrangère CSV est limitée au **statut `pending`** et refuse les statuts ignorés/terminés. Le compte et la transaction sont comparés à leur état initial immédiatement après la recherche de taux asynchrone ; une modification intervenue pendant cette attente refuse l'enregistrement.
- **Fermeture du contournement par lots :** `legacyImportNatureReady` refuse la confirmation groupée des importations `pending` sur des comptes non-CAD pour les sources CSV, OCR, capture ou PDF, même si une nature suggérée existe ou si `natureReviewed` est déjà vrai. Les saisies manuelles et l'enregistrement individuel expressément revu restent accessibles ; les imports étrangers prévalorisés sans parcours individuel adapté restent en attente. Le contrôle s'applique à la validation de lot, à `validatePendingAll` et à `TraceBankBridge.quickFinalizeApproved`.
- `tests/trace-international-foreign-csv-confirm.test.cjs` : 16 scénarios (12 antérieurs + 4 supplémentaires) **effectivement exécutés sous V8**, avec source de test récupérée sur GitHub, modules Node simulés, vrai moteur financier extrait, fausses UI/base et aucun réseau. **16/16 réussis, zéro échec**. Compilation syntaxique V8 des deux fichiers modifiés réussie. **Ce ne sont PAS** des tests Node natifs, Chromium, Safari, PostgreSQL ou Supabase hébergé.
- Le conteneur a Node 22 mais toujours ni checkout Git accessible, ni DNS GitHub, ni PGlite installé : les migrations 07/08/09 et les tests Node natifs restent **non exécutés sur ces commits**. Aucun service worker généré manuellement ; `trace-international-preview-sw.js` reste périmé et doit être régénéré via `node scripts/build-trace-preview-pwa.mjs`, puis contrôlé avec `--check`, une fois un checkout complet autorisé obtenu.

**Suite :** restaurer un checkout fictif Node/PGlite, exécuter les tests SQL et natifs, revoir les droits et la concurrence à deux sessions, régénérer/requalifier la PWA laboratoire, finaliser les natures étrangères et le débit différé, puis faire la recette Safari, la préparation de sauvegarde/rollback sous autorisation avant toute décision GO.

---

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
