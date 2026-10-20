# TRACE 5.36.2 — Correction du chargement après connexion

## Incident observé sur Safari iPhone
Le foyer et l'Accueil sont bien chargés, mais un écran « Trace a rencontré un problème » apparaît. Dans `renderAll()`, le rendu d'Activité utilise `$$$('[data-tx-open]').forEach(...)` ; `$$$` n'existe pas. Après l'Accueil et le Budget, `renderActivity()` déclenche une `ReferenceError` que le traitement global interprète comme un échec partiel de chargement.

## Correction
- Remplacer strictement `$$$` par `$$`, l'utilitaire déjà défini comme `document.querySelectorAll`.
- Garder intacts les autres modules, fonctionnalités premium 5.36, calculs et modèles métier.
- Refaire les vérifications de code, et exécuter le **vrai renderActivity** dans un environnement DOM fictif avec opérations confirmées, revenus, dépenses et opération en attente.
- Ajouter un test interdisant une variable de sélecteur à trois dollars.
- Actualiser les identifiants de version et de cache PWA en 5.36.2.

## Données
Aucune table Supabase, aucune transaction, aucun compte utilisateur et aucun solde d'ouverture ne sont modifiés.

## Limites
Les vérifications automatisées ne reproduisent pas tous les comportements de Safari et l'environnement utilisateur; confirmation sur iPhone requise après déploiement GitHub Pages. 
