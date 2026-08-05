# Checklist de mise en production — Trace V4

## Avant la migration

- [ ] Fermer l’application sur les deux iPhone.
- [ ] Télécharger un nouvel export JSON et le conserver sur l’ordinateur.
- [ ] Vérifier que GitHub contient toujours le fichier `config.js` fonctionnel.
- [ ] Ne pas relancer `supabase-schema.sql` sur la base existante.

## Migration Supabase

1. Ouvrir **Supabase → SQL Editor → New query**.
2. Vérifier que le rôle d’exécution est `postgres`.
3. Copier l’intégralité de `migrations/04-migration-trace-v4.sql`.
4. Cliquer sur **Run**.
5. Vérifier `Success. No rows returned`.
6. Facultatif : exécuter les deux requêtes de vérification commentées à la fin du script.

## Publication GitHub

1. Ouvrir le dépôt actuel `Budget-duo`.
2. Choisir **Add file → Upload files**.
3. Glisser le contenu du dossier V4, pas le dossier parent.
4. Confirmer le remplacement de `index.html`, `app.js`, `cloud.js`, `styles.css`, `sw.js` et `manifest.webmanifest`.
5. Téléverser également le dossier `assets` et le dossier `migrations`.
6. **Ne pas supprimer le `config.js` déjà présent.**
7. Message de commit recommandé : `Mise à jour Trace V4`.
8. Attendre le statut vert dans **Actions → pages build and deployment**.

## Première ouverture

- [ ] Ouvrir d’abord l’adresse GitHub Pages dans Safari et actualiser.
- [ ] Ouvrir ensuite l’application depuis l’icône d’écran d’accueil.
- [ ] Accepter le bouton **Mettre à jour** s’il apparaît.
- [ ] Se connecter une fois si iOS a séparé la session Safari de la webapp installée.
- [ ] Vérifier que le statut indique **Synchronisé**.

## Contrôles avec Louis-Antoine et Élise

- [ ] Les deux comptes ouvrent le même espace.
- [ ] Les anciennes transactions sont visibles.
- [ ] Les budgets existants sont visibles.
- [ ] Le solde du couple est identique à la V3.
- [ ] Une transaction ajoutée par Élise propose Élise comme payeuse.
- [ ] Une transaction ajoutée par Louis-Antoine propose Louis-Antoine.
- [ ] La date proposée est la date locale du jour.
- [ ] Le formulaire ne zoome pas sur iPhone.
- [ ] Une dépense de 80 $ avec deux amis donne 40 $ de dépense ménage et 40 $ à recevoir.
- [ ] Un remboursement reçu d’un ami diminue le montant à recevoir sans devenir un revenu.
- [ ] Un salaire toutes les deux semaines génère une nouvelle opération à la date prévue.
- [ ] Un loyer mensuel génère une nouvelle opération à la date prévue.
- [ ] Une catégorie utilisée peut être archivée sans disparaître de l’historique.

## En cas de problème

1. Ne pas réimporter immédiatement le JSON.
2. Revenir au commit GitHub précédent pour restaurer l’interface V3.
3. Vérifier si les données sont toujours présentes dans Supabase Table Editor.
4. Utiliser `04-rollback-trace-v4.sql` seulement pour remettre l’indicateur de version à 3.
5. La restauration depuis `trace_v4_backups` ou le JSON doit être préparée au cas par cas, car elle pourrait écraser des transactions ajoutées après la migration.
