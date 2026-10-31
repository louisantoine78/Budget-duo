# TRACE 5.37.0 — Matrice de confidentialité entre deux foyers

Statut : validation PostgreSQL fictive, branche candidate uniquement, production NO-GO.

La migration candidate d'écritures CAS conserve la lecture sous RLS et interdit les écritures directes. La recette PostgreSQL vérifie trois utilisateurs authentifiés répartis dans deux foyers distincts :

- Les deux membres du premier foyer peuvent lire ses comptes, membres et informations communes.
- Aucun ne peut lire le second foyer ou ses documents, ni y écrire par RPC.
- Le membre du second foyer ne peut ni lire les documents et membres du premier, ni écrire dans cet espace.
- Les documents du second foyer restent visibles pour leur propriétaire.
- Les contrôles précédents de permission directe, révision CAS, suppression et paramètres personnels restent actifs.

Les identifiants et claims JWT sont fictifs ; aucun Supabase hébergé n'est appelé. Cette recette ne remplace pas Auth/PostgREST/Realtime à deux sessions réelles et Safari physique.

Test : tests/trace-cas-exclusive-cutover.integration.cjs ; intégré aux garde-fous existants via PGlite isolé.

