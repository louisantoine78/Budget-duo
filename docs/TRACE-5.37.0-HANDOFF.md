# TRACE 5.37.0 International — relais inter-conversations

> **Document de reprise synthétique, maintenu sur la branche candidate.** Lire ce fichier **au début de chaque nouvelle conversation de développement**, puis contrôler l'état réel sur GitHub. Mettre à jour **ce même fichier** à la fin de chaque lot terminé. Pour le détail historique consulter `docs/TRACE-5.37.0-INTERNATIONAL-AUDIT.md` et le code.
>
> État établi le **23 octobre 2026**, sur le commit **`d6f350a197b35df25076c478256b98f6ee6dc97f`** avant création de ce relais. À chaque reprise, **résoudre la dernière SHA de branche plutôt que supposer ce commit encore en HEAD**.

## Sources de vérité et sécurité absolue

- Dépôt : **`louisantoine78/Budget-duo`**.
- **Seule branche autorisée en écriture : `trace-5.37.0-international-accounts-fx`**.
- `main` stable 5.36.5, dernière référence contrôlée : **`02c70f50e7e51da79b77a91dde96a03c6c719909`**. Ne pas modifier `main`, ne pas créer de PR/fusion, ne pas déployer Vercel, ne pas basculer l'index actif, manifest/service worker ou `trace-version.json`. Ne pas lire ni écrire de données financières réelles Supabase, ne pas modifier de schéma. Ne pas réactiver les rapports/actions PickPoint.
- Commits **`[skip ci]`** systématiques. La CI `.github/workflows/trace-regression.yml` vise **`main` uniquement** ; ne pas lancer les workflows sans autorisation.
- `vercel.json` désactive le déploiement automatique de la branche candidate. Le labo `trace-international-preview.html` utilise des données fictives et ne doit pas devenir la production.
- Préserver intégralement le comportement et les données historiques 5.36.5 : aucune remise à zéro, aucune suppression ou fusion automatique de doublons, aucune reclassification de paiements internes en revenus/dépenses, aucune équivalence implicite de devises 1:1.
- Sur toute opération financière : **montant bancaire natif prioritaire**, devise du compte, montant réel de chaque jambe de virement, taux historique daté/source traçable, budget CAD historique **figé**, centimes exacts, solde inconnu jamais présenté comme zéro, statut `pending` jamais assimilé à `confirmed`.
- Priorité **Safari iPhone / PWA** et UX propre à TRACE, **cinq onglets** : Accueil, Budget, +, Activité, Patrimoine. Préserver les catégories Revenus / dépenses fixes / variables et les filtres Moi / partenaire / Couple.

## Fonctionnalités validées au niveau du besoin

1. Multi-comptes, multi-pays (CA/FR/autres), devises CAD/EUR/USD/GBP/CHF extensibles ; courant à débit immédiat, courant et carte de crédit, débit différé.
2. Compte principal et liquidité estimée : comptes courants moins dette de cartes liées ; vue tous comptes et vue Couple ; épargne/placements distincts de la trésorerie.
3. Multi-devises : montants natifs et montant d'achat original, taux date/source, pas de taux inventé ; virement CAD↔EUR avec montants effectivement débités et reçus et frais inclus.
4. Budget réel / prévisionnel, catégories fixes/variables/revenus, analyses 12 mois ; avances et remboursements nominatifs, dépenses partagées, plusieurs proches sur un achat, remboursements partiels/complets.
5. Import journalier par capture/OCR/CSV ; relevé PDF **mensuel avant tout pour vérifier l'exhaustivité et rapprocher des opérations déjà saisies**, **jamais** pour recréer automatiquement des dépenses.
6. Patrimoine : afficher **Épargne et Placements en premier**, puis patrimoine net ; ne jamais couper le « e » de « Patrimoine » sur la navigation mobile.

## État du code au 23 octobre 2026

