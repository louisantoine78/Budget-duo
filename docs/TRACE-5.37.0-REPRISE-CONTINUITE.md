# TRACE 5.37.0 International — point de reprise permanent

**Date du point de reprise : 28 octobre 2026.**

**Utilisation :** ce document permet de continuer le projet depuis une nouvelle conversation ChatGPT, sans dépendre de la longueur du chat ou de l'existence d'une sandbox éphémère. Toujours consulter le **HEAD réel** de GitHub avant d'agir. **Ne pas repartir de zéro** et ne pas supposer que les observations ci-dessous restent exactes après de nouveaux commits.

## Dépôt, branches et état vérifié

- Dépôt : `louisantoine78/Budget-duo`
- **Branche de travail exclusive :** `trace-5.37.0-international-accounts-fx`
- HEAD vérifié **avant création de ce document** : `bd930ce9929590a2b76b076f178063e86e1c9d84` — `fix(trace): cache protected HTTPS preview static assets with same-origin session [skip ci]`
- La version stable **`main` doit rester inchangée** : `02c70f50e7e51da79b77a91dde96a03c6c719909` lors du dernier contrôle.
- Lors de cette reprise, une machine de test éphémère a expiré. **Ne jamais compter sur son système de fichiers** : repartir de la branche distante réelle.
- Ne pas modifier les données utilisateur, les projets Supabase réels, les migrations de production, les sauvegardes réelles ni la branche `main`. Commits exclusivement sur la branche 5.37 et **messages avec `[skip ci]`**.
- Déplacer la référence de branche avec contrôle CAS (`expected_sha`, `force:false`) et vérifier l'arbre Git exact après publication.

## Mission et logique validée

TRACE est une PWA premium de gestion budgétaire individuelle et de couple, prioritairement iPhone/Safari, avec comptes FR/CA, cartes canadiennes à crédit, débit immédiat, débit différé français, CAD/EUR/USD/GBP/CHF, import CSV/PDF, rapprochement, partage Moi/Élise/Nous/amis, épargne/patrimoine, UX accessible, sécurité et prévention des doubles écritures.

Les décisions d'architecture et d'UX ont déjà été validées. Ne pas réinventer la conception. Les règles financières à préserver :
- Paiement d'une carte canadienne = sortie du compte courant et réduction **équivalente** de la dette de carte, **neutre** sur la dépense budgétaire.
- Le changement ultérieur du compte de règlement d'une carte ne doit **pas** invalider rétroactivement ses remboursements correctement confirmés.
- Débit différé français : les dépenses sont imputées selon leur date d'achat, le débit bancaire intervient à une échéance mensuelle paramétrée ; le posting n'est pas encore libéré.
- Virements multidevises et conversions explicites, sans créer de fausse valeur en CAD si le taux manque.
- Import CSV idempotent ; lignes illisibles retenues pour vérification et consentement explicite quand nécessaire ; pas de réimport fictif des mêmes lignes.
- Ne jamais compromettre l'ownership/RLS, les contrôles CAS, les protections de restauration et la traçabilité.

## Acquis techniques déjà committés

1. Fondations banque/comptes/multidevises, garde-fous d'écriture et migrations jusqu'à `migrations/12-trace-cas-exclusive-write-cutover.sql`.
2. Recettes Chromium complètes sur opérations fictives (34 parcours), remboursements cartes, EUR/USD, imports PDF/CSV, rapprochement, épargne et partage.
3. Qualité UX : petits écrans, contraste, labels accessibles et interactions tactiles.
4. Recette WebKit Linux et émulation tactile, navigation, rotation, conservation de brouillon et PWA hors connexion. Ce n'est **pas** Safari sur un iPhone physique.
5. Test de mise à jour du service worker avec deux générations : pas de rechargement forcé si une saisie est en cours ; nouveau cache activé après choix explicite.
6. **Export isolé installable du laboratoire fictif** : `scripts/export-trace-537-preview.mjs`. Il copie seulement les actifs de la liste blanche du worker vers un répertoire vide et exclut `config.js`, code cloud, point d'entrée de production, migrations et données réelles ; entrée `trace-international-preview.html`.
7. Commit `bd930ce9929590a2b76b076f178063e86e1c9d84` : ajustement des téléchargements des actifs du service worker avec `credentials: same-origin` pour la prévisualisation HTTPS protégée. **Vérifier sur la vraie URL protégée** avant toute conclusion.

