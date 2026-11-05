# TRACE 2.0 — Conserver les finances ; nettoyer les imports seulement si nécessaire

Constat du 5 novembre 2026 (inventaire agrégé ; aucun document ni montant
individuel extrait du serveur).

| Collection | Documents | Politique |
| --- | ---: | --- |
| accounts | 7 | Conserver, y compris le compte partagé owner=household |
| investment_accounts | 3 | Conserver |
| budgets | 20 | Conserver |
| categories | 84 | Conserver |
| transactions | 64 | Conserver par défaut ; tous source=image avec nom de fichier |
| imports | 87 | Réinitialisation possible si nécessaire |
| import_days | 37 | Réinitialisation possible si nécessaire |

L'origine des 64 transactions est connue, mais elles peuvent avoir été
corrigées manuellement depuis leur importation. Les 87 éléments
imports portent le type smart_draft ; leurs références aux
transactions doivent être traitées conjointement en cas de nettoyage.

## Sauvegarde avant toute suppression

L'instantané privé du serveur trace20-pre-cas-20261105 contient
302 documents, 3 foyers et 4 membres. Son schéma n'est pas accessible
aux utilisateurs anon et authenticated. Il se trouve toutefois dans
le même PostgreSQL, et NE remplace PAS une sauvegarde externe.

## Nettoyage conditionnel et jamais automatique

1. Arrêter les saisies et synchronisations des deux appareils.
2. Délimiter un seul foyer et vérifier les modifications après la
   dernière sauvegarde ; créer un instantané récent.
3. Examiner ensemble imports, import_days et les transactions dont
   source=image ET importFileName est non vide. Ne pas purger
   des transactions saisies manuellement ou retraitées.
4. Préserver intégralement budgets, categories, accounts,
   investment_accounts, investment_operations et settings.
5. Examiner les soldes, virements, paiements par carte et éventuels
   rapprochements liés aux imports ; prévoir une restauration.
6. Comparer les comptes financiers et les documents avant/après.

AUCUN import ni transaction n'a été supprimé à ce checkpoint.

## Compatibilité du compte partagé

La migration candidate 07 reconnaît owner=household uniquement sur
accounts, seulement pour les membres du foyer. Elle empêche la
conversion silencieuse d'un compte personnel en compte partagé et
vice versa. La migration candidate CAS 09 autorise les écritures
sur cet ancien compte partagé mais pas celles d'un tiers.

Ces modifications sont préparées sur la branche candidate, non
appliquées en production. Le cutover 12 casserait les écritures
directes des anciens clients 5.36.5 : il exige un déploiement
coordonné et un plan de retour arrière.
