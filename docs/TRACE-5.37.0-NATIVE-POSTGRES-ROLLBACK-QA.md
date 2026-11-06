# TRACE 5.37.0 — preuve de sauvegarde/restauration PostgreSQL isolée

**Date :** 28 octobre 2026. **Code testé :** `e21fae34f3c7efbf26d4d03395bf531667af525b`.
**Statut :** exercice de laboratoire réussi. **La publication reste NO-GO.**

## Périmètre exact

- Vercel Sandbox **éphémère**, région `yul1`, projet de prévisualisation `trace-v5-preview`. Pas de déploiement, pas de variables Supabase, aucune connexion à la base hébergée.
- PostgreSQL **18.6** natif (Ubuntu 26.04), `psql`, `pg_dump` et `pg_restore` ; quatre bases entièrement fictives sous le préfixe `trace_qa_`.
- Schéma du dépôt `supabase-schema.sql` ; 2 membres de foyer, 1 utilisateur extérieur, 8 documents financiers fictifs (comptes CAD/EUR, carte crédit, salaire, achat, remboursement carte, transfert FX), 1 instantané `trace_v5_backups`.
- Les migrations **05 à 12** se sont exécutées sans erreur sur la base source. Les mêmes huit migrations ont été réappliquées à une base restaurée : aucune modification des documents, membres, foyers ou instantanés inclus dans l'empreinte.

## Protocole et observations

1. Établir un instantané source cohérent après migrations. Empreinte SHA-256 des lignes complètes (foyers, membres, documents, `trace_v5_backups`) : `3b558c5ec07315feb529b27a2fe7b5538ad240a22119ae1a30970b2d5639b54d`.
2. Effectuer un `pg_dump -Fc` natif. SHA-256 du fichier de sauvegarde fictif : `f51608806ec12d734c628425509c067ec429da8040d32a93a45c56fba1e1709f`.
3. Exécuter `pg_restore --exit-on-error` vers une seconde base PostgreSQL vide : **succès** ; empreinte du contenu identique à la source, 8 documents, 2 membres et 1 sauvegarde interne.
4. Simuler un incident **sur la source fictive** : montant d'un achat remplacé par `99999`, opération de change supprimée, solde d'ouverture du partenaire remplacé par `9999`. Nouvelle empreinte : `d18d96ab09daf19ed7632e14f653469c56e57db10d0c85181f5cdeb441cbcca9` ; différence détectée.
5. Bloquer les nouvelles connexions de la base fictive, supprimer/recréer **uniquement** `trace_qa_source`, puis exécuter `pg_restore --exit-on-error` depuis l'archive native : **succès**. L'empreinte retrouve exactement sa valeur d'origine, identique aussi à la seconde base. Le montant `-100`, la transaction FX et les deux membres sont récupérés.
6. Contrôler les autorisations après rollback : RLS activée, INSERT/UPDATE directs des documents retirés à `authenticated`; l'utilisateur extérieur voit **0 document**, les membres **8 chacun** ; fonction `trace_cas_save_document` exécutable par `authenticated` mais pas par `anon`.
7. Réappliquer les migrations 05–12 sur la base restaurée, puis comparer à nouveau les empreintes : **8/8 réussies, données inchangées**.

Les **79/79 tests PostgreSQL de sécurité et CAS (PGlite)** et les **107/107 suites Node** avaient déjà été exécutés sur le même arbre de code `e21fae34`, avant cette répétition PostgreSQL native.

## Limites et conditions obligatoires avant GO

- Ce test porte sur un **jeu réduit et fictif** dans PostgreSQL 18. Il ne teste pas une copie intégrale de Supabase, ses extensions, tous ses volumes de données, son versionnement serveur ou les sauvegardes managées.
- La sauvegarde du laboratoire ne contient **aucune donnée réelle** et n'est pas un plan de restauration automatique de la production. Pour la mise en ligne : sauvegarde native réelle contrôlée, chiffrée, conservée hors de la base, testée dans une infrastructure sécurisée séparée, et contrôles de complétude indépendants au moment du cutover.
- En particulier, la migration 12 enlève la possibilité d'écriture directe aux anciens clients 5.36 ; **remettre seulement les anciens fichiers statiques en ligne ne constitue pas un rollback compatible**. Une stratégie DB+client synchronisée doit être approuvée.
- Avant GO : recette sur **véritable iPhone/Safari** (PWA/hors ligne), revue UX/UI premium complète, contrôle final de compatibilité des clients et autorisation explicite du propriétaire.
- Ne jamais lancer `dropdb`, `pg_restore --clean` ou les étapes de cet exercice contre un environnement hébergé, un nom de base non fictif, ou une instance connectée aux utilisateurs réels.

**Conclusion :** la faisabilité de la restauration/du rollback PostgreSQL natifs, la préservation des lignes financières et l'idempotence des migrations sont maintenant éprouvées en laboratoire. **Production : NO-GO.**