**Développé et testé de manière isolée ou partiellement intégré :**
- `trace-international-1.0.0.js` : moteur montants bancaires natifs, devises, taux datés, conversions, transferts ; `trace-international-ui-1.0.0.js` + `v5-app-5.37.0.js` : intégrations candidates comptes, éditeurs, soldes et compte principal.
- `trace-smart-inbox-3.5.0.js` : import candidat ; CSV français et canadien, vérifications centimes, provenance des lignes, contrôles de doublons et revue humaine. Pas de suppression automatique.
- Partage/débiteurs : `trace-friend-debtor-ui-1.0.0.js` et mécanismes candidats pour avances / paiements carte / remboursements de proches.
- `trace-statement-reconcile-1.0.0.js` : **moteur de comparaison mensuelle en lecture seule**, compte, sens, montant natif, date, distinction des doublons, paiement de carte neutre budgétairement.
- `trace-statement-evidence-1.0.0.js` : **préparation et contrôle humain des lignes PDF déjà extraites** (page/ligne/extrait, identités du document, blocage si lignes/compte/période modifiés). **Ce n'est PAS un lecteur PDF**. Modules documentaires non câblés à l'app.
- `trace-deferred-debit-1.0.0.js` : **simulateur isolé** : achat à date d'achat/date budgétaire, échéance, règlement confirmé du lot complet ; le règlement n'ajoute aucune dépense. Rejette les règlements partiels, les remboursements et les frais non modélisés. **Pas câblé à l'app** : l'option carte différée reste **`disabled`** dans `v5-app-5.37.0.js`.
- `trace-international-preview.html` et fixtures fictives : laboratoire indépendant sans Supabase réel, non déployé.

**Incomplet ou non validé :**
- Intégration financière réelle et parcours complet du **débit différé**, notamment règlements partiels, frais, remboursements et concordance avec imports.
- Lecture réelle de PDF/OCR bancaire mensuel multi-pages, vérification de couverture des pages, solde de départ/fin et UX de revue.
- Parcours finaux des cinq onglets et intégration épargne/placements internationaux ; UX Safari tactile, PWA hors ligne, édition et imports réels fictifs.
- Tests bout en bout avec base **fictive isolée** et utilisateurs multiples, contraintes de concurrence côté serveur, vérification HTTP des taux Valet de la Banque du Canada.
- Réexécution **native** des tests `node` dans un vrai checkout, véritables tests navigateur/Safari et CI. Des essais de `git clone` dans le conteneur précédent avaient échoué à cause de la résolution DNS : **ne jamais décrire les tests V8 simulés comme des exécutions natives**.

## Dernière campagne QA vérifiée

Sur le commit candidat précédant la création de ce fichier : **32 suites, 633/633 contrôles réussis en harnais JavaScript V8 avec modules Node et DOM simulés**, dont :
- 5 suites historiques TRACE 5.36.5 : **232/232** ;
- 25 suites International : **386/386** ;
- 2 suites laboratoire/boot fictifs : **15/15** ;
- suite spécialisée du débit différé : **35/35** (incluse dans les 386).
- La tentative initiale de regroupement a rencontré une erreur de transport puis une limite d'appels, **mais les suites restantes ont finalement été relancées par petits groupes** et les 633 tests exécutés. Aucune CI réelle, Safari réel ou données réelles.

Dernier commit du lot précédent : `d6f350a197b35df25076c478256b98f6ee6dc97f`. Main inchangée. Consultez les dernières sections de l'audit pour la chronologie.

## Ordre de travail recommandé (sans précipiter la livraison)

1. **D'abord audit court et git :** lire ce document et le dernier segment d'audit ; vérifier HEAD candidate/main, branches, auto-déploiement, fichiers touchés, garde-fous et tests existants. Réconcilier toute information périmée avec le code réel.
2. **Poursuivre phase 1 :** fermer les trous comptables avec cas fictifs ciblés avant toute intégration : débit différé (remboursements commerçant, frais, règlements partiels/écarts), double-comptage, paiements carte, avance proche, FX exact, soldes.
3. **Raccorder progressivement les fonctions candidates** à l'application, **sans modifier les points d'entrée production** ; conserver les gardes tant que les parcours ne sont pas validés.
4. **Terminer l'UX mobile** Accueil/Budget/+ /Activité/Patrimoine selon les arbitrages existants ; éviter tout chantier destructeur/redesign global non validé.
5. **Valider réellement** en Node, navigateur iPhone, PWA offline et base fictive multi-comptes. Lever tous les blocages **avant** de solliciter une autorisation explicite de fusion/déploiement.

## Protocole pour éviter la limite de conversation

**Une conversation = un lot borné, pas toute la version 5.37.0.** Travailler par étapes de 1 à 3 problèmes apparentés, avec modifications vérifiables en petits commits. À la fin de **chaque lot**, dans cet ordre :

