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
