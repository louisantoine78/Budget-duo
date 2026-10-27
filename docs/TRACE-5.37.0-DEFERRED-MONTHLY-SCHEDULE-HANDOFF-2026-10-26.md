# TRACE 5.37.0 — Calendrier mensuel de débit différé (26 octobre 2026)

Branche exclusive : `trace-5.37.0-international-accounts-fx`. HEAD du code avant ce document :
`23ba485eed1a3bec8e226e380c2dee9a4a227170`. Base de départ : `f6d0f58f7757a76779d4404cd04e4068baed5147`.
Toujours résoudre le HEAD réel à la prochaine reprise.
Stable `main` : `02c70f50e7e51da79b77a91dde96a03c6c719909`.

## Fonctionnement validé avec l'utilisateur

Une carte française à **débit immédiat** débite le compte courant et le budget une fois à l'achat.
Une carte française à **débit différé** enregistre l'achat dans le budget (sur la date budgétaire choisie) et au passif de la carte. Le compte courant n'est diminué que lors du prélèvement **effectivement confirmé**, sans seconde dépense.
Chaque carte différée aura un **jour de prélèvement mensuel** (1–31) et, de façon distincte, un **jour de clôture de son relevé** optionnel (1–31).

Si les deux jours sont connus, la clôture est celle du mois de l'achat, ou du mois suivant si l'achat arrive après la clôture. La date prévue de débit est le premier jour mensuel strictement ultérieur à cette clôture. Si l'un des jours tombe après le dernier jour d'un mois, utiliser le dernier jour calendaire de ce mois : 31 → 28/29 en février, ou 30 en avril. Aucun décalage automatique pour un week-end ou jour férié ; date prévue et date bancaire réelle sont deux champs distincts.
Sans clôture, seul le prochain jour mensuel est indiqué comme information, **sans attribuer automatiquement un achat à un lot**. Pas de prélèvement automatique, d'écriture bancaire ou de taux FX inventé.

Exemples :
- 28 de prélèvement / clôture le 20 : achat le 12 oct. 2026 → 28 oct. ; achat le 21 oct. → 28 nov.
- Prélèvement le 5 / clôture le 20 : achat le 12 oct. → 5 nov. ; achat le 21 oct. → 5 déc.
- Prélèvement le 31 / clôture le 20 : achat le 21 janv. 2027 → 28 fév. 2027 ; en année bissextile 2028 → 29 fév.

## Commits effectués (tous `[skip ci]`)

1. `752a0fdb` : `TraceDeferredDebit.monthlyDebitSchedule`, calcul pur en dates civiles UTC, période de clôture, mensualité et statut `allocationVerified`, avec 17 tests spécifiques.
2. `8eb42ef4` : dans `v5-app-5.37.0.js`, simulation en lecture seule avec deux réglages, échéance calculée automatiquement seulement si la clôture est connue ; validation de dates et message explicite, sans nouveau mouvement.
3. `ce4c10b9` : validation pure des champs par carte `deferredDebitDay` et `deferredClosingDay` par `TraceInternational.resolveAccountEdit`, sans rétroaction sur transactions historiques ni modification de carte canadienne classique.
4. `23ba485e` : accès à la simulation du calendrier depuis les paramètres « Mes comptes » de la carte ; indication claire « configuration réelle bloquée ».

## Tests exécutés après les quatre commits

**189/189 scénarios V8**, sur les fichiers réels GitHub, huit suites :
- `trace-deferred-monthly-schedule` 17 ;
- `trace-international-deferred-debit` 84 ;
- `trace-deferred-purchase-forecast` 24 ;
- `trace-account-lifecycle` 16 ;
- `trace-deferred-write-plan` 17 ;
- `trace-deferred-account-readonly-integration` 14 ;
- `trace-deferred-household-cascade-contract` 5 ;
- `trace-deferred-budget-month` 12.
Le JavaScript principal a également passé l'analyse syntaxique dans V8. Les APIs Node, fichiers et navigateur étaient **simulés** : ce ne sont PAS des suites Node natives sur checkout complet, ni PostgreSQL/PGlite, ni Safari iPhone réel.

## Étapes restantes : ne pas confondre prévisualisation et fonctionnalité déployable