1. Rejouer les tests adaptés ; distinguer **simulé / natif / navigateur** ; dire clairement ce qui n'a pas pu être exécuté.
2. Commiter toutes les modifications sur la candidate avec `[skip ci]`. Ne pas laisser de code non sauvegardé en tant que seul résultat.
3. Mettre à jour **ce document** : branche, commit HEAD, progrès/régressions, QA exacte, difficultés restantes, prochain lot concret. Mettre à jour l'audit complet si un diagnostic technique significatif apparaît.
4. Répondre avec les SHA réelles et le prochain objectif, **sans prétendre que le travail continue automatiquement entre conversations**.
5. Commencer la conversation suivante avec « Lis `docs/TRACE-5.37.0-HANDOFF.md` sur la branche candidate, vérifie le HEAD et exécute le prochain lot » ; ne pas resservir l'intégralité des échanges précédents.

**À faire immédiatement dans la prochaine conversation :** vérifier l'état GitHub et choisir un petit lot de sécurisation du débit différé, notamment **règles et simulations de remboursements/frais/règlements partiels**, sans activer l'option dans l'app. Terminer le lot, tests, commits, et mise à jour du présent relais. Aucune fusion ni déploiement.


## Mise à jour après relais — lot remboursements commerçants (23 octobre 2026)

- Branche candidate vérifiée avant lot : `e975beb7f5239ad79fa365721edcdfdd9dcf1e7d`; `main` stable vérifié : `02c70f50e7e51da79b77a91dde96a03c6c719909`.
- Implémenté **uniquement dans le moteur isolé** : remboursement commerçant confirmé avant échéance, avec date et montant natif au centime ; diminution de dette carte et compensation de dépense budgétaire sans mouvement du compte courant ni revenu ; remboursement `pending` sans impact, contrôles de doublons et trop-perçu. Fix `-0` sans paiement.
- Règlements partiels, frais, remboursements post-règlement/post-échéance et FX différé restent **refusés**. Aucun câblage UI, aucun import ni déploiement, `deferred` toujours désactivé.
- **QA exécutée : 48/48 scénarios de la suite `tests/trace-international-deferred-debit.test.cjs` en environnement V8 simulant `require`/modules Node.** La suite comptait 35 tests précédemment. Pas de vrai Node CLI, aucune autre suite rejouée dans ce lot ; le 633/633 antérieur reste historique, pas actualisé.
- Commits de ce lot : moteur `bea4f0d392ef382e50c8c83b1f4941d7c94d22e4`, tests `6c7cb6310241f0186e6c2bb6f14ddc1b7e4c3824`, journal d'audit `13107d2b35a37c35e3543e993c67c3f596510f21`; tous `[skip ci]`.
- **Prochain lot concret :** frais de carte et frais de règlement, analyse des règlements partiels avec rapprochement/import ; travailler avec données fictives, maintenir les blocages si les règles ne sont pas sûres. Rejouer les tests Node natifs dès qu'un checkout fiable est possible, puis les autres suites.
- **SHA HEAD :** lire le HEAD de GitHub après chaque modification du présent relais : un document ne peut pas contenir sa propre SHA de commit de manière stable.


## Mise à jour du 23 octobre 2026 — frais carte différée (lot suivant)

- **HEAD initial de ce lot :** `41dc7a7a52fc84552342deb01ee5626b549bc519`; `main` toujours `02c70f50e7e51da79b77a91dde96a03c6c719909`. Récupérer le HEAD actuel lors de la prochaine reprise.
- Ajout isolé de `fees` : événements `card_fee` explicites et confirmés, devise native, dates `chargeDate/budgetDate/dueDate`, montant total centime, dette carte et dépense budgétaire uniques ; `pending` sans effet comptable. Règlement complet référencé par `purchaseIds + feeIds` : transfert bancaire interne neutre pour le budget.
- Lots sans achat mais avec frais confirmés désormais possibles ; aucun taux inventé. Remboursements commerçants antérieurs et frais confirmés se compensent selon leurs montants réels. Frais et taxes implicites ou données inconnues rejetés.
- **Toujours bloqués :** paiement bancaire partiel, règlement multi-échéance, frais supplémentaires sur compte courant, FX complexe, ligne bancaire importée non rapprochée. `deferred` désactivé ; pas de connexion application/UI, CI, production, Supabase réel ou déploiement.
- QA **exécutée sur fichiers candidats avant commit** : **65/65 tests V8 avec Node/DOM simulés** dans `tests/trace-international-deferred-debit.test.cjs` (48 historiques dans cette suite + 17 nouveaux). Aucun vrai Node CLI, aucune des 31 autres suites rejouée dans ce lot, aucun Safari/CI ; 633/633 simulés reste un chiffre historique d'avant ces nouveaux changements.
- Commits : moteur `1141b9e915fd1cfb97330d982805b5396a018305`, tests `f978bc1850433cc068ca6f03ddb113430005f659`, audit `6855581d32cdcdea8bd250e57e52586e75644bc1`, tous `[skip ci]`. Le dernier commit est celui du relais ci-dessous ; une SHA ne peut pas être contenue dans le commit qui la calcule.
- **Prochain lot concret :** définir un paiement partiel justifié par un montant bancaire réellement identifié, rejeter l'allocation implicite, préserver le budget ; enrichir ensuite le rapprochement avec import fictif. Test du vrai Node à prioriser dès que les sources GitHub peuvent être récupérées par un checkout fiable.


