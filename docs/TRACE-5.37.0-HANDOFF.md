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
