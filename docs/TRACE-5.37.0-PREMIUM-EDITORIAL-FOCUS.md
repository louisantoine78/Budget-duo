# TRACE 5.37.0 — Passe de simplification premium (Accueil + Activité)

Statut : candidat de laboratoire uniquement. Ne jamais déployer en production sans approbation, sauvegarde et recette Safari.

## Décisions design
- L'Accueil doit répondre en priorité à deux questions : quel est mon solde estimé et combien puis-je encore dépenser ?
- Le rappel du mois est condensé en une seule bande de 3 valeurs (revenus, dépenses, marge), sans les longues notes répétitives. Chaque valeur reste un bouton vers son détail.
- L'Accueil affiche les opérations à vérifier et une vue d'évolution. Le calendrier d'import, le solde avec le partenaire et le raccourci de partage sont préservés dans un panneau natif « Outils et partage », fermé au chargement.
- Le sélecteur de comptes de l'Accueil retrouve les petites pastilles validées : 30 px d'apparence, cible tactile de 44 px, nom tronqué, couleurs discrètes.
- L'Activité reste filtrable ; la barre de statistiques utilise une typographie calme et trois colonnes plutôt que trois blocs indépendants. La liste des filtres avancés reste repliée, et sa légende ne prend plus de place lorsqu'elle est fermée.

## Conservation des comportements
- Les identifiants HTML des soldes, opérations, filtres, calendriers et raccourcis restent inchangés.
- Aucune modification de Supabase, du modèle de documents, des montants, des conversions, des transactions ou du partage.
- Les outils secondaires deviennent accessibles par une divulgation native, clavier et lecteur d'écran inclus.
- Aucun écran ou menu n'a été supprimé. Les nouveaux styles sont limités aux pages Accueil et Activité de la candidate.

## Correction d'une régression découverte
Une modification technique antérieure avait perdu la réduction validée des pastilles de comptes, ainsi que son test et la documentation. Les fichiers approuvés du commit 4822424 ont été rétablis avant de poursuivre. Toujours comparer les arbres Git avant de créer de nouveaux commits ; ne jamais utiliser un ancien base_tree_sha.

## Validation requise
- Test navigateur couvrant l'Accueil condensé, les valeurs KPI, la divulgation secondaire, l'accès au calendrier et l'absence de débordement à 320, 390 et 768 px.
- Vérifier le traitement des comptes personnels en EUR/CAD, le bilan du couple, le patrimoine, les virements, les imports CSV/PDF et le mode hors ligne.
- Exécuter la recette officielle sur la branche candidate **propre**, exacte au commit, puis déployer seulement en prévisualisation privée fictive.
- Aucune donnée réelle ; version stable 5.36.5 non modifiée.

## Prochaine passe envisagée
Finir la hiérarchie visuelle Budget puis Patrimoine (moins de libellés explicatifs, principaux montants en premier, détails sur demande). Valider ensuite sur Safari iPhone physique. Ne pas créer de projet Supabase supplémentaire sans demande explicite du propriétaire.

