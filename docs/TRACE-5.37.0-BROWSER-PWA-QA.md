# TRACE 5.37.0 — laboratoire Chromium / PWA

**Date :** 28 octobre 2026. **Candidate vérifiée :** `7a18e3494a4f9c3b60fb56b1b2e4d67b9f13ab0a`.
**Statut :** tests Chromium fictifs réussis ; **NO-GO production** jusqu'à la recette iPhone/Safari, à la validation financière et à l'autorisation explicite du propriétaire.

## Preuve enregistrée

Le script optionnel `scripts/trace-browser-537-qa.cjs` a été exécuté dans Vercel Sandbox éphémère (projet de prévisualisation, sans secrets, sans accès à Supabase ni à la production), avec Playwright Core 1.64.1 et Chromium 153.

- Formats : **320, 390, 768, 1 440 px**.
- Navigation réelle : **4 onglets x 4 formats = 16 transitions** ; bon panneau et onglet actif à chaque fois.
- Dans les quatre formats, aucun débordement horizontal global du document ; libellés visibles et zones tactiles de la navigation d'au moins **44 × 44 px**.
- **Zéro erreur JavaScript** et **zéro réponse HTTP d'erreur** pour les ressources locales du laboratoire.
- **Rechargement sans réseau** à 390 px : service worker contrôlant la page, cache statique vérifié, rechargement hors ligne fonctionnel, navigation vers Activité conservée.
- Aucun accès réseau externe accepté par le test. Les données sont entièrement fictives.

## Reproduire sur une machine isolée

1. Récupérer le commit candidat exact, ouvrir la copie du dépôt dans une machine de test éphémère, puis installer les outils de navigateur hors du dépôt. Utiliser des polices système valides pour Chromium.
2. Fournir les chemins du module `playwright-core` et de l'exécutable Chromium via les variables d'environnement :

```sh
TRACE_PLAYWRIGHT_MODULE=/tmp/trace-browser-deps/node_modules/playwright-core \
TRACE_CHROMIUM_EXECUTABLE=/tmp/chromium \
node scripts/trace-browser-537-qa.cjs --report /tmp/trace-537-browser-qa.json
```

Le script démarre un serveur **uniquement sur 127.0.0.1**, bloque toute requête sortante et échoue si une navigation, un contrôle PWA ou le chargement d'un fichier échoue. Il ne modifie aucune donnée bancaire et n'est pas lancé par la campagne Node standard.

## Limites avant GO

- Chromium sur des dimensions d'écran similaires à celles des iPhone **n'est pas Safari/iOS**. La recette Safari sur de vrais appareils et l'installation depuis l'écran d'accueil sont toujours obligatoires.
- Aucun parcours d'inscription ou de connexion réel, synchronisation Supabase, migration hébergée, import de véritable relevé ou capture iOS n'a été effectué dans ce laboratoire.
- Les dimensions globales et les cibles principales sont couvertes ; les sous-éléments, tableaux, graphiques, lecteurs d'écran, orientations et textes agrandis demandent une revue humaine plus approfondie.
- La restauration PostgreSQL native et le rollback ont été qualifiés séparément avec données fictives dans `TRACE-5.37.0-NATIVE-POSTGRES-ROLLBACK-QA.md`.

**Production : NO-GO.** Aucun changement à la branche stable ni au déploiement n'est autorisé par ce document.



## Qualification WebKit Linux et émulation tactile — 28 octobre 2026

Le même script de qualification navigateur prend désormais en charge Chromium
(par défaut) et WebKit sous Linux, sans charger de services externes.

En mode WebKit, les vues 320 et 390 px simulent le tactile iPhone : navigation
par tap, vrais événements touchstart, soldes fictifs, quatre onglets, contrôles
des formulaires, du graphique et rechargement PWA hors connexion. Le test
respecte le même blocage réseau que la version Chromium.

Commande dans une microVM Linux isolée avec Playwright WebKit installé :

    TRACE_BROWSER_ENGINE=webkit PLAYWRIGHT_BROWSERS_PATH=/tmp/trace-pw-browsers \
    TRACE_PLAYWRIGHT_MODULE=/tmp/trace-webkit/node_modules/playwright-core \
    node scripts/trace-browser-537-qa.cjs --report /tmp/trace-537-webkit-qa.json

WebKit Linux ne remplace pas Safari sur iPhone réel. Clavier logiciel, VoiceOver,
installation à l'écran d'accueil, reprise d'arrière-plan et réseau instable
restent à qualifier sur un véritable appareil. Production : NO-GO.


## Rotation et changement d'onglet (WebKit Linux uniquement)

La recette WebKit couvre désormais un scénario complémentaire à **390 px
en portrait / 844 × 390 px en paysage** : ouvrir une opération fictive,
saisir un brouillon sans l'enregistrer, pivoter, vérifier qu'il reste
éditable et que le formulaire défile verticalement, revenir en portrait,
annuler sans écriture puis vérifier le retour après changement d'onglet.