L'enregistrement réel des comptes à débit différé demeure volontairement refusé par la garde `TRACE_DEFERRED_NOT_RELEASED`. Les champs existent en validation pure et en simulation, mais ne sont **pas sauvegardés dans le compte réel**. Avant activation, il faudra définir la règle de prise d'effet d'une modification de jour (sans recalcul de l'historique), rendre persistante la configuration par carte, qualifier la sécurité propriétaire/foyer/CAS et la migration candidate sur PostgreSQL isolé, gérer les décalages de débit réellement constatés, puis tester iPhone Safari et les imports bancaires.

Quatre suites PostgreSQL/PGlite des migrations 05–12 **non exécutées**. Migration 12 **NON APPLIQUÉE**. Aucune modification de `main`, aucune PR/fusion, CI/Actions, déploiement ni écriture Supabase réelle. **Production NO-GO.** Estimation globale indicative ~58 % ±10 points.


## Lot complémentaire — prévision de trésorerie différée par carte (26 octobre 2026)

HEAD de départ vérifié : `5ad59c4ff38dd74aa186bd2dd5c9b2f32bdcb398`, cinq commits après le HEAD communiqué `f6d0f58f`. La branche `main` demeure `02c70f50e7e51da79b77a91dde96a03c6c719909`.

Commits de cette reprise sur la branche exclusivement (tous `[skip ci]`) :

- `c438df1c240313d4fa9582b56fcbfe7e52155e45` : moteur pur `TraceDeferredDebit.projectCheckingBalance`, fondé sur le résultat de `simulate` et un solde courant TRACE explicitement fourni, sans mouvements ni écriture.
- `fed2503e172d0a8938043329f7bf7c8614911bb0` : 11 tests nouveaux sur le solde prévisionnel d'une carte, le non-double-débit, les statuts `pending`, remboursements, règlements partiels justifiés, découverts, montants natifs et mutations interdites.
- `4d999051b1fc495711e17d29afb3da697d1acd39` : fiche carte différée affichant solde du courant **calculé par TRACE**, différé restant et solde prévisionnel limité à cette carte. La projection est bloquée si solde inconnu, moteur absent, mouvements ou points de rapprochement confirmés datés dans le futur.
- `f4fa122b666b38b5edcc7e3d83cfe15e4474d436` : quatre scénarios complémentaires d'intégration interface, dont garde des mouvements futurs et refus d'inventer un solde.

**Preuve réellement obtenue : 187/187 vérifications sous V8 avec `fs/path/vm/node:test` simulés**, sur les sources GitHub au HEAD `f4fa122b`, sept suites :
84 `trace-international-deferred-debit`, 17 `trace-deferred-monthly-schedule`, 11 `trace-deferred-balance-forecast`, 18 `trace-deferred-account-readonly-integration`, 24 `trace-deferred-purchase-forecast`, 16 `trace-account-lifecycle`, 17 `trace-deferred-write-plan`. Le code principal a été analysé syntaxiquement sous V8.

**Frontières financières :** aucun prélèvement confirmé n'est généré, aucune seconde dépense budgétaire, aucun recalcul historique et aucune persistance de dates par carte. La projection soustrait seulement la dette restante d'une **seule** carte de l'estimation du compte courant ; elle exclut explicitement les autres cartes, futurs mouvements ordinaires, frais inconnus, aléas bancaires et taux FX. Un solde TRACE calculé n'est **pas** un solde bancaire réel certifié par un relevé actuel. Les écritures déjà confirmées dans le courant ne sont pas débitées une seconde fois.

**Portes encore fermées :** création des cartes différées et enregistrement effectif du jour de prélèvement/clôture toujours interdits via `TRACE_DEFERRED_NOT_RELEASED`. Restent à définir la prise d'effet prospective de toute modification de jours, sécuriser migrations SQL candidat 05–12 et CAS/Auth/RLS sur PostgreSQL isolé, relier preuves d'achat carte et preuve distincte de débit courant, qualifier scénarios PDF/CSV/OCR, paiement décalé/partiel et réconciliation bancaire, compte conjoint/autres cartes, véritable checkout Node, cache PWA, Safari iPhone et restauration/rollback.

**N'ont PAS été exécutés :** tests natifs Node sur un checkout intégral, migrations 05–12 sous PostgreSQL/PGlite, tests navigateur, Safari, hébergement Supabase, concurrence à deux sessions. Le conteneur ne dispose pas d'un checkout Git accessible (DNS GitHub inaccessible) ni de PGlite, mais le connecteur GitHub permet lectures/commits de la branche.

