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

## Finition du parcours de saisie du 3 novembre — devise identique / devise différente
- Correction UX minimale sur le formulaire manuel : lorsqu'une opération est dans la devise du compte (ex. 50 CAD sur compte CAD), masquer le bloc de conversion 1:1 et l'explication répétitive. Garder le montant, la date, la catégorie et les cadres.
- Si l'opération est étrangère (ex. 50 EUR sur compte CAD), conserver la contre-valeur estimée, le taux d'observation daté, sa source, la confirmation du montant estimé et la correction du débit réellement appliqué.
- Aucun calcul, ni écriture, ni modèle bancaire, ni flux FX n'a été modifié : seul le critère de visibilité des deux zones de pédagogie est ajusté.
- Tests Chromium ajoutés aux scénarios de saisie native et USD → CAD : masquage des détails pour une même devise et maintien des détails pour la devise étrangère.
- Les assertions statiques et la compilation JS ne remplacent pas l'exécution réelle des tests navigateur. Le protocole de validation sur le vrai iPhone reste ouvert.

## Nettoyage des libellés bancaires du 3 novembre — deuxième passe
- Le formulaire n'affiche plus la note technique « montant réellement débité » lorsque le champ réel reste secondaire : le texte était trompeur sous la saisie achat d'une carte CAD.
- Les comptes en CAD masquent la note bancaire de valorisation CAD et son explication, mais gardent le bloc de conversion et de correction facultative pour un achat en EUR/USD.
- Les comptes en EUR/USD/GBP/CHF conservent le champ de taux pour valoriser la référence de budget CAD, même si l'achat et le compte ont la même devise ; le champ est maintenant lié à son explication accessible.
- Ajout d'assertions navigateur ciblées ; aucune logique financière, calcul, RPC, règle de sauvegarde ni module de production modifié. Rejouer Chromium/WebKit avant toute mise en ligne.

## Protection UX après changement de compte vers une carte différée
- Si un ancien compte possédait une estimation FX en cours ou terminée et que le titulaire sélectionne une carte française à débit différé non libérée, toutes les anciennes informations de cotation sont effacées et les commandes de confirmation/correction sont masquées.
- L'écran réaffirme le mode « lecture seule » et le garde de sauvegarde existant demeure inchangé ; les jetons de requête FX invalident déjà les réponses asynchrones périmées.
- Scénario navigateur ajouté : cotation EUR sur compte CAD puis bascule vers la carte différée EUR ; vérifier absence de vieille provenance, de confirmation et d'écriture, et absence de requête réseau externe.
- Exécution navigateur complète encore requise sur le SHA candidat exact.

## 3 novembre 2026 — finition iPhone du montant de transaction et du compte
- Cause du défaut de sélecteur : la couche unifiée dessinait une deuxième flèche via ::after, superposée au chevron SVG déjà attaché au sélecteur natif. Un seul chevron conservé, espace droit 50 px, ellipse pour les libellés longs ; l'identifiant et les options bancaires restent identiques.
- Libellé « Montant de la transaction » ; récapitulatif « Montant estimé sur le compte » avec valeur lisible directement et signe ≈. En correction, « Montant réellement débité/crédité sur le compte », sans signe d'estimation.
- Case à cocher financière inchangée, mais libellé chiffré et actualisé « Confirmer 45,50 CAD » ; lien « Saisir le montant réellement débité/crédité » selon le sens de l'opération.
- Provenance, cotation, observation datée et éventuelle journée ouvrable précédente toujours présentes ; seule la phrase technique sur l'horaire de publication est retirée. L'aide à la conversion reste accessible par aria-describedby sans paragraphe visuel supplémentaire.
- Tests de régression Chromium candidats : viewport 320/390/768, absence double chevron, gouttière, troncature, pas de débordement, nouveau texte d'estimation et correction manuelle.
- Aucun changement des règles de validation bancaire, de rapprochement, des calculs, des RPC Supabase ou de production. Chromium, WebKit et Safari physique encore à exécuter sur le HEAD exact.

## 3 novembre — correction après préflight du laboratoire
- La compilation prévisualisation a révélé qu'un sélecteur CSS `display:none!important` était interdit par les tests de non-masquage des sélecteurs financiers de l'Activité.
- Le pseudo-élément décoratif ::after du champ bancaire utilise dorénavant uniquement `content:none!important` ; le vrai select natif et les contrôles Activity restent visibles et utilisables.
- Le scénario navigateur vérifie la propriété de contenu du pseudo-élément plutôt que son display.
- Nouvelle prévisualisation requise après régénération contrôlée du cache.

## 3 novembre — rapprochement prudent des dépenses étrangères et captures CAD
- Découverte : le détecteur générique exigeait une égalité des montants pour considérer deux achats semblables. Une dépense 25 GBP/45,50 CAD estimée pouvait donc sembler indépendante de sa capture bancaire réelle à 46,12 CAD.
- Ajout d'un détecteur **lecture seule** pour une unique dépense manuelle en devise étrangère sur un compte CAD, confirmée, de même jour, même libellé normalisé et dont le montant diffère de 15 % maximum. Ambiguïté, devise native, dates ou commerçants différents : aucune correspondance supposée.
- L'import capture montre « Estimation enregistrée / débit sur la capture », et un bouton « Ouvrir la dépense existante ». Il n'effectue aucune correction silencieuse.
- La validation du lot d'images relit les transactions vivantes et refuse dans ce cas de comptabiliser une deuxième dépense même si « doublon possible » a été sélectionné. L'utilisateur peut ouvrir et modifier explicitement l'opération initiale, puis réexaminer la capture.
- Test isolé : `node --test tests/trace-foreign-estimated-capture.test.cjs`. Les captures importées sous les autres parcours ne sont pas encore certifiées comme rapprochement automatique ; ne pas prétendre que la correction du débit et l'écriture de preuve sont automatisées.
- Aucun changement des formules de change ou écritures existantes, ni de la branche main.
