## 27 octobre — Preuve supplémentaire des octets binaires (mise à jour des 20 scénarios)

Un dernier test a été ajouté sur la branche candidate au commit **`31903f1fe23ac08ed62d705320090367b15abc51`**, `[skip ci]` : le **véritable générateur** cache une icône **PNG binaire** 1 × 1 du laboratoire temporaire, puis `--check` réussit. Une modification d'un octet du PNG **sans changement de nom ni de taille** fait échouer `--check` et le préflight natif ; l'inventaire nominal reste valide. Nouvelle empreinte Git du fichier de tests `tests/trace-preview-native-preflight-isolation.test.cjs` : **`a6813da97ed5da817a74e5a0717dea0f50ca818d`**, identique au miroir local exécuté.

**Bilan ciblé final : 21/21 tests réellement exécutés par Node v22.16.0**, 13 contrôles TAP + 8 tests du vrai générateur/runner/preflight sur **mini-laboratoire local fictif vérifié par blobs Git** ; zéro échec, zéro `skip`, zéro `todo`. **Cela ne qualifie pas les 106 fichiers de tests de la candidate complète.** Le SW GitHub demeure périmé (six modules différés manquants) et n'a été ni régénéré ni modifié. Toujours besoin du clone complet, génération via script officiel et `--check` au même HEAD, campagne Node réelle, Chromium/Safari iPhone et PG/PGlite isolé. Aucune CI/PR/merge/Vercel/Supabase réel/main ni changement de quarantaine. **Production NO-GO, 58 % ±10 historique inchangé.**

---

# TRACE 5.37.0 International — étapes restantes vérifiables (27 octobre 2026)

## 27 octobre — Contrôle natif supplémentaire du générateur (sans checkout intégral)

Le commit candidat `036f63f4da9e496df9e710eab76293f6e0b254bb` (`[skip ci]`) complète `tests/trace-preview-native-preflight-isolation.test.cjs` par **trois scénarios Node natifs** : modification d'octets d'un actif à taille et nom constants, altération directe du SW alors que les noms d'actifs restent corrects, refus des URL externes et chemins parents au sein du laboratoire. Le SHA Git exact du fichier de tests après commit est `680b87bd106400bc27efd522945b70650d7aa680`.

**Preuve exécutée en Node 22.16.0 : 20/20 scénarios ciblés**, répartis en **13** contrôles TAP et **7** essais du générateur officiel et préflight sur arborescence fictive temporaire. Les modules et tests utilisés ont des empreintes Git identiques aux fichiers GitHub candidats (générateur `2fbc9bd0`, runner `e638e0d4`, inventaire `6e4b69de`, contrôleur corrigé `5be1aa77`, tests TAP `63f5b378`, tests SW `680b87bd`). Le test octet prouve en laboratoire que `--check` utilise le contenu réel et pas seulement un inventaire de noms ; il ne régénère **pas** le SW enregistré dans Git.

**État de porte A : toujours NO-GO.** Les 106 fichiers de tests du checkout intégral n'ont pas été exécutés, les six modules de débit différé manquent toujours dans le SW candidat, aucun Chromium/Safari ni SQL PGlite/PostgreSQL sur la candidate complète. Récupérer le checkout réel, lancer le générateur officiel et `--check`, le `--preflight`, puis les 106 suites et la qualification serveur. Aucune autorisation de CI, PR, merge, Vercel ou Supabase réel ; `main` et `TRACE_DEFERRED_NOT_RELEASED` inchangés. Estimation indicative globale **58 % ±10**, pas de réestimation.

---


## 27 octobre — Garde anti-faux-positifs Node renforcée (porte A encore NON franchie)