Aucun changement de `main`, aucune PR, fusion, action GitHub déclenchée manuellement, déploiement, migration appliquée ou lecture/écriture Supabase réelle. **Production NO-GO.** Avancement indicatif global inchangé : **environ 58 % ±10 points**, à recalibrer uniquement après qualifications d'intégration effectives.


## 26 octobre 2026 — règles prospectives datées et simulation dans les réglages

**Code HEAD de ce lot :** `b2ae4ccd401f306241de2c52faa5b39fac2e606a`. Base documentaire précédente : `3470934b77be89a5b5a7c3d8b65d2d500dbda94f`.

### Implémenté sur la branche candidate, sans sauvegarde bancaire

- Le moteur pur `TraceDeferredDebit.proposeScheduleRevision` prépare une version de calendrier datée pour **une carte française différée active en EUR liée au compte courant EUR du même titulaire**. Il exige une date de prise d'effet future, interdit une révision dans le cycle de relevé actuellement ouvert lorsque l'ancienne clôture est connue et refuse un deuxième changement déjà programmé.
- `TraceDeferredDebit.scheduleForPurchase` sélectionne la règle en vigueur **à la date de l'achat** à partir de `deferredScheduleVersions`. Un achat antérieur à la première version reste sans attribution automatique. Les achats et échéances historiques réellement enregistrés ne sont jamais réécrits par ces modules.
- Les anciens réglages `deferredDebitDay/deferredClosingDay` sans date d'effet historique bloquent l'établissement automatique de nouveaux calendriers versionnés, en attendant une revue bancaire. Une clôture manquante ne permet pas de créer de lot exigible automatique. Les jours 29/30/31 suivent la règle de fin de mois validée.
- Dans les paramètres de la carte différée française, choix **en simulation seulement** du nouveau jour de prélèvement, du jour de clôture et de la date de prise d'effet. Le résultat est calculé en lecture seule, ou refusé avec un message précis. Aucune commande de sauvegarde du calendrier n'est exposée.
- Les contrôles explicites de propriétaire, compte lié, devise et pays sont vérifiés avant la proposition. Une carte canadienne classique, étrangère, archivée, orpheline ou d'un autre titulaire est exclue.

### Commits supplémentaires (tous `[skip ci]`)

- `9af7876d909df16f50643984669a33f9c53e9ccf` : moteur de calendriers successifs à prise d'effet.
- `5b5bedfda5ebaf210d3f97cb02401b5aa91e2552` : tests du moteur versionné.
- `f5ec3ab9f4af9797597577ba16696c13d65a81db` : prévisualisation des paramètres futurs de chaque carte.
- `0f337ddde3ceaa32be9286dc99a4954964bc8d64` : tests de l'interface de prévisualisation.
- `fbc374d20b4e16929f31d697906fcc13b72198ea` : vérification pure du vrai compte courant EUR lié et du titulaire.
- `6ff77b0ab0c0522b32767baa892ccc9bdf7df291` : tests de propriété/devise/pays.
- `ad33e62322d62d8a7d4db0633f616ff44f9103a8` : raccordement de cette vérification à l'UI.
- `b2ae4ccd401f306241de2c52faa5b39fac2e606a` : blocage UI du compte non lié.

**Validation réexécutée au dernier HEAD : 224/224 contrôles V8 simulés sur 11 suites, aucune erreur**, dont 13 nouveaux scénarios de calendrier versionné, 7 scénarios UI, 84 moteur comptable, 17 calendrier simple, 11 projection cash, 18 rapprochement lecture seule, 24 prévision d'achat, 16 cycle de vie, 17 plan d'écriture, 12 budget différé et 5 contrôles **purement textuels** de la migration 10. Syntaxe de `v5-app-5.37.0.js` analysée avec V8. Modules Node `fs/path/vm/node:test` simulés par un harnais, **pas** de Node natif sur checkout complet. La prévisualisation HTML référence déjà `trace-deferred-debit-1.0.0.js`, mais son cache SW n'est pas requalifié.