Les derniers tests complets rapportés avant ce checkpoint : **108 suites Node / 1 741 scénarios recensés**, **34 parcours financiers Chromium**, recette de l'export statique fictif sur les formats 320/390/768/1440 avec rechargement hors connexion, et **17 garde-fous officiels** dont 4 suites PostgreSQL/PGlite, réussis sur l'arbre exact du commit d'export `d35276b4a524822292ba1cce6f9fc1ab279813c6`. Pour le commit ultérieur `bd930ce9929590a2b76b076f178063e86e1c9d84`, **ne pas extrapoler** : refaire sa qualification et vérifier la prévisualisation HTTPS.

## Fichiers d'entrée essentiels

- `trace-international-preview.html` et `trace-international-preview.webmanifest` — laboratoire PWA fictif, CSP `connect-src 'none'`.
- `trace-international-preview-sw.js` — worker limité à l'entrée de laboratoire et aux actifs fictifs.
- `scripts/build-trace-preview-pwa.mjs` — manifeste de cache déterministe et `--check`.
- `scripts/export-trace-537-preview.mjs` et `tests/trace-preview-export.test.cjs` — paquet statique à liste blanche.
- `scripts/trace-browser-537-qa.cjs` — Chromium/WebKit, touch et hors connexion ; variable `TRACE_LAB_ROOT` pour qualifier un export.
- `tests/trace-candidate.browser.cjs` — 34 scénarios financiers Chromium.
- `scripts/trace-preview-upgrade-qa.cjs` — activation volontaire du nouveau service worker.
- `scripts/test-trace-native.mjs` — régression Node.
- `scripts/check-trace-537-release-gates.cjs` — garde-fous de sortie (les conditions manuelles ne sont pas franchies).
- `docs/TRACE-5.37.0-BROWSER-PWA-QA.md` — recettes navigateur, cache, export et HTTPS.
- `docs/TRACE-5.37.0-IPHONE-SAFARI-SIGNOFF.md` — procédure iPhone physique toujours à exécuter.
- `docs/TRACE-5.37.0-BACKUP-ROLLBACK-RUNBOOK.md` — restaurations, migration et limitations.

## Où reprendre, dans l'ordre

1. **Inspecter le HEAD réel de la branche**, la dernière série de commits, le statut des fichiers et le HEAD de `main`. Lire ce document et les guides iPhone / export / rollback. Ne pas se fier à une sandbox d'une ancienne conversation.
2. Vérifier les modifications du commit `bd930ce9929590a2b76b076f178063e86e1c9d84` : accès authentifié aux actifs statiques sur une prévisualisation HTTPS Vercel protégée ; éviter toute exposition publique ou variable d'environnement réelle.
3. Régénérer **dans un dossier temporaire vide** l'export de laboratoire : `node scripts/export-trace-537-preview.mjs --out /tmp/trace-537-lab`. Vérifier sa liste blanche, ses sommes SHA-256, son manifeste et l'absence de `config.js` / `cloud.js`.
4. Rejouer la recette navigateur sur **le dossier exporté**, et celle de mise à jour PWA ; tester ensuite WebKit. Exécuter la régression Node complète et les garde-fous PostgreSQL/Git. Corriger tout vrai défaut avant publication.
5. Préparer une **URL HTTPS de prévisualisation privée dédiée** contenant seulement l'export, sans modifier les domaines ni la production existants. Ne pas déployer la branche brute du dépôt (qui inclut aussi le code réel). Contrôler les accès Vercel.
6. Faire la recette manuelle iPhone/Safari (clavier iOS, VoiceOver, ajout à l'écran d'accueil, rotation réelle, arrière-plan, mode avion, réinstallation, mise à jour protégée). Demander une exécution humaine, car une microVM ne peut pas simuler ces conditions fidèlement.
7. Avant toute libération réelle : sauvegarde et restauration PostgreSQL, revue de migration/rollback, permissions et fonctions RPC, validation des parcours financiers avec les données autorisées, choix de déploiement et **accord explicite du propriétaire**.

