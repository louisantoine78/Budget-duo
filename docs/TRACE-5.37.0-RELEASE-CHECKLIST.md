## 26 octobre 2026 — Vérification des preuves de débit différé

- [x] `f47c85a9` : carte et compte courant exigent des preuves avec `sourceId` et `importId` distincts ; `feeIds` explicite/valide, pas de désactivation du plafond d'un règlement partiel faute de métadonnées de frais.
- [x] `8def77b8` : une ligne typée achat/frais/remboursement carte ou débit/crédit de compte courant est refusée si son sens bancaire est contradictoire ; elle ne peut pas être utilisée comme justificatif local fiable.
- [x] **137/137 V8** sur les 8 suites reportées ci-dessus : relevé courant 29, preuve achat 24, assemblage 25, modules réels 14, passerelle 9, intégration locale relevé 7, budget différé 12, plan d'écriture 17. Modules métiers réels, dépendances Node simulées.
- [ ] **Bloquant** : quatre suites PostgreSQL/PGlite natives sur migrations 05–12 avec données fictives, puis toute la suite Node réelle sur checkout isolé. Migration 12 NON APPLIQUÉE.
- [ ] Safari iPhone réel et PWA offline, vérification des imports PDF/CSV/OCR, transfert entre devises, Couple, patrimoine, UX premium et restauration/rollback.
- [ ] Production NO-GO ; 58 % ±10 estimés et inchangés. Aucun workflow, CI, déploiement, merge, PR, `main` ou Supabase réel modifié.

---

## 26 octobre 2026 — Preuve des dates et centimes des placements

- [x] `23422265` : une transaction confirmée liée mais déplacée sur un autre compte déclenche le verrouillage du solde ; une date bancaire active invalide, de transaction ou d'opération de placement, bloque le calcul et est expliquée dans la fiche compte.
- [x] `032e1db5` : saisie placement : dates strictes, montants au centime natif, aucun arrondi silencieux, vérification de la source liée (compte, sens, date, montant) avant `saveDocument`.
- [x] Régression étendue **207/207 V8** : 18 Activité + 38 comptes + 34 monnaie + 45 CAD legacy + 21 banque/placements + 15 carte/amis + 19 garde-fous + 17 formulaire. Parsing JS app complet PASS ; modules dépendants simulés.
- [ ] **BLOQUANT** : tests Node natifs sur checkout complet et **4 suites PostgreSQL/PGlite** sur données fictives pour migrations 05–12, avec protections RLS/Auth/CAS/CSV et rollback. Migration 12 non appliquée.
- [ ] Safari iPhone réel, PWA offline, UX premium, imports PDF/CSV/OCR, Couple/FX et maintien des clients 5.36.x.
- [ ] Aucun GO production sans validation humaine explicite. Aucun changement `main`, CI, PR/merge, déploiement ou Supabase hébergé. Estimation globale prudente ~58 % ±10.

---

## 26 octobre 2026 — Critères banques et placements liés (nouveau lot)

- [x] `f29385b8` : appariement montant **natif** au centime, compte et sens bancaire corrects ; conflit actif = solde inconnu et alerte lecture seule. Les liens hors rapprochement, en attente ou justificatifs de carte n'effacent pas une vraie jambe.
- [x] `f02b190f` : plusieurs opérations de placement ne peuvent pas utiliser le même débit/crédit bancaire confirmé dans la fenêtre de solde, même si les deux montants semblent identiques.
- [x] Régressions V8 sur sources GitHub **184/184** = 18 Activity + 36 comptes + 34 intégrité + 45 CAD legacy + 17 placements + 15 Mastercard + 19 garde-fous ; compilation/parsing JS app PASS. Tests isolés simulés, **pas** Node natif complet.
- [ ] **Bloquant :** quatre suites PostgreSQL/PGlite des migrations 05–12 avec données fictives, puis audit Auth/RLS/CAS. Migration 12 NON APPLIQUÉE.
- [ ] Recette Safari iPhone et PWA offline, UX premium, imports CSV/PDF/OCR, Couple/FX, rollback et coexistence/transition ancien client.
- [ ] Production **NO-GO**. Ne changer ni `main`, ni CI, ni PR/merge, ni déploiement, ni Supabase réel. Indicateur d'avancement conservateur ~58 % ±10.

---

## 26 octobre 2026 — Activity FX : aucun faux montant natif

- [x] `e0b7a9f5` : filtres EUR retrouvent le virement CAD→EUR reçu ; affichage des mouvements en attente respecte la jambe native du compte filtré, sans inventer les réceptions inconnues.
- [x] `408f7308` : lignes confirmées : `TraceInternational.amountOnAccount`, centimes natifs, valeurs inconnues affichées comme inconnues ; zéro substitution CAD→EUR. Le CAD historique demeure indicatif si exact, sans devenir un solde EUR.
- [x] `9a0cefe7` : tests supplémentaires sur réel moteur JS pour absence de montant natif, devise discordante, montant fractionnaire au centime et transfert EUR reçu attesté.
- [x] **175/175 tests V8 réussis lors de ce passage sur les sources GitHub finales** : 18 journal, 34 comptes, 34 argent, 45 legacy, 10 banque/placements, 15 Mastercard/amis, 19 garde-fous. Parsing app V8 PASS. Exécution Node CLI complète NON réalisée.
- [ ] **BLOQUANT** : migrations 05–12 et 4 suites PostgreSQL/PGlite dans un checkout isolé avec données fictives ; migration 12 NON APPLIQUÉE.
- [ ] Recette physique Safari iPhone, PWA offline, imports PDF/CSV/OCR, compatibilité anciens clients, restauration/rollback et validation UX premium avant toute décision de sortie.
- [ ] Production **NO-GO**, avancement indicatif ~58 % ±10 ; `main` et Supabase réel intacts, aucun workflow/CI, merge, PR ni déploiement.

---

## 26 octobre 2026 — reprise UX banques et protections de harnais

- [x] Harnais banque/placements, Mastercard/amis et financiers alignés avec `traceLinkedBankTransactionCovers`; injection `traceBudgetPostingMonth` dans les scénarios intégrés ; **44/44 tests V8** après `38dfbd13`.
- [x] Justificatifs bancaires cliquables vers Activité filtrée au **bon compte et au bon mois**, uniquement lorsqu'ils désignent une transaction. Placements signalés séparément, sans fausse promesse de redirection ; style tap/focus mobile ; `50f0301b`.
- [x] Plus récents justificatifs visibles en premier ; date invalide non cliquable ; faux calendrier strict, `95b57664` ; **34/34 UX V8** sur HEAD du code.
- [x] Parsing V8 des sources `v5-app-5.37.0.js`, du test UX et du script release confirmé ; branche vérifiée, `main` `02c70f50` intacte.
- [ ] **BLOQUANT :** PostgreSQL/PGlite natif isolé non disponible, migrations 05–12 et quatre suites d'intégration non exécutées, migration 12 toujours non appliquée.
- [ ] Node natif de checkout complet, recette iPhone Safari, parcours réel tactile, FX/Couple, CSV/PDF/OCR et restauration/rollback avant décision de sortie.
- [ ] GO humain explicite exigé ; **production NO-GO**, avancement ≈58 % ±10. Aucun `main`, CI, Supabase réel, merge, PR ou déploiement modifié.

---

## 26 octobre 2026 — preuve bancaire / placements : qualification de régression

- [x] `accountEstimate` et `traceAccountBankProofNotice` ignorent les liens d'investissement vers une simple preuve de relevé ou vers une transaction déjà couverte par le dernier rapprochement valide ; contrôle partagé `traceLinkedBankTransactionCovers` (`a2a1db79`).
- [x] Jour d'ouverture : diagnostic cohérent avec début/fin de journée `openingBoundary`, sans faux justificatif le jour d'ouverture en mode `end` (`a2a1db79`).
- [x] 5 scénarios additionnels dont lien valide sans double débit, lien relevé, lien antérieur, borne d'ouverture, calcul bancaire réel ; 28/28 sur fiches comptes.
- [x] Harnais financiers isolés mis à jour pour importer le helper partagé (`fd2ee4b2`) ; tests V8 sur sources actuelles : **34/34** monnaie internationale + **45/45** historique CAD, total lot **107/107** avec 28 comptes.
- [ ] **BLOCKER** : quatre suites PG/PGlite locales avec migrations 05–12, Auth/RLS/CAS, CSV/différé et rollback, non exécutées ; migration 12 non appliquée.
- [ ] Exécution Node native complète sur checkout, iPhone Safari physique, parcours détaillé Activité, UX premium et réception PDF/CSV à qualifier.
- [ ] GO production explicitement autorisé seulement après toutes les gates ; **NO-GO**. Aucun main/Supabase réel/CI/PR/merge/déploiement touché. Avancement conservateur ≈58 % ±10.

---

## 26 octobre 2026 — diagnostic bancaire : dernier rapprochement valide uniquement

- [x] L'encart compte « Justificatifs bancaires à vérifier » et `accountEstimate` utilisent le même dernier rapprochement **complet** (date valide, statut confirmé, devise native correspondante, montant `actualBalance` exact) : un rapprochement incomplet ou dans la mauvaise devise ne peut plus cacher une anomalie FX (`e8df42b`).
- [x] 3 nouveaux scénarios de rapprochement incomplet / devise incorrecte / rapprochement EUR complet (`92a0683`).
- [x] V8 sur sources GitHub actuelles, modules Node/DOM simulés : **23/23 UX comptes**, **34/34 finance**, **45/45 legacy**, soit 102/102 sur ce passage.
- [ ] Exécution native du test et recette Safari iPhone, y compris accès au bon mouvement depuis Activité.
- [ ] Quatre suites natives PostgreSQL/PGlite sur migrations 05–12, Auth/RLS, CAS, historiques et rollback — **non exécutées**.
- [ ] GO production explicitement autorisé uniquement après qualification complète.

`main` et Supabase réels inchangés, aucun déploiement ou CI. Avancement conservateur 58 % ±10, NO-GO.

---

## Lot suivant — preuve FX et diagnostic bancaire utilisable

- [x] Révision d'un virement : nouvelle devise native source ou reçue invalide l'empreinte d'import historique ; vrai virement CAD→CAD inchangé conserve la preuve, pas de deuxième revenu/dépense (`eaaccd8`, `164af90`).
- [x] Un transfert confirmé vers le même compte ne produit plus de solde bancaire fictif ; mouvement malformé = solde à vérifier, virement réel CAD→EUR correctement valorisé (`d8828e1`, `b52a872`).
- [x] Fiche bancaire premium : signalement en lecture seule des documents confirmés FX / banque / investissements sans preuves de devise ou montant, des transferts auto-référencés ; rapprochements et jour d'ouverture respectés ; aucun changement de données, style responsive (`2604cf1`, `557181e`, `175ec87`, `64c1883`).
- [x] 6 nouveaux scénarios fake-DOM dans `tests/trace-international-account-details.test.cjs` (`55e56e5`, `21cd0eb`) ; 20/20 réussis sur cette suite. Au total **275 scénarios V8 réussis en lots** sur le périmètre financier, UI, CAS, legacy, contrats de sécurité/gates, avec modules Node/DOM/RPC simulés. Les deux harnais PG passent leur syntaxe JS V8, pas leur exécution SQL.
- [ ] **BLOQUANT : PostgreSQL/PGlite natif isolé** (binaries et npm réseau absents du conteneur) ; migrations 05–12 et les 4 suites de qualification Auth/RLS/CAS/CSV/débit différé/restauration restent non exécutées.
- [ ] Vérifier iPhone Safari réel, ergonomie de correction des preuves anciennes, interfaces premium, banque multi pays, montants historiques et projet de transition des clients 5.36.x avant toute activation de migration 12.
- [ ] Publier uniquement après validation explicite et procédure de restauration. **Production NO-GO ; ~58% ±10 points.**

Aucune modification `main`, ni Supabase réel, déploiement ou CI.

---

## 25 octobre 2026 — toutes les jambes bancaires internationales doivent prouver leur devise

- [x] Jambe de réception `toBankAmount` : montant étranger ou venant d'une autre devise sans `toBankCurrency` explicite devient **inconnu**, jamais arbitrairement EUR/CAD (`662a98a`).
- [x] Jambe source `bankAmount` d'un compte étranger : `bankCurrency` obligatoire ; règle étendue aux opérations de placement et aux réceptions explicites `investmentAmount` des comptes d'investissement non CAD (`d738ba8`).
- [x] Les anciennes opérations CAD→CAD restent compatibles en conservant leurs valeurs historiques CAD, sans reconvertir les budgets.
- [x] Tests cross-currency, paiements carte, 50 USD/46,20 EUR, épargne/placements et régression des soldes historiques ajoutés/maintenus (`967ac7d`, `ca65696`, `eac0c39`, `32f4c58`).
- [x] Harnais comptable 5.36.5 corrigé pour injection de `traceBudgetPostingMonth`; ajout scénario débit différé octobre→novembre `7b56ff1`.
- [x] **249/249 tests V8** exécutés et réussis sur sources GitHub : moteur, UI, CAS client, vrais extraits d'import intelligent, contrats statiques SQL et scénarios historiques, avec dépendances simulées. Suites PG : parsing JS seulement.
- [ ] Faire l'inventaire des éventuels anciens documents internationaux sans preuve de devise **dans une base fictive**, prévoir revue manuelle sans aucun taux ni devise inventé, pas de rétroconversion.
- [ ] **BLOQUANT** : quatre suites PG sur moteur PostgreSQL/PGlite natif isolé, migrations 05–12, Auth/RLS/CAS/CSV/débit différé et rollback ; **non exécutées**.
- [ ] Recette iPhone Safari, offline/PWA, flux réel fictif et UI premium ; GO explicite requis. **NO-GO**.

