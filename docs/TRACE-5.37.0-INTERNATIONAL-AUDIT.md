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

## Phase 1 — Cycle Mastercard / avances / remboursements / rapprochements (23 octobre 2026)

**Point de départ :** `ea040277ddeb92eb2dec5be73cb0639b44e5e536`, branche candidate `trace-5.37.0-international-accounts-fx` uniquement.

### Tests de cycle financier ajoutés

Nouvelle suite `tests/trace-international-card-friend-cycle.test.cjs`, sans données ou réseau réels, qui extrait et exécute les **vraies fonctions** `accountEstimate`, `summary`, `sharingHistory`, `coupleBalance`, `TraceMovement.friendReceivables` et `TraceInternational.snapshot` à partir des fichiers GitHub de la candidate. État bancaire et contexte de test entièrement fictifs.

**Scénario :** compte courant canadien ouvert à 1 000 CAD, Mastercard ouverte à 0 CAD, achat restaurant 120 CAD sur carte, ventilé 45 CAD Moi / 25 CAD Partenaire / 50 CAD Amis (Camille 30 et Alex 20), remboursement partiel Camille 15 CAD sur le courant, paiement Mastercard 100 CAD depuis le courant, preuve de paiement sur relevé carte, puis remboursement commerçant 12 CAD sur la Mastercard.

**Contrôles effectués et réussis (15/15 via V8 isolé) :**
1. L'achat carte accroît uniquement la dette et n'abaisse pas le courant lors de l'achat.
2. Le budget de l'achat vaut 45 Moi, 25 Partenaire, 70 Couple, hors 50 d'avances.
3. Camille et Alex ont des créances nominatives 30 et 20 indépendantes.
4. Le remboursement confirmé 15 augmente le courant, réduit seulement Camille et ne crée aucun revenu.
5. Le remboursement en attente ne touche ni le solde ni la créance.
6. Le paiement carte 100 est neutre pour le budget ; courant 915 et Mastercard −20 après réception Camille.
7. La preuve de paiement importée sur la carte ne crédite pas une deuxième fois la carte.
8. Le remboursement commerçant 12 réduit la dette carte à −8 et les dépenses Couple à 58, sans modifier les créances.
9. La liquidité nette CAD après le remboursement Camille et le paiement carte est de 895 (915 − 20), sans double comptage.
10. Un remboursement au-dessus du restant dû à Camille ou attribué à un inconnu est refusé.
11. Une baisse de l'avance de Camille en dessous de sa somme déjà remboursée est refusée.
12. Les rapprochements CAD du 12 octobre clos à 915 (courant) et −8 (carte) ne rejouent pas les mouvements antérieurs.
13. Un rapprochement `pending` plus récent ne remplace pas le dernier confirmé.
14. Un nouvel achat après rapprochement modifie le solde carte exactement une fois.
15. Un solde initial absent demeure inconnu (null), pas zéro.

**Résultat distinct de cette session : 15/15**, tous les scénarios de la nouvelle suite ont été rejoués dans un harnais V8 avec implémentations simulées des API `fs/path/vm/assert`. Le dépôt n'a pas pu être cloné dans le conteneur Node v22.16.0, erreur DNS `Could not resolve host: github.com`. Aucun test Node sur un clone réel, Safari, PWA, CI ou Supabase n'est revendiqué.

**Commits :**
- `042d8d99608b874d88986d15b7c445acbbaf0723` : ajout de la suite fictive de cycle Mastercard/Amis ;
- `1d848c7fc29b32a6138267191b7adcf271a477fa` : ajout de la nouvelle suite au workflow `trace-regression.yml` **sans modification de ses déclencheurs**, qui restent `push` / `pull_request` sur `main` uniquement. Aucune exécution GitHub Actions déclenchée par les commits candidats.

**Décompte :** le bilan précédent de 469 contrôles V8 sur 24 suites reste un bilan **de la session précédente**, pas une réexécution globale durant ce lot. Cette nouvelle suite ajoute 15 cas et porte l'inventaire théorique à 484 contrôles sur 25 suites ; **ne pas présenter 484/484 comme une nouvelle campagne globale exécutée**.

### Prochaines validations encore nécessaires

Exécuter les 25 suites avec la vraie CLI Node dès qu'un checkout local est possible, tester le parcours dans Safari iPhone réel avec données fictives, puis les rapprochements PDF mensuels et les écarts de dates des relevés. Garder l'activation de `index.html`, `trace-version.json`, `sw.js`, le déploiement, la fusion et toute migration soumis à une autorisation expresse séparée.

**Phase 1 non terminée.** Aucun changement du moteur de production ou des données réelles lors de ce lot.

## Phase 1 — Sécurisation des montants d'import OCR et CSV (23 octobre 2026)

**Périmètre :** `trace-5.37.0-international-accounts-fx` uniquement. Production et `main` préservées. Aucun déploiement, aucun accès ou mutation Supabase réels, aucune migration, aucune GitHub Action déclenchée.

### Défaut réellement reproduit

Sur une capture Mastercard fictive, `smartMatchCardPaymentDraft` acceptait `99.999 CAD` comme montant d'une preuve pour un virement de `100 CAD`, puis le sauvegardait comme `100 CAD`. Ceci constitue un arrondissement silencieux de données bancaires. Le risque se retrouvait dans la validation `smartApproveDraft`, le staging `smartStageRows` et les lignes CSV au-delà de deux décimales.

### Correction ciblée

- Fonction interne commune `smartExactBankAmount` dans la candidate `v5-app-5.37.0.js` : accepte uniquement les montants positifs au centime exact (tolérance `1e-6` sur le calcul en centimes pour les artefacts IEEE-754), sans arrondi financier implicite.
- Une capture OCR douteuse reste `pending` avec montant non validé (`null`) et `needsAmountReview` : aucune transaction bancaire n'est créée lors de cette étape.
- Un rapprochement carte ou une validation d'import rejette explicitement la fraction de centime avant d'écrire.
- Une ligne CSV à montant non valide est comptée parmi les lignes invalides avant import ; elle n'est pas ajoutée silencieusement au budget ou au ledger.
- Les valeurs exactes et les rapprochements corrects réutilisent toujours le mouvement existant, sans nouvel achat, remboursement ou paiement de carte.

### Commits

1. `a48c72947a52ad09b69fdd38a9e12ca4fe7e357a` — correction OCR, validation et paiement Mastercard.
2. `f5b69b9609e7b0f3f30560096ec56a7ff3966b64` — rejet des fractions de centime des CSV.
3. `0fb27a34d128d8348c385b8485d6369598c049fd` — nouvelle suite `tests/trace-international-import-cents.test.cjs` de 12 contrôles sur sources réelles et données fictives.
4. `c586aa613e11bd48b7f3aa96cbc2a65334eb86dd` — inscription de la suite dans `.github/workflows/trace-regression.yml`, **sans modifier les déclencheurs** `push/pull_request` sur `main` uniquement, sans lancer CI.

### Campagne de vérification de cette reprise

