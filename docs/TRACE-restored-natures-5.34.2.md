# TRACE 5.34.2 — Tous les mouvements dans la même liste

## Cause
Après l'unification en 5.34.1, l'éditeur courant des opérations « Dépense / Revenu / Retour commerçant » réinjectait trois natures dans le sélecteur ; l'éditeur bancaire excluait de son côté la plupart des opérations budgétaires. Les autres natures du référentiel n'étaient donc pas accessibles partout.

## Correctif principal
- Le champ visible reste **Nature du mouvement**, sans seconde étape Famille / Nature précise.
- Les quatre familles précédemment validées sont conservées sous forme de sous-groupes du sélecteur natif.
- Compte courant, sortie : dépense, frais avancés par un proche, paiement de carte, virement entre comptes, argent prêté, sortie hors budget, versement épargne / CELI.
- Compte courant, entrée : remboursement commerçant, salaire / revenu, remboursement de frais avancés, retour d'argent prêté, autre entrée non budgétaire, retrait d'épargne / CELI.
- Carte de crédit : achat / dépense en débit, remboursement commerçant en crédit ; les paiements de carte apparaissant en crédit restent à **rapprocher** de la sortie du compte courant depuis le parcours d'import.
- L'éditeur bancaire accepte lui aussi les natures budgétaires compatibles : il n'est plus limité aux mouvements hors budget.

## Règles de conservation
- Un changement de nature se fait **sur la même transaction bancaire**, sans en insérer une deuxième.
- Le changement conserve la date, le compte, le montant et le libellé en cours de saisie lorsque l'éditeur spécialisé devient nécessaire.
- Les catégories et répartitions ne sont demandées que pour une dépense, un revenu ou une correction de dépense ; les transferts n'ajoutent pas de dépense/revenu.
- Conversion d'une dépense vers paiement de carte = sortie courant et crédit de dette carte, sans dépense supplémentaire.
- Conversion vers une dépense réelle = catégorie budgétaire requise et répartition réactivée.
- Conversion d'une dépense avec remboursements amis déjà liés vers une opération hors budget bloquée pour protéger les écritures existantes.
- La catégorie précédente ne peut plus rester accidentellement sélectionnée si l'on passe d'une dépense à un revenu de nature opposée.
- Suppression visuelle du lien secondaire « Autre nature : paiement, virement, épargne » devenu redondant.
- La terminologie explicative change selon la nature ; ne pas afficher le texte « Un proche a avancé les frais » pour une dépense générique, un revenu ou un retour commerçant.

## Limites intentionnelles
- Le sens d'un mouvement existant ne peut pas être retourné arbitrairement : un débit ne devient pas un crédit sans un flux bancaire réel compatible. Cela protège la correspondance avec les relevés.
- La ligne crédit du relevé de carte doit être rapprochée de la sortie sur le compte courant, et non créée comme une dépense ou un revenu.
- Les autres fonctionnalités (objectifs d'épargne mensuels, suivi multi-avances) ne sont pas modifiées.

## Vérifications
- 23 assertions de régression : compilation JS, compatibilité selon compte, fonctions comptables et import inchangées, protections des liens et calculs.
- 5 simulations de sauvegarde dans l'éditeur bancaire : dépense → paiement carte ; virement → dépense ; virement reçu → remboursement d'ami ; entrée externe → retour commerçant ; refus de reclassifier une dépense déjà remboursée.
- Tests du sélecteur de l'éditeur standard : sorties du courant, entrées du courant, carte de crédit, et sauvegarde de la nature « frais avancés par un proche ».
- Aucune modification de données réelles ni migration Supabase ; le rendu visuel sur iPhone nécessite encore confirmation.