Aucune mutation main/Supabase réel, aucun déploiement ni CI déclenchée ; ~58 % ±10.

---

## 25 octobre 2026 — Couverture Couple international et patrimoine global au centime

- [x] Vue Couple mixte : contrôler sommes de courants, dettes cartes et solde net, ne jamais masquer un overflow par une compensation opposée (`eb8bf44c`, `9196905e`).
- [x] Effacer l'alerte d'avoir carte après correction, sans réécrire de mouvement ou taux bancaire.
- [x] Moteur `TraceInternational.snapshot` : groupes courants et cartes et patrimoine CAD global contrôlés séparément en centimes sûrs (`75ab7b5a`).
- [x] Tests synthèse Couple fictive et global CAD : `1d115b92`, `eb408e41`.
- [x] **114/114 tests V8** sur le vrai JavaScript et des modules Node/DOM/RPC simulés : 22 financiers, 8 Couple, 13 UI comptes, 27 CAS, 11 release gates, 33 statiques SQL (5 contrat12 + 28 autres). Deux harnais PG syntaxe JS V8 PASS.
- [ ] **BLOQUANT** : exécuter migrations 05–12 et 4 suites sur vrai moteur PostgreSQL/PGlite *isolé fictif* : grants, Auth/RLS/CAS, CSV, suppression et restauration foyer, débit différé, transferts et paiements.
- [ ] Recette Safari iPhone sur interface premium, comptes CAD/EUR/USD, conversions datées, budgets couple, connexion/hors-ligne, imports PDF/OCR/CSV.
- [ ] Autorisation humaine GO explicite avant toute fusion ou déploiement, et plan transition anciens clients.

Tous commits `[skip ci]`. Aucun `main`, CI, déploiement ou Supabase réel touchés ; ~58 % ±10, production **NO-GO**.

---

## 25 octobre 2026 — garde de précision sur solde d'ouverture + mouvements + patrimoine Couple

- [x] `accountEstimate()` : cumuls banque/placements vérifiés avec `I.exactMoney()` par mouvement, **avec le solde d'ouverture inclus dans chaque vérification** ; tout dépassement non sûr reste inconnu et ne peut être annulé silencieusement par un mouvement ultérieur. Commits `5f63f9c`, `3cf397e`.
- [x] `bank(s)` : sommation CAD des comptes du couple, dettes et avoirs cartes refuse dépassements intermédiaires, sans effet sur les comptes EUR ni les opérations réelles.
- [x] 5 tests financiers fictifs de cumuls et compensations, `bee1bb1c`.
- [x] **93/93 V8** vérifiés sur sources GitHub avec imports Node simulés, répartis 20 finance, 13 UI, 27 CAS, 33 contrats SQL. Syntaxe V8 des 2 harnais PG vérifiée.
- [ ] Valider ce moteur sur Safari/iPhone, import réel fictif, rapprochements et multi comptes avec une suite Node native complète.
- [ ] Exécuter migrations 05–12 sur PostgreSQL/PGlite isolé, 4 suites PG, Auth/RLS/CAS, rollback, CSV, débit différé, membres du couple ; **NON EXÉCUTÉ**.
- [ ] Préparer la publication uniquement après une preuve complète et autorisation explicite. **NO-GO**. Aucun main / Supabase / déploiement touché.

---

## 25 octobre 2026 — Accueil multi-comptes : absence de solde périmé et alertes cartes expliquées

- [x] Compte courant archivé ou absent : vider les chiffres de l'ancien compte, afficher « À configurer », supprimer les alertes carte obsolètes sans opération financière (`daa260b`).
- [x] Dettes non valorisables : expliquer à l'utilisateur les cartes liées dans une devise différente et les cartes sans compte de règlement clairement identifié ; aucun rapprochement ou taux inventé (`ec256fc`).
- [x] **13/13 tests fake-DOM V8 réussis** sur le composant réel, incluant nouvelles régressions (`0952ad4`, `140d893`).
- [ ] Safari iPhone physique, réactivité des boutons et états visuels après chargement réel, changements de principal, relance hors ligne.
- [ ] PostgreSQL/PGlite local avec données fictives : migrations 05–12 et quatre suites d'intégration, puis décision sur compatibilité des anciens clients et plans rollback. **Non exécuté actuellement**.

Aucun commit main, migration hébergée, CI, déploiement ou modification Supabase réel. Progression ~58 % ±10, NO-GO.

---

## Rectificatif 25 octobre — vérification centimes après bornage

- [x] `41481110` et `5dcbf143` `[skip ci]` : conserver les arrondis à 2 décimales des cumuls valides ; test 0,10+0,20=0,30 et 0,30−0,20=0,10.
- [x] **20/20** contrats et fonctions financières V8 exécutés (15 scénarios financiers, 5 contrats SQL12), faux imports Node. JS suite PG syntaxe validée.
- [ ] Vérifier les flux natifs PostgreSQL/PGlite (non exécutés) et la recette mobile. Production NO-GO.

---

## 25 octobre 2026 — sécurité des agrégats FX et privilèges SQL12 toutes colonnes

**NO-GO**. Deux améliorations candidates enregistrées exclusivement sur branche internationale :

- [x] Moteur `trace-international-1.0.0.js` : centimes sûrs imposés à `exactMoney` et `fxValue`; `snapshot` retourne une valeur inconnue pour les agrégats de dette ou patrimoine dont les centimes sont trop grands ; distinction solde natif du principal vs total global préservée. Commits `d1c12094`, `da3f78b6`.
- [x] Trois nouveaux scénarios monétaires en `tests/trace-international-money-integrity.test.cjs` `4838a1eb`, `39eb2b24`.
- [x] `migrations/12-trace-cas-exclusive-write-cutover.sql` : REVOKE dynamique de chaque colonne présente et postcondition sur droits effectifs des rôles `anon`/`authenticated` (y compris hérités), commit `21fd483a`.
- [x] Scénario PGlite préparé : grants anormaux de `created_at`/`updated_at` avant migration, refusés après ; test de contrat statique corrigé `bf96a861`, `ebf5b97d`, `3dd4586`.
- [x] **19/19 tests V8 réellement exécutés** sur ce périmètre : 14 scénarios fonctionnels JavaScript du moteur FX et 5 tests de contrat SQL12, imports Node simulés. Harnais PGlite : syntaxe V8 PASS, aucune exécution PostgreSQL.
- [ ] **CRITIQUE** : SQL 05–12 et 4 suites PG sur vrai moteur fictif isolé ; tester comportement des grants colonne, privilèges hérités, réitération et rollback, RLS/2 partenaires et 2 foyers, preuves CSV, débit différé, CAS et protection historique.
- [ ] Vérifier les éventuels dépassements des soldes numériques dans les autres calculateurs de la PWA (accueil/budget, recomposition des valeurs natifs/CAD) et la recette navigateur.
- [ ] Finir FX/Couple, PDF/OCR, premium UX, Safari iPhone, backups, transition clients 5.36.x et autorisation GO.

**La validation réelle du serveur PostgreSQL n'a pas eu lieu** ; SQL12 reste non appliquée, `main` et Supabase réel intacts. ~58 % ±10. Publication non autorisée.

---

## 25 octobre 2026 — CUTOVER RPC CAS EXCLUSIF : prêt à qualifier, NON APPLIQUÉ

**NO-GO production — migration 12 candidate exclusivement.** Nouvel artefact `migrations/12-trace-cas-exclusive-write-cutover.sql` propose la fermeture des écritures SQL directes de `authenticated` après vérification de présence des RPC CAS, RLS et 5 triggers 08–11. Revocation niveau TABLE + COLUMN sur documents et foyer ; postconditions effectives `has_*_privilege`. Aucune ligne budgétaire n'est modifiée. **Attention : l'application 5.36.x utilisant les écritures directes serait volontairement bloquée ; jamais activer sans autorisation explicite + procédure de transition.**

- [x] Migration 12 NON DÉPLOYÉE créée `a714bdc` et renforcée pour interdire tout `UPDATE` direct de `households` `35c8e61`.
- [x] Suite PGlite entièrement fictive conçue `07c03e4`, complétée (index CSV absent `fb3ade3`, renommage direct interdit `19fdce7`).
- [x] Gate de release vérifie **quatre** suites PG (la nouvelle 12 incluse) : `e2173f5`; tests de gate et contrats ajustés (dont `db487eb`, `45b455e`, `4bec9ee`, `366d348`, `5ad041f`).
- [x] **71/71 tests V8 de contrats et d'adaptateur client / gate fictif réussis**, vrais fichiers depuis GitHub, imports Node simulés. Deux harnais PG compilent sous V8.
- [ ] **BLOQUANT** : exécuter sur PostgreSQL/PGlite NATIF entièrement fictif migrations 05–12, 4 suites d'intégration, vérifier refus des anciens clients, absence de pertes et droits RLS effectifs de deux membres, puis tests de concurrence réelle et rollback.
- [ ] Vérifier tous les parcours 5.37, prévisualisation PWA, restauration, Auth/Reatime, Safari physique, flux internationaux et budget historique CAD.
- [ ] Concevoir une RPC de renommage du foyer si fonction demandée ; **ne jamais rétablir un `UPDATE` direct**.
- [ ] Vérifier/mettre en place la procédure réelle de bascule versions anciennes ; demander GO explicite. Aucun merge/déploiement Supabase ni commit main.

L'absence de PGlite/PostgreSQL native ne peut pas être compensée par les contrôles V8. **Production NO-GO, estimation 58 % ±10.**

---

## 25 octobre 2026 — capture fidèle des intentions de sauvegarde du client CAS

**NO-GO**. Correctif client `cfd340c` `[skip ci]` : chaque `saveDocument()` fige immédiatement une copie profonde JSON de la requête financière, avant son entrée dans la file `traceSerialWrite`. Les vérifications de quarantaine bancaire différée sont réexécutées sur le modèle actuel ET sur cette copie, empêchant à la fois les changements de montants involontaires et le blanchiment d'opérations différées.

- [x] Tests comportementaux candidats `3e0016a`, `2147f10` : deux demandes CAS successives avec montants 40/41 malgré mutation ultérieure à 900, notes imbriquées indépendantes, refus metadata différée et JSON non sérialisable.
- [x] **55/55 tests de contrat/JS exécutés sous V8** avec les véritables sources du dépôt et des modules Node simulés, dont adaptateur CAS client et RPC fictives ; syntaxe V8 du harnais PG.
- [ ] Exécuter `node --test tests/trace-cas-client.test.cjs` sur un véritable checkout et compléter tests navigateur Safari iPhone (actions simultanées, perte réseau, service worker, édition).
- [ ] Qualifier migrations 05–11 et les suites PostgreSQL/PGlite isolées avec jeux de données fictifs : concurrence CAS, Auth/RLS, révisions, FIFO, partage Couple, opérations de placement historiques, preuve CSV, cascade différée et restauration.
- [ ] Reprendre fermeture éventuelle des droits d'écriture directe après cutover vérifié ; aucun GO tant que ces barrières sont ouvertes.

Aucune banque réelle, Supabase, `main`, CI, workflow, PR, publication ou service worker de production touchés. Avancement 58 % ±10.

---

## 25 octobre 2026 — ancien compte bancaire des placements : contrôle CAS bidirectionnel

**NO-GO maintenu.** Migration 09 candidate : contrôle du compte bancaire original d'une opération de placement à la modification ET à la suppression. Le compte `bankAccountId` ancien doit encore être la propriété du membre actif et être un courant `checking` (si renseigné). La vérification du compte/portefeuille **nouveau** reste présente. Cette protection n'éteint pas les anciennes écritures directes ; un cutover serveur reste obligatoire après qualification.