Toutes les 26 suites du workflow, incluant les nouvelles suites de cycle Mastercard et d'import, ont été lues depuis GitHub, puis exécutées en plusieurs lots dans un environnement JavaScript V8 avec simulations de `fs`, `path`, `vm`, `assert`, `process` et du DOM. Une première défaillance due à `assert.rejects` absent du harnais de laboratoire a été corrigée **uniquement dans le simulateur**, puis les sept scénarios du laboratoire ont été rejoués avec succès.

| Périmètre | Suites | Contrôles réussis |
|---|---:|---:|
| Candidate International 5.37.0 | 19 | **251** |
| Régressions historiques 5.36.5 | 5 | **232** |
| Laboratoire fictif | 2 | **15** |
| **Total réellement observé** | **26** | **498/498** |

Aucun échec lors du dernier passage. Le nombre 498 est issu des sorties des suites actuelles, et non du bilan documentaire précédent (484 théoriques avant ajout de 12 cas). Le décompte préexistant comportait des imprécisions, dont 27 cas présents dans `trace-international.test.cjs` contre 25 anciennement cités ; ne pas additionner les anciens chiffres comme des résultats réexécutés.

**Limites impératives :** le clonage GitHub par `git` échoue toujours dans le conteneur (résolution DNS), bien que Node v22.16.0 soit disponible. Ce ne sont **pas** des tests Node CLI sur un vrai checkout, ni GitHub Actions, ni de vrais tests Safari iPhone, PWA ou Supabase multi-utilisateur. Le relevé PDF mensuel de vérification ligne par ligne reste une phase distincte de l'import quotidien. Aucun état client historique n'a été réécrit.

**Phase 1 non terminée.** Validation Node native, Safari réel et parcours PWA/Supabase fictifs restent nécessaires avant toute intégration ou publication ; toutes interdites sans accord explicite.

## Phase 1 — Rapprochement des écritures CSV de natures différentes (23 octobre 2026)

**Reprise :** 25ff1468f540b020cdef035603e1c2a8eb7f0be2, branche trace-5.37.0-international-accounts-fx uniquement.

### Risque confirmé

La détection CSV historique basée sur l'empreinte incluait le type de mouvement. Un débit de 100 CAD importé comme dépense n'était pas rapproché d'un paiement Mastercard déjà classé virement interne. Un crédit de 15 CAD importé comme revenu n'était pas rapproché d'un remboursement Camille classé external_refund. Ces CSV sont initialement pending et ne créaient pas de double comptage tant qu'ils n'étaient pas confirmés, mais une validation erronée restait possible.

### Correctifs réversibles

- **csvBankEvidenceMatches :** contrôle en lecture seule du compte, du sens, du montant bancaire natif vérifié et de la date (écart maximal de 2 jours). Pour les virements interdevises, comparaison de la destination avec toBankAmount effectivement enregistré ; aucun taux implicite de 1:1.
- **Prévisualisation CSV :** affichage des lignes ressemblant à des mouvements déjà enregistrés et de leur date, nature et libellé. Aucune fusion ni suppression automatique. Les imports restent pending.
- **Persistance :** recalcul du rapprochement avant insertion des lignes pending, conservation des références csvReviewMatchIds à examiner. Transactions précédemment confirmées laissées intactes.
- **Validation dans l'éditeur :** si une ligne CSV à confirmer ressemble à une écriture existante, l'utilisateur doit comparer et confirmer expressément qu'elle est distincte. Le contrôle est recalculé après modification du compte, de la date ou du montant ; si une nouvelle ressemblance apparaît pendant l'édition, rouvrir la fiche pour examiner les candidats. Confirmation distincte traçable avec csvDistinctReviewedAt.
- **Faux positifs :** deux opérations distinctes peuvent avoir le même montant, le même compte et une date proche. Les correspondances sont des alertes, pas des rapprochements automatiques définitifs. Un utilisateur peut confirmer une opération effectivement distincte après vérification.

### Commits de cette reprise

1. 0372fd044c080e2f56cfbca0079e2ea24f02b9bb — identification des écritures CSV similaires malgré une nature différente.
2. ee220b9f15a79da88323956056dd28ec0a049758 — confirmation explicite dans l'éditeur CSV pending.
3. f781aa7623e88a863b7f3cf282783defcb7eb930 — suite de tests du rapprochement inter-natures.
4. 417b3eab27ec49cf7b64f797eb1db5c08687bc40 — tests de validation de l'éditeur réel avec DOM simulé.
5. 0084c3d7c6fb08bed5f935312add4f5c201f03a5 — inscription dans le workflow de régression futur, déclenché uniquement sur main (aucune action lancée).
6. 7837df660086aada8568cd7f376250e336d5df76 — tests du parcours complet import CSV fictif / aperçu / lignes en attente.

### Vérification réellement effectuée dans cette session

Les **27 suites actuelles** ont été récupérées depuis la branche GitHub et exécutées par lots dans un environnement JavaScript **V8 isolé**, avec simulation ciblée des API Node et DOM (et non dans une CLI Node native ou Safari).

| Périmètre | Suites | Résultat V8 |
|---|---:|---:|
| Candidate 5.37.0, dont les 23 nouveaux contrôles CSV | 20 | 274 réussis |
| Régressions historiques 5.36.5 | 5 | 232 réussis |
| Laboratoire fictif et démarrage simulé | 2 | 15 réussis |
| **Total observé cette fois** | **27** | **521/521 réussis** |

Les 23 nouveaux tests couvrent Mastercard débit courant et crédit carte, retour Camille, nature différente, faux positif de commerçant, compte et devise native (EUR), transferts interdevises réels, absence de conversion fictive, dates, montant exact, statut pending, traçabilité, contrôle de l'éditeur lors de la confirmation et import intégral de deux lignes fictives. Aucune transaction réelle manipulée.

**Limites et sécurité :** le conteneur dispose de Node 22 mais le clone git échoue encore par DNS sur github.com. Aucun test Node réel sur dépôt cloné, GitHub Actions, Safari iPhone, PWA ou Supabase multi-utilisateur n'a été mené. Aucun déploiement Vercel, merge, modification de main, du chargeur 5.36.5, de Supabase ou PickPoint. Les relevés PDF mensuels restent un chantier distinct. La phase 1 n'est pas déclarée achevée et toute publication exige une autorisation séparée.

## Phase 1 — Confirmation CSV périmée et préservation de lignes bancaires identiques (23 octobre 2026)

**Point de départ de ce lot :** `5c0247c393e0ccd2299a5841e0ea4fa5973314b6`, branche `trace-5.37.0-international-accounts-fx` exclusivement.

### Anomalie 1 — Case de confirmation réutilisée après modification des preuves

L'éditeur de la candidate présentait une case à cocher pour confirmer qu'un CSV ressemblant à un mouvement bancaire déjà enregistré était en réalité distinct. Problème **reproduit avant correction** : une case précédemment cochée permettait encore de confirmer après modification du montant, de la ligne bancaire comparée ou de son statut.

**Correctif :** dans `editTransaction`, `csvReviewIdentity` capture une identité en mémoire des détails bancaires examinés : compte, date, montant natif, nature, libellé et détails des mouvements rapprochés (IDs, statut, type, date, comptes et montants). Pour toute écriture CSV confirmée :
- un changement d'identité ou des correspondances bloque la validation et demande de rouvrir la fiche ;
- une case antérieurement cochée ne suffit donc plus si la preuve de rapprochement a changé ;
- un second recalcul a lieu juste avant `saveDocument` pour détecter un changement intervenu au cours d'une opération asynchrone, notamment une nouvelle preuve ajoutée ;
- un changement de catégorie budgétaire uniquement, sans modification de l'identité bancaire comparée, reste possible.