## Mise à jour — lot règlements partiels différés (23 octobre 2026)

**HEAD initial avant ce lot** : `9c2805b9a23e7d7eb3e28e87423ab2c015784244`. `main` vérifiée inchangée : `02c70f50e7e51da79b77a91dde96a03c6c719909`.

- Moteur `trace-deferred-debit-1.0.0.js` **toujours isolé** : fractions `settlementMode:'partial'` admises uniquement avec allocation explicite à une échéance et `bankEvidence` (document/ligne/compte courant/devise/date/sens/montant/statut/revue humaine). Contrôles d'ID de ligne dupliqué, réserve des paiements `confirmed` et `pending`, rejet de surpaiement, d'allocations entre échéances, de frais ou taux implicites. Règlements complets antérieurs rétrocompatibles.
- Les sorties donnent le payé, restant et en attente par échéance ; le retard est recalculé sur le **solde restant**. Paiements confirmés = transfert courant→carte **neutre dans le budget** ; `pending` = aucun changement de dette/trésorerie.
- **L'élément `bankEvidence.reviewed:true` reste une déclaration client fictive, jamais une authentification bancaire ni un rapprochement d'import réellement vérifié.** Aucune contrainte transactionnelle serveur n'est encore branchée.
- **QA : 84/84 contrôles V8 avec modules Node simulés**, soit 65 anciens + 19 nouveaux. Pas de vrai Node CLI, CI ni Safari ; les autres 31 suites non rejouées pendant ce lot. La référence globale historique 633/633 n'est pas un bilan nouveau.
- Commits `[skip ci]` du lot : moteur `aaa66fa00461c0c6ead0ea89856eb6332ceef8e4`, tests `65493b155b798422806e44e649000a608e0d30f9`, audit `f1c5696cee6ff801bcfa27cee0f4e3279580d921`. Après mise à jour du présent relais, **relire HEAD réel sur GitHub** plutôt que deviner sa SHA propre.
- **À faire ensuite :** audit/outil isolé de **correspondance en lecture seule** d'une ligne bancaire déjà structurée avec une fraction de règlement, gestion des imports répétés et preuves périmées. Aucun mouvement créé/confirmé automatiquement. Tester les cas fictifs, continuer la sécurisation de la phase 1. Ne pas modifier `main`, la CI, la PWA, Supabase réel, ni déployer.


## Dernier lot — correspondance des lignes bancaires pour fractions différées (23 octobre 2026)

