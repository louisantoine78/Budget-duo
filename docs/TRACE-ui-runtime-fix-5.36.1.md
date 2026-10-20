# TRACE 5.36.1 — Réparation du chargement et des analyses

## Incident après 5.36.0
L'application mélangeait `document.querySelector` (`$`, un seul élément) et `document.querySelectorAll` (`$$`, une liste). Les vues annuelles exécutaient `$('#annualBudgetChart [data-insight-month]').forEach(...)` pendant `renderBudget()`. Cette opération déclenchait `TypeError: ...forEach is not a function` et bloquait `renderAll()` immédiatement après connexion, laissant l'application partiellement ou totalement inutilisable malgré une compilation réussie.

## Correction sans régression
- Corriger les sept utilisations de `querySelector(...).forEach` en `querySelectorAll(...).forEach`, notamment le chargement Budget annuel, l'Accueil > opérations à vérifier, le détail d'une catégorie, l'analyse du patrimoine, les analyses mensuelles et le clic sur les mois.
- Conserver les modules TRACE Insights, les nouvelles vues premium, le rapprochement carte, la logique comptable 5.36.0, les comptes et les données.
- Étendre les tests statiques et les tests d'exécution des vrais renderers avec un DOM fictif : renderBudget, catégories, analyse annuelle, analyse budgétaire et patrimoine.
- Mettre à jour les références de version et invalider le cache PWA à 5.36.1.

## Données
Aucune mutation de transaction ni migration Supabase ; le correctif concerne uniquement la sélection des éléments et les protections d'interface.

## Vérification utilisateur
Une fois GitHub Pages déployé : ouvrir sur iPhone et attendre l'affichage 5.36.1. Vérifier Accueil, Budget > vue annuelle, catégories, Analyses et Patrimoine. Si une ancienne version reste visible, relancer la PWA ; le contrôle de version doit charger le nouveau code.
