# TRACE 5.37.0 — Budget : simplification premium (candidat)

Statut : changement d'interface sur la seule branche candidate, **NO-GO production**.

## Ce qui change
- Carte récapitulative mensuelle plus compacte et moins décorative.
- Les trois familles Revenus / Dépenses fixes / Dépenses variables restent visibles avec leur total et nombre de postes.
- Chaque famille présente ses deux premiers postes éditables ; les suivants restent accessibles via le panneau natif « Voir les autres postes » (accessible clavier, lecteur d'écran et tactile).
- Une divulgation ouverte reste ouverte lors d'un simple recalcul ; elle revient à l'état compact si le mois ou le périmètre change.
- L'action Ajouter demeure disponible immédiatement dans chacune des trois familles ; Gérer les catégories passe après les postes pour alléger le haut de l'écran.
- « Mes dépenses réelles », la navigation vers Activité et l'aperçu « Mon année en clair » restent présents sans changement des calculs.

## Préservation
Aucune modification de `summary()`, `budgetAmt()`, de l'import, des transferts, des calculs FX, du modèle Supabase, de la gestion des comptes ni des petites pastilles d'Accueil. Les IDs et les points d'entrée financiers restent inchangés.

## Contrôles
- À exécuter dans un checkout complet : `node --check v5-app-5.37.0.js`, `node tests/trace-international-premium-layout.test.cjs`, `node tests/trace-candidate.browser.cjs`, `node scripts/build-trace-preview-pwa.mjs`, `node scripts/build-trace-preview-pwa.mjs --check` et recette stricte avant diffusion.
- Générer puis committer `trace-international-preview-sw.js` avant une nouvelle prévisualisation installable : le SW précache ces fichiers et ne doit jamais servir une ancienne interface.
- Ne pas confondre inspection statique et recette Chromium/WebKit ; Safari iPhone physique reste à qualifier.

## Validation de la passe corrigée — 31 octobre 2026
- Le premier moteur de rendu Budget remplaçait directement le HTML initial et a provoqué une régression au scénario PDF/account-view. La correction conserve **à l'identique la génération de lignes financière historique**, puis applique la présentation progressive sur les éléments DOM. Aucun calcul financier n'est déplacé ou modifié.
- Validation statique : `node --check v5-app-5.37.0.js`, `node tests/trace-international-premium-layout.test.cjs` : OK.
- Chromium complet sur données fictives : **45/45 scénarios PASS**, y compris les rapprochements PDF et tous les parcours financiers existants ; ressources externes bloquées.
- Cache PWA candidat : `node scripts/build-trace-preview-pwa.mjs` et `--check` : OK, cache versionné et limité aux ressources statiques fictives.
- Cette validation navigateur Chromium n'est pas une recette Safari physique ni Auth/RLS Supabase hébergée ; **NO-GO production** maintenu.
