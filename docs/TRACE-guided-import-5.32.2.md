# TRACE 5.32.2 — Import orienté compte et rapprochement des paiements de carte

## Ce qui est implémenté
- Compte bancaire toujours sélectionné avant la lecture des captures (fonction existante conservée).
- Nature proposée uniquement lorsque la combinaison **type de compte + sens de mouvement + libellé** est suffisamment explicite. Un virement Interac ambigu reste sans nature préchoisie.
- Sous-menu « sens du mouvement » (débit/crédit), puis familles et natures proposées contextuellement. Carte de crédit : achats côté débit, retours de commerçant côté crédit. Compte courant : dépenses/prélèvements/virements sortants et salaires/remboursements/virements entrants.
- Champs de catégorie, répartitions, comptes destinataires et CELI apparaissent selon la nature. L'utilisateur confirme toujours chaque opération; l'OCR ne valide rien automatiquement.
- Vérification identique dans la sauvegarde (on ne peut pas contourner le menu pour comptabiliser un salaire sur une carte, etc.).
- Paiements de carte présents sur deux relevés : lorsque le transfert **courant → carte** a déjà été confirmé, la ligne détectée sur la carte peut être rapprochée par **choix explicite de l’utilisateur**. On vérifie les deux comptes personnels, le montant exact au centime et ±5 jours. La ligne du second relevé devient une preuve de rapprochement `status=matched_card_payment` dans les imports, **sans aucune nouvelle transaction ni aucun impact budgétaire**.
- Un paiement de carte connu déjà rapproché n'est pas proposé une deuxième fois. Si aucun paiement n'est disponible, la capture reste en attente. Modification/suppression du transfert apparié : il faut d’abord retirer son rapprochement, lequel redevient une ligne en attente.
- Le compteur des journées importées compte les preuves rapprochées parmi les lignes vérifiées, sans les comptabiliser comme opérations financières.

## Scénarios validés en code
- Type carte = achat ou remboursement commerçant, pas salaire ou virement sortant courant.
- Type courant entrant = remboursement d’amis hors budget / salaire ; sortant = prélèvement, dépense ou paiement de carte.
- Paiement carte 180 $ confirmé au courant ; même montant sur la carte le lendemain = une preuve à lier, 0 mouvement nouveau. Montant différent ou preuve déjà liée = pas de proposition.
- La logique existante de partage 40 $ à 50/50, remboursement d’amis, épargne et soldes de référence n'est pas modifiée par la migration.
- Syntaxe JS et vérifications de correspondance exécutées avant publication.

## Étapes suivantes (non livrées par cette version)
- Répartition par noms de plusieurs amis et allocation d'un remboursement unique entre plusieurs dépenses. Elle nécessite une structure de dettes par personne, des contraintes de concurrence côté serveur, un traitement de remboursements partiels et un parcours de reprise manuelle.
- Tests de bout en bout sur iPhone avec vrais extraits anonymisés et vérification des balances après import.

Aucune opération financière réelle, identité ou ressource PickPoint n'a été modifiée par le déploiement.
