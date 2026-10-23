# TRACE 5.37.0 — Audit de développement international (non publié)

**Statut : chantier en branche uniquement, non approuvé pour production.**

Base fonctionnelle conservée : `main` / TRACE 5.36.5, commit `02c70f50e7e51da79b77a91dde96a03c6c719909`.
Branche : `trace-5.37.0-international-accounts-fx`.
Entrée de production : `index.html` (toujours câblée en 5.36.5). Ne pas la basculer avant les tests d'intégration et la validation iPhone.

## Audit et mesures de sécurisation déjà effectuées

- Moteur `trace-international-1.0.0.js` : un montant bancaire est calculé en devise native, une contre-valeur CAD est figée et datée à la validation. Aucune équivalence CAD=EUR/USD/GBP/CHF implicite.
- Les comptes historiques dépourvus de champ `currency` et les transferts CAD historiques restent compatibles.
- Les transferts internationaux **doivent** indiquer le montant réellement reçu sur le compte destinataire. La contre-valeur budgétaire CAD ne peut pas servir de montant crédité fictif.
- Une carte de crédit nouvellement créée doit être reliée explicitement à un compte courant du même titulaire, de la même devise et du même pays. Les rattachements historiques ambigus ne peuvent plus produire un faux solde principal.
- Un montant d'origine est requis si la devise d'achat diffère de la devise bancaire. Les taux datés manquants, invalides ou postérieurs à l'achat sont rejetés.
- Les CSV étrangers peuvent être importés comme lignes **en attente** avec leur montant natif, même en l'absence de taux. Le montant budgétaire CAD reste `null` jusqu'à validation.
- L'éditeur de mouvements bancaires hérité de 5.36.5 est protégé contre l'édition de comptes et de transferts en devise étrangère : c'est une restriction temporaire, pas une fonctionnalité terminée.
- La création d'une carte à débit différé est désactivée tant que le moteur de dates d'achat, d'échéance, de paiement et de rapprochement n'est pas développé.
- Les listes d'actions des écrans Compte/Patrimoine utilisent désormais `querySelectorAll` ; quatre erreurs `querySelector(...).forEach` potentiellement bloquantes ont été corrigées.
- Le compteur principal d'un utilisateur ne doit plus écraser le montant du filtre Couple.

## Vérification effectuée

- 17 scénarios comptables du fichier `tests/trace-international.test.cjs` exécutés dans un environnement JavaScript isolé avec le moteur de la branche : réussis. Sont notamment couverts : héritage CAD, EUR natif, achat USD facturé EUR, dette de carte et compte lié, transfert CAD/EUR, taux manquant ou invalide et date de référence indicative simulée.
- 7 gardes d'intégration statique du fichier `tests/trace-international-wiring.test.cjs` exécutés : réussis. Ils vérifient des raccordements à protéger mais **ne simulent pas un navigateur**.
- Analyse syntaxique JavaScript du fichier `v5-app-5.37.0.js` après modifications : réussie.
- Schéma Supabase TRACE inspecté **en lecture seule**. `public.documents.data` et `public.households.settings` sont JSONB. Aucune migration, donnée bancaire, transaction ni utilisateur n'a été modifié.
- Aucune fusion vers main, aucune modification de l'entrée PWA, aucun déploiement et aucune validation GitHub Actions de 5.37.0 n'ont été réalisés.

## Bloqueurs avant publication

1. **Éditeur international complet** : permettre l'édition sûre des virements étrangers et des montants réellement reçus, avec validation des répartitions Moi / partenaire / amis, conservation des taux historiques et simulation précise des conséquences. L'éditeur bancaire existant reste désactivé sur ces opérations.
2. **Imports OCR, PDF et CSV France** : tester des relevés fictifs représentatifs, les dates JJ/MM/AAAA, montants à virgule, colonnes débit/crédit, SEPA, rapprochements et doublons, sans certification anticipée. Vérifier la validation des brouillons étrangers sans taux.
3. **Accueil et patrimoine** : finaliser et tester l'agrégation de l'ensemble du foyer en CAD/EUR, les comptes partagés et les transferts non dupliqués, les taux de valorisation datés, les cartes présentant des avoirs non vérifiés, et la distinction cash/épargne/placements.
4. **Modèle différé** : moteur de règlement, dates distinctes achat/échéance/débit et rapprochement sans deux dépenses. Ne pas réactiver l'option tant que des tests réels de scénario fictif n'existent pas.
5. **Parcours iPhone/Safari et chargement réel** : tests de chargement initial et de navigation, tous les formulaires comptes/import/édition, fonctionnement PWA hors ligne, bascule Moi/Couple, conservation des fonctions 5.36.5.
6. **CI** : branche actuelle non visée par `.github/workflows/trace-regression.yml` lors d'un simple push. Exécuter les régressions historiques, les nouveaux tests et le smoke test mobile avant fusion. Ne pas réactiver le stockage QA PickPoint.
7. **FX du transfert vers épargne internationale** : `trackedSavingsAccounts` et `isReadySavingsAccount` ne gèrent aujourd'hui que les comptes CAD liés ; étendre en préservant les soldes historiques et sans assimiler un virement à une dépense.
8. **Vérification Banque du Canada** : les tests Valet utilisent une réponse fictive. Confirmer les séries et les réponses HTTP réelles avant activation.

## Critères de sortie

- Zéro test historique en échec, aucune création de doublon ou de revenu/dépense fictifs sur un paiement de carte.
- Aucune transaction ancienne modifiée massivement et aucun solde inconnu présenté comme zéro.
- Conversion et date de taux traçables; jamais de fallback 1 sur devise étrangère.
- Chargement app, formulaires et flux principaux validés en navigateur (priorité iPhone Safari).
- **Puis seulement** câblage des ressources versionnées, service worker, changelog, PR relue, vérification GitHub Actions et GitHub Pages.

Ce document décrit les limites observées et ne constitue pas une annonce de disponibilité de TRACE International.


## Reprise suivante — progrès sécurisés (20 octobre 2026)

**Tout reste dans la branche de développement. La 5.36.5 est inchangée en production.**

### Édition internationale

- Un nouvel éditeur dédié aux transferts bancaires multi-devises est raccordé à la fiche transaction existante. Il modifie **un seul** document de transfert, les deux montants natifs, le montant d'origine éventuel et le taux CAD daté.
- Les comptes et la date du transfert restent fixes dans cette première itération. Les mutations ne sont appliquées en mémoire qu'après sauvegarde réussie ; toute erreur valide/serveur laisse la transaction initiale intacte.
- Les autres mouvements spéciaux internationaux restent protégés par l'ancien garde-fou. Les dépenses/revenus/remboursements étrangers disposent désormais d'un aperçu de répartition CAD lorsque le taux daté est connu, au lieu d'un aperçu constamment vide.
- Un avoir positif de carte de crédit non vérifié invalide le total mondial et le solde principal concerné : il n'est jamais additionné silencieusement à l'argent disponible.

### Import et vue couple

- Les comparaisons OCR et les contrôles de doublons des transferts comparent les **montants bancaires natifs**, pas la contre-valeur CAD.
- Le rapprochement automatique des justificatifs de carte de crédit étrangère est désactivé jusqu'à un moteur de correspondance par montants natifs/source/destination.
- Les CSV français en devise étrangère restent « en attente » sans CAD ni répartition nulle/NaN ; dates FR, virgules et débits/crédits font l'objet de tests fictifs.
- La vue Couple peut agréger plusieurs comptes CAD/EUR et leurs dettes en un montant CAD courant lorsque **tous** les soldes et taux sont connus ; sinon « Situation à vérifier ». Les comptes sont dédupliqués par identifiant et les taux affichés avec leurs dates. L'épargne n'est pas confondue avec les liquidités.
- Le chargement des taux est limité par devise et date de demande, plutôt que bloqué globalement après la première devise consultée.

