# TRACE 5.37.0 International — sauvegarde et rollback

**Statut : NO-GO.** Ceci est une procédure de qualification. Aucun passage en production, migration SQL, modification Supabase réelle ou réactivation du débit différé n'est autorisé par ce document.

## Avant toute mise en ligne

1. Conserver le SHA exact du candidat, une copie vérifiée des assets de l'application stable et un responsable du GO/NO-GO.
2. Réaliser une sauvegarde PostgreSQL native, chiffrée et contrôlée, en plus de l'export JSON TRACE. Vérifier sa restauration dans une base totalement isolée.
3. Obtenir un export en lecture seule **cohérent dans le temps** des foyers, membres et documents. Vérifier séparément les comptes, les propriétaires, les révisions, les montants, les différentes devises et les autres tables métier. Ne pas copier de données personnelles dans les logs ou GitHub.
4. Relever indépendamment de l'archive le foyer, le nombre de membres, le total des documents, les quantités par collection et l'empreinte exacte du contenu. Une empreinte calculée depuis le snapshot à valider n'est PAS une preuve indépendante.

## Contrôles de l'export JSON local (exemples fictifs)

La commande fingerprint lit un **export source obtenu séparément**. Elle ne signe pas ses résultats et ne prouve pas, à elle seule, l'exhaustivité de la base.

~~~bash
node scripts/trace-snapshot.mjs fingerprint independent-source.json > independent-fingerprint.json
node scripts/trace-snapshot.mjs create raw-export.json backup.snapshot.json --source-commit 0123456789abcdef0123456789abcdef01234567
~~~

Avant extraction, obtenir la valeur payloadSha256 depuis independent-fingerprint.json et les comptages indépendants dans independent-collections.json. Ces fichiers doivent provenir de la même coupe cohérente des données.

Un inventaire SQL peut inclure des catégories à **zéro document**, par exemple `{"accounts":2,"transactions":12,"budgets":0}`. TRACE accepte ces zéros dans le fichier de comptages indépendants, tout en exigeant une correspondance exacte de chaque catégorie **non vide**. Un total positif manquant, différent, négatif ou fractionnaire bloque la restauration. Les comptages et l'empreinte doivent être calculés sur la même coupe cohérente des données source.

~~~bash
node scripts/trace-snapshot.mjs unpack backup.snapshot.json restored-export.json \
  --expected-household-id 00000000-0000-4000-8000-000000000001 \
  --expected-source-commit 0123456789abcdef0123456789abcdef01234567 \
  --expected-documents 14 \
  --expected-members 2 \
  --expected-collections independent-collections.json \
  --expected-payload-sha256 "$EXPECTED_SOURCE_PAYLOAD_SHA256"
~~~

L'extraction impose ces contrôles. Si un seul échoue, aucun fichier de restauration ne doit être créé. Les commandes ci-dessus ne se connectent pas à une base et ne permettent pas de restaurer PostgreSQL.

## Exercice obligatoire de restauration / retour arrière

1. Installer les migrations candidates 05–12 **uniquement** dans PostgreSQL ou PGlite fictif et isolé, avec deux membres et une troisième identité étrangère. Tester la sécurité RLS, CAS, les conflits, les comptes personnels, les droits d'écriture et la quarantaine différée.
2. Restaurer la sauvegarde PostgreSQL native sur une seconde base isolée. Réconcilier les nombres, les identités, les versions et les montants (CAD/EUR et cartes) avec la source indépendante.
3. Simuler un incident, figer les nouvelles écritures, puis effectuer réellement un retour arrière complet sur l'environnement de test. Vérifier l'accès, les comptes, les montants et l'absence de doublons après reprise.
4. **Attention :** la migration 12 retire aux anciens clients 5.36 leurs accès d'écriture directe. Revenir seulement aux anciens fichiers web ne restaure pas ces permissions. Toute procédure SQL de retour arrière doit être conçue et qualifiée séparément ; ne jamais rendre les tables librement modifiables pour dépanner.
5. Terminer la recette Safari/iPhone, PWA hors ligne et cache, puis obtenir une décision de déploiement explicite.

**Arrêt immédiat (NO-GO) :** PGlite/PostgreSQL fictif indisponible, sauvegarde native non restaurée, empreinte externe absente, contrôle RLS ou financier en échec, rollback non éprouvé, ou tests iPhone non validés. Ne jamais substituer la base hébergée réelle à un environnement de test.

La sauvegarde JSON est un export portable vérifiable ; **elle n'est pas un rollback PostgreSQL certifié**. TRACE_DEFERRED_NOT_RELEASED reste actif.
