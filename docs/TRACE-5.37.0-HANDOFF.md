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