## Gardes non négociables

- **Production : NO-GO** tant que toutes les validations manuelles/financières et l'accord explicite ne sont pas obtenus.
- Ne pas toucher `main` et ne pas lancer automatiquement CI/CD de production : `[skip ci]` à chaque commit candidat.
- Pas de connexion à des comptes ou données réelles dans les tests du laboratoire.
- Les tests de WebKit Linux et Chromium **ne constituent pas** une recette sur Safari/iPhone réel.
- Ne pas prétendre qu'une URL HTTPS est déployée sans vérifier son existence et son accès.
- Si une sandbox disparaît, récupérer **GitHub HEAD**, ce document et les scripts ; ne pas réinventer ni promettre du travail asynchrone.

## Prompt minimal de secours

> Reprends TRACE 5.37.0 International dans `louisantoine78/Budget-duo`, sur la seule branche `trace-5.37.0-international-accounts-fx`. Lis `docs/TRACE-5.37.0-REPRISE-CONTINUITE.md`, inspecte le HEAD réel et `main`, puis poursuis la préparation de la prévisualisation HTTPS privée et la qualification iPhone/financière sans toucher à la production. Ne recommence pas la conception ; teste puis commit uniquement des changements vérifiés avec `[skip ci]`. Explique ce que tu as réellement réalisé et les blockers.

## Avancée de la qualification après le checkpoint `aa7f170` — 28 octobre 2026

Une nouvelle sandbox Vercel isolée, réinitialisée depuis le SHA `aa7f170`, a regénéré l'export fictif, réussi les 2 tests d'export et rejoué la régression Node (108 fichiers / 1 742 scénarios / zéro échec). Les recettes Chromium et WebKit Linux sur **le dossier exporté** passent sur 320, 390, 768 et 1 440 px avec navigation et fonctionnement hors ligne. Le garde-fou officiel a validé ses 17 contrôles, dont les quatre suites SQL PGlite, sur un clone Git à historique complet. Ces résultats n'incluent pas Safari iOS physique.

Le test de mise à jour `scripts/trace-preview-upgrade-qa.cjs` avait une lacune d'isolation : il servait directement le checkout. Il a été corrigé pour accepter `TRACE_LAB_ROOT` et refuser un répertoire sans preuve `trace-lab-export-audit.json`. Recette de mise à jour sur l'export : PASS (brouillon préservé, activation volontaire et cache périmé supprimé) ; répertoire non autorisé : refus vérifié. Les commandes et preuves de test sont détaillées dans `docs/TRACE-5.37.0-BROWSER-PWA-QA.md`.

Une prévisualisation antérieure existe dans le projet Vercel indépendant `trace-537-iphone-lab`, marquée READY et protégée par Vercel Authentication. Une requête sans connexion a obtenu HTTP 302 vers SSO, mais aucune preuve de fonctionnement **authentifié** et de cache `credentials: same-origin` n'a été recueillie. Ne créer aucun lien de contournement public. Prochaine action : qualification HTTPS sous session autorisée, puis recette iPhone physique. **Production : NO-GO**, sans modification de `main` ni du Supabase réel.

Toujours relire le HEAD distant avant de travailler : ce paragraphe documente un checkpoint, et non un SHA actuel immuable.

