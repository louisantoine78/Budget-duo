-- Trace V4 — retour logique non destructif
-- Ce script ne restaure pas les anciennes données et ne supprime aucune donnée V4.
-- Pour revenir à l'interface V3, restaurez d'abord le commit GitHub précédent.

begin;
update public.households
set schema_version = 3
where schema_version = 4;
commit;

-- La sauvegarde privée reste disponible dans public.trace_v4_backups.
-- Une restauration complète écraserait les nouvelles opérations créées après la migration;
-- elle ne doit être faite qu'à partir d'un script préparé pour le foyer concerné.