- **Branche unique :** `trace-5.37.0-international-accounts-fx`. Départ `a46755d0370d2f62d70cd950ba5c770c4126c119`; `main` inchangée `02c70f50e7e51da79b77a91dde96a03c6c719909`.
- Nouveau **module autonome, isolé et READ ONLY** : `trace-deferred-bank-review-1.0.0.js` compare les règlements partiels déjà présents avec des lignes **CSV/PDF déjà structurées**. Pas de lecture PDF/CSV brut, pas de vrai compte, pas de Supabase, pas de connexion à la PWA. Correspondance par source documentaire et ligne, compte courant, devise native, montant centimes, date exacte, sens débit et statut. Une comparaison n'est jamais une confirmation automatique.
- Rejets/signalements : ligne réutilisée pour deux paiements, ID de règlement dupliqué, import répété (même source physique/ligne), document déclaré incomplet, mouvement `pending`, ligne absente ou incohérente, changement de n'importe quelle ligne du document après revue. `reviewSnapshot` permet une **empreinte JSON exacte client** de la totalité du document et du règlement : non cryptographique, non authentifiée et non verrouillée côté serveur. `manual_review_current` n'est PAS une certification bancaire.
- **QA effectivement rejouée depuis les sources GitHub** : nouveau module **27/27**, moteur débit différé précédent **84/84**, plus **1 scénario composé** achat 40 EUR / paiement 12,35 EUR / dette 27,65 EUR sans dépense supplémentaire. **V8 JavaScript avec `require/fs/path/vm` simulés**, ni Node CLI natif ni navigateur/Safari. Les 31 autres suites n'ont pas été rejouées ; le total 633/633 d'une ancienne campagne ne s'applique pas tel quel à HEAD.
- Code `5b6858360db91c24aba5b907d95a6be095eaf791`, tests `151d6206c31c04cbfb5a75f173d3eae982a33cf8`, audit `97c2519fdaf300402b0a8b8b73e7c27b4a4aafdd`. Chaque commit est marqué `[skip ci]`. Aucune fusion, PR, changement de `main`, CI, déploiement, Supabase réel, migration ni activation de la carte différée.
- **Prochain lot concret** : sécuriser idempotence et provenance multi-imports, puis écrire/valider le contrat isolé entre le comparateur de règlements différés et le module d'import intelligent. Priorité au test Node CLI sur fichiers d'un vrai checkout lorsqu'il est accessible, ensuite tests d'intégration fictifs et Safari iPhone. L'entrée `deferred` reste désactivée.
- **HEAD :** relire la branche GitHub après ce commit de relais (un commit ne peut référencer sa propre SHA de façon fiable).


## Dernier relais — préversion fonctionnelle fictive, débit différé interactif (23 octobre 2026)

- **But immédiat :** rapprocher la 5.37.0 d'une bêta testable, sans confondre préversion fictive et production financière. L'utilisateur a demandé d'avancer le déploiement ; cela s'est traduit **uniquement** par un déploiement **Preview** Vercel du projet indépendant `trace-v5-preview`, jamais par une modification de `main`.
- La candidate, qui était au commit `bccbca51c49b524a4fe6e46bd6a0006a7c003de6`, a reçu une **interface interactive strictement en mode labo** sur la page `trace-international-preview.html`, sous **Activité → Importer**. Elle charge `trace-deferred-debit-1.0.0.js`, `trace-deferred-bank-review-1.0.0.js` et `trace-deferred-lab-ui-1.0.0.js`, simule achat EUR 40, paiement fractionné au centime, frais, remboursement, pending et revue d'une ligne de relevé fictif.
- Commits `[skip ci]` : interface `96e6a0e48ca53de254368f0fef7d2769d29ca04d`, suite UI `4b800871ab05445d38408fb555baf64ff3fbf3eb`, raccordement de **la page labo uniquement** `820f0058c560216fdd94c003de4adaf338974206`, audit `9e9041d80d8ccf382a8ca1b404314ef5f976b3b3`. Aucun changement `index.html`, `v5-app-5.37.0.js`, `sw.js`, manifest, Auth, Supabase ou données réelles. `deferred` reste désactivé dans la vraie application.
- Vérification après lecture des fichiers GitHub : **10/10** nouveaux tests UI fictifs + **84/84** moteurs + **27/27** rapprochement = **121/121 tests V8 simulant modules Node**. Pas de Node CLI natif, navigateur ni vraie validation iPhone ; campagne globale de régression historique pas relancée.
- Le déploiement initial **avant ajout UI** vers `trace-v5-preview` est `dpl_B3miyL7HUqp4QdTPj24TWA6SHQs9` au commit `bccbca5`, état **READY** ; la page est potentiellement protégée par authentification Vercel. Inspecter le dernier déploiement Vercel après ce relais pour obtenir l'URL au commit actualisé, et la vérifier avant d'affirmer qu'elle est accessible.
- **Prochain chantier concret de production :** auditer l'intégration directe dans le flux Activité/import intelligent du modèle différé avec écritures sûres, sécuriser double comptage/frais/règlements partiels sur une base totalement fictive, compléter UX des cinq onglets, exécuter Node/CI et navigateur Safari. L'objectif est une 5.37.0 fonctionnelle et sûre ; ne pas réactiver `deferred` prématurément.
- **Prochaine reprise :** toujours lire ce relais et vérifier HEAD GitHub. Ne jamais déployer vers `main` ou prod sans tests et autorisation spécifique.


