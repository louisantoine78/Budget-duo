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
