# TRACE 5.37.0 — Politique de cache de transition

**État : préparée en code, NON intégrée au service worker de production.**
La version 5.36.5 reste l'entrée stable. Son SW actuel supprime tous les caches sauf le sien à l'activation, y compris des caches étrangers. Ne jamais recopier cette politique dans le SW 5.37.

## Invariants vérifiés par le moteur candidat
- Une montée de version ne nettoie aucun cache sans nouvelles ressources et tous les clients concernés validés.
- Après validation, seuls d'anciens caches qui appartiennent explicitement à l'espace TRACE 5.37 peuvent être supprimés ; toujours conserver trace-shell-v5.36.5 le temps d'un rollback contrôlé.
- Les caches du laboratoire et des applications étrangères sont intouchables.
- L'allowlist exclut les réponses API, Auth, les URL distantes, les requêtes non-GET et les ressources portant Authorization/apikey.
- config.js, index.html non qualifié, sw.js et les anciennes ressources critiques ne sont pas considérés comme des fichiers cachables par la politique générique.
- Aucun déploiement, aucune inscription de worker et aucune suppression de cache réelle ne sont exécutés par ces tests.

## Contrôle de publication restant
Avant GO : remplacer l'entrée de production par un véritable build 5.37 vérifié, produire le service worker effectif et son manifeste de ressources, valider la compatibilité de mise à jour et le rollback sur Safari iPhone installé et dans un laboratoire HTTPS isolé. Sans cela, le contrôle renvoie NO-GO.

Outils : scripts/trace-537-cache-policy.cjs et tests/trace-537-cache-policy.test.cjs. Ces fichiers sont sur la branche candidate uniquement.