## Livraison de la préversion fictive — contrôle Vercel (23 octobre 2026)

- Projet Vercel **`trace-v5-preview`**, projet ID `prj_NvXLdQg1KAmDlcYzdjNhFpYls0Bj`, déploiement `dpl_7Tk3K4nYzYbz1rGp1eLCb17TDsLA`, **READY** vérifié par l'API Vercel, target **Preview** (`null`, pas `production`).
- **Commit réellement déployé :** `5989f220492d1bd2fa6bf9576cf773129f94e413` sur la candidate. URL : https://trace-v5-preview-g9oqwi2ok-lambotla-1719.vercel.app/trace-international-preview.html
- Accès protégé par **Vercel Authentication/SSO** sur le projet. L'API confirme le build READY mais la navigation externe n'a pas pu charger la page protégée : **aucun test navigateur de cette URL, ne pas annoncer Safari/iPhone validé**. L'utilisateur peut devoir se connecter avec son compte Vercel.
- Le build inclut l'interface de laboratoire du débit différé. **Aucun déploiement de `main`, aucun domaine de production modifié, aucun accès à Supabase réel**, aucune migration. `deferred` reste désactivé sur le parcours de création réel.
- **Important :** le(s) commit(s) documentaires enregistrant cette URL peuvent avancer le HEAD candidat au-delà de la SHA du build Vercel ; les seuls changements supplémentaires sont documentaires et ne sont pas déployés automatiquement (branche candidate désactivée dans `vercel.json`).


## Nouveau relais — préparation finale préproduction, 23 octobre 2026

- **État des lieux réellement constaté** : le déploiement précédent `trace-v5-preview`, commit `5989f220492d1bd2fa6bf9576cf773129f94e413`, est `READY` sur Vercel. La branche avait avancé à `33366fcbaab07ee827db329047d5b38957c6f198` pour la documentation uniquement, `main` reste `02c70f50e7e51da79b77a91dde96a03c6c719909`.
- Sur la **branche candidate uniquement**, `v5-app-5.37.0.js` corrige les éditions dangereuses des dépenses en devise étrangère : le nom et la catégorie peuvent être modifiés quand la dépense est confirmée et le compte appartient à l'utilisateur ; tous montants natifs/CAD, dates, taux historiques et répartitions sont préservés, sinon blocage explicite. `deferred` réel toujours désactivé.
- Commits `[skip ci]` : code `1fa6293ca3f820cc9b157676d8dbcae589bedb73`, tests `649a15ad664a165383abdd0618e592c1260a4bec`, checklist `105a0785d344c8deae88c34aa129df11340a3965`, audit `2eace718de6e9d173d4994555164c6685b08af62`.
- **Tests V8 à modules Node simulés** exécutés : nouvel éditeur 12/12, câblage 7/7, intégrité labo 8/8, boot application fictive 7/7, invariants financiers 19/19 (**53/53**). Ni tests Node CLI réels ni Safari/CI ni base de données distante ; **ce n'est pas** une certification générale 5.37.0.
- **NOUVELLE SOURCE DE VÉRITÉ DES BLOQUANTS :** `docs/TRACE-5.37.0-RELEASE-CHECKLIST.md`. Toutes les portes production restent ouvertes : implémentation comptable différée dans grand livre réel, validation FX/import/partage, base de données fictive isolée, tests natifs et navigateur iPhone, SW/manifest/version/rollback, acceptation release.
- **Préversion à actualiser** manuellement via Vercel sur le HEAD candidat après commit de ce handoff et vérifier READY/commit. Ne pas modifier le domaine de production ni `main`.


## Préversion actualisée sur Vercel — 23 octobre 2026

