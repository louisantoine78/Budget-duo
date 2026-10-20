# TRACE 5.36.3 — « Paiement » sur relevé Mastercard

## Problème remonté sur Safari iPhone
Capture du 7 octobre 2026, compte « LA — Carte » : la ligne bancaire montre « Paiement +750,00 $ », mais TRACE propose « Dépense (achat, facture, prélèvement) ». La logique reconnaissait surtout « PAIEMENT CAISSE » et libellés incluant Mastercard ; « Paiement » seul conservait sa nature expense.

## Correction (sans migration)
- « Paiement » / « Payment » seul sur un relevé de carte devient une **proposition de nature « Paiement reçu sur ma carte · à rapprocher »**, y compris pour les brouillons déjà en attente.
- Cette suggestion est **non comptabilisée** : un règlement doit être lié au paiement déjà enregistré du compte courant (même montant, carte et propriétaire, date à 5 jours max), sans deuxième revenu/dépense ou mouvement de solde.
- Si une capture a explicitement le symbole négatif associé au montant OCR, « Paiement » reste une **sortie/achat**, pas un règlement. Les nouveaux imports OCR conservent le sens du relevé quand un signe + ou - est lisible devant le montant.
- Sur une ancienne capture dont le sens signé n'avait pas été enregistré, le formulaire demande de **cocher une confirmation du + sur la capture** avant de permettre le rapprochement, et la couche de sauvegarde vérifie ce consentement.
- Les opérations « Paiement » du compte courant ne sont pas reclassées et les véritables achats de carte restent des dépenses.
- Les copies exactes, règles de catégories, remboursements commerçants, transferts et soldes réels restent inchangés.

## Tests
Guide comptable pour carte et compte courant, contrainte de rapprochement, refus du double comptage, OCR positionnel avec +750 / -750, 44 scénarios comptables existants et smoke tests des écrans.

## Vérification iPhone
Sur le 7 octobre / LA — Carte, ouvrir « Paiement » 750 $. La nature proposée doit être « Paiement reçu sur ma carte ». Vérifier sur la capture qu'il s'agit bien de +750 $, cocher la vérification si demandée, puis choisir le paiement du compte courant et rapprocher. Si aucun paiement compatible n'est proposé, vérifier qu'il est enregistré comme transfert **vers cette carte** et que ses dates/montants concordent. Ne pas forcer la validation comme revenu ou dépense.