- [x] Code candidat commité : `c20be62` `[skip ci]`.
- [x] Fixtures de risque inter-partenaire et compte manquant préparées dans `tests/trace-cas-writes.integration.cjs` : `2d2da87` `[skip ci]`.
- [x] Contrats statiques ajoutés aux tests `trace-cas-investment-ownership-static` : `548d820` `[skip ci]`.
- [x] **28/28** contrôles statiques/lexicaux V8 réussis sur sources actuelles avec dépendances Node simulées ; syntaxe du JS d'intégration valide sous V8.
- [ ] **CRITIQUE :** exécuter migrations 05–11 sur vrai moteur PostgreSQL/PGlite fictif, vérifier ancien compte bancaire/portefeuille, y compris opérations correctes et celles contenant des comptes absents, RLS et deux membres.
- [ ] Vérifier et documenter le traitement des anciens comptes sans `type='checking'` et sans automatiser la modification de mouvements financiers historiques.
- [ ] Verrouiller les écritures directes uniquement après cutover autorisé et vérification des anciens clients ; tester backups/restores, cascade CSV/différé, Realtime et CAS concurrent.
- [ ] Compléter FX/Couple/immédiat/crédit/PDF/OCR/UX premium et recette Safari physique ; GO humain explicite requis.

La migration SQL modifiée est NON qualifiée : aucun `postgres`, `psql`, `initdb`, PGlite ou téléchargement de dépendance disponible dans le conteneur. `main` intacte ; aucune donnée réelle ni déploiement touché.

---

## 25 octobre 2026 — la sonde CSV exige un index unique en état valide

**Production NO-GO.** `trace_csv_evidence_guard_ready()` exige désormais `trace_csv_unparsed_source_unique` sur la table documents avec `pg_index.indisunique AND indisvalid AND indisready`. Migration 11 encore **candidate et non appliquée**. Les tests fictifs PostgreSQL simulent la perte de l'index et la réapplication de migration pour contrôler que la capacité de stockage privé s'interrompt puis reprend.

- [x] Correctif et tests enregistrés dans `a5f207b`, `ae8ca41`, `dcf149b` (`[skip ci]`).
- [x] **20/20 tests statiques/lexicaux exécutés sous V8**, dépendances Node simulées ; compilation du harnais PG sous V8.
- [ ] Exécuter ces tests sur **vrai PG/PGlite**, valider l'index unique sur source normalisée, son RPC d'état, son échec/reprise, le cas direct SQL et les différents foyers/comptes.
- [ ] Tester également CAS/auth/RLS/concurrence, anciennes écritures directes, privacy/realtime, effacement et restauration du foyer y compris banque différée, backups et rollback.
- [ ] Finir FX/Couple/PDF/OCR, interface premium et tests Safari iPhone et obtenir autorisation de mise en production.

**Aucun test natif PostgreSQL ni navigateur nouveau réussi pendant ce lot.** Référence 58 % ±10, NO-GO.

---

## 25 octobre 2026 — preuve CSV : collision serveur et source normalisée

**NO-GO.** Migration 11 candidate : index unique partiel `trace_csv_unparsed_source_unique` ajouté (source = foyer + propriétaire + compte + nom de fichier exact + ligne numérique). Le garde refuse `accountId` >240 caractères ; précontrôle migration des preuves antérieures avec identités manquantes ou numéros invalides. Faille résiduelle à valider : création de doublons avec ID différent par RPC ou écriture directe legacy, désormais **censée échouer** en PostgreSQL par violation d'unicité.

- [x] Commits `9de886e`, `71f0b96`, `102491f`, `97c334e`, `19fa718`, `1d62ffb`, tous `[skip ci]`. Aucun autre branchement / deployment.
- [x] Contrats V8 : **19/19 statiques/lexicaux** sur les vrais fichiers SQL et JS, dépendances Node simulées. Harnais PG compilé sous V8 seulement.
- [ ] Tester le **vrai index PostgreSQL** et l'échec unique `23505` pour même foyer/propriétaire/compte/fichier/ligne même avec deux IDs ; `sourceIndex=4` / `0004`, reimport, écriture directe ancienne, lignes et propriétaires distincts.
- [ ] Tester un historique mal formé/dupliqué AVANT migration 11 : l'installation doit refuser sans effacer ni modifier les preuves.
- [ ] Qualifier intégralement la cascade foyer + CSV + débit différé, 05–11, Auth/RLS/CAS, deux sessions/foyers, Realtime, backup/restore/rollback dans moteur PostgreSQL/PGlite isolé (NON exécuté).
- [ ] Poursuivre FX/Couple, PDF/OCR, UX premium et Safari iPhone ; demander GO explicite, sans toucher à `main`, Supabase réel ou GitHub CI.

**Ne PAS compter les 19 contrôles V8 comme une exécution PostgreSQL.** Progression de référence 58 % ±10, production NO-GO.

---

## 25 octobre 2026 — correctif candidat de cascade différée (tests PG toujours requis)

**NO-GO.** Candidate 10 modifiée uniquement sur la branche internationale : exception limitée au `DELETE` déclenché après disparition effective du parent `households` et appelé par le vrai rôle PostgreSQL `postgres` sans JWT. Aucun accès à la fonction par les clients, aucun assouplissement du rejet des écritures bancaires différées, aucun RPC d'effacement utilisateur. **Vérification PostgreSQL encore ABSENTE ; ne pas déployer**.

- [x] Correctif candidat migration 10 écrit : `724ab694` `[skip ci]`.
- [x] Tests intégrés fictifs préparés : 4e utilisateur, foyer avec 2 anciens documents différés + compte et preuve CSV privée ; direct DELETE, membre DELETE, JWT injecté, cascade administrateur et contrôle des 4 tables : `4cb1c4a`, `301e675`, `73a1de5`.
- [x] Contrats statiques dédiés ajoutés dans `tests/trace-deferred-household-cascade-contract.test.cjs` : `d21a881`.
- [x] 17/17 contrôles sous V8, dépendances Node simulées ; compilation syntaxique JS du test PostgreSQL, **pas d'exécution SQL**.
- [ ] **CRITIQUE :** exécuter réellement migrations 05–11 sur PostgreSQL/PGlite isolé, puis `node tests/trace-cas-writes.integration.cjs`. Vérifier déclenchement cascade, snapshots, autorisations, transactions annulées, idempotence, JWT et restauration.
- [ ] Qualifier `tests/trace-database.integration.cjs` et `tests/trace-personal-settings-ownership.integration.cjs` avec deux foyers, deux membres et vrais rôles RLS/CAS.
- [ ] Concevoir puis valider le **droit d'effacement légitime des membres** indépendamment de la voie administrative.
- [ ] Poursuivre tests navigateur, Safari iPhone, budgets CAD historiques, flux internationaux, sauvegarde/restauration/rollback et GO explicite.

**Ne pas transformer une assertion qui devrait réussir en preuve PostgreSQL réussie.** `main`, service worker prod, GitHub CI/Actions, données Supabase réelles et déploiement inchangés.

---

> **Complément vérifié — 25 octobre 2026 :** commit `c8e27041a6fd02e11ebc022607ead8bf064f469a` (`[skip ci]`) : le test de suppression refusée vérifie désormais également que la ligne `household_members` et la sauvegarde `trace_v5_backups` survivent à la transaction avortée. **12/12 tests de contrat/lexique exécutés sous V8 avec `node:fs`, `node:path`, `node:assert` et `node:test` simulés, sur sources GitHub actuelles ; aucune exécution PostgreSQL ni suite Node native.** Les tests d'effacement PG restent NON exécutés et représentent un NO-GO.

## 25 octobre 2026 — barrière d'effacement des foyers avec débit différé

**NO-GO MAINTENU.** Sur la branche internationale uniquement, `tests/trace-cas-writes.integration.cjs` a été renforcé (`c195aee`, `666c866`, `333c2c9` ; tous `[skip ci]`) pour préparer une validation fictive supplémentaire : quatrième utilisateur, foyer indépendant avec ancienne carte différée + achat, et détection du rejet `TRACE_DEFERRED_NOT_RELEASED` lors de la suppression administrative (à travers la cascade `documents`). L'ancien schéma ne fournit pas de privilège de suppression du foyer aux membres. La suppression du foyer contenant seulement une preuve CSV reste couverte par le test précédent mais elle aussi NON exécutée sur ce HEAD.

- [x] Tests d'intégration écrits : cas de blocage d'effacement, conservation atomique en cas d'échec, membre sans accès DELETE ; limites et immutabilité des preuves CSV.
- [x] Contrôle syntaxique du fichier `.cjs` sous V8 après modifications ; correctif de fixture UUID paramétrée.
- [ ] Exécuter ces tests dans un **vrai moteur PostgreSQL/PGlite** local et fictif ; confirmer le comportement réel des triggers 10/11 et corriger tout échec.
- [ ] Concevoir/qualifier explicitement une **suppression légitime complète**, y compris anciennes opérations différées, preuves CSV, cascade, utilisateurs/partenaires, droits RLS, restauration administrative et rollback. Aucun bypass non authentifié et aucune relaxation générale du trigger pour atteindre artificiellement un test vert.
- [ ] Exécuter migrations 05–11, Auth/RLS/CAS multi-sessions, Realtime, données propriétaires et foyers distincts, tests Node/Chromium/Safari ; préserver les budgets CAD et toutes les décisions UX.
- [ ] Vérifier sauvegarde restaurée et procédure de retour arrière ; GO humain explicite obligatoire.

**Le test qui démontre un rejet attendu n'est pas un test de réussite de suppression.** L'estimation reste **58 % ±10 points**, production **NO-GO**, aucun SQL réel appliqué.

---

## 25 octobre 2026 — lot CSV longues lignes, empêchement des faux rapprochements