## Checkpoint suivant — durcissement du cache HTTPS fictif (28 octobre 2026)

Après le HEAD `cf9216d2`, un test HTTPS local à session fictive a mis en évidence un risque non couvert : lorsque l'installation du service worker rencontre une redirection vers la connexion, une ancienne version pouvait laisser un cache de génération contenant une réponse inappropriée. Le générateur du worker a été durci avec `redirect:'error'` et suppression de la génération incomplète en cas d'échec. Le test de régression `scripts/trace-protected-preview-qa.cjs` passe sur le nouvel export et échoue délibérément sur l'ancien export ; 68 actifs statiques mis en cache sur 69 fichiers exportés. Le test `tests/trace-preview-offline-readiness.test.cjs` a été adapté au mode `TRACE_LAB_ROOT` ajouté au checkpoint précédent.

Les recettes navigateur Chromium/WebKit et mise à jour contrôlée du cache ont été relancées sur l'export corrigé : PASS. Voir `docs/TRACE-5.37.0-BROWSER-PWA-QA.md` pour la preuve et la commande de reproduction. **Ne pas présenter ce test HTTPS simulé comme une validation Vercel SSO réelle.** Le déploiement Vercel existant est antérieur à cette correction. Aucune nouvelle mise en ligne du laboratoire ni production réelle n'a été autorisée. Toujours vérifier le dernier SHA distant avant toute reprise, puis faire la recette iPhone/Safari physique et les validations finales de migration et de finance.

## Contrôle additionnel HTTPS : réponse de connexion HTTP 200 (28 octobre 2026)

Nouvelle régression reproductible : une réponse HTTP 200 de type `text/html` à la place d'un actif statique échappait au rejet des redirections 302 et pouvait être conservée dans le cache de la PWA fictive. Le test `scripts/trace-protected-preview-qa.cjs` démontre l'échec de l'ancien worker, et vérifie maintenant les deux modes de défaillance (302 et 200). Le générateur a été renforcé : `Cache.addAll` natif puis inspection des réponses en cache (URL exacte, statut, type MIME), suppression de la génération incorrecte. Un essai intermédiaire utilisant des `fetch()` concurrents a été volontairement abandonné parce qu'il empêchait l'installation sur Chromium ; la solution finale utilise la mise en cache native vérifiée. Les tests de sécurité unitaires rejettent également une réponse hors origine. La recette Chromium/WebKit Linux, l'actualisation contrôlée et le rechargement hors ligne sont réussis sur l'export final.

Ne pas confondre la réussite de l'HTTPS local à cookie fictif avec une connexion Vercel SSO autorisée ; le déploiement isolé existant est plus ancien. Conserver le blocage production : Safari physique, vraie prévisualisation privée, sauvegarde/restauration, migration et validation financière restent nécessaires.

## Reprise du 28 octobre — contrôle tactile et régression financière

À la reprise du HEAD `70de2d5a`, la revue ciblée de la PWA fictive a confirmé 34/34 parcours financiers réels Chromium (sur fixtures), sans accès à Supabase. Un contrôle WebKit mobile a trouvé un bouton Aide/Guide trop petit (36 × 36 px). Le style **spécifique 5.37.0** assure maintenant au moins 44 × 44 px à 320/390 px ; la recette de navigateur l'impose. Le générateur de cache et l'export statique ont été regénérés ; Chromium, WebKit, HTTPS fictif et mise à jour SW sont validés sur les artefacts locaux (un timeout WebKit en exécution parallèle n'a pas été reproduit au second lancement seul).

**Pourcentage de pilotage : environ 90 %, estimation indicative**, et non taux d'achèvement certifié. Les contrôles automatiques ne remplacent pas l'essai physique iPhone/Safari, la vraie prévisualisation Vercel authentifiée, les validations finance, migration et restauration PostgreSQL. Respecter l'interdiction de toucher `main` et les données réelles ; production : NO-GO.
