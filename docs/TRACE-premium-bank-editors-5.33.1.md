# TRACE 5.33.1 — Éditeurs de mouvements bancaires premium

## Constat
Les transactions Dépense / Revenu disposaient d’un éditeur visuel premium, alors que les paiements de carte, virements, remboursements de proches et transferts vers CELI ouvraient un autre formulaire non harmonisé. Des virements courants vers carte pouvaient être dirigés vers le formulaire de règlement entre partenaires.

## Modifications visuelles
- L’éditeur des mouvements bancaires réutilise les cartes numérotées 01 Nature du mouvement, 02 Détails bancaires et 03 Informations complémentaires (affichées selon la nature choisie).
- Champs harmonisés avec l’éditeur Dépense de TRACE : fonds doux, sélecteurs fins, montant CAD, date centrée et calendrier iOS natif conservé.
- Aperçu de l’impact dans une carte compacte, bouton fixe d’enregistrement, suppression et annulation secondaires.
- Les champs de destination, épargne, catégorie / répartition et rapprochement avec remboursement ne s’affichent que lorsqu’ils sont pertinents.
- Le règlement entre partenaires suit la même direction artistique et affiche un aperçu simple du déplacement d’argent.
- Ces nouveaux styles sont limités aux classes trace-premium-movement / trace-premium-settlement, sans modification de l’écran standard.

## Correction de navigation
Les transferts entre comptes du même propriétaire (dont les paiements de carte) ouvrent désormais l’éditeur de mouvement bancaire. Les transferts entre propriétaires différents conservent l’éditeur de règlement entre partenaires.

## Garanties et tests
- Les fonctions sauvegardant un mouvement bancaire et un règlement partenaire ont été comparées au code 5.33.0 et restent strictement identiques. Les données réelles n’ont pas été modifiées.
- La fonction de routage des éditeurs a été corrigée : carte de crédit et virements personnels ne basculent plus dans le règlement partenaire.
- Parsing JS réussi. Tous les identifiants de champs et de boutons attendus par les gestionnaires d’événements sont présents.
- Tests simulés des éditeurs de paiement carte, remboursement reçu, versement CELI, nouveau règlement et règlement existant : ouverture et changement de date réussis.
- Rendu réel iOS Safari à confirmer avec une capture utilisateur ; pas de test visuel sur le téléphone.

## Périmètre exclu
Pas de modification des natures en 5.33.0, du moteur comptable, des catégories, du stockage Supabase ou de la logique de rapprochement des remboursements.