Ce garde-fou demeure de niveau client : **il ne remplace pas une contrainte transactionnelle Supabase** ni une gestion de concurrence distribuée, qui devra être vérifiée avant une publication publique.

### Anomalie 2 — Lignes CSV véritablement distinctes supprimées de la prévisualisation

L'import CSV utilisait l'empreinte date/type/commerçant/montant/compte pour supprimer implicitement les lignes ayant les mêmes caractéristiques. Deux achats réels du même montant au même commerçant le même jour pouvaient donc être réduits à une seule ligne **avant vérification**.

**Correctif limité au parcours CSV :**
- chaque ligne comporte un `csvSourceRowIndex` correspondant à sa position physique dans le fichier (en plus de `importFileName`, compte et empreinte) ;
- une ligne identique provenant d'une **autre position du même fichier** est conservée comme opération `pending`, avec alerte sur la transaction ressemblante ;
- seule la réimportation de la **même ligne source, depuis le même nom de fichier, sur le même compte et avec la même empreinte** est ignorée pour éviter une réimportation identique ;
- un fichier renommé ou une transaction similaire enregistrée manuellement reste à examiner, jamais écarté silencieusement ;
- la fonction historique `csvImportedDuplicate`, utilisée par d'autres parcours, n'a pas été changée. Le comportement plus prudent est limité à l'import CSV.

**Limite connue :** l'identification par nom de fichier + position + empreinte n'est pas un identifiant bancaire universel. Une source ancienne sans `csvSourceRowIndex`, un fichier renommé ou un extrait CSV réordonné peut être reproposé comme `pending` ; l'utilisateur devra le comparer. Aucun doublon n'est supprimé automatiquement.

### Commits candidats enregistrés pour ce lot

- `bfbdb8f9b388cce1e54afecfdc3e21d679f74d6a` — invalidation d'une confirmation devenue périmée ;
- `c5c7b2f10bb662b8be43cdd958c8a83c547ffa3c` — cinq tests supplémentaires de concurrence simulée et de comparaison périmée (28 contrôles dans la suite CSV bank review) ;
- `90508a9351519b888d105415f7b1fe0a8bcfe532` — conservation des lignes CSV identiques d'origine différente, idempotence par ligne source ;
- `0f253afd25684e8152e140a3a0c26df61d99fd30` — nouvelle suite de cinq tests CSV sur vraies fonctions et données fictives ;
- `eb062cb21d1582e43698fc27cce28d25ccec8fc0` — inscription de la suite dans le workflow futur limité à `main`, sans modifier les déclencheurs ni lancer de CI.

### Campagne actuelle : 531/531 validations V8 isolées

Les fichiers candidats les plus récents ont été récupérés via GitHub, et les **28 suites** ont été réexécutées par lots dans un harnais JavaScript V8 avec simulations de `fs`, `path`, `vm`, `assert`, `process` et éléments DOM :

| Périmètre | Suites | Cas réussis |
|---|---:|---:|
| Candidate TRACE 5.37.0 | 21 | 284 |
| Régressions historiques 5.36.5 | 5 | 232 |
| Laboratoire fictif et boot simulé | 2 | 15 |
| **Total observé** | **28** | **531/531** |

Les nouvelles simulations contrôlent que les modifications de montant, de libellé, de statut ou l'apparition d'une preuve bancaire pendant la validation invalident la case cochée. Les mêmes achats bancaires réellement distincts restent des lignes `pending` séparées et la réimportation stricte d'une même ligne source n'en rajoute pas.

**Limitations inchangées :** les suites n'ont pas été exécutées dans un checkout Node natif (clone GitHub bloqué par DNS dans le conteneur) ni dans Safari iPhone ; tests Supabase intégrés, PWA, UX tactile et rapprochement mensuel PDF restent nécessaires. Aucun accès aux données Supabase réelles, migration, fusion, activation, suppression automatique de doublons, déploiement ou réactivation de workflows PickPoint.

**Phase 1 non terminée.** Toute modification de `main` ou publication exige une autorisation expresse ultérieure.

## Phase 1 — Relevés CSV : colonnes Débit / Crédit ambiguës (23 octobre 2026)

**Périmètre autorisé :** branche `trace-5.37.0-international-accounts-fx` uniquement, depuis `bb4878c865932dc0cc7a3cd17af44511a99d4a7c`. Aucun accès ou écriture Supabase, aucune fusion, aucun déploiement ou CI lancé ; `main` et l'application 5.36.5 restent préservées.

### Défaillances financières reproduites dans le code candidat initial

1. Pour un relevé CSV fictif contenant **75 CAD au débit et 50 CAD au crédit sur une même ligne**, `importFile` choisissait silencieusement un mouvement `income` de 50 CAD et le créait en `pending`, malgré deux colonnes simultanément positives. Aucun mouvement n'était encore `confirmed`, mais une validation manuelle ultérieure pouvait contaminer les comptes et le budget.
2. Avec `Débit = ILLISIBLE` et `Crédit = 50 CAD`, une cellule bancaire non vide mais impossible à analyser était silencieusement traitée comme une absence de débit ; l'import retenait 50 CAD.
3. Le parseur `parseCsvMoney` acceptait un champ composé uniquement de caractères de signe (`--`, `+`, `-`) et le convertissait en 0. Un signe intégré (`1-0`) pouvait être interprété comme un montant négatif fictif.

### Mesures conservatrices appliquées à la candidate

- Quand les colonnes `Débit` et `Crédit` sont utilisées, elles doivent contenir **exactement une valeur positive**, l'autre étant vide ou nulle. Deux valeurs positives ou deux valeurs nulles/vides invalident la ligne.
- Un champ bancaire **non vide et illisible** invalide toute la ligne au lieu d'être converti en zéro.
- La lecture `parseCsvMoney` refuse les valeurs dépourvues de chiffres, les signes répétés et ceux placés entre deux chiffres ; les écritures bancaires classiques `-50,00`, `50,00-`, `1 234,56` et `1,234.56` restent prises en charge.
- Les lignes invalides sont **signalées dans le bilan de prévisualisation** avec leur numéro de ligne ; elles ne sont ni persistées, ni comptabilisées, ni transformées en une autre nature. Les autres lignes valides du même fichier restent proposées en `pending` ; leurs numéros de ligne d'origine sont conservés.
- Le format alternatif `Montant signé` continue de fonctionner indépendamment des deux colonnes `Débit` / `Crédit`.

### Commits GitHub de ce lot