### Tests présents sur la branche

- \`tests/trace-international.test.cjs\` — 27 scénarios de moteur FX.
- \`tests/trace-international-editor.test.cjs\` — 6 scénarios d'interactions d'édition, erreurs et absence de mutation.
- \`tests/trace-international-csv.test.cjs\` — 6 scénarios de CSV français et duplications natives.
- \`tests/trace-international-couple-home.test.cjs\` — 4 scénarios de trésorerie couple et taux manquants.
- \`tests/trace-international-wiring.test.cjs\` — 7 garde-fous d'intégration.
- \`tests/trace-international-ui-smoke.test.cjs\` — 12 contrôles DOM simulés sur la candidate 5.37.
- \`tests/trace-international-legacy-ledger.test.cjs\` — 44 cas historiques CAD exécutés sur la candidate 5.37.

**Total : 106 scénarios isolés disponibles et exécutés en environnement JS simulé.** Ils ont été exécutés en plusieurs groupes dans un environnement JS simulé. Ce n'est pas un test navigateur Safari ni une exécution CI GitHub complète.

La configuration \`.github/workflows/trace-regression.yml\` est mise à jour **sur la branche uniquement**, sans ajout d'artefacts de rapports, pour inclure les tests 5.37 lors d'une future PR vers \`main\`. Aucun lancement n'a été demandé : ne pas consommer inutilement le quota GitHub Actions.

### Non validé : blocage de livraison maintenu

- Safari iPhone/PWA : chargement complet, interactions réelles, navigation, service worker et cache.
- Réception de paiements de carte étrangère : traitement complet du rapprochement, dates d'opérations, devises différentes.
- Cartes à débit différé : échéances, lots et règlement bancaire complet.
- OCR multi-devises et PDF de banques françaises (aucun fournisseur réel ni capture réelle testée).
- Extension des livrets et placements internationaux reliés à un solde de compte bancaire.
- Vérification HTTP du service Valet dans un navigateur : la documentation officielle et les séries de données ont été consultées, mais le vrai endpoint JSON n'a pas pu être testé dans cet environnement.
- Vérification GitHub Actions et GitHub Pages après une éventuelle activation et une PR.

**Interdit :** fusionner ou modifier les références de \`index.html\`, \`sw.js\` ou les données financières avant la levée de ces blocages.

**Garde-fou additionnel :** le solde principal est laissé à vérifier si une carte liée est libellée dans une devise différente de son compte courant (aucune addition EUR+CAD native). La valorisation globale conserve des conversions CAD séparées lorsque les taux sont disponibles.


## Laboratoire 5.37.0 créé sur la branche (préproduction, non publié)

**But :** vérifier le chargement de l'application 5.37.0 et les parcours iPhone sans authentification, sans base bancaire et sans service worker. Le laboratoire n'est **pas** relié à GitHub Pages en production.

### Fichiers ajoutés et sécurité

- \`trace-international-preview.html\` : copie contrôlée de la structure réelle de \`index.html\`, contenant la zone \`#traceIntlHome\` manquante dans la 5.36.5, les scripts 5.37.0, la feuille CSS internationale et une bannière de démonstration. La page n'importe **ni** \`config.js\` **ni** le SDK Supabase et ne déclare pas de service worker.
- Une politique CSP refuse toute connexion réseau (\`connect-src 'none'\`), les workers et l'envoi de formulaires.
- \`trace-international-preview-fixtures-1.0.0.js\` : seuls des soldes et mouvements entièrement fictifs (CAD, EUR, USD, carte de crédit, couple, virements, taux simulés). Les données sont réinitialisées au rechargement.
- \`v5-app-5.37.0.js\` : bootstrap de laboratoire strictement limité à la page \`trace-international-preview.html\` ; aucune initialisation Supabase, requête de taux, contrôle de redirection de version ou persistance réelle dans ce mode. Les sauvegardes et suppressions de documents simulés restent uniquement en mémoire.
- \`trace-international-1.0.0.css\` : bannière visible et compacte sur iPhone, annonçant que les montants et taux sont fictifs.
- \`tests/trace-international-lab.test.cjs\` : 8 contrôles statiques de sécurité, chargement, ressources, fixture et isolation.
- \`tests/trace-international-preview-boot.test.cjs\` : 5 parcours de démarrage synthétique avec le **vrai code d'application**, la vraie logique bancaire, la bascule Canada → France, puis le filtre Couple. Pas de navigateur réel ; DOM et rendus graphiques secondaires simulés.

### Découverte lors de l'audit

L'interface 5.37 utilisait \`#traceIntlHome\`, absent de l'\`index.html\` actuel. Le laboratoire inclut cet élément, mais **l'entrée de production n'est volontairement pas modifiée**. La future intégration devra vérifier explicitement sa présence et l'ordre de chargement international. Une vérification syntaxique seule ne suffit pas.

### Critères de validation avant toute publication

1. Tester la page de laboratoire chargée localement en navigateur réel (priorité Safari iPhone) avec capture des erreurs console et absence de requêtes vers Supabase.
2. Parcourir les comptes CAD/EUR, sélection principale, vue Couple, ajout/édition de transaction, virement CAD ↔ EUR, CSV français et navigation tactile.
3. Recontrôler paiements de carte, doublons, soldes d'ouverture, remboursements et catégorie/partage après chaque opération fictive.
4. Obtenir les résultats CI réels sur une PR relue ; surveiller le quota Actions sans créer d'artefact à conserver.
5. Seulement alors envisager les branchements versionnés dans l'entrée PWA et le service worker ; aucune fusion ni déploiement pour le moment.

La présence des scripts en laboratoire et le test sur DOM simulé **ne sont pas une certification Safari**.


### Point de contrôle additionnel : laboratoire d'édition

- Le laboratoire initialise une session de démonstration **sans client Supabase**, ce qui autorise les parcours ordinaires des formulaires sans aucune authentification ni donnée persistée.
- Les fonctions de séparation/suppression et déconnexion réelle sont neutralisées dans ce mode.
- Les taux des achats et mouvements EUR/USD/GBP/CHF sont **explicitement fictifs et datés** lorsqu'ils sont demandés dans la page de laboratoire exacte. Le moteur réel de taux Banque du Canada reste inchangé hors de cette page.
- Un scénario simule la création d'un compte courant EUR depuis Profil → Mes comptes : aucune écriture externe ni demande réseau.
- Le scénario complet de démarrage simulé comporte désormais **7 cas**, en complément des **8 contrôles d'intégrité** du HTML sécurisé et des **106 scénarios comptables et UI préexistants** : **121 contrôles locaux/isolés** au total lors de ce palier (à réexécuter après toute modification ultérieure).
- Aucun test en Safari réel n'a encore été effectué, aucune prévisualisation n'est publiée sur GitHub Pages, aucun appel Supabase réel n'a été exécuté et aucune autorisation de fusion n'est donnée.

Ce parcours ne valide pas encore le DOM natif de Safari, l'OCR/PDF international complet, ni la qualité UX sur un iPhone réel. Ce sont des **critères de validation à discuter** avant la mise en production.


## Reprise sécurisée — 22 octobre 2026 (phases 0 et 1)

**Périmètre : branche International uniquement.** La branche main demeure au commit 02c70f50e7e51da79b77a91dde96a03c6c719909, TRACE 5.36.5. Aucun changement d'entrée de production, service worker, manifeste, trace-version.json, données Supabase, fusion ou déploiement n'a été effectué par cette reprise.

### Commits techniques appliqués

**d40b259efe9bfeafbddb3cd7b87b410ba2891dca — protection des mouvements et rapprochements :**
- Un montant bancaire absent, null ou vide ne devient plus fictivement zéro ; zéro réellement enregistré et historiques CAD sont préservés.
- Une devise bancaire explicitement non prise en charge est rejetée, tandis que les comptes historiques sans devise restent CAD.
- Rejet des devises originales invalides, protection contre l'affichage à zéro d'un montant inconnu.
- Refus des éditions de transferts vers une carte dépourvue de compte courant de règlement explicitement associé.
- Les rapprochements sans montant vérifié ne réinitialisent plus la trésorerie ; les champs inconnus ne sont pas préremplis à zéro.
- Les rapprochements manuels conservent montants en devise native et référence de devise ; différence nulle seulement si arithmétiquement zéro, et null si référence inconnue.
- Nouvelle suite tests/trace-international-financial-guards.test.cjs ajoutée au workflow de régression sur branche.
- vercel.json désactive les déploiements automatiques pour la branche trace-5.37.0-international-accounts-fx.

**f915577bf5686322e52c51a4ecbc7b359983ce9a — garde-fous complémentaires :**
- Les rapprochements en attente, incomplets, explicitement non vérifiés ou non datés ne deviennent pas des soldes de référence.
- Les rapprochements anciens sans statut restent compatibles. Les nouveaux rapprochements manuels portent les attributs status=confirmed et source=manual_balance.
- Édition de carte : contrôle explicite de la devise, du pays et du compte courant associé.
- Devise d'affichage inconnue non présentée comme CAD.
- Suite de garde-fous étendue à 19 scénarios fictifs.

### Vérifications de phase 0

Vérifications réalisées au moyen du vrai contenu des fichiers récupérés sur GitHub, exécuté dans un harnais JavaScript V8 simulant des interfaces Node.js ; aucune base bancaire réelle, aucun réseau applicatif et aucune écriture Supabase. Il ne s'agit **pas** d'une exécution Node CLI, d'un résultat de CI GitHub, d'un navigateur réel ou de Safari.

- Avant modifications : 150 contrôles de régression historique, 44 de comptabilité CAD, 14 de détail de paiements de carte, 12 de doublons et 27 de moteur FX, soit 247 contrôles réussis sur ces suites.
- Après le commit f915577b : moteur FX 27 ; scénarios historiques sur candidate 44 ; éditeur 6 ; câblage 7 ; CSV 6 ; vue Couple 4 ; garde-fous financiers 19 ; UI International 12. Total : 125 contrôles réussis.
- Après le même commit : laboratoire 8 ; démarrage simulé 7 ; UI historique 12. Total : 27 contrôles réussis supplémentaires.
- **Total post-commit sur la candidate : 152 contrôles isolés réussis, zéro échec observé.**
- Syntaxe JavaScript des deux fichiers modifiés vérifiée dans V8.
- Le workflow trace-regression.yml est toujours déclenché uniquement sur main ou les PR vers main ; aucune CI n'a été volontairement exécutée.
- Au contrôle suivant les commits, Vercel avait toujours pour dernier déploiement READY la version de SHA 8ca41fbb. Aucun déploiement associé aux nouveaux commits n'était visible.

### Phase 1 — restant avant de la déclarer terminée

1. Exécuter l'ensemble des suites dans Node.js réel sur un checkout isolé, et les futurs tests dans Safari iPhone, sans activer de CI ni déployer avant autorisation.
2. Renforcer les scénarios fictifs multi-devises : frais de virement, paiements de carte sur les deux comptes, avances et remboursements, répartition Moi/Partenaire/Amis et absence de revenu ou dépense fictifs.
3. Vérifier réellement la disponibilité HTTP et les séries de la Banque du Canada Valet ; les simulations actuelles ne certifient pas le service.
4. Préserver le caractère figé des conversions historiques et des budgets anciens lors des changements de compte principal.
5. Garder le débit différé désactivé tant que les échéances et règlements ne sont pas développés.
6. Les travaux à venir sur épargne internationale, rapprochement PDF ligne par ligne, Activité, Partage, Budget, Accueil et Patrimoine restent à réaliser conformément au cahier des charges validé.
7. Conserver index.html, sw.js, manifest.webmanifest et trace-version.json sur la version 5.36.5 jusqu'à autorisation explicite distincte de fusion/publication.

**Retour arrière :** les seuls commits de code de cette reprise sont d40b259e et f915577b. En cas de régression, préparer un revert contrôlé sur la branche International ; ne pas faire de force-push, ne pas toucher main ni réinitialiser Supabase.


## Poursuite de phase 1 — isolation des écritures de placements (23 octobre 2026)

**Périmètre :** branche `trace-5.37.0-international-accounts-fx` uniquement. La production 5.36.5, `main`, les données bancaires réelles et Supabase sont inchangés.

### Commits ajoutés

- `6628344caa400082fed63372b53a00965e46d17b` : nouvelle fonction `TraceInternational.investmentBankAmount`. Elle distingue le montant réellement comptabilisé en devise native des champs `bankAmountCAD` hérités. La compatibilité de ces derniers n'est autorisée que pour des comptes CAD.
- `ceec02590ea52bb9450e71d40d37760e0d156f8c` : `accountEstimate` traite le montant natif des écritures de placements, retourne un solde inconnu si la jambe étrangère est absente, et évite une seconde comptabilisation pour une opération explicitement liée à une transaction bancaire confirmée. L'ancien formulaire de placement à liaison bancaire CAD refuse provisoirement les comptes étrangers, faute de champ natif fiable.
- `b644fb8621d732003e332b0ee99feee411ca4879` : nouvelle suite de **10 tests fictifs** pour les soldes bancaires CAD/EUR, montants natifs manquants, liaison explicite et transferts non confirmés.
- `e9f81e58893c428459591554b1e3541e795ba7d4` : ajout des nouveaux tests au workflow de régression candidat, sans changer ses déclencheurs (push et PR vers `main` uniquement).

**Protection :** aucun taux fictif entre CAD et EUR n'est créé. L'ancien formulaire n'est pas considéré comme une saisie internationale complète. Le nouveau champ natif et son UX dans Patrimoine devront être finalisés ultérieurement, conformément au cahier des charges validé. Aucune suppression automatique de doublons et aucune réécriture massive de données existantes.

### Vérifications après les commits

Les fichiers de la branche ont été relus via GitHub, puis les suites ont été exécutées dans un **harnais JavaScript V8 simulant les API Node.js**, sur données exclusivement fictives. Tous les résultats ci-dessous correspondent à ce harnais, pas à Node CLI, CI GitHub ou Safari :

- Candidate 5.37.0 : **135 contrôles réussis** sur neuf suites moteur / historique sur candidat / UI / import / garde-fous / nouvel investissement.
- Laboratoire fictif : **15 contrôles réussis** (huit statiques et sept démarrages simulés).
- Historique stable 5.36.5 : **232 contrôles réussis** sur cinq suites (150 régressions générales, 44 comptables, 12 UI, 14 détail carte, 12 doublons).
- **382 vérifications isolées passées sur 16 suites distinctes**, aucune défaillance produit observée dans ces exécutions. Les premières tentatives de laboratoire ont nécessité une correction du harnais de tests pour simuler `assert.rejects`, puis les 7 cas de démarrage ont réussi.

**Node natif :** `node v22.16.0` est installé localement, mais le clone GitHub a échoué faute de résolution DNS du dépôt. Le code n'a donc pas pu être exécuté via un véritable checkout Node.js. Aucun lancement GitHub Actions n'a été effectué pour préserver les quotas. Une validation CI/Node réelle demeure obligatoire avant toute livraison.

**Banque du Canada :** documentation officielle de la série `FXEURCAD` consultée, mais l'endpoint JSON réel n'était pas accessible depuis l'environnement de contrôle ; les requêtes de taux restent non certifiées en conditions réelles.

### Prochaines étapes techniques

1. Vérifier les mêmes tests dans Node natif / CI contrôlée, puis Safari iPhone réel sur données fictives isolées.
2. Finaliser les écritures de placements liées à un compte en EUR ou autre devise : montant natif, devise du compte, preuves et conversions datées, sans conversion inventée. Lever ensuite le garde-fou temporaire de l'éditeur.
3. Compléter le moteur financier avec des tests de frais de transfert, remboursements partiels et groupés, transactions carte sur les deux comptes et changement de devise principale sans altération des budgets historiques.
4. Conserver la désactivation du débit différé et du nouveau rapprochement PDF jusqu'à implémentation et tests spécialisés.
5. Ne pas activer la 5.37.0 dans `index.html`, `sw.js` ni `trace-version.json` et ne fusionner aucune branche sans autorisation explicite.

**Retour arrière :** un revert contrôlé des quatre commits ci-dessus sur la seule branche International, sans force-push ni action destructive, préserve la référence 5.36.5.


## Phase 1 — Saisie native des placements et frais inclus (23 octobre 2026)

Périmètre strict : branche `trace-5.37.0-international-accounts-fx` ; aucune fusion, aucun déploiement et aucune écriture Supabase. Toutes les opérations de validation sont fictives.

### Fonctionnalités codées

- **Patrimoine / versements et retraits :** le formulaire de la version candidate propose désormais le montant réel en devise native du compte bancaire sélectionné (CAD, EUR, USD, GBP, CHF). La présentation montre la devise et l'impact bancaire hors budget ; le champ est obligatoire et ne reçoit jamais une contre-valeur CAD fictive lorsqu'un compte étranger est sélectionné.
- Les opérations de placement conservent `bankAccountId`, `bankCurrency`, `bankAmount` et `bankAmountCAD` uniquement si le compte bancaire est réellement en CAD. Les enregistrements historiques CAD à `bankAmountCAD` restent lisibles et modifiables.
- Si un placement est explicitement associé par `linkedTransactionId` à un mouvement bancaire déjà confirmé, ce mouvement n'est jamais débité deux fois. Le formulaire bloque la modification silencieuse du compte/de la nature ou du montant natif quand la transaction bancaire liée a déjà été confirmée.
- **Éditeur de virements internationaux :** ajout d'un champ facultatif de frais bancaires *inclus dans le montant réellement débité*, dans la devise native du compte source. Enregistrement de `transferFeeAmount`, `transferFeeCurrency` et `transferFeeIncludedInDebit` ; vérification d'un montant positif ou nul et inférieur ou égal au débit. Les frais documentés ne déclenchent ni un second mouvement bancaire ni une dépense de consommation fictive. Les deux jambes du transfert restent les montants débités/reçus réellement constatés.
- **Limite volontaire :** les frais prélevés sous forme d'une écriture bancaire indépendante ne sont pas inclus dans ce champ ; ils devront être rapprochés comme une ligne distincte existante sans duplication. Le formulaire international et les devises de référence budgétaires seront encore affinés dans les phases prévues.

### Commits GitHub de ce lot

1. `47813cd0d5d940765df3440550584f9b830ec46e` : métadonnées de frais inclus et validation du moteur.
2. `19d5255606d67a3ce9ad5c43d6c8d3ea1a908506` : nouveaux champs natifs et frais dans la candidate.
3. `1d71448483b8522e4c95a46933220d77e8c49655` : garde de cohérence des opérations de placement déjà liées.
4. `1b509aeba3d3ff31880878409a7e63e347cdb650` : nouvelle suite de 11 tests d'interaction.
5. `c25d8a560a69bf351b55a03c6433fa2f1fb3115e` : adaptation du contrôle de l'ancien blocage temporaire à la nouvelle saisie native.
6. `fee8d383de830f7fa22dd68a4f78c8b90d64da5d` : intégration de la nouvelle suite au workflow futur, sans en changer les déclencheurs.
7. `a992d96ad1d712edef5e530fa5bd1077848cc877` : deux tests supplémentaires du formulaire d'édition des frais.

### Résultats de tests du lot

Tous les tests ont été effectués depuis les fichiers réels du dépôt, au moyen d'un harnais JavaScript V8 isolé avec certaines API Node simulées, et sans accès à la production ni aux transactions réelles :

- Candidate 5.37.0 : **148 réussites** (10 suites).
- Régressions historiques 5.36.5 : **232 réussites** (5 suites).
- Laboratoire statique et démarrage simulé : **15 réussites** (2 suites).
- **Total : 395 contrôles isolés réussis sur 17 suites**, aucun échec observé après correction du simulateur de formulaire ; ne pas confondre avec les tests Native Node/CI/Safari.

La CLI Node.js existe localement mais le clone du dépôt n'est pas accessible par DNS depuis le conteneur ; les tests natifs, les tests de PWA hors ligne et Safari iPhone réel ne sont donc **pas validés**.

### Prochaines dépendances

1. Vérifier la saisie native dans un navigateur Safari réel, notamment les montants et l'espacement des libellés.
2. Finaliser les autres scénarios de phase 1 : remboursements partiels/groupés, Partage multi-bénéficiaires, transferts et frais sur relevé, et changements de devise de référence sans altération rétroactive.
3. Enchaîner ensuite les phases Activité/Partage, Import et rapprochement PDF ligne par ligne sans élargir la navigation à plus de cinq onglets.
4. Aucune activation de 5.37.0 dans `index.html`, `sw.js` ou `trace-version.json` avant validation expresse distincte.

Pour revenir en arrière, effectuer des reverts contrôlés des commits du lot **sur la branche candidate uniquement** ; aucune réinitialisation Supabase ni force-push.


## Phase 1 — Remboursement unique réparti sur plusieurs avances (23 octobre 2026)

**Périmètre :** exclusivement la branche `trace-5.37.0-international-accounts-fx`, hors `main`, production et données réelles. Conservation explicite des règles de budget 5.36.5 et des transactions bancaires sources.

### Fonctionnalités intégrées à la candidate

- `trace-movement-5.36.0.js` reçoit une fonction de lecture rétrocompatible des remboursements `repaymentLines`, un calcul des sommes déjà reçues par avance `paidForExpense` et une validation `validateRepaymentAllocations`.
- Chaque transaction bancaire de type `external_refund` / `friend_reimbursement` peut désormais contenir `repaymentAllocations: [{expenseId,amountCAD},...]` : **une transaction bancaire unique, plusieurs associations sans revenu budgétaire**. Le champ `relatedExpenseId` des historiques à une seule avance reste compatible, sans migration ni double décompte lorsqu'une nouvelle répartition est présente.
- Les validations imposent la somme exacte des avances = montant converti CAD de la transaction source, montants positifs au centime, aucun dépassement de créance, aucune avance répétée, propriétaire et date cohérents, et exclusion de la transaction lors de son propre réexamen.
- `v5-app-5.37.0.js` permet d'associer plusieurs avances depuis la **saisie manuelle** du remboursement, avec prénom facultatif du proche et montants CAD explicites.
- L'éditeur de mouvements bancaires **déjà importés en CAD** permet également ces associations sur l'opération existante. Il ne crée ni une seconde transaction ni un revenu. L'identifiant original est conservé ; si le compte, la date, le montant bancaire et le libellé restent inchangés, l'empreinte `importFingerprint` est conservée avec la preuve de l'import.
- Les éditeurs des dépenses avancées et le garde de suppression vérifient aussi désormais les liens multi-avances, empêchant une réduction de part des amis inférieure aux remboursements confirmés ou une suppression silencieuse de la dépense source.
- **Limites explicites :** le parcours de modification des remboursements importés reste CAD-only à ce stade, car l'éditeur financier importé international n'est pas encore finalisé. La gestion détaillée des personnes, avances, remboursements partiels et listes dans la nouvelle interface Activité → Partage reste prévue en phase 3. Le prénom stocké sur le remboursement ne constitue pas à lui seul un grand livre individuel des proches.

### Commits effectués

- `023bf367b087086d57783bfed22b51e3f68fcfd2` : moteur rétrocompatible de répartitions de remboursement.
- `357fdc4022f9a05417b43c79e8a1e360bff48e6b` : 14 scénarios unitaires d'avances et remboursements.
- `82c429370f0d4c4b72796c879b03984d75829fec` : garde-fous des éditeurs et de suppression.
- `760ce1d961dfba7843d42f16c6012fb0517de3bb` : interface de remboursement manuel multi-avances.
- `339018cdf59b126e274b3f0f4bcbf72d08084a06` : 3 scénarios d'intégration du parcours manuel.
- `0f4bcf5fae830e54468cf5ada45d00f3943b0add` : édition des remboursements CAD déjà importés sans duplication.
- `527f2b961219062d29eeef88cf1d6bb94fbaf150` : conservation de l'empreinte bancaire lorsque seules les associations changent.
- `9c0a21b477cc2e087d9e5efdddaa9ac89a332b60` : 2 scénarios d'édition d'un remboursement existant.
- `d47e969ff4fff982c2a96a1c126bea86ff1a6c84` : ajout des nouvelles suites aux régressions futures, sans déclenchement de CI sur cette branche.

### Tests de validation (données fictives uniquement)

Tous les contrôles suivants ont été exécutés sur le code récupéré du dépôt dans un harnais JavaScript V8 simulant une sélection d'API Node. Ils **ne sont pas des tests Node.js natifs, GitHub Actions, Safari iPhone, ni une validation PWA réelle**.

- Candidate 5.37.0 : **167 contrôles réussis**, 13 suites (incluant 14 tests multi-avances, 3 manuels, 2 sur mouvement importé).
- Régressions de la version stable 5.36.5 : **232 contrôles réussis**, 5 suites.
- Laboratoire fictif : **15 contrôles réussis**, 2 suites.
- **Total : 414 contrôles isolés réussis sur 20 suites**, aucun échec observé lors de la dernière exécution.
- La suite de 14 cas comprend la rétrocompatibilité `relatedExpenseId`, les remboursements partiels, l'absence d'impact des opérations en attente, le refus d'un montant excessif, d'un double lien, d'une date future ou d'un autre propriétaire.
- Les deux parcours d'interface ont été exercés au moyen de fausses instances DOM et de fausses fonctions de sauvegarde, sans accès Supabase.

### Travaux restants avant fin de phase 1 et phases suivantes

1. Réexécuter sur un checkout Node natif et dans Safari iPhone réel, sur une prévisualisation autorisée avec données fictives.
2. Compléter les tests d'enchaînement entre la comptabilité de partage, les remboursements groupés, les dépenses individuelles et les cartes, notamment le cas 100 CAD réparti 25 / 25 / 50 puis remboursements.
3. Finaliser l'édition des entrées en EUR/USD/GBP/CHF déjà importées, puis la gestion complète des noms de proches et du solde individualisé dans Activité → Partage.
4. Ne pas confondre remboursement de proche avec remboursement commerçant, salaire ou virement interne.
5. Garder `index.html`, `sw.js`, `trace-version.json`, `main`, le projet PickPoint et les données bancaires de production inchangés jusqu'à validation de publication distincte.

**Retour arrière :** reverts contrôlés sur la seule branche International ; pas de reset, pas de force-push, pas de mutation Supabase.


## Phase 1 — Créances nominatives et remboursements étrangers vérifiés (23 octobre 2026)

**Branche concernée uniquement :** `trace-5.37.0-international-accounts-fx`. La production 5.36.5, `main`, les données bancaires réelles et Supabase n'ont pas été modifiées. Aucun déploiement, aucune fusion ni activation de la candidate dans `index.html`.

### Implémentation enregistrée

**Créances par proche :**
- `trace-movement-5.36.0.js` contient `friendReceivables(transactions,owner)`, projection calculée exclusivement à partir des dépenses confirmées dont la part `splitAmounts.friends` est positive, et des remboursements associés confirmés (format ancien `relatedExpenseId` ou nouveau `repaymentAllocations`). Le cumul est cent-exact ; les remboursements non confirmés ne réduisent pas les créances.
- Une dépense partagée peut porter le champ optionnel `friendDebtorName` seulement quand **une seule personne doit la totalité de la part des amis**. Le champ est présent dans la saisie manuelle et les deux éditeurs des dépenses. Les dettes au même prénom sont regroupées sans tenir compte de la casse ; les créances de propriétaires `la` et `partner` restent distinctes.
- L'ancienne part Amis sans prénom reste `À attribuer`. Il est interdit de déduire le débiteur de `counterparty` d'un virement bancaire. Les dettes de plusieurs personnes pour une même dépense ne sont **pas encore détaillables** dans ce nouveau champ et restent un travail de la phase Partage.
- Le panneau historique `Partage du couple` affiche en lecture seule les avances initiales, reçues et restantes, par personne ou dans la catégorie à attribuer, avec détail par opération. Ce suivi est **séparé du solde Tricount entre partenaires** et ne modifie aucun budget.

**Import étranger :**
- `trace-international-1.0.0.js` ajoute `verifiedForeignFriendRefund` : exige un remboursement étranger confirmé sur compte courant compatible, montants bancaires natifs et CAD strictement positifs, devise bancaire cohérente, taux historique supérieur à zéro, date et provenance du taux, et concordance de `bankAmount * bankRateCad` avec `amountCAD` au centime.
- Le nouvel éditeur `editForeignFriendRepayment` dans `v5-app-5.37.0.js` n'autorise **que** l'ajustement de `relatedExpenseId`/`repaymentAllocations` et de `counterparty`, après contrôle du FX à l'ouverture **et à l'enregistrement**. Le montant natif, la contre-valeur historique, le taux, ses métadonnées, le compte, la date, l'identifiant, le statut et l'empreinte d'import ne sont pas modifiés.
- Une référence historique manquante/incohérente produit un écran bloquant plutôt qu'un taux de conversion fictif. Le parcours générique de modification des mouvements étrangers reste verrouillé pour les autres opérations.
- Les anciennes dépenses, remboursements commerçants, transferts bancaires, paiements de cartes, budgets CAD et paramètres couple ne sont pas réinterprétés.

### Commits du lot (avant cette documentation)

1. `d6fbc8a5ce8e375ecb49f0af44012397e0e22748` : projection des créances par proche.
2. `36acac3dc312a9a5e31f23a7da93f53aa44ce8d0` : normalisation des prénoms.
3. `bacce00fd8dee6ce5171a4f620839bf2245bf769` : nom optionnel sur dépense manuelle.
4. `b5480e4d4212de67e39bf5136117896bdf5271a6` : nom optionnel dans les éditeurs existants.
5. `9858920420fa45fafc3bc845837b54881a0edee0` : lecture des créances dans le Partage actuel.
6. `ddedd9a083d4f8bd41cd2b519ba1c7c735bddf12` : vérification historique des montants EUR et de leur taux.
7. `bf176c9edeca10a51fd7db2362d8e73b89c259f2` : édition de l'association sur un remboursement étranger confirmé, sans mutation bancaire.
8. `06a7b7faa4f9506d83adb9620d345008a5474377` : 15 tests de créances, FX et remboursement étranger.
9. `3eb6bea83187940704f4c1d40bafb3bfbf61ffd6` : adaptation du test d'éditeur FX au nouvel ordre des fonctions.
10. `d87109feee00fa41dd3afe18de70e2cba27fd44a` : suite FX/Partage ajoutée au futur workflow, sans nouveau déclencheur.
11. `15550bb6f40eb2fecc109a20a1800dccac214f3e` : 4 tests d'affichage du Partage et de ses champs nominaux.
12. `5d917839f1d70d39507762a6b698d523d189353d` : suite d'interface ajoutée au futur workflow sans déclencheur automatique sur la branche.

### Vérifications

Fichiers lus depuis GitHub et évalués dans un harnais JS V8 qui **émule certaines API Node**, sans accès à Supabase, sans saisie de comptes réels et sans réseau applicatif :

- Candidate TRACE 5.37.0 : **186 contrôles réussis sur 15 suites**.
- Régressions de la base stable 5.36.5 : **232 contrôles réussis sur 5 suites**.
- Laboratoire / boot simulé : **15 contrôles réussis sur 2 suites**.
- **Total : 433 contrôles isolés réussis sur 22 suites**, aucun échec après correction de l'extraction du test d'éditeur FX.
- Aucun test n'a été exécuté dans un véritable checkout Node, dans GitHub Actions ou dans Safari. **Ces validations restent obligatoires** avant toute publication.

### À traiter ensuite

1. Cas combinés Couplage/Amis/cartes, remboursements commerçants et devises de référence, avec transactions fictives ; détecter les états partiels et incohérences sans supprimer automatiquement les doublons.
2. Autoriser plusieurs **débiteurs nommés sur une même dépense**, gérer leurs parts individuelles et paiements croisés dans le futur Activité → Partage, sans attribution déduite des historiques.
3. Réconciliation PDF mensuelle indépendante des imports journaliers ; épargne et patrimoine multi-devises ; débit différé, conformément aux phases futures.
4. Checkout réel Node et tests Safari iPhone sur environnement isolé autorisé ; ne pas activer ni déployer la candidate avant validation distincte.

**Retour arrière :** reverts ciblés sur la branche International, sans force-push, sans reset ni modification Supabase.


## Phase 1 — Plusieurs débiteurs sur une seule dépense (23 octobre 2026)

Périmètre : exclusivement `trace-5.37.0-international-accounts-fx` ; aucune écriture dans la base réelle, aucune mutation de `main`, aucun déploiement et aucun changement du chargeur de la production 5.36.5.

### Moteur comptable

- Schéma optionnel `friendDebtorShares: [{name,amountCAD},...]` sur une **dépense existante**, conservant `splitAmounts.friends`, le montant bancaire natif/CAD et les parts budgétaires Moi/Couple. Aucun changement de nature de mouvement ni nouvelle transaction.
- `friendShares`, `parseFriendShares`, `validateFriendDebtorShares`, `paidForDebtor` : plusieurs prénoms sans doublon (comparaison insensible à la casse), montants positifs au centime, total exactement égal à la part des amis, limites individuelles des remboursements confirmés, interdiction de renommer/retirer une attribution lorsqu'un remboursement confirmé serait orphelin.
- `validateRepaymentAllocations` accepte facultativement le nom du débiteur correspondant : pour une dépense multi-débiteurs, refuse un virement de personne inconnue et plafonne son remboursement à **sa part encore due**, indépendamment des créances des autres personnes. Le total du virement doit toujours égaler la somme des allocations bancaires.
- `friendReceivables` calcule les soldes par prénom et par propriétaire ; ne réattribue pas une ancienne créance sans prénom au payeur d'un virement. Les montants remboursés à une dépense multi-débiteurs sans débiteur identifiable sont signalés dans `unattributedCAD` et `reviewRequired` plutôt que devinés.
- La dette entre partenaires, les budgets historiques CAD, les remboursements commerçants, les virements internes et les paiements de carte sont inchangés.

### Formulaires et rétrocompatibilité

- Champ `friendDebtorShares` accessible dans la saisie manuelle et les deux éditeurs de dépenses : plusieurs lignes au format `Camille : 30,00` / `Alex : 20,00`, ou champ historique à prénom unique, mais jamais les deux simultanément.
- Les remboursements manuels, importés CAD et importés EUR vérifiés transmettent le prénom du proche au validateur d'association. Un versement ne peut solder la part d'un autre débiteur. Les mouvements étrangers conservent toujours les montants natifs et CAD historisés et la preuve d'import.
- Les historiques `friendDebtorName`, `relatedExpenseId` et les dépenses sans nom restent interprétables sans migration ni réécriture de la base.

### Commits de l'étape

- `329babf614e95f9ca5426d61f9c57cd250de9951` : moteur multi-débiteurs et plafonds de remboursement.
- `397c671c3bc7aec9e7857c2ab244019f61bcc641` : champs de saisie sur trois parcours existants.
- `a90f308dee8e18d6007e846016ef46a30b797e0c` : validations des dépenses manuelles et éditeur bancaire, contrôle de contrepartie des remboursements.
- `0ed975880bd6cf99263f167b0c55c0f8b417185d` : validation sur éditeur historique de transaction.
- `cfb61764f3e64c3391fae06a3f6513885b9299a1` : fixture manuelle adaptée au validateur partagé.
- `883d411020ab4ea305779a4685da8149a9b9286e` : fixture d'édition importée adaptée au validateur partagé.
- `900464d77e1aa4c560575db309011af66851d88e` : huit tests ciblés de répartition et de remboursement nominatif.
- `80caede5d459ee527e070416844776f0cb068584` : nouvelle suite inscrite dans le workflow futur sans changer ses déclencheurs.

### Exécution et limites

Fichiers réellement lus depuis le dépôt GitHub puis exécutés dans le harnais de compatibilité **JavaScript V8 avec API Node simulées**, uniquement sur données fictives :

- Candidate 5.37.0 : **194 contrôles réussis / 16 suites**.
- Base historique stable 5.36.5 : **232 contrôles réussis / 5 suites**.
- Laboratoire fictif et démarrage simulé : **15 contrôles réussis / 2 suites**.
- **441 contrôles isolés réussis au total, 23 suites**, sans échec lors des dernières exécutions.
- Les premières régressions avaient trouvé deux fixtures de formulaires ne fournissant pas le nouveau validateur ; elles ont été corrigées pour injecter la **vraie fonction** plutôt qu'un substitut silencieux.
- **Non réalisé** : Node CLI sur un clone local, GitHub Actions exécutées, test d'interface iPhone/Safari réel, intégration PWA et validation sur comptes fictifs dans un navigateur. Ne pas considérer la candidate prête à publier.

### Suites nécessaires

1. Remplacer la saisie multiligne provisoire par une interface iPhone à lignes structurées et actions ajouter/retirer, dans l'identité TRACE déjà validée.
2. Afficher clairement les remboursements à attribuer et les incohérences historiques dans Activité → Partage ; contrôler les scénarios où un remboursement de tiers paie plusieurs débiteurs.
3. Tester les croisements réels sur données **fictives** : crédit/courant, conversions historiques, rapprochements bancaires, remboursements commerçants et parts du couple.
4. Compléter les étapes suivantes (Activité, Imports/PDF, Patrimoine) puis autoriser séparément toute fusion/déploiement.


## Phase 1 — Éditeur mobile des parts de proches (23 octobre 2026)

Développement **exclusivement** sur `trace-5.37.0-international-accounts-fx` ; aucune modification de `main`, de l'environnement de production, du service worker stable, du manifeste stable, des données Supabase réelles, ni déploiement ou fusion.

### Changement de saisie dans la candidate

- Ajout du module `trace-friend-debtor-ui-1.0.0.js` (sans réseau ni écriture) qui monte, à l'ouverture des formulaires, des lignes explicites **prénom + montant CAD** avec contrôles ajouter/retirer, somme totale et restant à attribuer affichés en temps réel.
- Les inputs utilisent `inputmode=decimal`, une taille de police de 16px afin d'éviter le zoom Safari, des cibles tactiles d'au moins 44px et une grille repliable sur une seule colonne aux petites largeurs iPhone.
- L'éditeur préserve la saisie active (pas de re-render sur chaque touche), les montants précédemment saisis, et préremplit les avances déjà enregistrées. Le passage d'un prénom unique à plusieurs personnes est explicite ; une personne restante peut repasser au champ unique si elle doit toute la part des amis.
- **Trois formulaires de `v5-app-5.37.0.js`** utilisent ce module : création manuelle d'une dépense partagée, modification d'un mouvement bancaire importé et modification d'une transaction. La liste multilignes initiale devient un champ `textarea` caché, conservé comme pont de compatibilité vers `friendDebtorFields` et le moteur `validateFriendDebtorShares`. Aucune structure bancaire, nature de mouvement ou transaction n'est recréée par l'interface.
- Styles limités au CSS de la candidate `trace-international-1.0.0.css` ; script explicitement chargé dans `trace-international-preview.html` **avant** `v5-app-5.37.0.js`. La production `index.html` n'active ni l'éditeur ni les scripts candidats.
- Compatible avec les anciens enregistrements `friendDebtorName` (un prénom) et le nouveau champ optionnel `friendDebtorShares` (plusieurs prénoms). Le calcul budgétaire Moi/Partenaire/Couple demeure inchangé. Les opérations de remboursement gardent leur seul identifiant bancaire et restent protégées contre les surremboursements.

### Commits

1. `c7b13521cb2bb68130805db5b6c827a50208ad20` : module autonome de saisie tactile ;
2. `a59095387c4fb18f3ced7aaa95ba73b8b1778996` : branchement des trois éditeurs ;
3. `e50258fe0b747d869a65a4cc38123f5d127fe265` : styles mobiles et cibles tactiles ;
4. `8f545cf2350fea89adfbb8ef8c07d0e620a792f6` : chargement du script dans le laboratoire fictif ;
5. `d5c2853dce0189e9886689eb23f90b6ef09320cf` : quatre tests du composant (montage, ajout, saisie, préremplissage) ;
6. `89a0d89837b66ef1c16092f6ed87a835f256091c` : inclusion de la suite dans le workflow futur **sans déclenchement automatique sur la branche**.

### Tests après modifications

Tests exécutés à partir des versions réelles des fichiers GitHub, dans un harnais V8 avec **émulation partielle de certaines API Node et DOM**, exclusivement sur données fictives :

- candidate 5.37.0 : **198 contrôles réussis sur 17 suites** ;
- référence stable 5.36.5 : **232 contrôles réussis sur 5 suites** ;
- laboratoire / boot fictif : **15 contrôles réussis sur 2 suites** ;
- **total : 445 contrôles isolés réussis sur 24 suites**, aucun échec dans les dernières exécutions.

Les tests ne sont **ni une exécution CLI Node dans un clone du dépôt, ni GitHub Actions, ni un vrai navigateur, ni Safari iPhone réel**. Le rendu tactile, l'accessibilité VoiceOver, les claviers iOS et les mutations de DOM réelles restent à vérifier dans une prévisualisation explicitement autorisée, sans données bancaires réelles.

### Dépendances pour la suite

1. Exécuter un vrai parcours de saisie mobile sur Safari iPhone isolé et vérifier la navigation au clavier, les lignes à retirer, les nombres décimaux et les erreurs de répartition.
2. Poursuivre les scénarios financiers croisés (compte courant, crédit, frais FX, remboursements commerçants, partage et rapprochements), puis préparer l'espace Activité → Partage validé.
3. Conserver l'interdiction de fusion, déploiement, réinitialisation ou écriture Supabase sans instruction explicite de mise en production.

## Phase 1 — Reprise et renforcement des tests mobiles / comptables (23 octobre 2026)

**Point de départ vérifié :** `1ae6db73042a3bfb6fd478e222a462f678b6cbd1` sur `trace-5.37.0-international-accounts-fx`. Avant les changements, `main` pointait toujours sur `02c70f50e7e51da79b77a91dde96a03c6c719909` (127 commits derrière la candidate, 0 commit manquant de `main`). La protection `vercel.json` est intacte : déploiement automatique interdit pour cette branche.

### Anomalies découvertes et corrections réversibles

1. La première reprise des tests ciblés a produit **15 réussites et 1 échec** : le composant mobile annonçait « Répartition complète » avec deux prénoms identiques et des montants totalisant bien 50 CAD, alors que le validateur comptable rejetait ces doublons. Le nouveau résumé mobile détecte les prénoms en double (insensible à la casse), les noms vides et les montants non valides, sans prétendre qu'une répartition erronée est complète.
2. L'input de montant des proches est désormais `type="text" inputmode="decimal"`, pour conserver la virgule du clavier décimal iOS et transférer les montants dans le champ de compatibilité sous leur forme entrée. La validation d'aperçu contrôle les centimes et refuse les nombres à plus de deux décimales au lieu de les arrondir silencieusement. Le contrôle comptable `validateFriendDebtorShares` reste l'autorité à l'enregistrement.
3. Lorsqu'un ancien champ de répartition contient une valeur illisible ou que son décodeur n'est pas disponible, le montage s'interrompt avec un message de contrôle **sans remplacer ni vider la donnée précédente**.

**Commits ciblés :**
- `cce9d0ab69ea5159c5ca0e72e5cd5ff53b3ee180` : retour utilisateur, doublons, virgule décimale iOS, centimes.
- `aa826402a4f1317583bc991d550724c0e68df617` : protection contre l'effacement silencieux d'un ancien champ non relisible.
- `0ccccdc61bd23dc13f85e0f35e54f4a755973b87` : passage de 4 à **15 tests** dans la suite mobile déjà existante.
- `ce3cabc442485b56c88b71c97f2dff32873cd157` : passage de 8 à **20 tests** dans la suite financière multi-débiteurs déjà existante.

### Tests effectivement exécutés dans cette reprise

Depuis **les versions des fichiers source et des fichiers de tests relues sur GitHub après les commits**, deux suites existantes ont été exécutées dans le harnais **JavaScript V8 isolé** avec API `fs/path/vm/assert` et DOM partiellement simulées :

- `tests/trace-international-friend-rows.test.cjs` : **15/15** réussites (modification, ajout, suppression, 30+20 sur 50, troisième personne, insuffisance et dépassement, doublons, noms vides, précision au centime, saisie à virgule, aller-retour prénom unique/multi, limite 13, réouverture d'historique, conservation des saisies non déchiffrables).
- `tests/trace-international-multi-debtors.test.cjs` : **20/20** réussites (créances individualisées, remboursement partiel, blocage d'un débiteur incorrect, validation des totaux, dépenses carte partagées, paiement Mastercard neutre, remboursement proche sans revenu, remboursement commerçant comme réduction de dépense, remboursement unique multi-avances, compatibilité `relatedExpenseId`, séparation Moi/Partenaire, remboursement EUR historique vérifié, absence de taux implicite, frais de virements interdevises et destination bancaire manquante).
- **Total exécuté cette fois : 35/35 réussites dans ces deux suites seulement**, sans échec au dernier passage.
- Analyse statique complémentaire : syntaxe V8 valide pour les scripts UI et app, trois appels de montage, chargement du module avant la candidate en laboratoire, CSS avec 16px et cibles 44px / règles petites largeurs, `index.html` conservant `v5-app-5.36.5.js`, `trace-version.json` et `sw.js` toujours 5.36.5, `vercel.json` préservé.

**Attention aux chiffres :** les 445 contrôles sur 24 suites sont le **bilan historique documenté avant cette reprise** ; les 23 nouveaux cas ajoutés portent théoriquement l'inventaire à 468, mais **468/468 n'a pas été exécuté ni validé ici**. Les seuls résultats de cette nouvelle session sont **35/35 dans deux suites**, via V8 et des adaptations d'API, pas un checkout Node natif, une vraie PWA, GitHub Actions ou Safari.

### Restrictions et points non validés

- Aucun déploiement, aucune fusion, aucun `main`, aucun compte bancaire réel, aucune écriture Supabase, aucune migration, aucune activation de `index.html`, aucun déclenchement GitHub Actions ni modification PickPoint.
- La CLI Node.js est disponible dans le conteneur mais le clone GitHub échoue toujours avec `Could not resolve host: github.com`. **Les véritables commandes Node sur un dépôt cloné et toutes les régressions historiques restent à exécuter**.
- Le comportement physique des claviers décimaux iOS, du zoom Safari, la navigation VoiceOver, les interactions DOM natives et les configurations multi-utilisateurs Supabase **ne sont pas testés**. Le CSS et le HTML ne constituent pas des validations Safari.
- Les scénarios traversant toutes les couches de l'application (import PDF bancaire, rapprochement intégral, PWA hors ligne, compte crédit, épargne, transactions couplées et régularisation du budget historique) doivent être validés sur données **fictives** dans des environnements autorisés, sans déploiement implicite.

**Phase 1 : en cours, non déclarée terminée.** Reprendre les tests complets et l'intégration réelle sous autorisation, conserver la compatibilité 5.36.5 et contrôler `main`/Vercel après chaque lot. Les quatre commits peuvent être annulés individuellement sans reset ni force-push.

## Phase 1 — Reprise suivante : centimes exacts et régression isolée des 24 suites (23 octobre 2026)

**Périmètre :** branche `trace-5.37.0-international-accounts-fx` exclusivement, après `f83a4cf9ab5d25d84c9da2b15d46702537e7148f`. `main`, le chargeur de production 5.36.5, Supabase, les déploiements Vercel et les workflows PickPoint restent hors périmètre.

### Nouvel écart comptable découvert et corrigé

Dans la version de départ, `TraceMovement.validateRepaymentAllocations` appelait `Math.round(Number(n) * 100)` sans contrôler l'exactitude du montant initial au centime. Une association de remboursement fictive de `10.005 CAD` pouvait donc être enregistrée comme `10.01 CAD` ; `10.001 CAD` était ramené silencieusement à `10 CAD`.

Le validateur refuse désormais les fractions de centime, aussi bien sur les lignes d'association que sur le montant bancaire du remboursement. Tolérance `1e-6` sur `raw*100` destinée aux seuls artefacts normaux de précision IEEE-754 ; aucun arrondi économique n'est autorisé. Les nombres parfaitement égaux à un nombre entier de centimes (ex. `0.1 + 0.2`) restent possibles. Aucun changement des montants enregistrés ni migration d'historiques.

**Commits enregistrés sur cette branche seulement :**
- `d8f163846a32d140347a72fc2f9a33ac8aa58aa5` : rejet des fractions de centime dans `trace-movement-5.36.0.js` ;
- `97b0946d51592c9ee69504a2a2589d2a9c4ee4a1` : trois nouveaux scénarios de précision dans `tests/trace-international-friend-allocations.test.cjs` (17 tests réussis).

### Tests de cette reprise — exécution V8 isolée

Le conteneur propose `Node v22.16.0`, mais `git ls-remote` vers GitHub ne fonctionne pas (`Could not resolve host: github.com`) : **aucun checkout Node natif**, aucune commande `node tests/...` sur un clone local et aucune GitHub Action n'ont pu être exécutés. Les fichiers source et les fichiers `.test.cjs` ont été récupérés depuis la branche GitHub, puis les tests exécutés directement dans un environnement JavaScript V8 par lots, avec simulations ciblées de `fs`, `path`, `vm`, `assert`, `process` et d'éléments DOM. Certaines simulations initialement incomplètes (`URL.searchParams`, assertions asynchrones) ont été complétées et les cas concernés relancés. Ces adaptations du harnais ne constituent pas des corrections du produit.

**Résultat mesuré depuis les suites réellement présentes :**

| Domaine | Suites | Contrôles réussis |
|---|---:|---:|
| Candidate internationale | 17 | **222** |
| Régressions historiques 5.36.5 | 5 | **232** |
| Laboratoire fictif et boot simulé | 2 | **15** |
| **Total V8** | **24** | **469** |

Aucun échec conservé sur la dernière exécution des suites ; les suites dépendant de `trace-movement-5.36.0.js` ont été relancées après le correctif, et les cinq suites stables ont été relancées après celui-ci. Les 14 contrôles de paiement carte reposant sur des promesses différées ont été revérifiés individuellement après liquidation des microtâches : **14/14**.

**Écart à signaler :** l'ancien audit annonçait **445 contrôles**, et l'ajout total de 26 cas depuis ce point pourrait laisser prévoir 471. Le recomptage depuis les 24 fichiers de tests à jour aboutit à **469** et non 471. Les deux unités de différence proviennent du décompte documentaire antérieur non rapproché ; **ce ne sont pas deux échecs observés**. Conserver 469 comme référence vérifiée ici et ne pas revendiquer un décompte historique corrigé sans vérifier les anciennes versions des suites.

### Limites majeures

- Le harnais V8 simule les API Node et de DOM et ne reflète pas l'intégralité de leurs comportements ; ces **469 validations ne sont pas des tests Node CLI natifs**.
- Aucune navigation réelle sous Safari iPhone, aucun contrôle de zoom réel, aucun clavier décimal physique, aucune interaction VoiceOver ou sélection/focus clavier iOS réels.
- Pas de session applicative multicomptes/multi-utilisateurs avec base Supabase fictive ; aucun test d'import PDF mensuel ligne par ligne ni de PWA hors ligne.
- Le débit différé, le parcours complet d'Activité → Partage et les écrans Patrimoine demeurent dans le périmètre de phases ultérieures prévues ; ne pas les considérer comme terminés.
- Aucune activation, fusion, migration, écriture bancaire réelle, déploiement ou GitHub Actions.

**Phase 1 toujours en cours.** Condition d'achèvement : exécution Node native du référentiel, contrôles Safari avec données fictives, validation réelle des parcours essentiels d'intégration et vérification du dispositif de déploiement avant décision séparée de publication.