Le second onglet est lui aussi isolé du réseau externe. Le scénario
teste le redimensionnement WebKit et l'activité entre onglets, **pas**
la suspension réelle d'une PWA par iOS, la rotation physique du
capteur ni le comportement du clavier logiciel. Ces vérifications
restent manuelles sur appareil réel et n'autorisent pas la production.

## Mise à jour contrôlée du cache avec formulaire ouvert

Le laboratoire possède désormais un test Chromium qui sert deux versions
consécutives du service worker sur une origine locale éphémère. Il confirme :

- lorsqu'une nouvelle version arrive pendant un brouillon, aucun rechargement
  automatique ne se produit et le texte saisi reste intact ;
- un avertissement est lisible dans la fenêtre d'édition ouverte, même si
  le bouton de mise à jour reste derrière cette fenêtre ;
- le bouton devient accessible après fermeture volontaire du formulaire ;
- l'utilisateur déclenche explicitement l'activation et le rechargement ;
- un seul cache statique de la nouvelle génération subsiste après l'activation ;
- le statut hors connexion est à nouveau vérifié, sans erreur JavaScript.

Pour reproduire sans service externe ni données réelles :

    TRACE_PLAYWRIGHT_MODULE=/tmp/trace-browser/node_modules/playwright-core \
    TRACE_CHROMIUM_EXECUTABLE=/tmp/chromium \
    node scripts/trace-preview-upgrade-qa.cjs --report /tmp/trace-upgrade.json

Ce contrôle valide uniquement la **PWA fictive de laboratoire**.
Il ne prouve pas la mise à jour de la PWA de production ni le comportement
Safari lors de la suspension réelle par iOS. Production : NO-GO.

## Export installable à fichiers limités

Le script scripts/export-trace-537-preview.mjs vérifie le cache statique
de la branche candidate, l'isolation CSP et le manifeste, puis n'exporte
que la liste blanche explicite du service worker, sans copier le dépôt.
Il produit un inventaire SHA-256 de tous les fichiers et refuse une
destination non vide ou un chemin arbitraire dans le dépôt.

Pour préparer une prévisualisation HTTPS, générer dans un répertoire
isolé (par exemple /tmp/trace-537-lab), puis publier uniquement son
contenu. L'entrée PWA installable demeure
/trace-international-preview.html, avec des données fictives et une
portée de service worker limitée à cette page. Aucun déploiement
ou changement de données de production n'est autorisé par ce protocole.


## Cookie d'accès sur prévisualisation HTTPS protégée

Pour le laboratoire hébergé derrière Vercel Authentication, les fichiers
statiques figurant dans la liste blanche du worker sont désormais lus avec
credentials: same-origin. Le navigateur peut ainsi présenter le cookie de
session uniquement à son propre domaine HTTPS. Aucun accès aux API externes,
à Supabase ou aux données financières n'est autorisé ; le cache demeure limité
aux fichiers fictifs. Le comportement sur la véritable URL protégée doit
être revérifié après chaque reconstruction du worker.

## Nouvelle qualification isolée — reprise du 28 octobre 2026

Référence du checkout réellement testé : `aa7f17025db1a14391832252b1ba4a21c174ad5c` (la documentation et le correctif décrits ci-dessous donnent lieu à un commit ultérieur). `main` est restée à `02c70f50e7e51da79b77a91dde96a03c6c719909` pendant la recette.

- Export du laboratoire : `node scripts/build-trace-preview-pwa.mjs --check` et `node scripts/export-trace-537-preview.mjs --out /tmp/trace-537-qa-export` réussis ; 69 actifs autorisés, métadonnées d'audit séparées, aucune configuration ou migration réelle.
- Tests export : 2/2 ; régression Node : 108 fichiers, 1 742 scénarios recensés, zéro suite en échec.
- Chromium et WebKit Linux exécutés sur `TRACE_LAB_ROOT=/tmp/trace-537-qa-export` : quatre formats 320/390/768/1440 px, 16 transitions et chargement hors connexion réussis, aucun échec recensé.
- Garde-fous : 17 vérifications automatisées réussies, y compris les quatre suites PostgreSQL/PGlite isolées, après récupération de l'historique Git complet. Production toujours NO-GO.
- Le script `scripts/trace-preview-upgrade-qa.cjs` accepte désormais `TRACE_LAB_ROOT` et refuse explicitement une destination sans `trace-lab-export-audit.json`. Sa mise à jour à deux générations, exécutée sur l'export fictif, a réussi : brouillon protégé, activation volontaire et ancien cache supprimé.
- Vercel : le projet distinct `trace-537-iphone-lab` a une authentification activée ; un déploiement antérieur (`bd930ce`) est déclaré READY. L'accès anonyme à sa page répond par HTTP 302 vers Vercel Authentication. Le contenu authentifié et le cache sous session réelle restent à vérifier : ne pas confondre ce contrôle avec une recette HTTPS authentifiée.

Reproduire le test d'activation **sur l'export**, après avoir installé Playwright et Chromium dans un environnement isolé :