- `877b05c4dbec97102747b449c4f5928025663393` — rejet des lignes CSV avec débit et crédit simultanément non nuls.
- `6ac6161229987f5b1f6fba3c02cab1875da0b0a4` — refus des cellules bancaires non vides mais illisibles.
- `a1a695442791aa8fbad12766c5f26e2d253cdd51` — durcissement conservateur de `parseCsvMoney`.
- `69565ecc510c292d60973610fed478a2bf809f33` — ajout d'une nouvelle suite `tests/trace-international-csv-column-safety.test.cjs`.
- `eddbd94ede0549593b686521eb7f65c9535e6453` — enrichissement à **11 scénarios** pour les signes invalides.
- `2ca184e1adce0c9871b28070fce2733b5f7338fa` — inclusion de la suite dans le workflow historique **main-only**, sans exécuter GitHub Actions.

### Réexécution isolée observée dans ce lot

Les fichiers de **29 suites** ont été récupérés via l'application GitHub connectée et exécutés, en quatre lots, dans un environnement V8 avec simulations contrôlées de modules Node / DOM. Les résultats de ces simulations, et non d'une CLI Node réelle, sont :

| Périmètre | Suites | Contrôles réussis |
|---|---:|---:|
| Candidate International 5.37.0, dont la nouvelle suite de 11 cas | 22 | **295** |
| Tests historiques 5.36.5 | 5 | **232** |
| Laboratoire et boot fictifs | 2 | **15** |
| **Total observé** | **29** | **542/542** |

La nouvelle suite couvre la ligne doublement débitée/créditée, débit ou crédit valide, cellule malformée adjacente à une cellule valide, colonnes vides/à zéro, colonne à zéro explicite, conservation des numéros physiques de ligne dans un fichier mêlant valeurs valides et invalides, ainsi que le format `Montant signé`.

**Limites :** impossible de cloner le dépôt par Git à partir du conteneur (erreur DNS `github.com`), même si Node v22.16.0 est disponible. Aucune exécution Node CLI sur checkout natif, aucun test Safari iPhone/PWA, aucune écriture Supabase ni transaction bancaire réelle. Les erreurs concurrentes distribuées exigent toujours de vraies validations de bout en bout et une contrainte serveur avant la publication. Le relevé PDF mensuel demeure destiné à vérifier la couverture des mouvements existants plutôt qu'à les importer à nouveau.

**Phase 1 toujours ouverte.** Aucune modification de `main`, du chargeur PWA stable, des versions, du service worker, du déploiement Vercel ou de PickPoint.

## Phase 1 — Laboratoire de rapprochement mensuel des relevés (23 octobre 2026)

**Point de départ vérifié :** `8674462a46d614473fa09530385a930b970339d5`. Modifications autorisées uniquement sur `trace-5.37.0-international-accounts-fx` ; aucun déploiement, aucune fusion dans `main`, aucune écriture réelle Supabase, aucun workflow GitHub Actions lancé, aucune intervention PickPoint.

### Préparation fonctionnelle volontairement isolée

La lecture PDF n'est **pas encore implémentée ni activée**. Ajout d'un moteur **en lecture seule** `trace-statement-reconcile-1.0.0.js` destiné aux **lignes bancaires préalablement structurées** (date, compte, sens entrée/sortie, montant natif, libellé facultatif). Ce module n'est chargé **ni par `index.html` ni par la candidate active/preview**, ne possède pas d'accès au navigateur, à une base de données ou au budget et n'effectue aucune mutation.

La fonction `TraceStatementReconcile.compare` dépend explicitement de `TraceInternational.amountOnAccount`, déjà existante, pour respecter les montants bancaires natifs et éviter de recréer une règle de conversion. Elle retourne uniquement le rapport de comparaison :

- `matched` : une **seule correspondance plausible** avec une transaction `confirmed`, non partagée avec une autre ligne du relevé. Ce statut reste un résultat **technique indicatif**, et **ne certifie pas** un rapprochement officiel : les noms de commerçant peuvent différer.
- `pending` : un seul candidat existe mais sa transaction TRACE n'a pas encore été validée.
- `ambiguous` : plusieurs écritures sont candidates, ou un même mouvement pourrait expliquer plusieurs lignes du relevé. **Aucune ligne n'est automatiquement attribuée deux fois ou effacée** ; examiner manuellement.
- `missing` : aucune transaction éligible trouvée pour une ligne du relevé, compte/sens/devise native/montant/date conformes.
- `notOnStatement` : écriture confirmée dans la période qui ne ressemble à aucune ligne du relevé.
- `invalid` et `outOfPeriod` : lignes rejetées du périmètre de vérification sans modification.
- Totaux de couverture et indicateurs `writes: 0`, `financialChanges: 0` ; pas de mutation des entrées.

Tolérance par défaut de ±2 jours calendaires (paramétrable de 0 à 4). Contrôle strict des dates et centimes. Exclusion de `card_statement_evidence` afin de ne pas comptabiliser deux fois le paiement d'une carte. Les virements source/destination sont des jambes distinctes ; en CAD→EUR, un montant EUR de destination doit exister effectivement (jamais de substitution implicite de CAD ni taux 1:1). Les remboursements de proches `external_refund` sont traités comme entrées bancaires et non comme revenus de salaire.

**Principe comptable :** le relevé mensuel sert à vérifier la couverture et l'exactitude des mouvements déjà saisis, pas à reconstituer ni réimporter automatiquement ces mouvements.

### Commits réalisés

- `c8565e5347fb2d00824a25c7bb2ce8a70be6b097` — nouveau module isolé de comparaison mensuelle, sans chargement actif.
- `c20a337bc32806887295b7ef9f820bfadd8f9b91` — **22 tests** fictifs de correspondance, doublons légitimes, anomalies, paiements de carte, avances, EUR/CAD, absence de FX fictif, intégrité lecture seule.
- `0fd5c888bf995e6d2e1629f01533515645cd046e` — inscription de la suite dans le workflow de régression futur **main-only**, déclencheurs inchangés, sans exécution de CI.

### Campagne de vérification du lot

Les **30 suites actuelles** ont été récupérées via le connecteur GitHub puis exécutées par lots dans un environnement JavaScript V8 avec modules Node et DOM simulés. Il ne s'agit ni d'une exécution native `node tests/...` sur un checkout local ni d'un essai Safari.

| Périmètre | Suites | Résultat V8 isolé |
|---|---:|---:|
| Candidate International 5.37.0 | 23 | **317 réussites** |
| Régressions historiques 5.36.5 | 5 | **232 réussites** |
| Laboratoire d'application / boot fictif | 2 | **15 réussites** |
| **Total de cette reprise** | **30** | **564/564** |

Aucun échec lors de cette campagne isolée. Les 22 nouveaux cas testent notamment la stricte relation une-ligne/une-écriture, les montants identiques dans les deux sources, les correspondances ambiguës, les opérations en attente, les mouvements enregistrés mais absents du relevé, la neutralité du paiement Mastercard et du remboursement de proche, les virements CAD↔EUR, les écarts de dates, les entrées erronées et la non-mutation de l'état financier.

### Limites à respecter avant la suite

