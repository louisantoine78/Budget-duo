# TRACE 5.36.5 — Identifier une transaction déjà enregistrée lors d’un doublon

## Demande et exemple
Dans l'import intelligent iPhone du 11 octobre 2026, « Fromagerie Atwater Cen · 27,89 $ » est signalé comme doublon mais l'utilisateur veut comprendre exactement à quelle transaction déjà enregistrée la capture est comparée.

## Affichage
- Dans le panneau « Rapprochement à contrôler », comparer « Ta ligne à importer » et « Transaction déjà comptabilisée » avec nom, compte, montant au centime, date, catégorie et origine si disponibles.
- Distinguer les autres brouillons « Autre capture en attente » des opérations `transactions` ayant réellement `status:'confirmed'`. Un document encore à valider n'est plus présenté abusivement comme « comptabilisé ».
- Montrer aussi la correspondance de date proche fournie par l'inspection existante si elle n'est pas déjà dans la liste.
- Les correspondances sont limitées au même compte et aux montants exacts pour la détection de duplicata identique ; aucun nouveau rapprochement, suppression ou approbation automatique.
- Si la capture est corrigée (date, marchand, montant), le comparatif se rafraîchit.
- Permettre l'écartement volontaire de la capture inchangée ; aucune nouvelle transaction n'est créée.

## Technique
Nouveau module `trace-duplicate-compare-1.0.0.js` (HTML protégé contre les libellés non fiables) et styles iPhone. Enrichissement des métadonnées du pont `smartDuplicateMatches` et `inspect`. Tests de régression fictifs pour même montant/commerçant/compte, montant différent, autre compte, état en attente, encodage HTML.

## Sécurité
Aucune migration Supabase, aucune modification des comptes, mouvements ou calculs comptables. Vérifier en situation réelle que le comparatif du 11 octobre montre bien l'opération reconnue avant d'écarter la capture.