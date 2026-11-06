# TRACE 5.37.0 — Répétition du démarrage avec authentification

Statut : **candidat seulement / production NO-GO**.

## Pourquoi
L'écran d'accueil fictif 5.37.0 ne teste pas l'initialisation réelle du client de session. Les entrées en production demeurent index.html, sw.js, v5-app-5.36.5.js, version 5.36.5. Une nouvelle version ne doit pas être considérée prête uniquement parce que le laboratoire fonctionne.

## Ce qui est maintenant testable, sans toucher la production
- Le script build-trace-537-auth-entry.mjs assemble une page hors production depuis le DOM de la 5.37.0 et les scripts publics d'amorçage du client de la version stable. Il ne copie ni ne lit le vrai config.js, refuse d'écraser les fichiers de production et ne déploie rien.
- Le test trace-537-auth-entry.test.cjs vérifie l'inventaire des scripts, l'absence de dépendances de démonstration, l'absence d'inscription de service worker et l'intégrité des entrées 5.36.5.
- Le scénario trace-537-auth-cutover.browser.cjs démarre sous Chromium avec des doubles fictifs pour la configuration et l'interface d'authentification. Les deux conditions attendues sont testées : configuration manquante, puis absence de session. Les vues financières ne sont pas déverrouillées, aucun appel externe ni écriture n'est permis, aucune migration n'est déclenchée.
- Le script trace-537-current-head-rehearsal.cjs appelle désormais cette vérification après les scénarios financiers et avant de considérer que le laboratoire local a passé la recette.

## Non qualifié, donc toujours bloquant
- Connexion véritable à un Supabase isolé de production, Auth/RLS/PostgREST/Realtime à deux utilisateurs, reconnexion et écritures concurrentes.
- Écran de connexion sur iPhone Safari et PWA installée, autorisation du service worker, reprise hors ligne et mise à niveau de caches depuis 5.36.5.
- Création d'une entrée de production 5.37 avec son manifeste, sa politique CSP, un worker mis à niveau sans effacer des caches étrangers, et les règles de rollback.
- Une sauvegarde réelle indépendamment vérifiée, l'autorisation du propriétaire et un GO financier explicite.

Ne jamais diffuser la page générée avec une configuration Supabase réelle et ne jamais l'utiliser pour une migration.