**BLOQUANTS inchangés :** `proposeScheduleRevision` produit uniquement `persistable:false`, `confirmed:false`, `writes:0` ; les versions ne sont pas enregistrées dans des documents propriétaires ou une base réelle. `resolveAccountEdit` possède encore une validation indépendante des jours sans contrat de prise d'effet SQL ; il ne faut **pas** lever `TRACE_DEFERRED_NOT_RELEASED` avant migration/protocole serveur, verrouillage CAS, RLS, authentification, tests de révisions concurrentes, provenance des deux relevés et gestion des changements bancaires de date réelle. Les tests Node natifs, migration 10–12 réellement jouée PostgreSQL/PGlite, PWA/Chromium/Safari iPhone et Supabase isolé à deux clients restent **NON EXÉCUTÉS** dans ce lot. Migration 12 non appliquée.

Production **NO-GO** ; `main` intacte ; aucune PR, fusion, Action déclenchée manuellement, déploiement, ni manipulation Supabase réel. Pour la prochaine reprise résoudre le HEAD à nouveau, régénérer et vérifier le SW laboratoire uniquement via le générateur, poursuivre les qualifications SQL/RLS/CAS sur environnement fictif, puis connecter la persistance prospectivement **seulement après** preuve des gardes serveur. Estimation globale ~58 % ±10 points.


## Lot complémentaire — preuve des prélèvements complets et décalages bancaires (26 octobre 2026)

**Début du lot :** `4a7ee57e5b500ecf4b9c32762005e2be35bdc436`. **Dernier HEAD du code testé :** `b2d2ebdd12e7ded5e286cbaabcf6cea48ba21181`. Comparer à nouveau le HEAD réel à la prochaine reprise.

### Changements réels, sans persistance

- `trace-deferred-bank-review-1.0.0.js` étend la revue locale de justificatif du compte courant aux **prélèvements complets**. Un règlement complet exige sa propre `scheduledDueDate` et une ligne explicite `bankEvidence` correspondant **à la date bancaire réelle**. Un règlement partiel conserve `allocationDueDate` et ne peut mélanger ces champs.
- La réponse de revue expose `scheduledDueDate`, `observedDebitDate` et `bankDateDeviationDays` (signé), sans décaler automatiquement une échéance de week-end/jour férié. Modification de la date ou d'une ligne annexe du relevé périme l'attestation humaine, qui n'est pas une authentification bancaire. Un règlement ne peut pas réutiliser une ligne physique déjà revendiquée.
- `trace-deferred-evidence-intake-1.0.0.js` exige, pour un règlement complet alloué à **un achat unique et sans frais**, le montant natif exact et le bon lot d'échéance. Pour un paiement « complet » couvrant plusieurs achats ou frais, `fullBatchEvidenceComplete:false` empêche de présenter la revue d'un seul achat comme certification du lot total : la comparaison de la ligne courante reste seulement locale.
- La démonstration fictive dans `trace-international-preview.html` et `trace-deferred-lab-ui-1.0.0.js` propose une date bancaire observée séparée, affiche les jours d'écart et rejette les dates impossibles/antérieures à l'achat. Le calcul reste celui de `TraceDeferredDebit.simulate`, sans nouvel achat budgétaire ni virement créé.
- Important : le contrôleur documentaire pour règlement « complet » et le simulateur comptable `TraceDeferredDebit.simulate` sont **des étapes séparées**, non un flux persistable unique. Ne jamais traiter un jeton de revue locale comme autorisation de modifier un enregistrement `confirmed`.

### Commits de développement (tous `[skip ci]`)

- `fc0b878e0a72d040f05d3ce3752fa2c452305e86` : rapprochement local complet + dates réelles/plans.
- `e02ecf45238e3d6dedebd93b9b50c0f3c52ba53c` : scénarios date anticipée/retardée, montant, source, unicité et attestation périmée.
- `1e53d68b47dd457984e5de212ef2feda3c4db56b` : prévention du faux « entièrement réglé » sur un achat isolé.
- `a204b23aa8b9aca395a55fa87db56d790245c0c9` : intégration de 4 cas réels modules fictifs, sans écriture.
- `3868c2f798967d5d692a1dcc9c5e22fbb5644099` : jours de décalage dans le labo.
- `086c710108c190e4a9cd5e4e104ec1a4521be8dc` : saisie séparée de date bancaire dans la preview fictive.
- `b2d2ebdd12e7ded5e286cbaabcf6cea48ba21181` : tests de saisie valide/invalide et ancien avis révoqué.

