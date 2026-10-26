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