1. **Aucune extraction PDF réelle** : aucun lecteur de PDF bancaire branché, aucune classification OCR mensuelle et aucune UI de rapprochement final développée à ce stade.
2. Les correspondances reposent principalement sur compte/sens/montant/date ; un même montant pour deux achats distincts peut être ambigu même avec des libellés différents. Ne pas présenter `matched` comme une certification définitive.
3. Validation sur vraie CLI Node, parcours PWA/Safari iPhone avec données fictives et contrôle de concurrence multi-utilisateur non effectués. Les contraintes côté serveur Supabase restent à étudier avant publication.
4. Ne pas créer automatiquement de revenus/dépenses, réécrire les budgets CAD historiques, fusionner des enregistrements, lancer GitHub Actions, activer le module dans `index.html`, modifier `main` ou déployer sans nouvelle autorisation.

**Phase 1 reste ouverte.**

## Phase 1 — Préparation contrôlée des lignes de relevés PDF (23 octobre 2026)

**Point de reprise GitHub avant ce lot :** `bf3149fe63d3186a2d1e5798f27f691bf5bfe5b7`. Travaux effectués uniquement sur `trace-5.37.0-international-accounts-fx`, sans modification de `main`, sans fusion, sans déploiement, sans GitHub Actions et sans lecture/écriture de données réelles Supabase.

### Réalisation nouvelle — module de preuves documentaires isolé

Le module `trace-statement-evidence-1.0.0.js` a été créé. Il **ne lit ni les octets d'un PDF, ni un OCR brut**, et n'est activé ni dans `index.html` ni dans `trace-international-preview.html`. Il reçoit des **lignes déjà extraites et structurées** d'un relevé fictif, avec document, compte, devise native, période, numéro de page, numéro de ligne et texte original.

- `stage` : normalise strictement les dates ISO/JJ-MM-AAAA, montants natifs à centimes exacts, colonnes Débit/Crédit exclusives, sens entrant/sortant et devise du compte. Les lignes de date impossible, hors période, sans preuve de page/ligne/texte, en devise incorrecte, contradictoires, doublons d'emplacement, ou présentant un montant illisible restent dans `issues`. Un relevé vide est invalide.
- `reviewedRows` : demande la confirmation **explicite de chaque ligne** et de la même preuve. Les justificatifs qui changent de montant, date, libellé, sens, devise, document, compte, page, ligne ou extrait après leur préparation invalident l'approbation et bloquent la comparaison. Toutes les lignes problématiques doivent être résolues avant de produire un rapport complet ; aucun nombre n'est inventé.
- `compareReviewed` : une fois toutes les lignes confirmées, transmet uniquement leurs valeurs documentées au module isolé `trace-statement-reconcile-1.0.0.js` développé au lot précédent. Le compte et la devise doivent correspondre. Il ne crée jamais de nouvelles transactions, de revenus ou dépenses et ne certifie aucun solde.

Il s'agit d'une **étape de préparation et de tests**, pas d'un import PDF fonctionnel ni d'un écran prêt à utiliser. Les informations fournies par un extracteur futur devront être revues par une personne avant toute comparaison complète. Les remboursements de proches, paiements de carte et virements entre devises continuent à suivre les règles du rapprochement natif déjà testé.

### Commits de ce lot

1. `695a18922bfb159046198d7a17b427cb76ce3417` — nouveau module de préparation des preuves PDF déjà extraites.
2. `ed883c731bd61d18d005d4cced48926f61c31336` — rejet des relevés sans aucune ligne.
3. `f3bc03e41f400bac897d6193650d708ad628815a` — 22 tests initialement créés pour les lignes PDF structurées et la confirmation humaine.
4. `3ba2b76ff5e79e7035013176c43c340023612dd2` — inscription des tests au workflow futur **main-only** sans lancer de CI.
5. `4dafc4bbbe54e9c56993742b3d2faf081ebeb218` — invalidation des approbations après modification du document préparé.
6. `a516485548e2c220cf24ce0258f08516999167eb` — deux scénarios supplémentaires de preuve modifiée, portant la suite à **24 tests**.

### Campagne de tests observée dans cette reprise

Les fichiers ont été récupérés depuis le connecteur GitHub et les **31 suites** ont été exécutées par groupes avec des modules Node/DOM simulés dans l'environnement JavaScript V8. Les deux suites dédiées aux relevés (`trace-international-statement-evidence.test.cjs` et `trace-international-statement-reconciliation.test.cjs`) ont été rejouées après le dernier garde-fou : **46/46 cas réussis**.

| Périmètre | Suites | Contrôles passés |
|---|---:|---:|
| International 5.37.0 (incluant les 24 nouveaux tests de preuves) | 24 | 341 |
| Régressions historiques 5.36.5 | 5 | 232 |
| Laboratoire fictif et boot simulé | 2 | 15 |
| **Total de cette reprise** | **31** | **588/588** |

Ces résultats **ne sont pas** des tests natifs Node CLI sur un checkout local, ni des essais réels Safari iPhone/PWA, ni une validation Supabase multi-utilisateur.

### État d'avancement fonctionnel consolidé (au 23 octobre 2026)

| Domaine 5.37.0 | Réalisé en code candidat ou module isolé | Encore nécessaire avant une publication |
|---|---|---|
| Moteur multi-comptes/multi-devises | Montants natifs CAD/EUR/USD/GBP/CHF, comptes pays, taux datés, aucun FX implicite 1:1, transferts avec montant réel reçu, tests isolés | Validation HTTP Valet, intégration réelle et Safari |
| Modèles bancaires CA et FR | Compte courant, cartes crédit liées, débit immédiat, paiements neutres budget | Parcours réel multicomptes et rapprochements bancaires |
| Répartitions Moi/partenaire/amis | Avances, remboursements multiples/partiels, identités de débiteurs, moteurs et écrans ponctuels candidats testés | UX et régressions multi-utilisateurs et mobiles réelles |
| Imports | CSV FR/CA, devises natives en attente, doublons revus, centimes exacts, OCR intelligent candidat | Vraies pièces bancaires représentatives, workflow final stable |
| Contrôle de relevé mensuel | Comparateur read-only et préparateur read-only de lignes **préalablement extraites**, 46 contrôles dédiés | Extraction réelle du PDF, contrôle manuel UI, état de rapprochement validé, écarts bancaires |
| Accueil et synthèse Couple | Logique et éléments candidats d'agrégation multi-comptes, ambiguïtés empêchant un faux solde | Terminer UX et tests Safari réels de tous les cas |
| Activité/Budget/Patrimoine | Identité, structures et composants candidats partiels et conception de 5 onglets consolidée | Finaliser le parcours cible sans perte de fonctions 5.36.5 |
| Épargne et placements internationaux | Premières écritures et validations natives candidates | Raccordement complet aux comptes multi-devises, valorisations et navigation |
| Débit différé | Option volontairement désactivée | Moteur échéance/achat/débit, tests de règlement sans double consommation |
| Livraison | Laboratoire fictif indépendant sans Supabase réel, 31 suites V8 | Node natif, Safari iPhone, PWA offline, véritables essais intégrés, revue de PR, approbation pour publication |

**Appréciation :** le cœur comptable international est largement développé et s'est enrichi de nombreux garde-fous ; les cinq écrans finalisés, le débit différé, l'extraction PDF, la validation en navigateur et la vraie intégration restent des jalons significatifs. Aucun pourcentage de complétion global ne peut être déduit honnêtement du nombre de commits/tests.

**Phase 1 maintenue ouverte.** Aucune autorisation de modification de `main`, de la version de production, du service worker, d'une donnée Supabase réelle ou de déploiement.

