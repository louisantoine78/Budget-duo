# TRACE 5.34.1 — Finition du modèle unifié

## Filtrage contextuel des natures en modification
- Dans l'éditeur des mouvements bancaires spéciaux, le compte et le sens de la ligne d'origine limitent les natures proposées. Une entrée du compte courant ne présente plus les paiements de carte ou les virements sortants, et inversement.
- Le filtre préserve la correspondance des types existants `TraceMovement`, exclut les natures legacy et n'ajoute aucune nature incompatible avec le type de compte.
- Le passage d'un mouvement externe sortant vers une vraie dépense avancée par un proche reste possible, avec catégorie et répartition.

## Langage
- Le champ de la saisie manuelle « Cette dépense concerne » s'appelle désormais « Pour qui ? », comme dans les autres parcours.

## Sécurité
- Aucun moteur financier modifié, aucune migration et aucune transaction existante reclassée.
- Fonction de sauvegarde bancaire comparée à 5.34.0 : identique.
- Contrôles réussis sur trois ensembles de natures (entrée/sortie, paiement de carte) et validité syntaxique JS.
