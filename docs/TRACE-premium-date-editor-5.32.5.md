# TRACE 5.32.5 — Champs premium et date iOS

## Contexte
Retour utilisateur sur iPhone : le champ Date de la transaction déborde horizontalement et les champs standard Dépense / Revenu / Remboursement n'ont pas le niveau de finition des autres écrans de TRACE. L'aperçu compact et le bouton Enregistrer fonctionnent et doivent être conservés.

## Modification
- Champs contrôles unifiés dans des conteneurs plus doux et plus travaillés : fond vert-gris subtil, bordure très fine, focus visible, meilleure typographie et menus avec chevron harmonisé.
- Montant affiché avec l'indication CAD dans un accessoire intégré sans changer sa valeur.
- Date du formulaire toujours native iOS (input type=date), dans un conteneur large. Sur écrans étroits, date et montant s'affichent sur deux lignes indépendantes, afin de ne pas couper le sélecteur iOS ; deux colonnes réapparaissent à partir de 720px.
- Section « L’opération », plus naturelle, au lieu du titre de formulaire « Type et description » ; aucune nature de mouvement, catégorie ni calcul n'est modifié.
- Le style est limité à #sheetBackdrop.trace-premium-edit pour ne pas affecter les autres modales et parcours d'import.
- L'aperçu des impacts, le bouton fixe et les boutons de validation restent inchangés.

## Contrôles
- JS parsé sans erreur. Test du véritable contrôleur d'édition simulé avec un virement fictif Agathe du 16/10/2026 de 180 CAD réparti au couple : -180 CAD compte, +90 budget personnel, +90 partenaire, 180 couple.
- Présence de 7 champs regroupés, des boutons existants, type=date et value=2026-10-16 confirmée.
- Comparaison du corps de la fonction save(confirm) avant/après : identique à l'octet près.
- Aucune donnée réelle n'a été modifiée, aucune modification Supabase.
- Un dernier essai visuel sur iPhone est nécessaire : aucune simulation n'égale le rendu du navigateur natif iOS.
