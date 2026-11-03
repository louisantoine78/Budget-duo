# TRACE 5.37.0 — Point de reprise vérifié le 3 novembre 2026

## Source de vérité et restauration
- Dépôt : `louisantoine78/Budget-duo`.
- Branche candidate exclusive : `trace-5.37.0-international-accounts-fx`.
- HEAD retrouvé et vérifié le 3 novembre : `0ab054c73ecc6f258c05e7624a848dccea04f1a3`.
- Tree du HEAD initial : `e7664a08efbeccc34fe5499654183ebd8cb8a777`.
- Sauvegarde indépendante créée avant toute modification : `backup/trace-5.37.0-2026-11-03-0ab054c`, pointant sur `0ab054c73ecc6f258c05e7624a848dccea04f1a3`.
- Branche stable `main` : ne pas modifier ; version stable 5.36.5.
- Tous les commits candidats portent `[skip ci]`; ne jamais utiliser de force push, de migration Supabase réelle ou de données personnelles pour les tests.
- Après ce checkpoint, **relire le nouveau HEAD GitHub**, qui avance à chaque commit ; ne pas confondre un SHA de restauration avec le nouveau HEAD.

## Prévisualisation du formulaire simplifié retrouvée
- Projet Vercel isolé : `trace-537-iphone-lab`, SSO activé.
- Déploiement READY confirmé pour `0ab054c73ecc6f258c05e7624a848dccea04f1a3` : `dpl_D35vFGHzJvYNPVAchC69dzNfJyMn`.
- URL de ce déploiement immuable : https://trace-537-iphone-7k1eb1z1j-lambotla-1719.vercel.app/trace-international-preview.html
- Ce laboratoire contient des **données fictives et des taux FX simulés**, pas de compte bancaire réel ni de synchronisation Supabase. L'URL ci-dessus reste le point de comparaison de l'interface au SHA initial.

## Décisions UX et financières à ne pas perdre
- Formulaire d'ajout mobile : compte bancaire, quatre onglets visibles Dépense / Argent reçu / Virement / Épargne, description, montant + devise sur la même ligne, date, catégorie et répartition selon la nature du mouvement.
- Véritable bordure de section et de l'onglet sélectionné ; un seul contour pour le sélecteur bancaire ; garder la navigation accessible et les 44 px tactiles.
- Conversion affichée automatiquement en second plan : montant en devise du compte, taux, date d'observation, source et date d'opération. Taux de démonstration clairement étiquetés sur la preview ; taux datés et sourcés requis dans les vrais flux.
- Montant effectivement prélevé facultatif, rendu accessible si l'estimation diffère ; aucune écriture budgétaire ou bancaire sur le simple fait de consulter le formulaire ou de l'annuler.
- Ne pas créer de conversion 1:1 fictive lorsque le taux manque ; pas de double comptabilisation lors du règlement de carte et des transferts ; respecter le débit différé FR, les cents, CAS/RLS, CSV/PDF et rapprochement.
- Conserver les exigences d'Accueil (solde + reste budget, comptes subtils visibles), de Budget (année en clair, catégories complètes), d'Activité (filtres accessibles et sobres) et de Patrimoine (valorisations expliquées). Réduire la densité sans retirer les fonctionnalités.
- Style TRACE premium, sobre, adulte, avec Tricount comme référence d'intuitivité, jamais une copie de son identité.

## Travail de continuité de cette reprise
- Branche de sauvegarde indépendante créée sans altérer la candidate.
- Test navigateur renforcé dans `tests/trace-candidate.browser.cjs` pour **50 EUR saisis sur un compte CAD**, affichage d'une estimation avec taux et observation datée, possibilité de renseigner 78,35 CAD comme montant réel, absence de confirmation d'une estimation lorsque le débit est explicite et annulation sans écriture. Le test emploie exclusivement les fixtures de laboratoire.
- Aucun code de finance, de CSS ou de service worker n'a été modifié par ce checkpoint. **Ce nouveau test devra être exécuté** dans un environnement Chromium Playwright adapté : l'ajout de code de test et son contrôle statique ne sont pas une exécution navigateur.
- Les résultats antérieurs déclarés : 63 scénarios Chromium et 1 813 tests natifs sans échec, 30/30 WebKit premium et 105/105 prépublication, à rapprocher de leurs commits précis. Ne pas les déclarer rejoués sur le nouveau HEAD.
- Ne pas annoncer la release comme prête : Safari/iPhone physique sur le dernier formulaire, offline avec session protégée, workflow de restauration et qualification financière finale restent à valider.

## Séquence de reprise suivante
1. Vérifier le HEAD, la sauvegarde, le diff et l'intégrité de la candidate face à `main`.
2. Rejouer le test Chromium complété, les tests natifs, la suite PGlite isolée, WebKit et les portes de release sur le commit candidat exact. Aucun accès Supabase réel.
3. Faire valider par le propriétaire sur iPhone/Safari le formulaire du déploiement `0ab054c73ecc6f258c05e7624a848dccea04f1a3` : quatre choix, sélection de compte, 50 EUR vers CAD, taux/dates, correction du montant réel et retour sans enregistrement.
4. S'il y a un défaut constaté, correction ciblée sur la branche candidate uniquement ; tests et cache PWA régénérés si des assets sont changés ; nouvel aperçu Vercel isolé.
5. Continuer l'harmonisation Accueil / Budget / Activité / Patrimoine sans casser les comportements financiers ; pas de bascule production sans GO explicite.

**Statut : version candidate en validation — production NO-GO.**