**Qualification réellement obtenue au HEAD `b2d2ebdd` : 332/332 vérifications ciblées sous V8 avec dépendances Node simulées, 16 suites** :
40 comparaison relevé courant ; 27 intake de preuves ; 20 intake avec modules réels ; 7 bridge de relevés ; 14 lab fictif ; 84 moteur différé ; 17 calendrier mensuel ; 11 prévision de trésorerie ; 13 versions de calendrier ; 7 paramètres UI ; 18 lecture compte ; 16 cycle compte ; 24 projection achat ; 17 plan d'écriture ; 5 contrats SQL **statiques** ; 12 mois de budget. La syntaxe du fichier principal `v5-app-5.37.0.js` passe le contrôle V8. **Aucun** test Node natif sur checkout complet, PostgreSQL/PGlite, Auth/RLS/CAS réel, navigateur Chromium ou Safari n'a été exécuté pendant ce lot.

**Limites de sortie et sécurité :** les résultats restent `persistable:false`, `eligibleForServerConfirmation:false`, `confirmed:false`, `writes:0`. Tous les PDF/CSV et relevés des tests sont fictifs. La quarantaine `TRACE_DEFERRED_NOT_RELEASED` reste intacte. La preview a changé : **service worker candidat à régénérer exclusivement via le générateur, puis `--check` sur checkout local avant tout test PWA**. Aucune migration réellement appliquée, aucun changement `main`, PR, fusion, déploiement, action CI déclenchée manuellement ou accès Supabase financier réel. Production **NO-GO**.

Prochaine étape de fiabilité : rattacher les attestations à l'identité immuable des sources et à la version serveur/CAS dans un environnement fictif réellement exécuté sur PostgreSQL ; vérifier à deux sessions, deux membres, deux cartes, remboursements et frais, dates prévues/réelles avant de considérer la persistance. Refaire ensuite toute la recette Node/Safari/PWA et restauration isolée. **Estimation globale ~58 % ±10 points**, sans hausse artificielle avant les vérifications bloquantes.


## Reprise du 26 octobre 2026 — garde SQL et justification des règlements affichés

**HEAD de départ :** `a8d5f533921d2201aa9ac38330ebd2565dc6c0af` ; **HEAD du code testé :** `3ff991a93629ef5d5a8cae249665344a735c5dcd`.

### Correctifs réellement enregistrés en branche candidate

1. **Quarantaine SQL migration 10 (NON APPLIQUÉE)** : les documents `accounts` contenant `deferredDebitDay`, `deferredClosingDay` ou `deferredScheduleVersions` sont refusés même si `paymentMode` est absent ou falsifié en `credit`. Les nouvelles métadonnées transactionnelles `scheduledDueDate` et `allocationDueDate` sont également réservées pendant le NO-GO. La logique canadienne ordinaire sans ces champs reste autorisée.
2. **Tests en attente du vrai moteur SQL** : `tests/trace-cas-writes.integration.cjs` ajoute des tentatives de création CAS et directe avec une carte faussement ordinaire, les alias de dates et un contrôle Mastercard CAD classique. Fichier JavaScript syntaxiquement validé sous V8, **aucune** migration ni vérification SQL/PostgreSQL native effectuée.
3. **Affichage carte différée** : `traceDeferredAccountReview` refuse désormais de projeter un solde « réglé » si des transferts marqués `confirmed` ne sont pas reliés à une preuve de débit bancaire **indépendante** dans ce parcours. Une métadonnée `deferredBankEvidence.reviewed` auto-déclarée ne constitue pas une preuve. Tant que le module de source/provenance n'est pas relié à la fiche, ce blocage couvre tous les règlements confirmés. Les achats sans règlement confirmé et règlements `pending` peuvent être présentés comme **théoriques**, sous les gardes existants. Les soldes bancaires TRACE enregistrés ne sont pas réécrits.
4. **Non-régression** : aucun changement dans les moteurs de transferts CAD/MC, fichiers production `main`, migrations appliquées ou états Supabase.

### Commits de ce lot (tous `[skip ci]`)

