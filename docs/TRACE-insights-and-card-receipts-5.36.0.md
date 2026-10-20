# TRACE 5.36.0 — Catégoriser un paiement de carte et comprendre ses chiffres

## 1. Paiements reçus sur compte carte
- Nouvelle nature **« Paiement reçu sur ma carte · à rapprocher »** dans les mouvements **entrants du compte carte**. Elle ne figure pas sur un compte courant.
- Dans l'import intelligent, le crédit de relevé peut être qualifié explicitement, même si le libellé OCR ne précise pas « Mastercard ». Le bouton de validation d'une nouvelle transaction reste désactivé : il faut rapprocher avec un paiement débité du compte courant (montant exact, même carte destinataire et date à ±5 jours).
- Dans une ancienne transaction bancaire en attente, choisir cette nature dans l'éditeur et sélectionner le paiement du compte courant. La ligne existante devient une **preuve de rapprochement sans écriture financière**, type `card_statement_evidence`, avec `linkedTransactionId`. Aucun second débit, revenu ni nouvelle dépense n'est créé.
- Il est impossible de valider cette nature en lot ou globalement sans correspondance. Un transfert déjà rapproché n'est plus éligible à un second rapprochement.
- Les rapprochements restent réversibles depuis le paiement du compte courant : les preuves redeviennent en attente sans impacter les soldes.

## 2. Accueil : budget en direct
- Les catégories sont classées par **dépenses réelles** (et non par ratio de dépassement).
- Chaque ligne affiche dépenses de la catégorie, budget prévu, part dans le total, solde de budget restant ou dépassement.
- Les huit premières catégories sont visibles, et les suivantes accessibles par « Afficher les autres catégories ».
- Les opérations confirmées sont seules prises en compte. Un clic sur la catégorie ouvre les opérations sous-jacentes (sans nouvelle écriture).

## 3. Accueil : évolution et analyses
- Six mois présentés par dépenses et marge après dépenses. La marge n'est pas présentée comme argent placé.
- Comparaison avec un mois antérieur réellement renseigné, avec indication « mois en cours ».
- Les mois sans données ne sont pas comptés comme zéro.
- Le panneau Analyses montre également les catégories du mois sélectionné et une synthèse des revenus/dépenses.

## 4. Budget : vue annuelle lisible
- Tableau mois par mois (budget, dépensé, reste/dépassement, non renseigné, futur).
- Total de l'année basé seulement sur les périodes écoulées et documentées.
- Chaque mois se sélectionne pour revenir à sa page Budget. L'analyse annuelle détaillée est accessible en haut de la carte.

## 5. Patrimoine : progression documentée
- Détaille le compte courant, la dette de carte, les comptes et placements suivis.
- Liste les versements et retraits réellement datés par mois.
- Exclut toute **fausse courbe de valorisation historique** : les rendements de marché réels exigent des relevés ou valorisations à plusieurs dates.
- Les CELI suivis par transferts restent des soldes estimés. Les conversions manuelles sont signalées.
- Fonctionne en filtres Moi / Couple avec les données existantes.

## Sécurité et validations
Aucune migration Supabase, aucune mutation des transactions réelles, aucune suppression de fonctionnalité. Tests sur données fictives. Les écrans doivent encore être validés sur Safari iPhone, notamment la modification d'un ancien paiement carte pending, les catégories très longues et les effets du clavier iOS.