- **GitHub contrôlé au début de cette reprise :** HEAD candidate `1aa3077a4a481139284fda802893e6d83a0f85a8` ; `main` inchangée `02c70f50e7e51da79b77a91dde96a03c6c719909`. Les commits du lot `2c0c4235` et `c169557c` sont exclusivement sur `trace-5.37.0-international-accounts-fx`, chacun avec `[skip ci]`.
- **Faux vert reproduit avec Node 22 natif :** un processus `node --test` retournait statut 0, `# tests 2`, `# pass 1`, `# skipped 1` ; le contrôleur précédent déclarait `passed=true`. Le contrôle refuse maintenant `pass !== tests`, ainsi que toute valeur `skipped`, `todo` ou `cancelled` non nulle, y compris dans un résumé contradictoire. Aucun test ignoré ne certifie la campagne.
- **Régression nouvelle : 13/13 tests `node --test` réels sous Node v22.16.0**, sur un *miroir isolé de deux fichiers* dont les SHA Git ont été comparés aux blobs exacts de GitHub après les deux commits : `5be1aa77fd1030a16751bf16f2af64df677a7ecc` (moteur) et `63f5b3787afa578345d23d5d327241f0a9db41d0` (tests). Cela comprend un vrai sous-processus Node avec test bancaire volontairement ignoré, maintenant refusé.
- **Limites fermes :** ce résultat n'est **pas** une exécution native des **106 fichiers `*.test.cjs` du checkout complet**, ni une régénération ou validation du SW laboratoire, ni Chromium/Safari, ni PostgreSQL/PGlite. L'environnement local ne résout toujours pas `github.com` pour `git clone`; le connecteur permet la lecture/écriture par fichier, mais pas la matérialisation vérifiée d'un checkout complet ici. Aucun SW réécrit ; les six modules différés restent absents du cache enregistré. La porte A est **NON franchie**.
- **Étape immédiate inchangée :** checkout intégral propre du SHA courant ; `node scripts/build-trace-preview-pwa.mjs` ; `node scripts/build-trace-preview-pwa.mjs --check` ; `node scripts/test-trace-native.mjs --preflight --report trace-preflight.json` ; puis `node scripts/test-trace-native.mjs --report trace-native-evidence.json`. Examiner chaque test ignoré comme blocage, sans le contourner. Sans droits supplémentaires : aucune CI, preview Vercel, Supabase réel, PR, merge ou changement de `main`. `TRACE_DEFERRED_NOT_RELEASED` maintenu. Production **NO-GO** ; estimation **58 % ±10**, non recalculée.

---


> Référence candidate au début de cette reprise : `e0dcb2cade5e1bed36d22f475051cfc5e2338d07`. Résoudre le HEAD réel lors de chaque reprise. Branche de développement unique : `trace-5.37.0-international-accounts-fx`. Stable `main` vérifiée : `02c70f50e7e51da79b77a91dde96a03c6c719909`.
>
> Cette page est un **suivi de portes de qualité**, pas une annonce de release. Aucun auto-déploiement, PR, merge, migration de base réelle ou passage en production. Tous les nouveaux commits sont `[skip ci]`. Quarantaine `TRACE_DEFERRED_NOT_RELEASED` maintenue.

## Ce qui a réellement avancé

L'application comprend déjà les grands parcours de gestion individuelle/Couple, l'architecture CAD/EUR et comptes courants/cartes, paiements de carte sans double dépense, achat/debit différé français modélisé sous quarantaine, historique et validation mensuelle, flux FX avec preuves natives, partage, imports, épargne et patrimoine. Les choix UX/UI premium antérieurs restent la référence, pas une nouvelle conception.

**Correctifs de cette session :**
- L'éditeur **Partage → Règlement entre partenaires** est limité à deux comptes courants **CAD** des membres respectifs. Les virements internationaux, les écritures non confirmées, les autres types de transaction et les comptes inadéquats ouvrent une fiche non modifiable, sans écriture.
- Les montants des règlements créés en CAD doivent être sûrs **au centime** et alimentent explicitement `bankAmount`, `toBankAmount`, `bankCurrency` et `toBankCurrency` en CAD, sans revenu ou dépense supplémentaire.
- Un règlement confirmé avec preuve bancaire ne peut changer son montant de relevé ou ses comptes bancaires de rattachement silencieusement.
- La carte **Accueil → Éléments à vérifier** inclut désormais les virements **reçus** sur ses comptes personnels actifs, comme « Activité → À valider », sans afficher le montant source d'un partenaire et sans emprunter une contrevaleur CAD pour un montant EUR manquant.
- Tests ciblés sur code candidat exécutés en V8 simulé : **8/8** garde-fous de règlement et **5/5** contrôles Accueil, auxquels s'ajoutent **35/35** contrôles Activité et **7/7** parcours de démarrage fictif rejoués après modification. Aucune de ces exécutions ne vaut **certification Node native intégrale**, ni navigateur réel, ni PostgreSQL.