- `ce3ad2d21d272d17826e96037eee7892f7f200bf` — garde SQL contre les calendriers différés sous carte falsifiée.
- `6e850fe4862bd0a0191413c52fdec71cf3e94ad9` — assertions statiques correspondantes.
- `ffb3629e6f29c3bad652951a53f657115b1a4c6d` — cas PostgreSQL fictifs à exécuter dans un environnement isolé.
- `601026fbbb27ce5a345fc043af6430e3df718c84` — refus de soldes apparemment réglés sans preuve bancaire liée.
- `3ff991a93629ef5d5a8cae249665344a735c5dcd` — scénarios de régression de la fiche compte.

### Tests réellement effectués

**354 / 354 contrôles ciblés V8 simulés, zéro échec sur 17 suites au HEAD `3ff991a9`.** Ces contrôles incluent :
- 20 fiche de compte différé, 17 calendrier mensuel, 11 trésorerie prévisionnelle, 13 calendriers versionnés, 7 paramètres UI, 24 achats simulés, 16 vie des comptes ;
- 40 preuves de règlement, 20 rapprochements sur modules réels en mémoire, 7 conversion de relevés, 19 cycle réel de fonctions Mastercard + amis, 12 budget différé, 17 préparation d'écriture, 6 contrôles SQL **purement textuels** ;
- 84 scénarios comptables du moteur, 27 intake des preuves, 14 labo fictif.
La syntaxe JS de `v5-app-5.37.0.js` et du fichier de tests PG ajouté a été analysée dans V8, pas par le runner Node CLI complet.

**Non exécutés** : tests Node natifs sur clone intégral, migrations 05–12 sous vrai PostgreSQL/PGlite, Auth/RLS/CAS à deux sessions, sources bancaires authentifiées, vraie chaîne de publication du SW, Chromium/iPhone Safari, restauration. L'environnement local dispose de Node 22 mais ne peut pas accéder au dépôt privé par git (résolution DNS GitHub impossible) et n'a aucun serveur PostgreSQL/PGlite isolé accessible ; les sources ont été lues/éditées via le connecteur GitHub. **Ne jamais transformer les 354 tests simulés en « 354 tests natifs ».**

### Bloquants et suite à donner

- Qualifier migration 10, notamment nouvelle clause `accounts`, sur PostgreSQL isolé avec fixtures CAS/directes, lecture de compte adversarial, anciens documents et régression Mastercard.
- Définir un protocole de preuve durable (identifiant source SHA, lignes typées, revue non périmée, unicité serveur et CAS) pour déverrouiller conditionnellement la **lecture** des règlements confirmés ; ne pas accepter les seuls marqueurs client.
- Réexaminer les effets éventuels du champ transactionnel générique `scheduledDueDate` sur les modules non différés lors du test SQL complet ; garder les systèmes CA non modifiés.
- Après qualification SQL/Node, vérifier PWA preview/SW régénéré par générateur, puis Safari iPhone et scénario rollback. Ne pas lever `TRACE_DEFERRED_NOT_RELEASED` maintenant.

**Production NO-GO.** Aucun accès aux données financières réelles, aucune fusion, PR, déploiement, exécution d'Actions ni changement de `main`. Estimation globale inchangée : ~58 % ±10 points, en attendant les portes de qualification.


## Complément qualité : remboursement/frais dans un prélèvement intégral et formats monétaires (26 octobre 2026)

Départ de cette reprise : `f882545f4384b66909f40cfc2ba1ac61df4bd01a`. Code effectivement testé : `bf4d8a0e94b2c5fc1a21022cc226fdda4f04b7e4`.

### Changements conservateurs

- Le contrôleur `TraceDeferredEvidenceIntake.review` n'autorise plus `fullBatchEvidenceComplete:true` pour un règlement complet sur **un achat unique** si la source carte soumise contient des lignes supplémentaires, notamment remboursement commerçant, frais de carte, autre achat ou paiement reçu. La ligne courante et l'achat peuvent chacun être revus localement, mais cela ne démontre pas le solde net **complet** du cycle. Le marqueur `localEvidenceReviewed` reste donc faux. Un relevé carte limité à un achat unique avec revue renouvelée peut encore montrer un rapprochement documentaire local, non bancaire et sans droit d'écriture.
- `TraceDeferredBankReview.money` valide désormais les montants importés déjà structurés en centimes natifs décimaux : nombres JS exacts ou chaînes décimales canoniques avec au plus 2 décimales. Rejette les notations exponentielles, hexadécimales, montants négatifs, fractions de centime, textes à virgule ou à espaces non normalisés, booléens/objets. Les parseurs PDF/CSV doivent normaliser leurs montants avant de créer une ligne typée de preuve, sans inventer de valeurs ou de taux FX.
- Les contrats historiques des cartes Mastercard CAD et les anciens moteurs comptables restent non modifiés. Aucune écriture, confirmation bancaire, accès Supabase ou publication.

