# TRACE 5.32.3 — Éditeur de transaction premium

## Périmètre
Refonte UI/UX uniquement de la feuille Modifier la transaction / Vérifier l’opération du parcours standard Dépense, Revenu, Remboursement. Aucun changement de données, de catégories, de règles métier ou de structure SQL.

## Conception
- En-tête compact, kicker MOUVEMENT BUDGÉTAIRE, bouton de fermeture plus discret.
- Trois cartes de saisie : Nature du mouvement (Type, Description) ; Détails de l’opération (Montant, Date, Catégorie) ; Compte et répartition (Compte, Pour qui, parts amis si nécessaire).
- Carte d’impact dédiée : mouvement bancaire, part personnelle, part du partenaire, total couple ; ligne des amis uniquement si nécessaire.
- Les montants reprennent directement le moteur TRACE Movement déjà en production, sans modifier le calcul ni la sauvegarde. Les erreurs de répartition sont signalées dans la carte.
- Bouton de requalification léger, puis CTA Enregistrer les modifications mieux hiérarchisé et actions Annuler/Supprimer discrètes.
- Barre d'actions collante en bas de la feuille. Champ date empilé sur mobile étroit pour éviter la troncature iOS. Styles limités à #sheetBackdrop.trace-premium-edit : aucun impact sur les autres modales.
- Tous les identifiants de champs/boutons, validations, confirmations, suppression et traitements onClick restent identiques. La classe de la feuille est nettoyée à chaque nouvelle ouverture pour éviter un style résiduel.

## Tests
- Parsing JavaScript réussi.
- Simulation du vrai contrôleur d’édition sur une opération fictive de 180,00 $ du 16/10/2026, catégorie voyage, compte courant, bénéficiaire couple à 50/50 : compte bancaire −180 $, budget LA 90 $, budget partenaire 90 $, budget couple 180 $.
- Vérification des 3 cartes de saisie, des 4 lignes d’impact, de tous les champs et des actions : réussie.
- Aucun test avec une session bancaire réelle, ni rendu Playwright iOS réalisé. À vérifier visuellement sur iPhone.

## À venir
Le suivi nominatif des amis et les rapprochements multi-dépenses sont un projet distinct, non inclus dans la version.