```sh
TRACE_LAB_ROOT=/tmp/trace-537-qa-export \
TRACE_PLAYWRIGHT_MODULE=/chemin/isole/node_modules/playwright-core \
TRACE_CHROMIUM_EXECUTABLE=/chemin/isole/chromium \
node scripts/trace-preview-upgrade-qa.cjs --report /tmp/trace-537-upgrade-export.json
```

Restent impératifs : vraie session HTTPS protégée, Safari/iPhone physique, migration/rollback et validation financière finale. Aucun GO de production.

## HTTPS protégé : refus des redirections d'authentification — 28 octobre 2026

Base de cette nouvelle recette : `cf9216d2a30908a5ce08646ca2dfd74ad78c6569`.
Un nouveau test isolé `scripts/trace-protected-preview-qa.cjs` crée une origine HTTPS locale avec certificat éphémère et cookie de session **entièrement fictif**, sans identifiants Vercel/Supabase. Il ne sert que les fichiers de l'export dont il vérifie les SHA-256 et bloque les requêtes navigateur externes.

- Accès anonyme : redirection vers une page de connexion simulée.
- Accès authentifié : cookie transmis aux ressources et au service worker ; 68 actifs statiques mis en cache (l'export compte 69 fichiers applicatifs, dont le service worker non mis en cache), puis chargement hors connexion réussi.
- Session expirée pendant l'installation : une ressource est redirigée en HTTP 302 vers une fausse page de connexion. Le test reproduit une défaillance de l'ancienne génération : un cache non fiable subsistait. Le générateur `scripts/build-trace-preview-pwa.mjs` utilise désormais `Request(..., {credentials:'same-origin',redirect:'error'})`, et efface la nouvelle génération de cache en cas d'échec, sans supprimer le cache actif précédent.
- Validation du nouveau scénario : PASS. Le test sur l'ancien export échoue au contrôle d'absence de cache de connexion, puis passe sur l'export corrigé.
- Chromium/WebKit Linux sur l'export et test d'activation contrôlée : PASS sur les quatre formats déjà prévus. Le test statique de comportement du script `trace-preview-upgrade-qa.cjs` a été ajusté pour vérifier `TRACE_LAB_ROOT`.

Exécution reproductible depuis un checkout isolé, après export fictif et installation hors dépôt de Chromium/Playwright et OpenSSL :

```sh
TRACE_LAB_ROOT=/tmp/trace-537-auth-hardening TRACE_PLAYWRIGHT_MODULE=/chemin/isole/node_modules/playwright-core TRACE_CHROMIUM_EXECUTABLE=/chemin/isole/chromium node scripts/trace-protected-preview-qa.cjs --report /tmp/trace-auth-qa.json
```

**Portée stricte :** le certificat HTTPS et le cookie sont simulés ; ce test ne prouve ni l'accès authentifié réel sur Vercel, ni le fonctionnement de Safari sur iPhone. Aucune URL de partage public, migration, donnée réelle ou publication Vercel n'a été créée dans cette recette. Production : NO-GO.

## Régression HTTPS supplémentaire — page de connexion HTTP 200 (28 octobre 2026)

Après le correctif `71c89a514761ffb8ffd159475896494507d988e5`, le test isolé `scripts/trace-protected-preview-qa.cjs` a été étendu à une réponse **HTTP 200 text/html** qui imite une page de connexion à l'URL d'un fichier statique fictif (`vendor/pdfjs/LICENSE`). Cette situation ne comporte aucune redirection HTTP 302 et contournait donc le contrôle précédent : l'ancienne génération produisait un cache lab malgré le contenu non conforme (test initial rouge).

Le générateur `scripts/build-trace-preview-pwa.mjs` continue d'utiliser `Cache.addAll` avec `credentials:'same-origin'` et `redirect:'error'`, puis relit chaque entrée `Cache.match` **avant de valider l'installation**, vérifie exactement son URL, le statut HTTP 200, l'absence de redirection et le Content-Type statique attendu par extension. En cas de contenu inattendu (par exemple HTML sous un nom de fichier script, CSS ou LICENSE), le cache de génération est supprimé et le service worker ne s'active pas. Aucune origine externe ou API financière n'est mise en cache.

Preuves sur l'export fictif isolé : le scénario authentifié et le rechargement hors connexion réussissent avec 68 actifs, la redirection 302 et la page HTTP 200 HTML sont toutes deux refusées, et les caches invalides sont supprimés. Les tests unitaires du service worker incluent désormais le rejet d'une page HTML 200 et d'une URL de réponse extérieure. Chromium et WebKit Linux sur quatre résolutions et le test de mise à jour PWA restent PASS. Test exclusivement sur HTTPS local et cookie fictif : aucun test sur la session Vercel réelle ni sur iPhone Safari physique. La prévisualisation Vercel précédemment déployée utilise une version antérieure.

**Ne pas prendre ce succès de laboratoire comme un GO production** ; les contrôles humains d'accès HTTPS hébergé, de Safari iOS, de sauvegarde/rollback et de finances restent à effectuer.