- **Déploiement Vercel confirmé READY**, projet indépendant `trace-v5-preview`, ID `dpl_7QtLTNPtDzAoyLdfH37Q2fTER7AM`, URL **https://trace-v5-preview-delmx4spz-lambotla-1719.vercel.app/trace-international-preview.html**. Target Preview (API Vercel `target:null`), **pas production**.
- **SHA déployée vérifiée** `2c312f0021d2df92d3fb98e906c169cc76f82698`, candidate `trace-5.37.0-international-accounts-fx`. Elle inclut `v5-app-5.37.0.js` mis à jour pour l'éditeur **libellé/catégorie des dépenses étrangères confirmées**, le laboratoire de débit différé, les nouveaux tests et la checklist de release.
- **Main** `02c70f50e7e51da79b77a91dde96a03c6c719909` et production 5.36.5 préservés. Aucun changement de `index.html`, du service worker, du manifeste, aucun vrai compte Supabase contacté, aucune CI exécutée, aucune donnée réelle modifiée. Les données de la préversion restent fictives et la CSP coupe le réseau.
- Le projet est protégé par **Vercel Authentication/SSO**. `READY` atteste le build Vercel, mais **pas** la réussite d'un test de navigation sur Safari. L'utilisateur devra potentiellement ouvrir le lien connecté à Vercel.
- **Série QA du lot** : 53/53 contrôles V8 simulés ciblant édition, câblage, boot de la preview et garde-fous financiers. Les 121 tests ciblés précédents sont historiques au commit précédent et ne remplacent pas une campagne complète sur HEAD.
- **Prochain point de reprise impératif :** la checklist `docs/TRACE-5.37.0-RELEASE-CHECKLIST.md`. Priorités : intégrer sans régression le débit différé et les imports au vrai modèle de transactions **sur données fictives isolées**, puis faire les tests Node natifs et un vrai parcours Safari iPhone, avant de demander l'accord pour la production.
- **Remarque :** ce commit documentaire fait avancer HEAD après le déploiement confirmé `2c312f` mais **ne change aucun JavaScript ni le HTML déployé** ; ne pas confondre un décalage SHA documentaire avec une différence fonctionnelle.


## Référentiel validé des 5 onglets — audit de parité UX (23 octobre 2026)

**IMPORTANT :** après confrontation du cahier de reprise validé aux fichiers de la candidate/preview, **l'UX 5.37.0 n'est PAS entièrement intégrée**. Arrêter d'annoncer « cinq onglets finalisés » ou de considérer le succès des tests du moteur comme une validation du rendu. La **source opérationnelle d'acceptation** et de l'ordre des changements visuels est désormais **`docs/TRACE-5.37.0-UX-VALIDATED-GAP-AUDIT.md`** (créée au commit `dc00ae40e8aa43c2203ee3e1a96ffda0393e511e`).

**Écarts concrets :** Accueil commence par Disponible puis Solde en grille au lieu de Solde puis Disponible ; vrai panneau Comptes et confirmation/étoile du principal incomplets. Budget conserve correctement 3 familles + année, mais accès Activité filtrée et présentation à finir. Activité affiche seulement Transactions/Importer, journal non groupé par jour, partage complet encore dans une modale depuis Accueil, filtres et PDF mensuel intégrés incomplets. Patrimoine commence par Patrimoine suivi/Comptes, pas Épargne/Placements puis net ; épargne liée encore limitée à CAD. Navigation a 5 onglets, mais Safari n'est pas validé et Patrimoine ne doit jamais se couper.

**Ordre de livraison** : conformité visible Accueil/Patrimoine, navigation Compte/Budget → Activité, nouvelle structure Activité/Partage puis intégration financière/imports, tests complets et iPhone. Ne pas réouvrir les choix déjà validés. Les dates, les devises et les calculs historiques doivent rester intacts.

**Sécurité** : aucun code modifié lors de ce seul audit ; ne pas déployer ni toucher à `main`, données Supabase réelles, CI ou PickPoint. À la prochaine reprise, commencer par ce document en plus du présent handoff et de la checklist de release.


## Lot candidat livré — premier passage premium Accueil & Patrimoine (23 octobre 2026)

**Nouvelle étape concrète** : le visuel premium a commencé à être développé, pas seulement planifié. **Pas de déploiement**, ni Vercel ni production. L'ancien lien preview Vercel reste sur `2c312f0021d2df92d3fb98e906c169cc76f82698` et ne montre PAS encore ce lot.

