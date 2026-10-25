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