## Portes restantes, dans cet ordre

### A — Candidat fictif local certifié : **non franchie**

1. Obtenir un checkout intégral, propre et vérifiable du HEAD actuel.
2. Exécuter **uniquement** `node scripts/build-trace-preview-pwa.mjs` pour reconstruire le SW **du laboratoire** puis `node scripts/build-trace-preview-pwa.mjs --check`. Ne jamais écrire les octets SW à la main. L'ancien cache Git manque toujours **six scripts différés** effectivement présents sur la branche.
3. Préqualifier rapidement avec `node scripts/test-trace-native.mjs --preflight --report trace-preflight.json`. Ce contrôle **lecture seule** compare l'inventaire HTML/manifeste au cache SW et lance le générateur officiel en `--check`. Il refuse les six fichiers manquants, les sources externes, les anciens caches et les identifiants/scope incorrects. **Un préflight vert retourne code 0, mais `report.passed=false` : aucun test financier n'a été exécuté.**
4. Lancer ensuite `node scripts/test-trace-native.mjs --report trace-native-evidence.json` pour vérifier l'intégralité des **106 suites `*.test.cjs`** actuellement recensées (dont les nouvelles suites `trace-preview-static-inventory.test.cjs` et `trace-preview-native-preflight-isolation.test.cjs`). Le runner refuse une suite manquante/vide et un résultat zéro-test. Corriger tout échec ; ne jamais ignorer une suite.
5. Vérifier que les tests natifs, l'empreinte du SW et les garde-fous financiers sont cohérents avec **le même HEAD**. Ne pas mélanger les rapports d'anciennes branches.

**Condition de sortie :** SW généré et `--check` vert + runner Node vert et identifié par SHA + zéro connexion/donnée réelle.

### B — Aperçu premium réellement utilisable (données fictives seulement) : **non franchie**

1. Vérifier les parcours Accueil, Budget, +, Activité [Historique, À valider, Partage, Imports] et Patrimoine en **vrai Chromium** : 320–390 px, clavier/focus, grosses listes, sélecteurs CAD/EUR, paiement de carte, répartition Couple, faux virements CAD/EUR, PDF local.
2. Vérifier la PWA installable, son mode avion/offline, le SW effectivement contrôlant, la mise à jour en attente et le chargement de chaque module/PDF worker.
3. Vérifier les parcours tactiles/VoiceOver sur **iPhone Safari réel**. Tester que 60 lignes d'Historique et 40 « À valider » n'occulteraient aucun ancien mouvement.
4. S'assurer qu'aucun appel Supabase/auth réel, aucune donnée bancaire réelle, aucun mauvais service worker ou ancien commit Vercel ne sont impliqués.

**Condition de sortie :** démonstration fictive convaincante, matrice de tests manuels notée, défauts critiques corrigés. Une **nouvelle preview Vercel isolée** n'est envisageable **qu'après autorisation distincte et contrôle du SHA/SSO** ; l'ancienne preview `2c312f00` n'est pas cette candidate.

### C — Intégrité persistante et sécurité à deux membres : **non franchie**

1. Exécuter les migrations **05–12** dans une base **PostgreSQL/PGlite fictive isolée**, vérifier l'ordre, le rollback, les sauvegardes/restaurations et la non-régression du grand livre.
2. Tester l'isolation entre les deux membres, Auth/RLS, les écritures concurrentes/CAS, les comptes archivés, imports, preuves de relevés, doublons et erreurs de synchronisation avec **deux sessions fictives**.
3. Rejouer les cas de débit immédiat FR, différé mensuel FR et carte de crédit CA ; vérifier débit courant, dette carte, règlement, calendrier fixé, absence de double dépense, stabilité des historiques.
4. Rejouer les conversions CAD/EUR datées : montant natif au centime, devises d'achat, commissions, taux vérifiés et refus de toute conversion inventée.