- Accueil : premier bloc **Solde estimé**, deuxième **Disponible sur mon budget**, section **Ce mois-ci**, puis **À faire**, **Budget en direct**, **Évolution**, **Partage**, dans cet ordre exact. CSS mobile premium : solde prioritaire, cartes douces, hiérarchie renforcée, typographie montants, boutons focus.
- Patrimoine : **Épargne**, **Placements**, ensuite **Patrimoine net accessible**, puis **Trésorerie et comptes**. `renderWealth` distribue les comptes épargne/placements dans les grilles correspondantes ; banques et dettes restent en bas. Épargne liée CAD inchangée sur le plan financier, aucune fausse conversion ajoutée ; état incomplet explicite si taux/solde inconnu. Navigation : libellé `Patrimoine` non coupé par règle CSS.
- Commits `[skip ci]` : `3a3e1c3444ddc24d37d29de6246773fa59541c3c` HTML, `74ef4cbd05b297b03abf9b83d0879be343d3fbc7` CSS, `0cef178a6e8deda9d93995128e70aec7e111fe71` JS, `71dfeed32ef01b79484e2de7c45c9b30d961e7b5` tests, `e7a26786bb9a154dcf99c0cca3056f2a7b6d847c` audit UX.
- QA **66/66** contrôles des 6 suites ciblées V8 simulées relancés **après persistance GitHub** ; suite UX neuve 13 tests, bootstrap 7, UI 12, lab 8, câblage 7, finance 19. **PAS** Safari/Node natif/CI/régression complète. Main demeure `02c70f50e7e51da79b77a91dde96a03c6c719909`.
- **Source opérationnelle :** `docs/TRACE-5.37.0-UX-VALIDATED-GAP-AUDIT.md` actualisé ; la structure/UX restante est listée précisément et n'est pas finalisée.
- **Prochain lot prioritaire** : panneau **Mes comptes** complet depuis Accueil, fiche compte avec 2 transactions récentes et lien vers Activité filtrée, choix du compte principal avec étoile et confirmation explicite ; puis navigation des catégories Budget, structure Activité/Partage, et la finition premium de tous les onglets.
- **Interdits toujours actifs :** modification `main`, production, migration et données Supabase réelles, CI, PWA de prod, PickPoint ; ne pas déployer automatiquement. Activation débit différé réel toujours bloquée.


## Nouveau relais du 23 octobre — Mes comptes et historique filtré

**Code candidat effectivement commité** : bouton « Comptes et trésorerie » depuis Accueil, panneaux de comptes Moi/Couple et fiches individuelles lisibles (solde natif, CAD indicatif ou indisponible, pays/devise/titulaire, carte liée, dernier rapprochement, 2 opérations). « Voir toutes les opérations » ouvre **Activité avec un filtre Compte et le mois du mouvement le plus récent**. Le principal est étoilé et **toute sélection depuis Accueil ou Profil requiert confirmation explicite**, annulation sans écriture, restauration si sauvegarde échoue. Aucun montant historique/FX/compte ne change automatiquement lors de cette navigation.

**SHAs** : JS `f828e2aa511855c841fb08011076c7c686d757ca`, HTML `081c377f273745ec692061000039fec5bcdccc20`, CSS `2c2ffd0b9c2856eb88468677b18f89e3ceafa9e8`, fix DOM `d76caeef60c1c735d8f544c71e5f01da07083041`, adaptations tests `09f0a416cdf9d7b3c6b8bdd6ac784d60d7ca994e`, `fedb95648e808139820b4c99f0f67cc2598b0ad0`, `73888f6a9b9082473b584d28f437d0ec10c775bd`, tests neufs `33590906ca459f39b9c10f15b895a70765025428`, audit UX `dac52a58c526015ac54b01859b799919614cf03d`. Tous `[skip ci]`.

**Tests relus et rejoués sur les fichiers GitHub après commit : 80/80 en 7 suites V8 à modules Node/DOM simulés**, pas de Node CLI ni Safari, CI ni vraie base. Dernier déploiement Vercel reste l'ancienne candidate `2c312f0021d2df92d3fb98e906c169cc76f82698`; **aucun nouveau déploiement demandé ou exécuté**, la préversion externe ne contient pas encore ces avancées.

**Prochain lot** : développer Activité, historique regroupé par jour et filtres avancés ; lier les détails du Budget aux transactions préfiltrées ; organiser Partage Couple/Proches. État détaillé dans `docs/TRACE-5.37.0-UX-VALIDATED-GAP-AUDIT.md`. Ne pas réactiver cartes différées réelles. Ne pas toucher `main` `02c70f50e7e51da79b77a91dde96a03c6c719909`, Supabase réel, PWA prod, déploiements, CI ou PickPoint.
