# TRACE 5.35.3 — Rapprochement des paiements de carte Desjardins

## Principe comptable conservé
Un règlement Mastercard depuis le compte courant est **une seule transaction** : débit sur le compte courant et réduction de la dette de carte du même montant. Aucun revenu, aucune dépense et aucune variation de patrimoine net. La ligne crédit du relevé Mastercard devient une **preuve de rapprochement** liée à cette transaction existante, jamais une deuxième écriture.

## Ajustement
- Sur les **relevés de carte uniquement**, détecter « PAIEMENT CAISSE », « PAIEMENT REÇU » et « PAYMENT RECEIVED / THANK YOU » en plus de « Paiement Mastercard ».
- Ne pas déduire automatiquement qu'un « PAIEMENT CAISSE » présent sur le **compte courant** est un règlement de carte.
- Dans l'import intelligent de carte, suggérer le transfert existant seulement si même carte destinataire, même titulaire, montant exact et date à moins de cinq jours. L'utilisateur confirme explicitement l'association.
- Refuser de confirmer une correspondance devenue invalide ; ne jamais créer un remboursement commerçant à partir du paiement de carte.
- L'import historique OCR/PDF reconnaît et bloque les paiements de carte qui pourraient sinon être mal classés ; le rapprochement est réalisé dans l'import intelligent.
- Un transfert déjà rapproché n'est pas présenté une deuxième fois comme candidat.

## Limites
Cette version ne crée pas de rapprochements silencieux. Les règlements groupés ou décalés de plus de cinq jours nécessitent une validation spécifique, et les achats de carte non encore importés laissent la dette provisoire. La connexion entre lignes de deux relevés reste traçable via `matched_card_payment` et `linkedTransactionId`.

## Sécurité et tests
Aucune migration, aucune modification des transactions ou données Supabase. Tests avec libellés réels Desjardins, compte courant vs carte, montants, dates, destination et protection du budget.