- [x] Commit `cd94b0a5bd1631fd58ad76d06feafaa51ab9eeea` : non-troncature silencieuse des noms CSV >110 caractères, `rawTruncated` et message de revue explicite si extrait supérieur à 650 caractères, nécessité de vérifier le CSV d'origine.
- [x] Commit `2da832a6613a0a7727cf304a750646309aac204e` : nouvelle empreinte `rawFingerprint` de la ligne intégrale (FNV-1a 64 bits **non cryptographique**, détection d'erreur accidentelle uniquement). Divergence de deux longues lignes ayant le même préfixe visible = conflit et aucune création bancaire. Vérification en prévisualisation et avant enregistrement. Contrôle fingerprint/longueur dans snapshot de revue ; test de non-régression.
- [x] Commits `f49610b013e243c4038f358a8e233dbcf261ac4c` et `9ef4e4e37831bf235f6ffb45aa7408915551ec83` : tests SQL fictifs préparés pour deux foyers indépendants, troisième utilisateur propriétaire et suppression admin avec cascade ; **non exécutés**.
- [x] `98/98` scénarios V8 sous mocks (28 CSV, 6 preview, 7 conflits, 5 partiels, 24 CAS, 6 Accueil, 10 revue, 8 SQL contrats statiques, 4 SQL lexique) et syntaxe JS du test PGlite réussis ; ne pas annoncer « 98 tests PostgreSQL » ou test navigateur.
- [ ] **NO-GO :** vrai checkout natif avec SQL/PostgreSQL/PGlite pour migrer 05–11 et tester Auth/RLS/CAS, abonnements Realtime, données privées cross-foyer, suppression légitime du foyer contenant des preuves et restauration. Analyser l'interaction du trigger 11 (interdit DELETE) avec cascade depuis suppression utilisateur, actuellement non qualifiée.
- [ ] Vérifier perf gros CSV, tests vrais navigateurs/FileReader, accessibilité 320–430px et iPhone Safari, régénération SW uniquement via constructeur officiel preview, imports PDF/OCR, Couple multi-devises, cartes CA/FR/différé, patrimoine, backups et rollback. Aucun fichier stable ni donnée réelle modifiés.
- [ ] **Avancement qualitatif maintenu à 58 % ±10**, candidat seulement et **PRODUCTION NO-GO**.

---

## 25 octobre 2026 — incident SQL 11 et garde-fou de collision source CSV

- [x] Défaut réel identifié dans la migration candidate 11 : littéral regex `sourceIndex` non terminé, empêchant la qualification SQL. Première tentative `595e66965dbfabf00e5067805beb3c0b7ebdd579` non correcte, supersédée par `26dcc704446798a900aed5623479d6867d2b3a6e` qui reconstruit la migration, préserve le terminateur regex par callback JS et valide l'index dans un `CASE` avant de convertir en entier.
- [x] `71739b3da130a37a69125517cf41c1418a7f6ee2` : test de lexicalisation statique SQL pour migrations 07–11, chaînes et corps `$tag$`, détection d'expression tronquée, singletons policy/trigger/RPC. 4/4 cas V8 sous mocks. **N'est pas une preuve de parsing ou d'exécution SQL PostgreSQL.**
- [x] `4b0377016059c4366cb597fd539d18a457cab031` et `a6bd854de0a3618786d58fc056431708611a65d3` : collision client désormais bidirectionnelle entre opérations CSV et preuves illisibles déjà conservées ; vérifie aussi les preuves marquées `reviewed`. 2 nouvelles fixtures end-to-end fictives, pas de nouvelle transaction silencieuse.
- [x] **91/91 tests ciblés V8 sur HEAD courant** : 24 CSV, 6 compte, 7 collision, 5 partiel, 24 CAS client, 6 Home, 7 inbox, 8 SQL contrat statique, 4 SQL lexique. Module Node/FileReader/DOM/RPC simulé, vérifications SQL statiques uniquement.
- [ ] **BLOQUANT :** vrai `node --test` dans checkout complet, PostgreSQL/PGlite migrations 05–11, 2 Auth JWT/foyers, RLS et triggers, RPC SECURITY DEFINER, relecture concurrente, sauvegarde/restauration, rollback. Aucun SQL de cette migration n'a été appliqué ni exécuté sur un moteur réel.
- [ ] Séparer confidentialité des extraits bancaires, RLS Realtime, liens entre preuves CSV et achats bancaires, certificat mensuel PDF. Valider Safari physique, SW preview construit officiellement, Couple/FX/patrimoine/débit différé avant publication.
- [ ] Stable `main` /5.36.5 intouché, ni PR, CI, Supabase réel ou déploiement. Estimation globale qualitative maintenue **58 % ±10**, release **NO-GO**.

---

## 25 octobre 2026 — confidentialité CSV : sonde de sécurité et restauration DBA

- [x] `2e675a6492fcd317fd47b91dcd8d97214e6e8606` : migration candidate 11 modifiée pour garder possible la restauration sans JWT par session administrative réelle `current_user=session_user='postgres'` ; session `authenticated` sans JWT refusée.
- [x] `452f265162f8dd6b93cde2a13e58182195949ca6` : SQL candidate ajoute `trace_csv_evidence_guard_ready()` (SECURITY INVOKER, contrôle RLS+policy SELECT restrictive+trigger activé). Client candidate appelle la sonde avant stockage/clôture de preuves sensibles. Absence de la fonction ou erreur/refus bloque la sauvegarde. **Cette sonde n'est pas une validation de sécurité** sans test Postgres effectif.
- [x] `e3cfdda7d23ccd70ddb87a92d3c45162db0e8611`, `7230365b49685b2458d1e7f30cb54d1de3550444` : tests V8 du refus sans protection et de la modification des preuves/comptes pendant la sonde ; contrats statiques SQL ; `85/85` tests V8 ciblés sans échec.
- [x] `498ea5f99f3a47bd994a7e78a29be7d13436dca8` : tests d'intégration PostgreSQL préparés pour policy/trigger désactivés et réapplication de la migration (retour à READY), NON EXÉCUTÉS.
- [ ] **BLOQUANT NATIF :** obtenir checkout local complet (le conteneur n'a pas de GitHub DNS), Node, PGlite/PostgreSQL fictif, exécuter migrations 05–11 et `tests/trace-cas-writes.integration.cjs`; valider RLS réel, CAS concurrent, direct grants, séparations entre foyers et propriétaires, entrée sans JWT, DBA restore. **Aucun accès aux données Supabase réelles.**
- [ ] Tests Realtime `REPLICA IDENTITY FULL` avec deux clients, backup/restore/effacement, charge CSV lots de 100, iPhone Safari et rendu premium, imports PDF/multi-devises, SW preview reconstruit officiellement + test `--check` et GO humain.
- [ ] Dernier bilan `85/85` représente vrais tests JS sous V8 avec modules DOM/Node/RPC simulés et 8 contrats SQL **statiques** ; **zéro SQL natif exécuté**. Production NO-GO, global 58 % ±10 points, `main` inchangée.

---

## 25 octobre 2026 — propriétaire des preuves CSV et limite des imports illisibles

- [x] Commits `27c521e0a5d0fef59949cdde926c85349bcc69c9`, `47dab520cd78f5259f75f815d0b5a479c4281eaf` : migration `migrations/11-trace-csv-unparsed-owner-privacy.sql` proposée, **NON APPLIQUÉE** ; RLS restrictive SELECT membre propriétaire sur `imports.csv_unparsed` ; trigger de protection des écritures directes/CAS, vérifiant membre et compte, empêchant modification de l'extrait et suppression des preuves, seule clôture explicitement revue autorisée.
- [x] `d5626c77fe2f9d9ea01e2057338c7acebec411bc`, `86c2632a374452603e4d23a466f40f5244b64122` : 5 scénarios PostgreSQL fictifs ajoutés à l'intégration existante et fixture JSONB corrigée. **Tests écrits, PAS exécutés sur PostgreSQL.**
- [x] `9a97a700f1291627b48a1fd7428f2a09e01938c7` : refuse les fichiers avec plus de 100 lignes CSV illisibles avec raison/action explicite, pas d'écriture partielle. Test ajouté.
- [x] `ce0fae9030c280a7d5f620b7aa2ee99c171a6b43` : 6 tests de contrat SQL statique ; qualification `77/77` sous V8 simulé (71 tests client + 6 statiques SQL), faux services Node/DOM/RPC, aucun PG réel.
- [ ] **BLOQUANT :** migrer fictivement 05–11 sur PostgreSQL/PGlite, exécuter `tests/trace-cas-writes.integration.cjs`, RLS pour deux membres et deux foyers, direct table grants, RPC `SECURITY DEFINER`, écritures simultanées, délégation de suppression/effacement, et rollback. Ne pas présenter cette sécurité comme appliquée en production.
- [ ] Vérifier Supabase Realtime sur `documents` (`replica identity full`) et voies indirectes de lecture (vues/exports/backups) ; clarifier rétention des preuves bancaires et besoin d'effacement côté utilisateur, restauration admin sous trigger strict.
- [ ] Tests vrais navigateurs, lots de 100/101 lignes et 1000 valides, Safari iPhone, SW labo via script constructeur officiel `build-trace-preview-pwa.mjs --check`, PDF mensuel, Couple/FX, patrimoine, débit différé, sauvegarde avant GO.
- [ ] **NO-GO production ; état global qualitatif `58 % ±10`.** Main/5.36.5 intacts. Aucun déploiement ni changement Supabase réel.

---

## 25 octobre 2026 — suivi persistant des lignes CSV non interprétées

- [x] `b13297ce7baf5926c2c0183a54f56c7cc0108ac9` : écrit des **preuves non financières** après consentement dans `imports` (`kind=csv_unparsed`, `status=pending_review`, source CSV, banque, titulaire, index, texte borné). Sans transaction, montant CAD, dépense, revenu ni journée certifiée. Peut conserver un CSV entièrement illisible. Identifiant stable de source, collisions bloquées.
- [x] `69a621f44ba2b6690f3cc4f1287457e4d5103f46` : liste des preuves dans Activité → Importer, compteur « éléments » à vérifier dans Accueil ; action explicite « Marquer comme revue » après vérification manuelle du relevé, statut non financier `reviewed`.
- [x] `0215dad8ec2bcfe71852ac12a0bbd6af5acb5d11`, `744fae90dec3ae9bf489ae77242f8753e4a3d938` : nouveaux cas de test et correction réelle collision historique source `importFileName` / `sourceFileName`.
- [x] `c6d7e36c44731b41315ebbf576b1fdc28f5a9751`, `bdb16d12350ade57c9ccebf50a220bcf913c20e9` : mise à jour contrat des tests anciens et nouveau test de revue/consentement/confidentialité UI ; total `70/70` tests sous V8 simulé sur vrai code, tous verts.
- [ ] **BLOQUANT serveur/confidentialité :** les extraits bancaires sont destinés à être conservés dans le foyer. Vérifier le modèle RLS de lecture et les droits de modification entre titulaires/foyers avec PostgreSQL/PGlite fictif (migrations 07–10) et deux utilisateurs, puis préciser rétention/effacement. Une barrière UI client ne remplace pas les règles serveur.
- [ ] Performance/imports volumineux : écrire une preuve par ligne peut provoquer beaucoup de RPC et des lots partiellement conservés. Qualifier limites, atomicité et gestion des erreurs avant GO.
- [ ] Exécuter les tests Node CLI de tout le repo, tests Chromium + FileReader véritable et Safari iPhone, contrôle mensuel PDF exhaustif/manuellement attesté, SW preview régénéré uniquement via outil officiel, backup/restore/rollback, puis GO utilisateur.
- [ ] Préserver les budgets CAD historiques, transferts internes hors budget, comptes FR immédiats, cartes CA crédit, Couple/multidevises et quarantaine différée. **Production NO-GO.**
- [ ] Estimation globale `58 % (±10)` ; progression qualitative d'environ +1 point pour la nouvelle file de revue candidate, sans validation production.

---

## 25 octobre 2026 — test intégré CSV et moteur mensuel fictif

- [x] Commit `f83c7fc091333950e80819c5b232e3b17d8a5868` : tests vrais points d'entrée CSV de `v5-app-5.37.0.js` avec FileReader/DOM/RPC fictifs (CAD/EUR, doublons, interruption en cours d'écriture, collisions de noms de fichier, lignes illisibles).
- [x] Commit `d687df3f1496c37025f511b1ff49e595d010d925` : fixtures CSV corrigées et error logger injecté dans la **simulation**, 8/8 tests intégrés V8 réussis.
- [x] Commit `832a821f9e60a5db7cb1491a9fc865cf0b448f8e` : rapprochement **lecture seule** du moteur mensuel sur les transactions CSV fictives — `pending` non `matched`, lignes bancaires identiques ambiguës, ligne absente détectée ; 3 scénarios supplémentaires.
- [x] **58/58 cas V8 exécutés** sur code et tests actuels avec dépendances simulées : 11 CSV/mensuel + 6 compte/mappage + 7 source + 5 partiel + 24 CAS + 5 Accueil. Aucune modification des moteurs financiers dans ce lot.
- [ ] **NON QUALIFIÉ :** tests Node natifs en checkout entier, SQL PostgreSQL/PGlite migrations 07–10, droits/grants/Auth/RLS/concurrence deux utilisateurs, lecture PDF réelle et comparaison manuelle exhaustive, rendu Chromium et Safari iPhone.
- [ ] SW prévisualisation périmé après chantiers JS/CSS précédents ; le reconstruire uniquement via `scripts/build-trace-preview-pwa.mjs` et valider `--check` en checkout complet. Ne pas toucher au SW production.
- [ ] Qualifier et sécuriser imports/Couple/multi-devises, débit différé atomique, patrimoine, interface premium, sauvegarde/restauration/rollback, puis obtenir GO utilisateur.
- [ ] **Production NO-GO.** Estimation globale qualitative maintenue `57 % ±10` malgré le renforcement de la couverture.

---

## 25 octobre 2026 — reprise : barrières CSV prévisualisation → import pending

- [x] `67ba2cd314d7f1dc20a00562136958d6b74882f9` : cohérence des colonnes, signe, date, propriétaire, compte et devise native contrôlée **avant chaque** import de ligne CSV. Un changement exige une nouvelle prévisualisation ; lignes déjà pending conservées.
- [x] `352e03be722df1f3d8696e3f56b524193fde6577` : source CSV déjà importée au même compte, fichier, numéro de ligne et empreinte identique ignorée ; contenu différent à la même source = **conflit visible, aucun import silencieux**. Anciennes transactions non supprimées, véritables occurrences sur lignes différentes préservées.
- [x] `3c6e0707a07fbe90d172a1b1979bb03044231cef` : import partiel conditionné à une attestation explicite concernant les lignes invalides visibles, dont l'enregistrement reste absent. **Ne pas déclarer un relevé complet.**
- [x] **47/47 scénarios V8** exécutés sur véritables sources 5.37.0 avec faux modules Node/DOM/RPC : 6 contexte, 7 collision, 5 consentement, 24 CAS, 5 Accueil ; zéro échec après correction du simulateur d'assertions.
- [ ] Qualifier l'intégration CSV complète (FileReader/DOM réel, différentes banques et formats, iPhone Safari) et conservation traçable des lignes invalides pour contrôle mensuel ; vérifier conflit de sources et comptes via sessions simultanées.
- [ ] **BLOQUANT :** checkout Node natif complet, `@electric-sql/pglite` ou PostgreSQL fictif migrations 07–10, droits directs, RLS/Auth/CAS, tests deux clients, validation serveur différée et rollback.
- [ ] Reconstruire le SW de prévisualisation **uniquement** par `scripts/build-trace-preview-pwa.mjs`, vérifier `--check`, Chromium/offline et Safari iPhone ; aucun SW production modifié.
- [ ] Couple/multi-devises prospective, imports multi-formats, fonctionnalités premium, restauration et GO humain explicite. **Production NO-GO**, global environ **57 % qualitatif ±10 points**.

---

## 25 octobre 2026 — « À faire » : trois raccourcis et fiabilité OCR

- [x] `9a6d3d71bdb7f69964067fc977fbd588a5984ebe` `[skip ci]` : trois actions tactiles intégrées dans l'Accueil candidat « Importer » (Activité → Importer), « Rapprocher » (réconciliations existantes), « Rappels » (alertes existantes). CSS premium + responsive et boutons accessibles ; aucun nouvel onglet ni débit.
- [x] `362fdec5861b781391b310eadba981a46f1bfa38` `[skip ci]` : correction de l'état « Tout est à jour » pour signaler les lignes OCR non résolues, sans les additionner au nombre des opérations `pending` et sans double comptage.
- [x] Tests **5/5** `tests/trace-home-next-actions.test.cjs` sous **V8 simulant Node/DOM** sur la section réelle ; **24/24** client CAS de nouveau sous V8 avec RPC simulées. Ces résultats ne sont **pas** des exécutions Node natives ni navigateur/Safari/PostgreSQL.
- [ ] Contrôler les trois boutons, lisibilité, focus et états OCR sur Chromium aux tailles iPhone et un vrai Safari iPhone ; vérifier écran de rappel, imports et rapprochements à l'arrivée, sans nouvelles opérations financières.
- [ ] Reconstruire **uniquement SW de preview** via `node scripts/build-trace-preview-pwa.mjs` puis `--check` sur checkout complet ; interdit d'éditer manuellement le SW, actuellement périmé.
- [ ] **BLOQUANT sécurité** : Node CLI complet, PGlite/PostgreSQL fictif 07–10 et Auth/RLS/CAS deux clients, ancien historique, cutover droits directs, double preuve différée, banques et Couple/FX.
- [ ] Rétablir les portes qualité mobile, import end-to-end, backup/restore/rollback et obtenir autorisation humaine avant publication. **Production NO-GO, global 57 % qualitatif**.

---

## 25 octobre 2026 — couverture des comptes différés historiques et des placements

- [x] Commit `8323cc64d3ac333c358e660f9f11ffe4af18f23d` : garde client et SQL candidate 10 refusent `paymentMode:'deferred'` même lorsque les comptes historiques omettent `type`. Tests typeless cartes + transactions + modifications + suppression préparés.
- [x] Commit `dfed7afab3611c84a0e31e16827f7bf5260cfa5e` : surveillance de `investment_operations` et de `bankAccountId` dans le client et SQL candidate 10 pour refuser les références à des cartes différées via des écritures de placement directes. Les transactions d'investissement ordinaires sur compte courant continuent à être acceptées par le contrat client.
- [x] **24/24 tests du fichier CAS client exécutés V8 avec Node/RPC/DOM simulés** ; aucune erreur. Compilation syntaxique JS des trois fichiers modifiés vérifiée.
- [ ] **BLOQUANT** : exécuter réellement `node scripts/check-trace-537-release-gates.cjs`, `tests/trace-cas-writes.integration.cjs` et les autres tests SQL migrations 07/08/09/10 sur checkout isolé + PGlite/PostgreSQL fictif ; valider vieilles cartes sans `type`, accès `bankAccountId`, RLS/Auth, RPC/CAS, deux sessions, grants directs et rollback. Tests SQL ajoutés mais PAS exécutés.
- [ ] Parcours bancaires différés réellement atomiques et double preuve côté serveur, vérifications de bout en bout des imports/Couple/FX, intégration premium, SW preview officiel, offline, Safari iPhone réel et GO explicite.
- [ ] Production **NO-GO** ; global qualitatif **57 % ±10**, pas de déploiement ou migration exécutée.

---

## 25 octobre 2026 — reprise : suppression, alias différés, test V8

- [x] **Commit `023c9130861df6c48eefb5c525ac6dbe9ce97577` uniquement branche 5.37.0 avec `[skip ci]`** : côté client, contrôle de suppression rétabli pour `imports`/`import_days` (recherche mémoire correspondante) et `reconciliations` ; alias d'allocation différée couverts sans carte chargée.
- [x] **SQL 10 candidat non appliqué** renforcé par les clés internes `deferredPurchaseId`, `deferredPurchaseIds`, `deferredFeeIds`, `deferredSettlementMode`, `deferredDueDate`, `deferredBankEvidence` ; scénario fictif ajouté au test PG non exécuté.
- [x] **22/22 tests client CAS sous V8 avec vrais sources/tests et dépendances Node/RPC simulées.** Compilation JavaScript des trois fichiers modifiés réussie. Aucune confirmation native Node/PGlite/PG/PostgREST.
- [ ] **BLOQUANT** : checkout complet + PGlite, `node scripts/check-trace-537-release-gates.cjs`, `node tests/trace-cas-writes.integration.cjs` et autres tests DB 07–10, anciens comptes et transactions, Auth/RLS/CAS à deux sessions, grants directs, refus de métadonnées et double preuve.
- [ ] **BLOQUANT** : fermeture du cutover bancaire, parcours Couple/FX/imports et UX premium, rebuild officiel du SW de preview, Chromium offline, iPhone Safari réel, sauvegarde/restauration et rollback autorisé.
- [ ] Production reste **NO-GO**, global **57 % qualitatif (±10)**, aucune fusion/PR/deploy/CI/Supabase réel.

---

## 25 octobre 2026 — contrôle des collections persistées et barrière de sortie PostgreSQL

- [x] Correctif `traceRefuseUnqualifiedDeferredWrite` : collections CAS effectives `imports` et `import_days` protégées à la place des noms mémoire `smartImports` / `importDays`.
- [x] `20/20` tests client CAS sous **V8 simulant Node et RPC** après correction des anciennes fixtures. La validation de la présence de vrais imports a détecté puis éliminé un écart réel, sans écriture Supabase.
- [x] Test d'intégration fictif enrichi : documents `transactions`, `imports`, `import_days`, `reconciliations` rattachés à une **ancienne carte différée** rejetés par le futur serveur même sans `deferredKind` ; transfert `toAccountId` idem. **Tests PostgreSQL NON exécutés**.
- [x] Commits exclusivement branche candidate et `[skip ci]` : `9ff2e6d`, `455eafe`, `1f8ae90`.
- [ ] **BLOQUANT** : exécuter vrais tests avec Node CLI du checkout complet et migrations 07/08/09/10 sur PGlite/PostgreSQL fictifs. Environnement actuel sans DNS GitHub/registre npm ni PGlite disponible.
- [ ] **BLOQUANT** : prouver Auth/RLS/CAS deux sessions et validation atomique de chaque preuve bancaire en base ; fermeture coordonnée des écritures directes, stratégie de rollback. Ne pas confondre la quarantaine 10 non appliquée avec la sécurité du déploiement.
- [ ] Imports réels, Couple/FX, débit différé et frais/refunds, UX premium, SW preview reconstruit par générateur, Chromium offline, Safari iPhone, sauvegarde/restore et GO explicite. **NO-GO production**.

---

## 25 octobre 2026 — Barrières de sécurité des écritures différées

- [x] Côté client candidat, `saveDocument` rejette les cartes différées et opérations référencées avec marqueurs financiers différés, `pending` comme `confirmed`. Même contrôle **dans la file CAS** immédiatement avant le RPC ; opérations ordinaires inchangées.
- [x] `removeDocument` refuse la suppression d'une transaction différée identifiable dans le journal local. Barrière client seulement, non preuve de sécurité serveur.
- [x] **Migration candidate 10 NON appliquée** : trigger `SECURITY DEFINER` `before insert or update or delete` sur `public.documents` pour refuser les écritures différées, y compris hors CAS ; cas anciennes lignes et écrasement des métadonnées abordés.
- [x] Scénarios PostgreSQL fictifs ajoutés dans `tests/trace-cas-writes.integration.cjs` et syntaxe JavaScript vérifiée. Ce n'est **pas** une exécution PGlite/PostgreSQL.
- [x] **18/18 tests client CAS exécutés sous V8 avec RPC et Node simulés**, cas de sauvegarde ordinaire, conflits, suppression, cartes différées, paiements, imports, file d'attente, marqueurs d'allocation. Zéro échec.
- [ ] **BLOQUANT MAJEUR** : exécuter **réellement** migrations 07/08/09/10 sur PGlite/PostgreSQL fictif dans un checkout, vérifier SQL, permissions et transactions à deux sessions, Auth/RLS/CAS, rejets des créations/suppressions directes et effets sur historique.
- [ ] **BLOQUANT MAJEUR** : avant déverrouillage des achats différés, concevoir et prouver une validation **serveur** de l'identité bancaire, sources distinctes, montants/devise/dates, unicité des pièces, transactions atomiques, remboursements/frais, révisions CAS et comptes Couple.
- [ ] Droits d'écriture directe maintenus par migration 09 pour compatibilité : préparer le retrait coordonné uniquement après qualification et autorisation ; migration 10 n'enforce pas tout CAS.
- [ ] Node natif complet, SW labo par générateur officiel, Chromium/offline, Safari iPhone, UI premium, devises Couple/patrimoine, backup/restore/rollback ; GO explicitement approuvé. **NO-GO production.**

---

## Accès conditionnel à la préparation d'une preuve de débit différé (25 octobre 2026)

- [x] `TraceDeferredStatementReviewUI` exige une carte au modèle bancaire `deferred`, liée à un compte courant non archivé même propriétaire/pays/devise, ou ce courant avec carte différée effectivement associée. Cartes ordinaires, comptes isolés, propriétaire différent et preuves hors preview sont exclus.
- [x] Le contrôle mensuel `TraceMonthlyStatementUI` transmet les comptes bancaires visibles. Une perte d'éligibilité invalide la restitution de l'ancienne preuve locale.
- [x] Fixture preview seule : carte de débit différé française fictive associée au courant EUR fictif. Aucune création réelle.
- [x] `101/101` tests ciblés sous V8, 9 suites avec sources authentiques du candidat et Node/fs/vm/DOM **simulés** (17 + 22 + 12 + 9 + 7 + 5 + 5 + 18 + 6).
- [x] Commits `922b5b6` et `9ac3033`, tous deux `[skip ci]` sur la branche candidate, main inchangée.
- [ ] **CRITIQUE** : runner Node natif complet sur checkout isolé et PG/PGlite fictif migrations 07/08/09, Auth/RLS/CAS à deux clients, contrôles de concurrence et permissions ; aucune preuve de qualification serveur à ce stade.
- [ ] Raccorder le parcours des documents à un véritable `pending` sécurisé et aux autres mouvements, avec refus des doublons/frais/refunds ambigus. Le parcours actuel reste prévisualisation et lecture seule.
- [ ] Refaire le SW **de preview** via générateur officiel, QA Chromium/offline et Safari iPhone natif. Finaliser la couverture Couple, FX, budgets et design premium, sauvegarde/rollback, puis décision GO humaine explicite. **NO-GO**.

---

## Raccordement des relevés PDF/CSV structurés à la revue différée (25 octobre 2026)

- [x] Pont **local et sans écriture** `TraceDeferredStatementBridge.convert` : sources préalablement structurées PDF/CSV via `TraceStatementEvidence.stage`, `reviewedRows`, contrôle de toutes les lignes, classifications signées uniquement par snapshot local, identification source/version, revue de complétude humaine, montants natifs, compte/devise/dates/page/ligne/texte d'origine.
- [x] Reconnaissance stricte des natures carte achat/remboursement/frais/paiement et courant débit/crédit, directions cohérentes ; lignes malformées, non classées, non approuvées ou modifiées refusées. Les attestations sont **non cryptographiques, non bancaires et non certifiées côté serveur**.
- [x] Le laboratoire fictif `trace-international-preview.html` utilise désormais le **vrai staging/bridge** pour fabriquer ses deux justificatifs locaux, au lieu de les créer directement comme documents complets. Deux attestations distinctes et expiration individuelle lors du changement de source, 0 transaction.
- [x] 4 commits : `224f73d`, `b9e97ad`, `176a46f`, `7fba0e6` ; toujours `[skip ci]` et seulement sur la branche candidate.
- [x] **77/77 vérifications V8 simulées** sur 7 suites de code candidat ; pas de Node CLI natif, PostgreSQL/PGlite, navigateur, OCR/PDF binaire ou flux cloud au HEAD actuel.
- [ ] **BLOQUANT** — relier les imports réels de relevés PDF/CSV aux états de revue utilisateur avec des données **fictives**, sans écrire en base ; gérer la complétude de toutes les lignes et les différences d'interprétation.
- [ ] **BLOQUANT** — qualifications natives Node et PGlite/PostgreSQL 07/08/09 Auth/RLS/CAS 2 clients sur checkout isolé ; préconditions `pending` → `confirmed` et prévention des doublons côté serveur.
- [ ] **BLOQUANT** — reconstruire `trace-international-preview-sw.js` avec le script officiel, QA Chromium/offline/iPhone Safari, restauration et rollback. Conserver désactivation cartes différées et aucune production.
- [ ] Finalisation multi-devises, Couple, frais/refunds/allocations et design premium avant un GO humain explicite. **NO-GO**.

---

## Débit différé — garde de règlement exclusivement attribué à un achat (25 octobre 2026)

- [x] `TraceDeferredEvidenceIntake` vérifie `checkingAccountId` du plan, devise du relevé courant et présence **sans doublon** de l'achat ciblé dans `purchaseIds` (commits `360ad429`, `fd1a241`).
- [x] Règlements partiels affectés **seulement à cet achat et sans frais** plafonnés en cumul à son montant bancaire natif exact ; montant fractionnaire de centime bloqué (commit `1d85b2a`).
- [x] Changement d'allocation multi-achats périme l'ancienne attestation bancaire et exige une nouvelle revue locale ; toujours 0 transaction créée.
- [x] **27/27 tests Node CLI natifs isolés** sur mocks (22 contrôleur, 5 UI), syntaxe du contrôleur vérifiée. **51/51 cas V8 simulés** avec véritables sources candidate et faux modules Node/fs/vm (17 + 22 + 12).
- [ ] **IMPORTANT** : les allocations de règlements comprenant d'autres achats, frais ou remboursements demandent le moteur complet et un journal fictif ; la revue de pièce bancaire seule ne prouve pas la répartition financière.
- [ ] **CRITIQUE** : exécuter le vrai runner Node complet, SQL PGlite 07/08/09 sur données fictives, Auth/RLS/CAS deux clients. Les nombres isolés ci-dessus ne sont pas des validations de ces portes.
- [ ] Compléter parcours réel d'import et confirmation `pending` sécurisée, Couple/multi-devises/premium, reconstruire SW de laboratoire via script, tester Chromium offline/Safari iPhone/rollback ; production **NO-GO**, aucune CI/deploy/Supabase réel.

---

## Barrières d'association achat différé / prélèvement — 25 octobre 2026

- [x] Le plan d'achat différé sauvegarde localement l'**identifiant du compte courant lié** dès la préparation en lecture seule ; pas de substitution ultérieure de compte par le comparateur.
- [x] Revue du prélèvement : compte et devise cohérents avec le plan, `purchaseIds` exigé, non vide, sans doublon, contient l'achat préparé.
- [x] Si une allocation de règlement est modifiée, l'attestation locale du prélèvement devient `stale_review` ; une nouvelle attestation reste **locale, jamais persistable**.
- [x] **23/23 tests natifs Node isolés** (18 contrôleur avec mock, 5 UI avec mock DOM) ; **45/45 tests V8** (Node/fs/vm fictifs, vraies sources financières incluses dans une suite). Un test de changement de répartition a détecté correctement une attestation expirée, puis a été corrigé pour l'exiger.
- [x] Test de clics V8 sur 7 modules réels et DOM simulé : double attestation, péremption séparée de chaque justificatif, zéro écriture.
- [ ] **BLOQUANT** : validation end-to-end des vrais imports structurés PDF/CSV sur données fictives, allocs multi-achats/frais/refunds dans moteur financier, source d'authentification et unicité vérifiées côté serveur.
- [ ] **BLOQUANT** : Node complet sur checkout, PGlite/PostgreSQL fictif migrations 07/08/09 Auth/RLS/CAS deux clients, SW de labo régénéré par script, Chromium offline, Safari iPhone et backup/rollback.
- [ ] Finaliser multi-devises/Couple/UX premium, autorisation explicite de GO avant toute modification réelle. **Production NO-GO.**

---

## Durcissement — complétude des relevés du courant (25 octobre 2026)

Le regroupement `TraceDeferredEvidenceIntake` ne marque plus deux preuves comme revues si `TraceDeferredBankReview.compare` signale un **autre document du lot bancaire invalide**, même si le prélèvement sélectionné a une attestation locale. Le champ `checkingSourcesComplete` le signale explicitement. **12/12 tests natifs Node isolés** sur l'adaptateur avec contrôleurs simulés ; 5/5 tests UI natifs isolés précédents ; 6/6 scénarios multi-modules V8 fictifs supplémentaires sur les sources réelles, ainsi qu'un clic-test V8 avec les sept modules réels (statuts initiaux, deux attestations, deux expirations). Ceci **n'est pas** un test Node intégré du dépôt, ni SQL, PG/PGlite ou Safari. Toutes les dépenses restent non persistables, NO-GO. HEAD initial de ce lot `de5782ed5299b6af4993fd93ed2f9cb06f00fe58`; aucun changement main, prod ou Supabase réel.

---

## Addendum de vérification — 25 octobre 2026

Après le circuit double preuve, `e825556372103f64d54149acd0fd5487017cc37d` ajoute `tests/trace-deferred-evidence-intake-real-modules.test.cjs` : **six scénarios sur les vraies sources** `TraceInternational`, `TraceDeferredDebit`, préparation d'achat, preuve carte, preuve courant et adaptateur. Ils sont **6/6 réussis dans un harnais V8 avec Node/fs/vm simulés** ; le fichier est présent pour sa future exécution **native Node** dans un checkout complet, mais **celle-ci n'a PAS été réalisée**. Montants 40 EUR → 64 CAD au taux fictif, deux attestations, invalidation indépendante, remboursement non accepté comme achat, impossibilité de confirmer/persister. Le SW de laboratoire est toujours périmé ; pas de PG/PGlite/Chromium/Safari ni GO. L'ancien bilan 219/219 V8 demeure historique et non rejoué sur ce nouveau HEAD.

---

## Revue d'achat et prélèvement : démonstration double preuve (25 octobre 2026)

- [x] Adaptateur **lecture seule** `TraceDeferredEvidenceIntake` : preuve d'achat sur carte et preuve de prélèvement sur courant sont deux canaux indépendants ; sources physiques et comptes distincts, contrôle des devises et associations.
- [x] Présentation dans `trace-international-preview.html` **laboratoire uniquement**, avec exemple fictif 40 EUR / 12,35 EUR, deux boutons d'attestation et changement de version source invalidant séparément chaque attestation.
- [x] **16/16 tests Node CLI natifs isolés** (11 adaptateur avec contrôleurs simulés + 5 UI avec DOM/contrôleurs simulés) et syntaxe JavaScript vérifiée. Ne pas les confondre avec des tests Node complets intégrés aux sources existantes, des tests SQL ou un navigateur.
- [ ] Brancher les sources de vrais imports **fictifs** PDF/CSV déjà structurés et intégrer le contrôle au parcours de validation de la candidate ; démonstration seule actuellement, aucune confirmation ni `pending` persistable.
- [ ] Exécuter Node complet + PGlite SQL 07/08/09 Auth/RLS/CAS 2 sessions, reconstruire SW **lab** officiel devenu périmé, tester Chromium/offline et iPhone Safari ; aucune production ni vraie donnée.
- [ ] Compléter multi-devises/Couple, frais/remboursements, UI premium, backup/rollback et GO humain explicite. **NO-GO**.

---

## Débit différé — preuve de l'achat sur la carte (25 octobre 2026)

- [x] Saisie `40,00` ou `40.00` dans le contrat candidat `pending`, montants natifs exacts, sous-centimes/notations ambiguës refusés.
- [x] Nouveau `TraceDeferredPurchaseEvidence.review` **lecture seule**, distinct de `TraceDeferredBankReview` des prélèvements du courant. Exige source structurée PDF/CSV complète, ligne d'achat explicitement sélectionnée, date/compte/devise/montant exact/sens débit, doublons physiques et revendications concurrentes bloqués.
- [x] Une attestation locale de comparaison reste `manual_review_current`, **jamais autorisation d'écriture**, expiration à changement de source/plan, non cryptographique.
- [x] Source bancaire carte mixte (achat/remboursement/frais/paiement) acceptée ; **seule** une ligne `card_purchase` constitue une preuve d'achat.
- [x] **219/219 contrôles V8 fictifs** sur 9 suites en reprise, dont 23 revue achat et 27 revue prélèvement. Aucun Node CLI/PGlite/Safari réel.
- [ ] Modules de preuve autonomes **non intégrés dans l'interface**. Relier au laboratoire d'imports structurés avec preuve d'achat séparée du prélèvement, afficher les ambiguïtés et les modifications de source ; ne pas ouvrir l'écriture.
- [ ] Sécuriser `pending` → `confirmed` sous Auth/RLS/CAS/PostgreSQL **fictif** avec preuves et unicité revalidées côté serveur, tests deux clients ; achat budget une fois, règlement transfert interne, remboursement/frais au centime.
- [ ] Checkout isolé/PGlite, `scripts/check-trace-537-release-gates.cjs`, SW preview régénéré par script, Chromium offline, iPhone Safari, backup/rollback ; **NO-GO**.

---

## Débit différé — dates budgétaires et contrat d'écriture, 25 octobre 2026

- [x] Budget/Home/catégories/année reposant sur `txs` : opération `expense` avec `deferredKind:'purchase'` affectée au mois `budgetDate` plutôt qu'au mois d'achat ; remboursement `deferredKind:'merchant_refund'` idem. Les anciennes transactions sans marqueur restent inchangées. Date invalide = pas d'écriture fictivement attribuée à un mois.
- [x] Revue de carte différée reconnaît les achats `deferredKind:'purchase'` et refuse un marqueur non identifié.
- [x] Nouveau `trace-deferred-write-plan-1.0.0.js` (non câblé à l'app) préparant seulement un objet `status:'pending'`, **non persistable** ; contrôle compte/titulaire, montant natif, date achat/budget/échéance, catégorie, devises achat/compte, quote CAD datée/sourcée, doublons et effets de simulation neutres.
- [x] **166/166 vérifications V8 fictives** en sept suites : 14 + 12 + 14 + 15 + 14 + 84 + 13, aucun test Node natif/SQL/browser.
- [ ] Lier la revue des documents en attente aux imports/relevés et aux corrections de doublons ; ne permettre `pending` → `confirmed` qu'après validation bancaire et tests Auth/RLS/CAS en PostgreSQL fictif. Les cartes différées sont toujours non activables et le module n'a pas d'écriture réseau.
- [ ] Vérifier les autres vues date/période, la granularité des allocations Couple, saisie/édition des achats, remboursements, frais et règlements. Tester toutes les suites natives et les deux clients CAS.
- [ ] Régénérer SW du labo avec son script, exécuter `scripts/check-trace-537-release-gates.cjs` sur checkout isolé avec PGlite, QA Chromium offline et Safari iPhone, sauvegarde/rollback. **NO-GO production**.

---

## Formulaire de simulation d'achat différé à trois dates — 25 octobre 2026

- [x] Sur la fiche d'une carte différée du titulaire : montant bancaire natif et dates **achat / impact budgétaire / prélèvement prévu** saisis distinctement, sans valeur présumée.
- [x] Simulation pure par `TraceDeferredDebit.simulate`, sans persistance ni double comptage, projection limitée à **cet achat hypothétique** (et non à la dette totale), montant/nombre de décimales/date/détention/compte lié contrôlés.
- [x] Anciennes cartes classiques et comptes courants ne chargent pas le simulateur ; protection ajoutée après détection d'une régression dans les tests UX des comptes.
- [x] Affichage mobile compact et projection expirant lorsque l'utilisateur modifie sa saisie.
- [x] **138/138 vérifications V8 fictives** sur cinq suites ciblées : 15 nouvelle fonctionnalité, 12 revue différée, 14 fiche comptes, 84 moteur différé, 13 UX premium. Ne sont PAS Node CLI, PostgreSQL ni Safari.
- [ ] **BLOQUANT** : cette fonction est un simulateur non enregistrable, pas un flux de création/validation des achats et règlements différés. Les cartes différées ne sont pas activables, aucun impact financier réel.
- [ ] Finaliser achat différé réellement enregistrable avec dates distinctes, relevés et règlement attestés, cas frais/refunds/imports, non-double comptage, droits utilisateurs et concurrence CAS, puis **tester** migrations fictives 07/08/09 et rollback.
- [ ] Lancer `node scripts/check-trace-537-release-gates.cjs` en checkout isolé avec PGlite, reconstruire le SW de preview depuis le script officiel, vérifier offline Chromium et iPhone Safari. Aucune autorisation production actuelle (**NO-GO**).

---

## Débit différé — contrôle des échéances en lecture seule (25 octobre 2026)

- [x] `traceDeferredAccountReview(card)` branché sur la fiche de compte candidat pour `paymentMode:'deferred'` : lecture des achats, frais, remboursements et règlements documentés ; dette théorique et échéances natives visibles **sans écriture**.
- [x] Refus de toute projection si date d'achat/budget/échéance, montant reçu ou pièce requise manque ; aucune conversion CAD automatique ni nouvelle dépense sur règlement.
- [x] 12/12 nouveaux scénarios V8, 84/84 scénarios du moteur différé, 14/14 comptes, 13/13 UX premium, soit **123/123 contrôles simulés V8**, sans Node CLI/PG/Safari.
- [ ] **Fonctionnalité complète non livrée :** création de carte à débit différé toujours désactivée, formulaires d'achat et règlement/associations bancaires non intégrés en écriture. Ne pas activer avant les tests PG/Node/UX et décision explicite.
- [ ] Suite QA native via `scripts/check-trace-537-release-gates.cjs` avec checkout/PGlite ; reconstruire le SW de preview via générateur, vérifier Chromium/iPhone Safari et rollback.
- [ ] **Statut NO-GO production.**

---

## Capture bancaire — sens immuable CAD et international (24 octobre 2026)

- [x] `smartApproveDraft` compare `bankDirection` OCR à la direction de la nature choisie pour **toutes les devises**, CAD inclus. Débit/credit opposés = refus avant sauvegarde.
- [x] Bouton UI verrouillé en cas de sens contradictoire, explication visible. Sens OCR absent non supposé.
- [x] Quatre scénarios CAD supplémentaires, et **97/97 contrôles V8 ciblés** repassés (92 simulations JS + 5 vérifications **SQL statiques**). Aucune exécution Node CLI/PG/browser native.
- [ ] **NO-GO** : exécuter le runner natif et PG 07/08/09 fictifs ; intégrer le différé et terminer Couple/premium, PWA et Safari, valider rollback.

---

## Comptes sur l'Accueil — contre-valeur CAD indicative (24 octobre 2026)

- [x] `trace-international-ui-1.0.0.js` : soldes natifs préservés et CAD **indicatif** explicite, taux daté et sourcé par compte, signalement « à vérifier » sans conversion fiable.
- [x] Source de taux manuelle ou Banque du Canada distinguée honnêtement ; toute source externe affichée avec échappement HTML.
- [x] Le moteur de demande de taux n'ignore plus une quote en cache invalide si un solde natif étranger est connu.
- [x] Mise en forme compacte mobile dans `trace-international-1.0.0.css`.
- [x] Nouveaux tests UX/FX 8/8 et régression de bascule de compte 9/9, soit **17/17 contrôles V8 fictifs**, pas des tests natifs navigateur.
- [ ] **CRITIQUE** — exécuter Node, PGlite/PostgreSQL fictifs, migrations 07/08/09 via `scripts/check-trace-537-release-gates.cjs` ; ne pas déployer en cas d'échec.
- [ ] Reconstruire SW preview via générateur, vérifier offline/Chromium, Safari iPhone et tous les parcours premium/différé/Couple/rollback. NO-GO inchangé.

---

## Qualification native reproductible — nouveau point d'entrée (24 octobre 2026)

- [x] Ajout du script **en lecture seule** `scripts/check-trace-537-release-gates.cjs` et de 10 tests de validation du gate réussis en V8 fictif.
- [x] Garde de branche `trace-5.37.0-international-accounts-fx`, contrôle état Git et transmission d'un environnement sans secrets Supabase aux sous-processus.
- [x] Le script prévoit les suites Node existantes, le test service-worker **`--check`**, puis les trois suites PostgreSQL/PGlite sur données fictives. Il ne génère aucun SW, ne déploie pas et ne lance pas de CI.
- [ ] **BLOQUANT :** disposer d'un checkout complet et d'un PGlite local dans un environnement de test isolé ; ici seulement Node est disponible. Exécuter réellement `node scripts/check-trace-537-release-gates.cjs` ; conserver les sorties authentiques et traiter tous les échecs.
- [ ] Reconstruire le SW laboratoire via son générateur puis contrôler `--check` depuis ce checkout (jamais SW prod).
- [ ] Qualifier véritablement migrations SQL 07/08/09, Auth/RLS/CAS/concurrence ; puis Chromium/PWA offline, Safari iPhone et scénario de rollback.
- [ ] NO-GO inchangé : résultat automatisé vert n'est jamais un GO de production à lui seul.

---

## Captures internationales — attestation, doublons et devises natives (24 octobre 2026)

**NO-GO.** Commit `465cfdc` (attestation de comparaison expirante), `3807d3e` (résistance absence module des natures et tests anciens), `fe29012` (affichage natif EUR/USD), tous sur la branche candidate `[skip ci]`.

- [x] Case « opérations distinctes » invalidée sur changement des informations et des mouvements comparés ; bouton désactivé tant que la vérification des doublons n'a pas été faite.
- [x] Les montants OCR/propositions de captures étrangères s'affichent dans la devise du compte ; aucun budget `40 CAD` présenté à la place d'un relevé `40 EUR`. Prévisualisation FX explicitement non évaluée.
- [x] Absence du module financier pendant l'amorçage : bouton non confirmable.
- [x] **93/93 vérifications V8 fictives** réexécutées, dont **5 statiques SQL**, mais aucune preuve de Node CLI, PostgreSQL/PGlite, Chromium, Safari ou deux clients.
- [ ] Exécuter réellement le générateur SW, les tests Node complets, migrations 07/08/09, CAS/RLS Auth en base fictive et tests iPhone Safari avant GO.
- [ ] Finir différé, modèles bancaires étrangers, compte/devise Couple, design premium, reprise et plan de rollback avant publication.
- [ ] Aucune production, CI ou données Supabase réelles sans autorisation explicite.

---

## Contrôle FX au centime et patrimoine — 24 octobre 2026

**NO-GO maintenu.** Trois commits `e8abbc5`, `f9ffc6b`, `7adbb09`, uniquement sur la branche internationale avec `[skip ci]`.

- [x] Refus explicite d'un achat bancaire étranger non nul qui deviendrait **0,00 CAD** en budget après arrondi.
- [x] Refus des valorisations étrangères avec multiplication FX infinie ou perte de précision sûre au centime.
- [x] Un solde étranger non nul ne peut pas devenir un actif `0 CAD` fictivement fiable : la vue `snapshot` est incomplète ; un solde natif réellement nul reste zéro.
- [x] Relecture intégrité : **78/78 contrôles V8 fictifs**, dont 5 vérifications **statiques** SQL ; aucun test PostgreSQL/PGlite ni Node CLI natif effectué sur ce HEAD.
- [ ] Exécuter les suites natives via `scripts/test-trace-native.mjs` sur checkout et dépendances fictifs.
- [ ] Exécuter réellement SQL 07/08/09 en PG fictif, vérifier le scénario `investment_operations`, la concurrence CAS, les droits RLS/Auth et les écritures directes à fermer lors du cutover.
- [ ] Regénérer le SW de preview via `scripts/build-trace-preview-pwa.mjs`, lancer `--check`, navigateur offline/Chromium, iPhone Safari.
- [ ] Terminer les flux financiers internationaux restants et le débit différé/UX premium/Couple ; aucun déploiement, aucune migration hébergée ou accès aux données réelles avant autorisation explicite.

---

## Portes ajoutées — investissement CAS et sens de preuve OCR (24 octobre 2026)

**NO-GO.** Correctifs candidats seulement, commits `a1ebbde`, `842ae60`, `e026ee1`, `8b2a4e3`, tous `[skip ci]`.

- [x] Crédit bancaire `bankDirection:'in'` d'une capture étrangère jamais confirmé comme dépense ; contrôle interface + handler, essais fictifs.
- [x] Après l'attente FX : relecture de l'objet compte et du brouillon synchronisés avant écriture, en plus des preuves déjà surveillées.
- [x] Migration 09 candidate : contrôles explicites `investment_operations` sur propriétaire du portefeuille et du compte courant associé, ainsi que propriété de l'ancien placement sur UPDATE/DELETE.
- [x] 51/51 simulations financières JS V8 + 5/5 contrôles statiques SQL V8 = **56/56 ciblés**, **pas** des tests Node CLI natifs, PG, navigateur ni RLS/Auth réels.
- [ ] **CRITIQUE** — exécuter les nouvelles règles migration 09 et son scénario de compte portefeuille en PGlite/PostgreSQL fictifs ; sécuriser les écritures directes lors d'un cutover autorisé.
- [ ] Rejouer toute la suite native Node / SQL 07/08/09 / deux sessions, reconstruire le SW laboratoire par le générateur et exécuter offline/Chromium/Safari.
- [ ] Completer les parcours étrangers, différé, Couple/patrimoine/UX premium ; qualification sauvegarde/restore/rollback et GO sous autorisation.

---

## Première revue OCR des achats en devise étrangère — 24 octobre 2026

**NO-GO.** Les commits `411a983`, `aa4ce6f` et `59e1d45` ne concernent que le laboratoire de TRACE 5.37.0.

- [x] Capture étrangère d'achat ordinaire : nature explicitement attestée, montant native exact, source/date du taux CAD conservées, budget valorisé sans valeur FX = 1 par défaut ; l'exemple fictif 40 EUR avec cotation fictive 1,60 donne 64 CAD.
- [x] Blocage des captures étrangères de remboursement, paiement de carte, virement et libellé ambigu ; conservation `pending` en l'absence de cotation ou confirmation.
- [x] Le bouton étranger n'est activé que pour un achat sûr appartenant au titulaire courant et après case cochée ; l'attestation est invalidée à chaque changement des données bancaires revues.
- [x] Re-vérification de la preuve après FX asynchrone et absence de mutation financière locale en cas de refus d'écriture.
- [x] Relecture des quatre suites ciblées sous V8 fictif : **46/46 réussis** (18 + 7 + 8 + 13), avec véritables sources candidate + modules FX/nature/guide. Ne pas les confondre avec les tests Node CLI, DB, navigateur ou iPhone.
- [ ] Exécuter toutes les suites Node natives et les migrations 07/08/09 en base PostgreSQL fictive et à deux sessions, Auth/RLS/CAS ; autres flux financiers étrangers restent incomplets.
- [ ] Regénérer service worker via `scripts/build-trace-preview-pwa.mjs` et contrôler offline/Chromium, puis Safari iPhone réel.
- [ ] S'assurer de couverture complète des mouvements étrangers, débit différé, UI premium/couple, sauvegarde-restauration/rollback autorisés et décision de sortie explicite.

---

## Portes sécurité ajoutées — cotation FX et virements/cartes (24 octobre 2026)

**NO-GO.** Les commits `070b8e7`, `bfb38d3`, `0c957b0`, `bc7f5e7` concernent uniquement la branche internationale.

- [x] Attente de la cotation CAD : comparaison des mouvements ressemblants refaite avant approbation CSV étrangère.
- [x] Capture source CAD → autre devise : conservation explicite du montant réellement reçu et de sa devise native ; centimes exacts, aucune conversion fictive.
- [x] Paiement de carte : source liée ou unique et non ambiguë, même devise/pays que la carte ; garde contre imputation à une autre carte ou source.
- [x] Contrôle croisé du code courant : **33/33 scénarios V8 fictifs réussis** (18 CSV, 7 capture, 8 transferts), y compris vrai moteur FX et vrai référentiel `TraceMovement`. Ce n'est pas un test Node CLI ou PostgreSQL.
- [ ] Rejouer sur un checkout natif et vérifier SQL 07/08/09 dans PGlite/PostgreSQL fictif et multi-session ; toujours pas de preuve hébergée.
- [ ] Régénérer le SW laboratoire par constructeur (l'asset actuel est périmé), vérifier hors ligne, Chromium, puis vrai Safari.
- [ ] Implémenter les autres natures internationales, différé, devise Couple et scénario d'écriture concurrente.
- [ ] Autorisation explicite avant sauvegarde de données réelles, migrations, cutover, rollback et déploiement.

---

## Portes additionnelles — captures étrangères et lots (24 octobre 2026)

**NO-GO maintenu.** Les deux commits `274414664eb480f73666b9a409437cee67dce54a` et `6bca9ab80caf1c7dfb1255db4f6285587c0dda5c` ne touchent que le laboratoire candidat et ses tests, jamais `main`, Supabase réel ou le déploiement.

- [x] Captures/OCR sur compte étranger : confirmation directe refusée et brouillon `pending` conservé ; bouton désactivé dans l'interface avec explication explicite.
- [x] Validations groupées restreintes à `pending`, aucune réactivation d'une ligne ignorée/traitée.
- [x] 7/7 tests captures/lots + 16/16 tests CSV exécutés dans un harnais V8 avec faux modules Node et transports, soit **23/23 simulés**. Ne pas leur attribuer le niveau de preuve Node natif/SQL/navigateur.
- [ ] Implémenter et qualifier un vrai parcours individuel OCR étranger (le rejet sûr actuel n'est pas une fonctionnalité terminée).
- [ ] Exécuter suites Node natives et SQL migrations 07/08/09 en PGlite/PostgreSQL fictifs, tester rôles, CAS et concurrence.
- [ ] Reconstruire le service worker via le générateur et requalifier Chromium et hors ligne, puis Safari iPhone et PWA installée.
- [ ] Préparer sauvegarde réelle fraîche autorisée, restauration isolée, rollback FX et décision GO explicite.

---

## Contrôles supplémentaires — revue étrangère et validations groupées (24 octobre 2026)

**NO-GO inchangé.** Les commits `650462a6c2e35199a1d230ed412ac1e54648e8a2` et `74e823f7deee512dc7021e7f3f824fdf7b328331` renforcent l'approbation CSV étrangère et bloquent la validation groupée des imports étrangers `pending` (CSV/OCR/PDF/captures). Changements strictement sur la branche de candidate avec `[skip ci]`, sans modification de `main`, CI ou déploiement.

- [x] Statut `pending` strict pour l'éditeur de dépense étrangère CSV ; révision de l'état de transaction et de compte après une attente de taux FX.
- [x] Garde commune de validation par lot : import étranger non-CAD `pending` jamais confirmé en masse ; revue individuelle obligatoire.
- [x] 16/16 scénarios réels du fichier de test exécutés **sous V8 simulant les modules Node**, sans PostgreSQL, navigateur ou données réelles ; syntaxe des actifs modifiés vérifiée sous V8.
- [ ] Rejouer ce test en Node CLI et toutes les suites historiques sur le checkout candidat final.
- [ ] Qualifier 07/08/09 en PostgreSQL fictif, deux sessions, rôles, droits, RLS et concurrence ; protéger les écritures directes uniquement après un cutover explicitement approuvé.
- [ ] Régénérer `trace-international-preview-sw.js` via le générateur, vérifier hors ligne et navigateur ; Safari iPhone natif restant à faire.
- [ ] Finaliser les autres flux internationaux de validation (les rejets sûrs actuels ne constituent PAS une fonctionnalité achevée).
- [ ] Sauvegarde/restauration/rollback sous autorisation et GO explicite avant tout déploiement.

---

## Contrôles ajoutés après la reprise catégorie/CAS/CSV (24 octobre 2026)

**NO-GO conservé.** Aucun nouveau test PostgreSQL, Chromium ou Safari natif n'a été exécuté.

- [x] Code de reprise additive des catégories, cache révision par ID, conservation des catégories personnalisées/archivées et des budgets présents ; **8/8 tests isolés V8 avec RPC fictif**.
- [x] RPC CAS candidate restreinte aux neuf collections connues, suppression physique refusée pour comptes et patrimoine ; **tests SQL ajoutés mais NON exécutés**.
- [x] Contrôle CSV étranger plus strict (montant initial natif et devises cohérentes, CAD encore absent, pas de FX déjà valorisée) ; **12/12 tests V8 avec moteur financier TRACE et faux DOM**, pas de test Node CLI.
- [ ] Exécuter les nouvelles suites avec **vrai Node** et les migrations 07/08/09 en PostgreSQL local fictif ; corriger les échecs.
- [ ] Vérifier les privilèges, RLS, contraintes et verrouillages CAS à deux sessions PostgreSQL/PostgREST isolées ; interdire les direct writes après une transition 5.36.5 autorisée.
- [ ] Régénérer et tester le SW laboratoire (actuellement périmé après changements JS/CSS), puis Chromium hors ligne/retour réseau et Safari iPhone authentique.
- [ ] Tests complets de catégories, budgets, comptes, transactions, imports et débits différés. Garder NO-GO jusqu'aux preuves et à la migration/rollback autorisés.

Détails et commits dans `docs/TRACE-5.37.0-HANDOFF.md`. Ne pas confondre « code présent », « test V8 avec faux transport », « intégration SQL » et « prêt pour production ».

---

## Contrôle de sortie après raccordement client CAS — 24 octobre 2026

**Statut actuel : NO-GO.** Le client 5.37.0 a maintenant le mécanisme de révisions et une UI de conflit ; l'ancienne ligne « raccorder le client » ci-dessous doit être interprétée comme **code présent mais non qualifié en PostgreSQL/Cloud**. Les RPC SQL 09 conservent temporairement les droits d'écriture directe par compatibilité, ce qui rend toujours le contournement possible.

- [x] App cliente 5.37.0 : lecture des révisions, RPC sur création/édition/suppression/settings, séquence locale, blocage des sauvegardes après conflit, alerte de récupération sur iPhone.
- [x] Contrats du vrai code extrait et tests de contrat exécutés sous V8 avec RPC fictives : 6/6 et 8/8 ; syntaxe JS vérifiée (distinct d'une exécution Node réelle).
- [ ] **Rejouer `node tests/trace-cas-client.test.cjs`** et les suites 5.36.5/5.37.0 sur un checkout local réel. Aucun nouveau résultat Node CLI n'a été obtenu.
- [ ] **Exécuter les deux tests d'intégration PostgreSQL des migrations 08/09** (et les 17 contrôles historiques) ; identifier et corriger les erreurs éventuelles.
- [ ] **Régénérer `trace-international-preview-sw.js`** à l'aide du générateur local puis relancer `--check` : le cache référencé sur GitHub est périmé après modification du JS et CSS. Aucun test hors ligne nouveau n'a été réalisé.
- [ ] Qualifier PostgREST/RLS/Auth/Realtime fictifs multi-session, coupures réseau, écriture persistante, rollback de conflits et privilèges `GRANT`/`REVOKE` avant de considérer `STALE-WRITE` clos.
- [ ] Finaliser la validation d'import étranger et les natures banque/carte/virement/remboursement ; raccorder le différé et la devise Couple indépendante.
- [ ] Refaire une recette sur **vrai Safari iPhone**, puis préparer sauvegarde réelle autorisée, migration et rollback financier avant toute publication.

Le HANDOFF en tête du dépôt contient les SHA du lot et les commandes. Aucun SQL n'a été déployé. `main` et GitHub Actions sont inchangés.

---

## Portes ajoutées après la reprise des migrations 08 et 09

**NO-GO maintenu.** Les fichiers SQL ont été créés sur la branche, jamais appliqués à un Supabase réel. Les anciens résultats d'essais du 24 octobre restent historiques et ne qualifient pas les nouvelles migrations.

- [x] Migrations candidates 08/09 et harnais fictifs d'intégration enregistrés avec `[skip ci]`, sans changer `main`.
- [x] 26 vérifications statiques V8 sur les signatures, contrôles de propriété, interdiction des mises à jour obsolètes et compilation JS des deux tests. **Pas un test PostgreSQL exécuté.**
- [ ] Lancer `tests/trace-personal-settings-ownership.integration.cjs` et `tests/trace-cas-writes.integration.cjs` sur PGlite 0.4.5 dans un checkout isolé, corriger toute erreur SQL et mettre à jour les preuves.
- [ ] Vérifier le schéma et les politiques réelles uniquement dans un clone Supabase fictif autorisé : JWT `auth.uid()`, RLS, `SECURITY DEFINER`, droits `EXECUTE`, rôle anon, propriétaires et changements simultanés.
- [ ] Raccorder `v5-app-5.37.0.js` aux RPC de version pour chaque création/édition/suppression, y compris les brouillons imports, les réglages, les comptes, les placements et les écritures hors ligne. En cas de version périmée : refuser l'écrasement et proposer le rechargement/la conciliation.
- [ ] Après qualification de la transition et compatibilité des anciens clients, retirer les écritures directes de tables afin que les RPC ne puissent plus être contournées. **09 est non contraignante tant que les anciens grants persistent.**
- [ ] Réexécuter ensuite toutes les anciennes suites, les deux nouvelles suites d'intégration, les scénarios à deux sessions et la recette Safari iPhone.
- [ ] Auditer la couverture complète des préférences personnelles dans `households.settings` (08 ne couvre que cinq familles de champs).
- [ ] Ne jamais appliquer ces migrations à des données financières réelles sans export frais, restauration isolée, autorisation explicite et scénario de rollback compatible FX.

### Justificatifs

Commits précis et commandes de tests dans `docs/TRACE-5.37.0-HANDOFF.md`. Après les commits SQL/doc uniquement, les chiffres précédemment publiés pour Node/Chromium/PostgreSQL ne doivent pas être attribués aux changements 08/09. Aucun nouveau résultat Safari n'est revendiqué.

---

# TRACE 5.37.0 — checklist de décision de sortie

**Verdict actuel : NO-GO.** Mission du 24 octobre 2026. Code qualifié localement : `94c613cd4e1c547a38671083c1da773967bded70` ; consolidation documentaire ultérieure. Les empreintes de source permettent de contrôler que les essais correspondent au code présent. Une réussite Node ou Chromium ne vaut pas feu vert production.

## Périmètre vérifié

- [x] HEAD initial candidate `6eb6c17e5c9eba2d3727ebea404cce5fec0424c6` ; `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` revérifiée sur GitHub.
- [x] Branche autorisée uniquement, tous les commits `[skip ci]`, aucune fusion, PR ou publication.
- [x] Entrées production 5.36.5, application stable et workflows inchangés ; déploiement Git automatique de la candidate désactivé.
- [x] Tests financiers fictifs ; aucune lecture/écriture financière Supabase réelle.
- [x] 46 fichiers syntaxiques et 54 suites Node natives : 911 scénarios rapportés, zéro fichier en échec.
- [x] 32 scénarios Chromium réel, cinq onglets et largeurs 320/390/430, formulaires natifs/FX, comptes, patrimoine, CSV et worker PDF local.
- [x] PDF.js réel 6.4.299, licence, SHA-512 du paquet et SHA-256 des actifs ; extraction locale FR/CA et repli manuel sans enregistrement automatique.
- [x] Rechargement complet du **laboratoire fictif** hors ligne et extraction PDF sans réseau ; cache statique propre à son périmètre.
- [x] 17 contrôles PostgreSQL fictifs : persistance disque, isolation inter-foyers, sauvegardes/restaurations, migration 07 et anomalies explicites.
- [x] 8 contrôles HTTPS publics Valet pour quatre devises sur dates historiques, y compris le week-end. Aucun identifiant financier transmis.

## Portes de sortie restant ouvertes

| Domaine | Code présent | Unitaire | Intégration | Navigateur | Prêt production |
|---|---|---|---|---|---|
| Accueil/comptes/principal et archivage | Oui | Réussi | Partiel | Chromium réussi | Non : droits serveur/race/Safari |
| Budget prévu/réel/trois familles/douze mois | Oui | Réussi | Partiel | Chromium réussi | Non : référence personnelle/Couple incomplète |
| Immédiat/crédit/paiement/FX/frais | Oui | Réussi | SQL fictif réussi | Scénarios ciblés réussis | Non : parcours cloud/concurrence incomplets |
| Épargne internationale/valorisation | Oui | Réussi | SQL fictif réussi | Scénarios EUR et inconnus réussis | Non : couverture autres devises/UI/cloud à étendre |
| PDF mensuel | Oui, actifs réels | Réussi | Extraction réelle réussie | Chromium et hors ligne réussis | Non : Safari et corpus bancaire représentatif |
| CSV CAD | Oui | Réussi | En mémoire | Téléversement réel réussi | Non : unicité inter-clients/transport cloud |
| CSV étranger | Import pending oui | Réussi | Partiel | Native EUR sans effet financier vérifiée | **Non : validation finale bloquée** |
| Captures/OCR/PDF quotidien | Partiel | Partiel | Incomplet | Non qualifié | Non |
| Débit différé/règlements multiples | Moteur isolé | Réussi | **Pas intégré au journal** | Démo isolée seulement | Non, création désactivée |
| RLS propriétaires | Migration 07 candidate | N/A | Réussi sur PostgreSQL fictif | UI seule | Non appliquée ; réglages personnels ouverts |
| Verrou optimiste / conflits | Absent côté serveur | Reproduction de l'échec | Perte de modification démontrée | Non qualifié | Non |
| Auth/sync à deux utilisateurs | Héritée | Partiel | Pas de Supabase hébergé | Pas de deux sessions réelles | Non |
| PWA Safari iPhone | Candidate labo | Contrôles statiques | Chromium fictif seulement | **Aucun Safari natif** | Non |
| Sauvegarde/migration/retour arrière | Outil et procédure | Réussi | Deux restaurations fictives réussies | N/A | Non : sauvegarde réelle et rollback compatible à qualifier |

- [ ] Fermer `RLS-PERSONAL-SETTINGS` et `STALE-WRITE` avec contrôles atomiques côté serveur et reprise des conflits.
- [ ] Qualifier la migration 07 sur un environnement Supabase fictif autorisé, avec Auth, rôles et Realtime réels ; précontrôle des propriétaires sans attribution automatique.
- [ ] Finaliser l'éditeur/validateur des opérations étrangères en attente et les modèles virement/carte/remboursement associés.
- [ ] Raccorder le débit différé et les règlements partiels au vrai journal, puis tester persistance et import.
- [ ] Finaliser les devises de référence personnelles/Couple avec effet prospectif et historique figé.
- [ ] Qualifier captures, OCR, PDF quotidien et ambiguïtés inter-imports avec corpus fictif FR/CA.
- [ ] Exécuter la recette sur un vrai iPhone Safari et sur la PWA installée, y compris fermetures/retour réseau/écritures en attente.
- [ ] Préparer le SW de production : ressources 5.37 complètes, cache nommé, migration des anciens clients et absence de nettoyage global d'autres caches.
- [ ] Obtenir une sauvegarde réelle fraîche sous autorisation, vérifier l'inventaire indépendant et restaurer en environnement isolé.
- [ ] Éprouver le gel des écritures et un rollback conservant les écritures FX postérieures à la sauvegarde ; ne pas revenir aveuglément en 5.36.5.
- [ ] Rejouer les contrôles sur le commit final choisi, examiner les risques puis obtenir l'autorisation explicite de fusion/publication.

Le contrôle `node scripts/trace-release-preflight.mjs` est local et en lecture seule. **Code de sortie 2 = NO-GO attendu**, zéro déploiement. Les rapports détaillés, commandes, anomalies et procédure Safari sont dans [WORK-VALIDATION](TRACE-5.37.0-WORK-VALIDATION.md). Ne pas présenter une ancienne URL Vercel comme la version de cette mission.
