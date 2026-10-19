# TRACE 5.34.4 — Validation complète des mouvements OCR mis en attente

## Cause identifiée pendant l'audit
Le blocage conservateur de la validation rapide ajouté en 5.34.3 pouvait être contourné par la confirmation d'un lot ou par « Valider les opérations » ; un mouvement hors budget reclassifié mais encore en attente nécessitait une catégorie alors qu'il ne doit pas en avoir.

## Correction
- Une même fonction `legacyImportNatureReady` protège les validations rapides, groupées et globales.
- Les opérations importées ambiguës nécessitent une requalification explicite via « Nature du mouvement » avant validation globale.
- Une correction explicite dans les éditeurs conserve `natureReviewed` sur le document de transaction sans créer une nouvelle ligne.
- La validation globale accepte les mouvements hors budget sans catégorie, uniquement après contrôle de la nature compatible.
- Un crédit sur relevé de carte identifié comme paiement de la carte n'est jamais confirmé comme remboursement commerçant par le parcours historique : le rapprochement doit passer par l'import intelligent.
- Aucun schéma ni contenu Supabase modifié directement, aucune transaction client modifiée.

## Tests et limites
- Assertions de non-régression des règles de calcul plus contrôles de présence des protections dans les trois chemins de validation.
- Compilation des modules actifs sur GitHub Actions ; publication GitHub Pages à contrôler.
- Le parcours visuel iPhone, l'ancienne extraction OCR et les rapprochements restent à faire tester avec des captures fictives.
