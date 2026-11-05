# TRACE 2.0 — sauvegarde/restauration et isolement multi-utilisateur

Checkpoint du 4 novembre 2026. **Qualification locale : réussie.**
**Publication générale : NO-GO.** Ne pas confondre ce test avec un
instantané, un export ou une restauration de la base Supabase réelle.

## Scénario automatisé et reproductible

Le script tests/trace-20-fictional-backup-restore.integration.cjs
crée une instance PostgreSQL éphémère (PGlite), sans connexion réseau et
sans identifiants de production. Il charge le schéma versionné et les
migrations du candidat 05 à 12. Il simule quatre identités inventées,
deux foyers distincts et des comptes bancaires fictifs CAD/EUR.

1. Création de foyer à deux membres et d'un foyer indépendant.
2. Écriture CAS de comptes CAD/EUR, d'une dépense bancaire en attente,
   et d'un document appartenant à l'autre foyer.
3. Rejets des écritures inter-foyers et de la modification d'un compte
   appartenant à l'autre membre, avant sauvegarde.
4. Instantané binaire complet de PGDATA, avec empreinte SHA-256 ;
   détection d'un fichier altéré avant la restauration.
5. Fermeture de l'instance source, démarrage d'une seconde instance
   indépendante depuis le seul instantané et comparaison de l'empreinte
   des lignes des tables households, household_members et documents.
6. Vérification des RLS de lecture avec chacun des membres, un autre
   foyer et un utilisateur non membre après restauration.
7. Vérification que la dépense EUR en attente conserve le montant natif,
   le statut, la révision et aucune contre-valeur CAD inventée.
8. Test d'un conflit CAS sur révision obsolète, suivi d'une écriture
   autorisée sur la révision restaurée.
9. Refus des écritures inter-foyers et de l'ancienne voie SQL directe
   après la restauration.

Le test fonctionne sur une copie temporaire sans aucune écriture
hébergée. Aucun fichier contenant des données utilisateur n'est
créé ou téléchargé. Le résumé affiche un SHA-256 de test (les UUID
fictifs sont générés à chaque exécution), jamais un secret.

## Exécution

    TRACE_PGLITE_MODULE=/path/to/@electric-sql/pglite node tests/trace-20-fictional-backup-restore.integration.cjs

Le script scripts/trace-537-current-head-rehearsal.cjs exécute désormais
ce test dans sa qualification complète et l'inscrit sous
tests.backupRestore avec hosted=false.

## Ce que cela ne démontre pas

- Il n'existe aucune preuve de sauvegarde effective du Supabase de
  production, de sauvegarde hors site ni de restauration Supabase.
- PGlite n'est pas le service hébergé Supabase : PostgREST, Auth,
  Realtime, Storage, les privilèges côté hébergement, et les accès
  simultanés de deux clients doivent encore être testés sur un
  environnement isolé.
- Aucune migration de service worker PWA ni réinstallation sur
  un véritable iPhone Safari n'est validée.
- Les exports CSV/PDF et les écritures hors ligne nécessitent toujours
  une recette bout à bout complète, avec un jeu de données fictif.
- Les droits RLS doivent être revérifiés sur la version réelle du
  schéma déployée en test isolé avant toute décision de mise en ligne.

## État de l'environnement Supabase hébergé

La production TRACE est le projet eiqvabddtgfonouyeavi.
Il n'existait aucune branche de test hébergée au début de cette passe.
Les branches Supabase peuvent entraîner une facturation horaire et
ne sont pas couvertes par le plafond de dépenses : aucune branche
ou second projet n'a été créé pendant cette qualification.
Ce sujet nécessite un consentement au coût avant création.
