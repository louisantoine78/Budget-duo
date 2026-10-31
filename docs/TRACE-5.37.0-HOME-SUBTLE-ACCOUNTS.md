# TRACE 5.37.0 — Comptes discrets sur Accueil

**Branche candidate uniquement.** Aucun changement de la version stable 5.36.5.

## Objectif

Redonner la priorité visuelle au solde estimé et au reste à dépenser, sans supprimer l'accès direct aux comptes personnels.

## Décisions UX

- Pastilles visuellement hautes d'environ 30 px, mais **surface tactile de 44 px** pour rester utilisables sur iPhone.
- Textes plus fins, largeur maximale de 122 px (115 px sur très petit écran), débordements tronqués.
- Sélection du compte en vert doux plutôt qu'en vert foncé, avec indication accessible `aria-pressed`.
- Espacements réduits sur Accueil seulement ; les écrans détaillés des comptes conservent leur densité.
- Note sur le caractère consultatif des soldes conservée pour les lecteurs d'écran, sans concurrencer les montants du tableau de bord.
- Le compte principal ne peut toujours pas être changé par ce raccourci ; aucun changement des calculs ou des règles financières.

## Vérification

Le scénario de navigation Chromium mesure à 320, 390 et 768 px les hauteurs, largeurs et l'absence de défilement horizontal. La batterie complète du candidat reste obligatoire avant toute prévisualisation privée actualisée. La recette Safari physique et les vérifications de données restent bloquantes pour la production.

