# Trace V4 — mise à jour de Budget Duo

Trace est la V4 de l’application de budget partagé. Elle conserve la même adresse GitHub Pages et le même projet Supabase.

## Principales nouveautés

- interface iPhone revue et champs à 16 px pour empêcher le zoom automatique;
- session Supabase persistante et écran de chargement pendant sa restauration;
- payeur proposé selon le compte connecté;
- date locale du jour proposée automatiquement;
- vues principales limitées à **Total du ménage**, **Louis-Antoine** et **Élise**;
- budget mobile sous forme de cartes, modifiable personne par personne ou pour le ménage partagé;
- catégories simplifiées, archivables, réactivables et supprimables lorsqu’elles ne sont pas utilisées;
- récurrences hebdomadaires, toutes les deux semaines, mensuelles ou annuelles;
- dépenses avec personnes extérieures et compteur des montants à recevoir;
- paiements à une personne et remboursements reçus d’une personne;
- projection mensuelle améliorée;
- « Solde réel » renommé **Flux net du mois**;
- solde de départ facultatif pour estimer la position du ménage;
- mise à jour du cache PWA sans supprimer les données Supabase;
- nom de l’application remplacé par **Trace**.

## Important

Le dossier de mise à jour ne contient volontairement **pas** `config.js`. Le fichier déjà présent dans ton dépôt GitHub doit rester inchangé, car il contient l’URL publique et la clé Publishable de ton projet Supabase.

L’icône livrée reste une icône provisoire. Elle pourra être remplacée par ton logo dans :

- `assets/icon-192.png`;
- `assets/icon-512.png`;
- `assets/apple-touch-icon.png`.

## Ordre obligatoire de déploiement

1. Télécharger une dernière sauvegarde JSON depuis l’application actuelle.
2. Exécuter `migrations/04-migration-trace-v4.sql` dans Supabase avec le rôle `postgres`.
3. Vérifier le message `Success. No rows returned`.
4. Téléverser les fichiers V4 sur la branche `main` du dépôt GitHub existant.
5. Ne pas supprimer et ne pas remplacer le `config.js` déjà présent sur GitHub.
6. Attendre que `pages build and deployment` soit vert dans GitHub Actions.
7. Ouvrir Trace depuis l’icône iPhone et accepter la mise à jour lorsqu’elle est proposée.
8. Vérifier les données avec les deux comptes avant de reprendre la saisie normale.

Les instructions détaillées sont dans `CHECKLIST-MISE-A-JOUR.md`.

## Structure des données

La V4 reste compatible avec les documents JSON de la V3. La première ouverture convertit les objets en mémoire, puis enregistre progressivement le format V4 dans Supabase. Les anciens champs utiles restent lisibles pendant la V4.

La migration SQL :

- ajoute uniquement `households.schema_version`;
- crée une sauvegarde privée dans `public.trace_v4_backups`;
- ne supprime aucune table;
- ne supprime aucune transaction, catégorie, budget ou objectif.

## Retour arrière

Comme la migration est additive, le retour le plus rapide consiste à restaurer le commit GitHub V3. Le script `04-rollback-trace-v4.sql` remet seulement l’indicateur de version à 3 et ne détruit aucune donnée V4.