## Phase 1 — Intégrité de l'ensemble du relevé préparé (23 octobre 2026)

**Point de départ vérifié :** `9fc9d7d7f49142ae1b749a42526832077a2f3ba2`. Branche candidate `trace-5.37.0-international-accounts-fx` exclusivement. Aucun changement de `main`, de l'entrée 5.36.5, du service worker, de Supabase réel, du déploiement Vercel ou des workflows PickPoint. Tous les commits du lot portent `[skip ci]`.

### Défauts confirmés par reproduction avant correction

Dans le module documentaire **isolé** `trace-statement-evidence-1.0.0.js` :
1. Après approbation d'une ligne, modifier `staged.accountId`, `staged.currency` et les bornes `fromDate/toDate` ne bloquait pas `reviewedRows`, qui retournait indûment `reviewed` pour un compte/période différent.
2. Retirer une ligne de `staged.ready` après la préparation d'un relevé de deux lignes permettait encore de valider le relevé comme intégralement revu, alors que `totalRows=2` et qu'une seule ligne restait disponible.

Ces deux défauts de **complétude du contrôle mensuel** ont été observés avec des données fictives avant toute activation du module. Ils n'affectent pas `v5-app-5.36.5.js` en production.

### Correction

- Ajout de `statementIdentity` : empreinte **non cryptographique** prenant en compte le document, compte, devise, période, nombre de lignes, ordre des lignes prêtes, preuves et anomalies signalées. Cette identité est capturée au moment de `stage` ; `reviewedRows` la recalcule et exige l'identité inchangée.
- Contrôle explicite de `totalRows === ready.length + issues.length` : suppression d'une ligne ou d'une anomalie après staging invalide la validation.
- Une modification du document, du compte, de la devise, des dates, de la position ou du contenu des opérations, ou de l'ordre des lignes impose de **reprendre la préparation depuis la source** ; aucune vérification « complète » ne peut continuer avec les anciennes approbations.
- Les dates de période `JJ/MM/AAAA` et `JJ-MM-AAAA` sont converties en ISO au début de `stage`, et comparées en ISO, tout comme les dates des lignes.
- **Frontière de sécurité :** une empreinte JSON client évite les validations périmées dues aux manipulations ou au changement d'état de l'interface ; elle ne constitue **ni signature de document PDF ni preuve anti-falsification**, ni contrainte transactionnelle serveur. La vérification de la provenance et de l'exhaustivité de l'extraction PDF devra être effectuée indépendamment.

### Commits

- `1489525a9227fd244967546e57d95a768c9e2ac5` — sécurité de l'identité de l'ensemble du relevé et dates normalisées ;
- `2cbddc89eb8e1ae0260e968f4d2740025cbb7735` — dix tests complémentaires couvrant changements de compte, devise, période, identité du document, nombre de lignes, ordre des lignes, anomalies supprimées et conversion des dates françaises.

### Vérifications après correction

La suite documentaire contient désormais **34 tests**, tous réussis dans le simulateur JavaScript V8. La campagne de régression complète a été rejouée, sur les fichiers candidats récents :

| Périmètre | Suites | Contrôles passés |
|---|---:|---:|
| TRACE International 5.37.0 | 24 | **351** |
| Régressions historiques 5.36.5 | 5 | **232** |
| Laboratoire fictif et simulation de démarrage | 2 | **15** |
| **Total** | **31** | **598/598** |

Aucun échec observé. Les suites ont été lancées en environnement **JavaScript V8 avec modules Node/DOM simulés**, et non par la vraie CLI `node` dans un checkout Git local, ni par GitHub Actions. Aucun test réel dans Safari iPhone, PWA hors ligne ou Supabase multi-utilisateur.

### Critères de sortie prioritaires avant toute mise en production

1. **Complétude technique :** terminer et intégrer les parcours internationaux restés partiels (épargne, placements, débit différé, transferts et gestion de toutes les natures de mouvement) tout en préservant les comportements financiers 5.36.5.
2. **Contrôle documentaire :** extraction de PDF mensuels bancaires fictifs avec provenance fiable, revue humaine de toutes les lignes, traitement explicite des pages absentes, tableaux multi-pages et soldes d'ouverture/clôture. Un match technique montant/date n'est jamais une certification.
3. **Expérience iPhone :** les cinq onglets Accueil, Budget, +, Activité, Patrimoine dans un vrai navigateur Safari, édition et imports, filtres Moi/Couple, navigation, états d'erreur et PWA offline.
4. **Comptabilité réelle simulée :** tests end-to-end avec une base **entièrement fictive et isolée**, avec transactions et comptes canadiens/français, rapprochement carte et fonds du foyer sans double comptage ni taux fictif.
5. **Livraison contrôlée ultérieure :** régressions dans une vraie CLI Node + navigateur, revue de sécurité/concurrence, validation explicite de l'utilisateur avant toute PR, fusion, mise à jour de `index.html`/`sw.js` ou déploiement.

**Décision maintenue :** la 5.37.0 est une candidate en développement, pas un produit complet prêt à lancer. Le nombre de commits ou de contrôles isolés n'est pas un pourcentage d'achèvement fonctionnel. Priorité à la fiabilité, pas à la vitesse de publication.

## Phase 1 — Laboratoire du débit différé, première itération (23 octobre 2026)

**Départ du lot :** `8b2357b3b4f106b6caee4c7f939a5685074da59f`. Branche `trace-5.37.0-international-accounts-fx` uniquement. Aucun changement de `main`, déploiement, GitHub Actions, Supabase réel, service worker, ni activation des cartes différées dans l'application.

### Moteur ajouté, non activé

`trace-deferred-debit-1.0.0.js` est un **moteur de simulation comptable isolé**. Il n'est chargé ni par `index.html` ni par le laboratoire HTML fictif. Les achats d'une carte `type:card`, `paymentMode:deferred` sont associés à un **compte courant de règlement explicite**, de même titulaire, devise et pays. Les achats ont quatre notions séparées : date d'achat, date budgétaire, échéance de débit et date du débit effectivement confirmé.

- Un achat crée **une seule dépense budgétaire** sur la date budgétaire choisie et une dette différée en devise native. Il ne débite pas immédiatement le compte courant.
- Un règlement `confirmed` et complètement rapproché débite le courant et éteint la dette de la carte, sans **nouvelle dépense ni revenu** ; un règlement `pending` n'altère aucun solde.
- Plusieurs achats à la même échéance sont regroupés ; cette première version **n'accepte qu'un règlement complet par lot**. Les règlements partiels, les doubles paiements, les mélanges d'échéances, les achats manquants, dates incohérentes et centimes fractionnaires sont rejetés plutôt que devinés.
- Les remboursements commerçants et les frais ne sont **pas encore traités** dans le moteur ; il rejette explicitement ces entrées plutôt que de les perdre ou de les compter comme achats ou revenus.
- Pas de taux FX implicite : la simulation est **native au compte** et ne modifie pas les montants CAD des budgets historiques.
- `asOfDate` permet de distinguer soldes dus, échéances futures, règlements confirmés, paiements en attente et retard de règlement ; calcul **sans écritures bancaires** (`writes:0`, `financialChanges:0`).

