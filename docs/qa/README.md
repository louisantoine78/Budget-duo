# Preuves de qualification locale TRACE 5.37.0

Ces rapports concernent le code référencé dans `TRACE-5.37.0-QUALIFICATION.json`, puis vérifié par empreinte au HEAD de consolidation. Aucun déploiement, CI ou accès aux données financières Supabase réelles.

- `trace-5.37.0-native.json` : Node v24, syntaxe et chaque fichier natif, y compris les tests à dépendances simulées.
- `trace-5.37.0-chromium.json` : vrai Chromium, application et worker local ; montants fictifs et persistance en mémoire. Les URL localhost ne sont pas des liens publiés.
- `trace-5.37.0-postgresql.json` : PostgreSQL 17 embarqué, schéma du dépôt et données fictives ; transport et Auth remplacés. Tests de diagnostic de failles réussis, `productionReady:false`.
- `trace-5.37.0-valet.json` : vraies réponses publiques historiques, aucune donnée bancaire ou de foyer.

Le manifeste conserve les empreintes des rapports et des sources. `node scripts/trace-release-preflight.mjs` les contrôle en lecture seule et retourne 2 tant que la décision reste NO-GO. Ces fichiers ne constituent pas une attestation Safari, un test Supabase hébergé ou une autorisation de publier.