Commits (tous `[skip ci]`) :

1. `c11d69e9bae8d3cbc78100e034fa563056985c08` — revue de lot « complet » désormais conservatrice face aux autres mouvements.
2. `d10ec75fa955831622d83b8d7cf4cca8cc4c9609` — tests de remboursement, frais, autre achat et prélèvement intégral isolé.
3. `3a8c9cec970ff3a1fd4708e44156d91a4ea0578d` — vérification des chaînes de centimes structurées sans coercition JS.
4. `bf4d8a0e94b2c5fc1a21022cc226fdda4f04b7e4` — tests des entrées malformées, de 0,01 EUR, des états de preuve.

### Résultat des contrôles sur le HEAD du code

**358 / 358 scénarios V8 simulés, sur 17 suites, aucun échec**. Repartis en quatre groupes distincts :
- 98 : revue bancaire (42), intake réel entre modules (22), pont sources relevés (7), intake simulé (27) ;
- 57 : calendrier (17), solde prévisionnel (11), versions futures (13), cycle vie comptes (16) ;
- 63 : fiche différé (20), paramètres UI (7), projection achat (24), budget (12) ;
- 140 : moteur bancaire différé (84), plan d'écriture (17), contrat SQL textuel (6), Mastercard + amis (19), labo fictif (14).
Le JS du fichier candidat principal a passé l'analyse syntaxique V8. Les modules Node fs/path/vm/test étaient **simulés** ; les deux commits de tests ne certifient **pas** des tests natifs ou une base réelle. Une tentative de récupération groupée a échoué côté connecteur puis a été retentée avec succès par petits groupes. Aucun résultat n'a été compté pour le passage avorté.

### Qualification restant obligatoirement ouverte

- **PG/RLS/CAS :** pas de clone Git local, de PGlite/PostgreSQL isolé ou de tests concurrents serveur réellement exécutés dans cette session. La migration 10 demeure candidate, la migration 12 NON APPLIQUÉE. Le verrou `TRACE_DEFERRED_NOT_RELEASED` ne peut pas être relâché.
- **SW/PWA :** les assets du labo ont changé depuis le cache généré `trace-international-preview-sw.js`. Le générateur `scripts/build-trace-preview-pwa.mjs` existe, mais ne peut pas être exécuté ici sur un checkout intégral ; son mode `--check`, Chromium hors ligne et Safari iPhone restent **non requalifiés**. Ne jamais éditer manuellement le SW ni le SW de production.
- **Finance :** pour une vérification « complet » sur un relevé carte complexe ou multi-achat, compléter les allocations/remboursements avec preuve bancaire et contrôle serveur atomique avant de requalifier `fullBatchEvidenceComplete`. Les marqueurs `manual_review_current` restent une revue cliente, pas une authentification bancaire.
- **Publication :** aucune PR, fusion, Action déclenchée manuellement, mise en production ou manipulation des transactions réelles ; `main` intacte. Production **NO-GO** et pourcentage d'avancement global indicatif inchangé (~58 % ±10 points).


## 26 octobre 2026 — calendrier UX explicite et centimes stricts (reprise à partir de acc6a8b0)

**HEAD de départ confirmé :** `acc6a8b01a12714fe9068df79ccee0934fb4ee63`. **HEAD du code effectivement testé :** `5484afe90ac77f5f8d402af690b574a7cb84916a`.

### Fonctionnalités et correctifs enregistrés sur branche candidate