Ce chantier est **un prérequis**, pas une fonctionnalité utilisateur : `Carte à débit différé` demeure désactivée dans la création de comptes et le moteur n'est pas branché aux documents financiers réels ou à l'UI iPhone. Avant intégration il faut décider et tester les remboursements, frais, règlements partiels, achats en devises distinctes et rapprochements avec des opérations bancaires réellement importées.

### Commits de ce lot

- `6c63adfa9355f1574c2694b0dc1f1ad12a3bc76e` — simulation isolée des achats, échéances et règlements différés.
- `da0c7b47d6c24f740a4cebf121f43c70fa161b84` — 30 scénarios initiaux, tous exécutés en V8.
- `d5568a0ad108555ba5c3631e4be2fc61e7480325` — rejet explicite de catégories inadaptées, frais et remboursements non modélisés.
- `00cbfbf55bb53b75103e14bacf287d33947480c4` — cinq scénarios supplémentaires, total de **35 tests** isolés réussis.
- `cf7b6333276da2e748f8085d57995bce731f3482` — inscription de la suite dans le workflow de régression futur, **toujours déclenché sur main uniquement**, sans l'exécuter.

### État exact des vérifications de cette reprise

La nouvelle suite `tests/trace-international-deferred-debit.test.cjs` a été exécutée sur le module réel récupéré depuis GitHub et a réussi **35/35** contrôles dans l'environnement JavaScript V8 simulé. Après correction, les cinq suites historiques TRACE 5.36.5 ont été rejouées **232/232**, ainsi que les dix premières suites International 5.37.0 **148/148**.

**Total vérifié pendant ce lot : 415/415 contrôles ciblés, sur 16 suites.** Une tentative de relecture des 15 suites candidates restantes a été interrompue par la limite d'appels de l'environnement ; les deux suites de laboratoire/boot et les autres suites International **n'ont pas été rejouées dans ce lot**. La dernière campagne complète antérieure à ce lot totalisait **598/598** contrôles simulés sur 31 suites. Il serait prématuré d'annoncer **633/633** tant que les 16 autres suites n'ont pas été relancées.

Ces tests restent des **simulations V8**, pas de vrais tests Node CLI, Safari iPhone/PWA, GitHub Actions ni Supabase fictif intégré.

### Suite technique et critères d'activation

1. Tester le débit différé sur les **16 suites restantes**, puis dans un vrai moteur Node/CI autorisé.
2. Définir les règles pour remboursements commerçants, frais et règlements partiels ; ne pas masquer ces événements dans le budget.
3. Raccorder au modèle de transactions et au rapprochement bancaire en **préservant les périodes et budgets existants** ; empêcher la transformation d'un paiement de carte en dépense ou revenu.
4. Valider de bout en bout avec comptes et données fictifs, puis les écrans Safari iPhone ; garder `main` et la production 5.36.5 intacts jusqu'à autorisation distincte.

**Statut : phase 1 toujours ouverte, non publiable.**

### Addendum de clôture de la campagne de régression (23 octobre 2026)

Après la consignation du résultat partiel ci-dessus, la limite d'appels initiale a été contournée en exécutant les suites restantes par groupes. **Toutes les 32 suites** ont finalement été rejouées sur la branche candidate avec leurs sources GitHub actuelles, dans le banc JavaScript V8 à dépendances Node/DOM simulées :

| Périmètre | Suites | Contrôles réussis |
|---|---:|---:|
| Historique TRACE 5.36.5 | 5 | **232** |
| TRACE 5.37.0 International, débit différé inclus | 25 | **386** |
| Laboratoire fictif et simulation du démarrage | 2 | **15** |
| **TOTAL REJOUÉ** | **32** | **633/633** |

**Détail d'exécution 5.37.0 :** dix suites initiales (148), huit suites avances/carte/partage (91), sept suites import/relevé/débit différé (147). La nouvelle suite débit différé passe **35/35** contrôles.

Cet addendum **remplace le caractère incomplet du bilan intermédiaire 415/415**, sans prétendre qu'une CI GitHub Actions, un checkout natif Node ou un navigateur Safari ont été exécutés. Aucune écriture réelle, aucun déploiement et aucune activation du modèle différé ne sont intervenus. L'interdiction de fusion vers main et la validation séparée de l'intégration UX/iPhone restent en vigueur.


## Phase 1 — crédits commerçants avant échéance, lot isolé (23 octobre 2026)

**Branche autorisée seule :** `trace-5.37.0-international-accounts-fx`. Départ : `e975beb7f5239ad79fa365721edcdfdd9dcf1e7d`. Commits code : `bea4f0d392ef382e50c8c83b1f4941d7c94d22e4` ; tests : `6c7cb6310241f0186e6c2bb6f14ddc1b7e4c3824`. Tous les commits portent `[skip ci]`. Aucune modification `main`, aucun déploiement, aucune écriture Supabase, aucun workflow lancé.

- Moteur isolé `trace-deferred-debit-1.0.0.js` : paramètre optionnel `refunds` (compatibilité des anciens appels). Un remboursement marchand **confirmé**, natif à la carte, rattaché à un achat confirmé, daté et avant échéance, diminue la dette de carte et la dépense budgétaire sur une date budgétaire explicite. Ne débite pas le compte courant et n'est jamais un salaire.
- Remboursements `pending` conservés hors des calculs. Plusieurs remboursements par achat possibles seulement si leur total, au centime exact, ne dépasse jamais le montant initial. La régularisation complète du lot tient compte des remboursements confirmés préalables. Un lot totalement remboursé devient `cleared_by_refund` sans transfert.
- Règles conservatrices **encore bloquées** : remboursement après échéance ou postérieur au règlement bancaire, frais/taxes propres au remboursement, paiement bancaire partiel, paiement sur plusieurs échéances, frais bancaires de règlement et FX. Aucun remboursement n'est inféré à partir de l'import. Le moteur n'est relié ni au grand livre ni à l'application.
- Correction du `-0` de `checkingBalanceChange` quand aucun règlement n'est passé, afin de satisfaire une assertion numérique stricte.
- QA : **48/48** scénarios de la suite spécialisée exécutés dans le banc **JavaScript V8 avec modules Node simulés** : les 35 scénarios antérieurs et 13 nouveaux. Aucun test Node CLI réel, CI, navigateur Safari, PWA offline, Supabase ou imports complets n'a été exécuté. Les autres 31 suites n'ont **pas** été rejouées pendant ce lot ; le précédent 633/633 reste une référence historique, et non le bilan nouveau.

**Prochain lot :** auditer et simuler les frais sur relevé différé (séparer frais de la transaction initiale et frais de règlement), puis décider et tester un modèle prudent pour règlements partiels et provenance des paiements importés. Garder l'option `deferred` désactivée.


## Phase 1 — frais explicites de carte différée, lot isolé (23 octobre 2026)

**État initial vérifié :** branche `trace-5.37.0-international-accounts-fx`, HEAD `41dc7a7a52fc84552342deb01ee5626b549bc519`, `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909`. Seule la candidate a reçu des commits `[skip ci]`. Aucun déploiement, workflow, changement d'entrée PWA ou accès aux finances Supabase réelles.

