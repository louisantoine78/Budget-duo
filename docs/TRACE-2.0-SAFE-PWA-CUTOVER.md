# TRACE 2.0 — migration PWA 5.36.5 vers 5.37.0 (candidat non publié)

**Date : 4 novembre 2026. Décision : NO-GO production.**

## Problème confirmé

Le service worker de main 5.36.5, fichier sw.js, utilise le cache
trace-shell-v5.36.5. Son gestionnaire activate efface tous les caches dont
le nom est différent. Une simulation sur son code Git exact reproduit la
suppression de caches sans rapport avec TRACE. Les travaux proposés ne modifient
ni ce fichier stable ni la production.

## Implémentation candidate isolée

- scripts/trace-20-cutover-worker.cjs génère un candidat exclusivement
  hors dépôt avec l'option --out /tmp/trace20.js ; aucun enregistrement.
- Nom de cache 5.37.0 calculé par SHA-256 sur les octets de cinq ressources
  JS/CSS non personnalisées ; préchargement limité à ces fichiers.
- Aucun skipWaiting automatique : le worker attend une activation volontaire.
- Message d'activation TRACE_2_0_ACTIVATE associé à l'empreinte du worker.
  L'interface de consentement n'est PAS encore raccordée.
- Aucune suppression de cache, pas de clients.claim automatique :
  l'ancien cache 5.36.5 et tous les caches tiers sont conservés.
- Les navigations s'effectuent par le réseau sans sauvegarder de HTML
  authentifié. Hors ligne, réponse 503 inerte sans finances réelles.
- Aucun stockage d'authentification, reçus bancaires, données JSON, POST,
  URL externes, paramètres d'URL ou requêtes avec autorisation.

## Tests exécutés — données entièrement fictives

1. Tests unitaires Node : 9/9, anciens et nouveaux comportements V8.
2. Tests vrais navigateurs Chromium et WebKit Linux avec service workers :
   - installation du worker stable exact au scope racine localhost ;
   - création de caches tiers et d'un brouillon fictif non enregistré ;
   - nouvelle version en attente sans activation automatique ;
   - conservation du cache stable, des caches tiers et du brouillon ;
   - activation volontaire et rechargement ;
   - coupure réseau : erreur HTTP 503 sans afficher de données financières ;
   - reconnexion : brouillon fictif toujours présent ;
   - cinq assets JS/CSS dans le seul cache nouveau ;
   - aucune erreur JavaScript dans ces scénarios.

## Limites avant production

- Le worker est un prototype de migration, pas le sw.js actuellement
  enregistré par TRACE : aucun utilisateur réel ne bénéficie de cette
  correction à ce stade.
- Il ne valide pas la migration du véritable moteur Supabase, des opérations
  en attente ou d'un historique financier. Le comportement hors ligne
  reste volontairement restrictif, donc pas encore fonctionnel pour l'app.
- Il manque une véritable entrée de production 2.0 et sa liste d'assets
  exhaustive, plus une interface de consentement coordonnée avec les
  écritures en cours et le contrôle de la mise à jour entre plusieurs onglets.
- iPhone Safari physique, PWA installée, échecs d'installation, conflit
  multi-onglet et compatibilité du moteur financier : QA à terminer.
- L'ancien worker 5.36.5 peut encore effacer des caches tiers lors de sa
  propre activation avant cette mise à jour. Cette limite est connue.
- Auth/RLS/CAS hébergés, imports bancaires complets, sauvegarde PostgreSQL
  indépendante, restauration et GO humain restent bloquants.

**Interdit à ce stade :** remplacer sw.js, fusionner dans main, déployer en
production, modifier Supabase réel ou activer le débit différé.

## Qualification complémentaire multi-onglets et consentement — 4 novembre

Une seconde passe a renforcé le candidat **sans intégrer de code dans la
PWA de production**.

- Le worker refuse désormais un message incomplet : version de cache erronée,
  absence de confirmation explicite ou absence d'identifiant de client.
- Avant l'activation, le worker interroge la liste de ses clients navigateur,
  y compris ceux encore contrôlés par l'ancien worker 5.36.5, et exige
  une seule fenêtre présente. Avec deux onglets, il renvoie
  TRACE_2_0_BLOCKED et ne s'active pas.
- Un adaptateur de consentement dans
  scripts/trace-20-upgrade-consent.cjs est préparé pour l'intégration future.
  Il exige des lectures de sécurité vérifiées et durables :
  0 écriture, 0 synchronisation, 0 import, 0 brouillon non sauvegardé ;
  la connexion réseau disponible et un consentement utilisateur explicite.
  Tous ces critères sont revérifiés après confirmation.
- L'adaptateur doit recevoir les vrais compteurs du moteur financier
  **après** une revue dédiée. Les tests emploient des compteurs fictifs :
  ils n'attestent pas l'absence d'écritures réelles.
- La réponse activation-requested ne constitue PAS un succès de migration ;
  seul le navigateur constate ensuite le worker actif après rechargement.
- Sur deux vrais moteurs de navigateur (Chromium et WebKit Linux),
  l'ouverture d'un deuxième onglet empêche l'activation.
  Après fermeture de cet onglet et consentement valide, la transition
  fonctionne avec brouillon fictif intact, cache 5.36.5 préservé et
  réponse 503 hors ligne. Erreurs JavaScript : zéro.
- Les essais supplémentaires couvrent les refus d'utilisateur, les
  brouillons non sauvegardés, les écritures en cours et le changement
  des écritures pendant que la confirmation est affichée.

**Limites inchangées :** la gestion réelle des sauvegardes et des queues
d'écriture du moteur TRACE reste à brancher ; l'interaction premium de
consentement et l'acceptation physique sur Safari iPhone restent à faire.
Cette QA ne donne pas GO production.