1. **Prévisualisation UX du calendrier à date d'effet** — Dans `v5-app-5.37.0.js`, la proposition non enregistrable dans les paramètres de carte française affiche maintenant un **achat fictif à la date future de prise d'effet**, la vraie clôture de cycle calculée et le **jour mensuel de prélèvement théorique** qui en découle. Exemple : effet le 21 février 2027, clôture le 20 mars 2027, prélèvement théorique le 31 mars 2027. Les mois courts sont gérés par le moteur existant, sans date bancaire réelle inventée. Si la clôture est absente, seul le prochain prélèvement **indicatif** est affiché, sans allouer de lot. Aucun historique recalculé, aucune écriture persistante.
2. **Montants bancaires stricts au sein du simulateur** — `TraceDeferredDebit.cents` refuse désormais la coercition JS implicite pour tous les mouvements différés (achats, transferts, remboursements, frais) : chaînes exponentielles, hexadécimales, textes à virgule, espaces, 3 décimales, booléens, objets ou tableaux. Nombres JS finis et chaînes décimales normalisées de 1 à 2 chiffres après la virgule acceptés si montants natifs en centimes exacts et bornes cohérentes. La preuve documentaire `TraceDeferredBankReview` appliquait déjà ce contrôle : les deux modèles convergent.
3. Aucun changement des règles Mastercard canadiennes, des données réelles, de `main`, des migrations SQL en base, de la séparation Moi/Couple ou des écritures différées mises en quarantaine.

### Commits — chaque message `[skip ci]`

- `d7a8e1a9cca67bffa5e57eac402547f06d710626` — affichage de l'échéance d'un achat d'exemple, lecture seule.
- `7b30b3b38c19abf6554e9f46993100770b0732ec` — 2 tests supplémentaires d'UX (clôture, date future, échéance indicative).
- `d48cecd4a0c36e8b6885abda9ae0441e2c7f5daf` — validation stricte des centimes dans le moteur comptable différé.
- `5484afe90ac77f5f8d402af690b574a7cb84916a` — 2 tests de non-coercition et précision à 0,01 EUR.

### Validation au HEAD `5484afe9`

**362 / 362 vérifications ciblées V8 simulées, zéro échec, 17 suites** :
- Calendrier mensuel (17), soldes prévisionnels (11), versions (13), paramètres UI (9) : 50.
- Fiche compte (20), achat prévisionnel (24), comptes (16), budget (12) : 72.
- Revue bancaire (42), intake modules réels en mémoire (22), intake simulé (27), pont de relevés (7) : 98.
- Moteur comptable différé (86), plan d'écriture (17), contrat SQL **statique** (6), Mastercard CAD + remboursements proches (19), laboratoire différé (14) : 142.

**Limite explicite :** ces assertions exécutent de vrais JS candidats dans V8 mais utilisent des doublures des modules `fs/path/vm/node:test` ; elles ne sont **PAS** le runner Node natif sur checkout complet ni une exécution de PostgreSQL. Le moteur JavaScript principal `v5-app-5.37.0.js` a passé l'analyse syntaxique V8. Le conteneur disponible dispose de Node 22, mais ni checkout local, ni PGlite/PostgreSQL, et `git ls-remote` ne peut résoudre `github.com`. Les sources sont modifiées via le connecteur GitHub, jamais via Supabase réel.

### Priorités inchangées / portes NO-GO

- **Blocage n°1 :** qualification en environnement fictif isolé des migrations 05–12 (Auth/RLS, CAS, simultanéité, quarantaine du différé, provenance/identités, restitution). Ne lever `TRACE_DEFERRED_NOT_RELEASED` qu'après avis explicite et contrôles PostgreSQL réels.
- **Blocage n°2 :** persistance Auth/RLS/CAS des versions de calendrier prospectives et des écritures débit différé avec sources bancaires immuables indépendantes sur carte/courant ; ne pas calculer un solde réglé depuis une simple propriété `status:'confirmed'`.
- **Blocage n°3 :** reconstruire le service worker **du labo** avec `scripts/build-trace-preview-pwa.mjs`, puis exécuter `--check` sur checkout complet ; qualifier hors ligne, retours réseau, iPhone Safari physique, imports PDF/CSV/OCR et sauvegarde/restauration.
- **Blocage n°4 :** relecture UX premium globale et maîtrise des flux Moi/Couple, devises indépendantes, patrimoine/avances, tests complets de non-régression avant toute release.

Production **NO-GO**. Aucun déploiement, CI forcée, merge, PR, ni transaction réelle. Estimation globale indicative ~58 % ±10 points tant que ces qualifications ne sont pas effectuées.
