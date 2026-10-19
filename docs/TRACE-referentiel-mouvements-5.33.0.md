# TRACE 5.33.0 — Référentiel des natures de mouvements

## Règle principale
La nature détermine la conséquence comptable ; la catégorie détermine la destination budgétaire (voyage, loyer, assurance, restaurant, etc.). Le mode de paiement (Interac, prélèvement, achat carte, virement) décrit le canal bancaire et **ne suffit pas** à classer une opération.

## Compte courant : sorties
| Cas réel | Nature TRACE | Impact |
|---|---|---|
| Loyer, assurance, épicerie, don, cadeau, prélèvement bancaire, frais de tenue de compte | Dépense | Dépense budgétaire avec catégorie et répartition |
| Agathe règle un hôtel, restaurant, billets, courses ; tu lui verses ta part | Virement pour des frais avancés par un proche | Dépense budgétaire dans la catégorie choisie |
| Tu règles Mastercard depuis le courant | Paiement de ma carte de crédit | Courant − ; dette de carte diminuée ; aucune nouvelle dépense |
| Tu déplaces de l’argent entre deux de tes comptes bancaires suivis | Virement entre mes comptes suivis | Compte source − ; destination + ; hors budget |
| Versement vers un CELI ou compte épargne suivi | Versement vers mon épargne / CELI | Courant − ; épargne + ; sans consommation |
| Tu prêtes 100 $ à un proche qui te les rendra | Virement envoyé · argent prêté à un proche | Courant − ; aucune dépense budgétaire |
| Autre sortie vérifiée sans consommation (cas particulier) | Autre sortie sans dépense | Courant − ; hors budget ; vérification nécessaire |
| « Dépense déjà comptabilisée » ancien libellé | Ancien règlement déjà comptabilisé (compatibilité) | Ne peut plus être choisi pour créer une nouvelle ligne. Il faut retrouver l’écriture bancaire existante et éviter une seconde sortie |

## Compte courant : entrées
| Cas réel | Nature TRACE | Impact |
|---|---|---|
| Salaire, prime, autre revenu réellement gagné | Salaire ou autre revenu | Courant + ; revenu du budget, catégorie revenus |
| Retour d’achat payé sur courant | Remboursement d’un commerçant | Courant + ; dépenses de la catégorie corrigées |
| Mathilde rembourse une partie de la dépense que tu avais payée pour le groupe | Virement reçu · remboursement de frais avancés | Courant + ; aucun revenu, aucune réduction supplémentaire de dépense ; lien facultatif à l’achat initial lorsque la part « amis » est renseignée |
| On te rend une somme précédemment prêtée | Virement reçu · argent prêté rendu | Courant + ; ni revenu ni dépense |
| Retrait de ton épargne vers le courant | Retrait de mon épargne / CELI | Courant + ; épargne − ; hors budget |
| Autre somme reçue, vérifiée et non assimilable à un revenu | Autre entrée sans revenu | Courant + ; hors budget |

## Carte de crédit
| Cas réel | Nature TRACE | Impact |
|---|---|---|
| Magasin, resto, essence, billet d’avion | Dépense | Dette carte accrue ; dépense du budget, catégorie et partage |
| Retour marchand ou annulation d'achat | Remboursement d’un commerçant | Dette carte réduite ; dépenses corrigées |
| Paiement de carte vu sur le relevé de carte | Preuve du transfert courant → carte | Associer au paiement déjà créé, sans seconde transaction ni budget |
| Salaire, Interac, épargne, prêt, virement interne | Non proposés sur la carte | Nature incompatible avec ce type de compte |

## Épargne, prêts et espèces : limites explicites
- Virement d’épargne = mouvement de patrimoine ; **l’objectif budgété d’épargne dans « Autres » reste à développer**. Ne pas créer une dépense artificielle pour suivre cette intention.
- Prêter et se faire rembourser une somme = deux natures financières distinctes ; **suivi nominatif complet, remboursements partiels et multi-avances restent à développer**. Les écritures bancaires peuvent déjà être correctement qualifiées.
- Retrait au distributeur = déplacement vers du liquide. La caisse espèces suivie n’est pas disponible : ne pas proposer un retrait comme une dépense fictive ni comme un transfert complet entre deux comptes suivis.
- Prêt bancaire = sortie de trésorerie ; comptabilité dette/intérêts, split capital et intérêt et budget de mensualité nécessitent un modèle distinct. Ne pas confondre automatiquement capital amorti et dépense de consommation.
- Un virement entrant provenant de l’un de ses comptes nécessite le rapprochement avec la sortie déjà enregistrée ; un crédit de carte est déjà rapprochable, les autres transferts entrants multi-relevés restent à étendre.
- Aucune identité de proche déduite automatiquement d’un libellé Interac sans confirmation.

## UI et compatibilité
- Quatre familles conservées mais libellés réorganisés. « Remboursement de commerçant » est désormais une **entrée**, et « frais avancés par un proche » une **dépense** plutôt qu’un simple transfert.
- Chaque nature possède un court texte décrivant ce qu’elle produit dans les budgets et les comptes.
- La saisie manuelle sélectionne le compte avant de qualifier le mouvement ; les familles incompatibles avec le type de compte sont désactivées.
- L'import de captures ne suggère plus automatiquement « Dépense » ou « Revenu » pour un virement Interac ambigu ; l’utilisateur précise la nature et confirme.
- Les documents historiques conservent leurs types et transferPurpose (pas de migration). Ancienne nature friend_payment_settlement reste lisible mais n'est plus proposée pour les nouvelles opérations.
- Le parcours de correction détaillée des mouvements historiques hors budget reste compatible. Les catégories actuelles, y compris les catégories personnalisées par le foyer, ne sont pas changées.

## Tests réalisés
- 65 assertions de logique pure : montant, partage à 50/50, avance, remboursement, sens bancaire, choix selon le compte, heuristiques Interac, rétrocompatibilité.
- Test sur les fonctions de calcul budgétaire et de soldes réelles avec six transactions fictives : courant +730, carte +10, revenus 1000, dépenses personnelles 110/110, couple 220 (avec solde initial nul).
- Compilation des quatre scripts JS ; aucun test iOS E2E ni mutation de données réelles.

## Suites à développer séparément
1. Objectifs d’épargne dans la planification « Autres » et suivi réalisé/prévu sans gonfler les dépenses.
2. Suivi des avances par personne, rapprochements partiels, multiples et protections concurrentes côté serveur.
3. Rapprochements entre relevés de comptes courants et gestion d'espèces.
4. Parcours de vérification des catégories personnalisées et tests réels iPhone.
