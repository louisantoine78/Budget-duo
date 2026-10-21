# TRACE 5.37.0 — Audit de développement international (non publié)

**Statut : chantier en branche uniquement, non approuvé pour production.**

Base fonctionnelle conservée : `main` / TRACE 5.36.5, commit `02c70f50e7e51da79b77a91dde96a03c6c719909`.
Branche : `trace-5.37.0-international-accounts-fx`.
Entrée de production : `index.html` (toujours câblée en 5.36.5). Ne pas la basculer avant les tests d'intégration et la validation iPhone.

## Audit et mesures de sécurisation déjà effectuées

- Moteur `trace-international-1.0.0.js` : un montant bancaire est calculé en devise native, une contre-valeur CAD est figée et datée à la validation. Aucune équivalence CAD=EUR/USD/GBP/CHF implicite.
- Les comptes historiques dépourvus de champ `currency` et les transferts CAD historiques restent compatibles.
- Les transferts internationaux **doivent** indiquer le montant réellement reçu sur le compte destinataire. La contre-valeur budgétaire CAD ne peut pas servir de montant crédité fictif.
- Une carte de crédit nouvellement créée doit être reliée explicitement à un compte courant du même titulaire, de la même devise et du même pays. Les rattachements historiques ambigus ne peuvent plus produire un faux solde principal.
- Un montant d'origine est requis si la devise d'achat diffère de la devise bancaire. Les taux datés manquants, invalides ou postérieurs à l'achat sont rejetés.
- Les CSV étrangers peuvent être importés comme lignes **en attente** avec leur montant natif, même en l'absence de taux. Le montant budgétaire CAD reste `null` jusqu'à validation.
- L'éditeur de mouvements bancaires hérité de 5.36.5 est protégé contre l'édition de comptes et de transferts en devise étrangère : c'est une restriction temporaire, pas une fonctionnalité terminée.
- La création d'une carte à débit différé est désactivée tant que le moteur de dates d'achat, d'échéance, de paiement et de rapprochement n'est pas développé.
- Les listes d'actions des écrans Compte/Patrimoine utilisent désormais `querySelectorAll` ; quatre erreurs `querySelector(...).forEach` potentiellement bloquantes ont été corrigées.
- Le compteur principal d'un utilisateur ne doit plus écraser le montant du filtre Couple.

## Vérification effectuée

- 17 scénarios comptables du fichier `tests/trace-international.test.cjs` exécutés dans un environnement JavaScript isolé avec le moteur de la branche : réussis. Sont notamment couverts : héritage CAD, EUR natif, achat USD facturé EUR, dette de carte et compte lié, transfert CAD/EUR, taux manquant ou invalide et date de référence indicative simulée.
- 7 gardes d'intégration statique du fichier `tests/trace-international-wiring.test.cjs` exécutés : réussis. Ils vérifient des raccordements à protéger mais **ne simulent pas un navigateur**.
- Analyse syntaxique JavaScript du fichier `v5-app-5.37.0.js` après modifications : réussie.
- Schéma Supabase TRACE inspecté **en lecture seule**. `public.documents.data` et `public.households.settings` sont JSONB. Aucune migration, donnée bancaire, transaction ni utilisateur n'a été modifié.
- Aucune fusion vers main, aucune modification de l'entrée PWA, aucun déploiement et aucune validation GitHub Actions de 5.37.0 n'ont été réalisés.

## Bloqueurs avant publication

1. **Éditeur international complet** : permettre l'édition sûre des virements étrangers et des montants réellement reçus, avec validation des répartitions Moi / partenaire / amis, conservation des taux historiques et simulation précise des conséquences. L'éditeur bancaire existant reste désactivé sur ces opérations.
2. **Imports OCR, PDF et CSV France** : tester des relevés fictifs représentatifs, les dates JJ/MM/AAAA, montants à virgule, colonnes débit/crédit, SEPA, rapprochements et doublons, sans certification anticipée. Vérifier la validation des brouillons étrangers sans taux.
3. **Accueil et patrimoine** : finaliser et tester l'agrégation de l'ensemble du foyer en CAD/EUR, les comptes partagés et les transferts non dupliqués, les taux de valorisation datés, les cartes présentant des avoirs non vérifiés, et la distinction cash/épargne/placements.
4. **Modèle différé** : moteur de règlement, dates distinctes achat/échéance/débit et rapprochement sans deux dépenses. Ne pas réactiver l'option tant que des tests réels de scénario fictif n'existent pas.
5. **Parcours iPhone/Safari et chargement réel** : tests de chargement initial et de navigation, tous les formulaires comptes/import/édition, fonctionnement PWA hors ligne, bascule Moi/Couple, conservation des fonctions 5.36.5.
6. **CI** : branche actuelle non visée par `.github/workflows/trace-regression.yml` lors d'un simple push. Exécuter les régressions historiques, les nouveaux tests et le smoke test mobile avant fusion. Ne pas réactiver le stockage QA PickPoint.
7. **FX du transfert vers épargne internationale** : `trackedSavingsAccounts` et `isReadySavingsAccount` ne gèrent aujourd'hui que les comptes CAD liés ; étendre en préservant les soldes historiques et sans assimiler un virement à une dépense.
8. **Vérification Banque du Canada** : les tests Valet utilisent une réponse fictive. Confirmer les séries et les réponses HTTP réelles avant activation.

## Critères de sortie

- Zéro test historique en échec, aucune création de doublon ou de revenu/dépense fictifs sur un paiement de carte.
- Aucune transaction ancienne modifiée massivement et aucun solde inconnu présenté comme zéro.
- Conversion et date de taux traçables; jamais de fallback 1 sur devise étrangère.
- Chargement app, formulaires et flux principaux validés en navigateur (priorité iPhone Safari).
- **Puis seulement** câblage des ressources versionnées, service worker, changelog, PR relue, vérification GitHub Actions et GitHub Pages.

Ce document décrit les limites observées et ne constitue pas une annonce de disponibilité de TRACE International.
