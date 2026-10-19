# TRACE 5.34.3 — Sécurisation de la validation rapide OCR/PDF

## Problème
La prévisualisation OCR historique est encore limitée à Dépense, Revenu et Remboursement. Elle pouvait confirmer rapidement, malgré une catégorie renseignée, une ligne dont le libellé suggérait un paiement Mastercard, un virement Interac ou un mouvement d'épargne.

## Protection
- La logique conservatrice `TraceImportGuide.safeForQuickApproval` est utilisée dans `quickFinalizeApproved`.
- Les lignes ambiguës demeurent **en attente** et doivent être qualifiées dans le sélecteur complet « Nature du mouvement ».
- Les achats courants, salaires et retours commerçants compatibles conservent leur validation rapide.
- L'import des captures n'est pas bloqué : seule la confirmation automatique est différée.
- Ne touche ni aux transactions confirmées existantes, ni à l'authentification, ni au schéma Supabase.

## Couverture
- Nouveau workflow GitHub Actions « TRACE regression safeguards » sur `main` et les pull requests.
- Vérification syntaxique des modules JavaScript actifs.
- Tests isolés du référentiel, des répartitions, des remboursements et de la protection OCR.
- La validation réelle des écrans iPhone et le rapprochement entre relevés restent à effectuer.

## Suite de l'uniformisation
L'ancien écran de prévisualisation OCR propose encore trois choix simplifiés. Il faudra fusionner son parcours avec le référentiel unique dans une version ultérieure, après tests de non-régression sur les captures et PDF.