**Condition de sortie :** zéro perte, zéro accès croisé, zéro double dépense, zéro conversion fictive et restauration prouvée. La quarantaine différée ne sera levée qu'avec une décision distincte après ces tests.

### D — Acceptation fonctionnelle, sécurité et publication : **non franchie**

1. Qualification end-to-end des opérations réelles **avec fixtures exclusivement fictives** : création, import, revue, corrections, rapprochements, Couple, épargne/patrimoine, premier lancement, changement d'appareil et restauration.
2. Audit final permissions, CSP, secrets, performance, accessibilité, disponibilité, cache, monitoring, gestion des erreurs et retour arrière.
3. Réception du produit sur une candidate figée ; ensuite seulement décision indépendante pour **preview isolée**, puis **production** avec accord explicite, plan de migration et de rollback. Ne pas toucher directement à `main` tant que ces décisions ne sont pas prises.

**Condition de sortie :** procédure documentée, autorisations requises, aucune porte technique contournée.

## Priorité immédiate

**Faire A avant toute nouvelle fonctionnalité de confort.** Le code fonctionnel a nettement avancé ; la principale incertitude est désormais la qualification réelle du système entier. Les retouches UX premium restantes sont importantes, mais elles ne doivent pas masquer les portes serveur et sécurité.

**Avancement global préalablement indiqué : ~58 % ±10 points, estimation illustrative non recalculée.** Les pourcentages ne justifient jamais de franchir une porte sans preuves.

Voir également `TRACE-5.37.0-HANDOFF.md`, `TRACE-5.37.0-PREVIEW-READINESS.md`, `TRACE-5.37.0-RELEASE-CHECKLIST.md` et `TRACE-5.37.0-UX-VALIDATED-GAP-AUDIT.md`.

## 27 octobre — Nouvelle préqualification technique, sans publication

- Nouveau fichier `scripts/trace-preview-static-inventory.cjs` : inventaire **pur et local** du cache (HTML, manifest, SW, CSS, JS, SVG, PNG, modules PDF.js) avec une liste explicite des fichiers manquants/non autorisés. Ce n'est pas une vérification de contenu cryptographique : seul **le générateur officiel `--check`** fait foi pour l'empreinte octet par octet.
- `scripts/test-trace-native.mjs --preflight --report trace-preflight.json` fournit un **diagnostic rapide avant toute suite**, retourne immédiatement un échec si le cache est périmé, sans lancer les tests financiers. Sur la branche actuelle, il doit refuser le SW ancien qui omet six modules différés. Si l'inventaire est correct et `--check` vert, il retourne code de sortie 0 mais conserve `report.passed=false`, car la suite financière intégrale n'a pas tourné.
- `scripts/test-trace-native.mjs` refuse aussi la réussite vacante si aucun fichier de test ni scénario n'a été exécuté. Test `tests/trace-preview-static-inventory.test.cjs` : **8/8 contrôles V8 simulés**. La logique du runner a été testée dans quatre scénarios V8 simulés (cache périmé, préflight vert, zéro suite, une suite fictive). La nouvelle suite `tests/trace-preview-native-preflight-isolation.test.cjs` embarque quatre scénarios **Node natifs à exécuter sur checkout**, avec reconstruction SW **dans un dossier temporaire fictif** uniquement.
- Accueil : badge global ne double plus un virement en attente dont les deux jambes sont sur les comptes actifs du même membre ; les comptes individuels gardent chacun leur propre compte d'opérations en attente. **9/9 tests ciblés Accueil en V8**, plus **8/8 règlements Couple et 35/35 Activité** relancés avec les sources candidates.
- **Porte A non franchie :** aucun checkout complet dans le conteneur, aucun SW candidat régénéré, aucune campagne Node native intégrale. Les 106 suites restent à exécuter dans un vrai checkout ; le SW actuel reste périmé. Aucune modification de `main`, aucune CI/déploiement/DB réelle, quarantaine `TRACE_DEFERRED_NOT_RELEASED` inchangée ; **production NO-GO**.
