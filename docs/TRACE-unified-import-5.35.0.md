# TRACE 5.35.0 — Unification de l'import OCR/PDF

## Nouveautés
- Les captures et PDF du parcours historique proposent désormais le **menu unique « Nature du mouvement »**, avec les sous-groupes du référentiel commun. Le sélecteur « Type » à trois possibilités disparaît.
- Nature compatible avec le compte bancaire et le sens entrée/sortie. Le sens peut être corrigé dans les détails de chaque ligne.
- Catégories, répartition et aperçu de l'impact ne s'affichent que lorsqu'ils sont pertinents.
- Une transaction n'est comptabilisée qu'après confirmation. Les transferts, paiements de carte et versements CELI restent en attente jusqu'à la sélection de leur contrepartie dans « À vérifier ».
- Le code conserve la nature exacte avec `type` et `transferPurpose`, et l'indicateur de qualification manuelle `natureReviewed`. Pas de nouveau schéma.
- Les crédits de relevé de carte décrits comme paiement doivent passer par le rapprochement de l'import intelligent ; la liste historique ne peut pas les convertir en remboursements marchands.
- Le bouton d'import et les champs sont adaptés aux petits écrans iPhone.

## Protection des données
Aucune donnée bancaire réelle utilisée pour les tests, aucune mutation Supabase, aucune suppression ni migration. Les anciens modules/versionnés restent présents pour permettre un retour arrière si nécessaire.

## Tests
Compilation JavaScript et assertions de régression étendues pour la classification, les conversions, les répartitions, les crédits de carte et la surface d'interface OCR/PDF.

## Reste à tester sur iPhone
Validation visuelle réelle, PDF multi-jours, suggestions OCR, saisie dans le sélecteur iOS et doublons issus de plusieurs captures. Les rapprochements bancaires multi-relevés sont toujours un chantier à améliorer.