### Modèle délimité (non branché aux écrans)

- Entrée optionnelle `fees` ajoutée au moteur **isolé** `trace-deferred-debit-1.0.0.js` sans changer les appels précédents. Chaque frais est une ligne `type:'card_fee'` explicite avec identifiant, compte carte, devise native, `chargeDate`, `budgetDate`, `dueDate`, statut et montant **total taxes incluses au centime**. Les propriétés inconnues sont rejetées : aucune taxe/commission/change caché ou taux supposé.
- Un frais **confirmed** constitue **une dépense budgétaire propre** et augmente la dette sur la carte au jour de la facturation, mais ne débite pas le compte courant. Un frais `pending` ne modifie pas les soldes ni les dépenses. Chaque règlement de lot doit référencer explicitement tous les achats ET tous les frais de son échéance (`feeIds`), avec montant exact égal aux achats + frais confirmés − remboursements commerçants confirmés. Un lot composé uniquement de frais est admis, avec ses identifiants explicites.
- Un règlement bancaire confirmé reste un **transfert interne**, sans créer une deuxième dépense. Les lots incomplets, frais non confirmés, références dupliquées, mauvais compte/devise, frais datés après règlement et montants incohérents échouent sans écriture bancaire.
- **Non traité et volontairement bloqué :** frais ajoutés au compte courant au moment du règlement, frais de conversion, taxe ventilée de façon ambiguë, frais rétroactifs ou contestés, paiements bancaires partiels, règlements multi-échéances, comparaison automatique avec imports et FX différé.
- Le drapeau `deferred` reste `disabled` dans `v5-app-5.37.0.js`, sans câblage à la PWA ni au grand livre.

### Vérification

- **65/65 scénarios réussis en harnais JavaScript V8, dépendances Node simulées** : 48 anciens scénarios + 17 scénarios supplémentaires couvrant frais explicites, échéances 100% frais, totaux exacts, remboursements, pending, dates de budget, rejet des frais cachés/incomplets et absence de double dépense.
- Cette exécution n'est **pas** une CLI Node native sur checkout, ni une CI, ni un navigateur ou Safari/PWA, et n'interroge aucune base de données réelle. Les 31 autres suites n'ont pas été rejouées ; le bilan historique de 633 contrôles reste une référence **antérieure** et ne qualifie pas le nouveau commit.

Commits du code et des tests : `1141b9e915fd1cfb97330d982805b5396a018305`, `f978bc1850433cc068ca6f03ddb113430005f659`. Tous deux `[skip ci]`.

**Prochain chantier borné :** modéliser un règlement bancaire partiel explicite avec allocations prouvables par échéance et statut de confirmation, ou laisser le blocage si les justificatifs sont insuffisants ; ensuite traiter le rapprochement d'une ligne d'import bancaire vers un règlement déjà identifié, sans nouvelle dépense ni confirmation automatique. Les frais du compte courant restent distincts des frais sur carte.


## Phase 1 — règlements fractionnés sur carte à débit différé, simulation isolée (23 octobre 2026)

**GitHub contrôlé au départ :** `trace-5.37.0-international-accounts-fx` au commit `9c2805b9a23e7d7eb3e28e87423ab2c015784244` ; `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909`. Fichiers modifiés uniquement dans la candidate.

### Modèle comptable introduit (NON activé et NON certifié par une banque)

- Règlement `settlementMode:'partial'` explicitement attaché à **une seule échéance** via `allocationDueDate`, avec liste exhaustive des `purchaseIds` et `feeIds` déjà déterminés pour ce lot. Aucun prorata, répartition implicite entre achats ou réallocation inter-échéances.
- `bankEvidence` est obligatoire pour chaque fraction : `statementId`, `lineId`, `accountId` du courant de règlement, devise native, sens `debit`, montant exact, `debitDate`, statut et booléen `reviewed`. Le moteur vérifie la cohérence stricte et refuse qu'une même ligne `statementId+lineId+accountId` finance deux fractions, même sous deux identifiants de règlement différents.
- **Limite de confiance impérative :** `reviewed:true` est un *indicateur de revue humaine fourni au simulateur*, **pas** une vérification auprès de la banque, une identité de document cryptographique, ni une contrainte d'unicité persistante/serveur. L'authenticité, l'idempotence inter-imports et la concurrence devront être sécurisées lors de l'intégration à une base fictive isolée.
- Seuls les règlements `confirmed` à la date de situation diminuent la dette différée et le compte courant. Une fraction `pending` demeure sans impact financier, reste affichée comme en cours de revue, et ne peut pas prendre la place d'une confirmation. Les montants confirmés **et** en attente sont réservés pour empêcher de planifier un total supérieur au net de l'échéance.
- Les sorties par échéance distinguent désormais `paidAmount`, `remainingAmount`, `pendingAmount`, les identifiants de fractions confirmées/en attente et le dernier débit effectivement confirmé. Le retard correspond au **solde restant dû**, pas au montant initial de l'échéance. Les flux bancaires produits par la simulation sont des **transferts internes sans second impact budgétaire**. Les achats, frais et remboursements marchands conservent leurs propres dates budgétaires.
- Les règlements complets préexistants fonctionnent encore en `settlementMode:'full'` implicite, avec contrôle du montant intégral. Le mélange de `full` et `partial` pour une même échéance est bloqué. Une fraction sans preuve, une ligne réutilisée, un dépassement, un paiement inter-devises implicite, une surcharge non modélisée, un mauvais compte/date/statut ou une allocation multi-échéance sont refusés.

### QA réellement exécutée

- **84/84 scénarios** de la suite spécialisée `tests/trace-international-deferred-debit.test.cjs` en **harnais JavaScript V8 avec modules Node simulés** : les 65 anciens scénarios et 19 nouveaux (centimes, remboursements/frais, échéances indépendantes, retards, pending, doubles identifiants de ligne, frais inconnus, immutabilité).
- La suite historique de cette fonctionnalité a été rejouée avant les changements de tests et la suite de 84 a été exécutée après modifications. **Ce n'est pas une exécution Node CLI native** : les essais de `git ls-remote` depuis le conteneur ont encore échoué (DNS `github.com`). Pas de CI GitHub Actions, pas de test Safari/PWA ni d'écriture Supabase. Les 31 autres suites n'ont pas été rejouées dans ce lot : **633/633 est un résultat historique sur une version antérieure**, pas le résultat global du code actuel.

### Enregistrement et prochaine étape

- Moteur : `aaa66fa00461c0c6ead0ea89856eb6332ceef8e4`
- 19 tests complémentaires : `65493b155b798422806e44e649000a608e0d30f9`
- Tous les commits portent `[skip ci]` ; aucune fusion, PR, CI ou activation de `deferred`.

**Prochain lot borné :** rapprochement **en lecture seule** d'une ligne fictive déjà extraite d'un CSV/PDF bancaire avec une fraction `pending` ou `confirmed`, en préservant le sens, le compte, la devise, la provenance (document/ligne) et l'interdiction de confirmer/ajouter automatiquement des opérations. Ajouter les simulations de collisions inter-imports et de changements de ligne après revue. Puis Node natif, base fictive et Safari avant intégration.
