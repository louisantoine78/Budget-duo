# TRACE 5.37.0 — preuves de mission et décision de sortie

Mission autonome du 24 octobre 2026, consolidation en UTC le 25 octobre. **Recommandation : NO-GO production.** Les lots sont sauvegardés sur `trace-5.37.0-international-accounts-fx`. Code de référence de cette qualification : `94c613cd4e1c547a38671083c1da773967bded70` ; le commit documentaire suivant ajoute les rapports et le précontrôle sans activer la version.

## Résultats concrets

- Interactions du solde estimé existantes reprises : consultation/principal séparés, focus des petits boutons, changement confirmé, carte liée, Moi/Couple et comptes inconnus traités sans montant inventé.
- Comptes : création, renommage/édition sécurisée, verrouillage de la devise avec historique, réassociation des cartes, archivage/réactivation et accès à l'historique conservé, y compris après archivage.
- Budget : contraste réparé, anneau, consommation en pourcentage, dépassement, graphique prévu/réel compact ; trois familles, détail de catégorie et douze mois conservés.
- Vrai formulaire international réparé : l'habillage premium retirait ses champs nécessaires. Centimes stricts, dates/source de taux, prix original, deux jambes natives et frais inclus des virements vérifiés.
- Épargne internationale reliée au journal : montants natifs des versements/retraits et de l'épargne, conversion indicative datée, budget neutre, inconnus visibles et conservation des flux CAD historiques. Le graphique de patrimoine n'actualise pas les anciens flux avec le change du jour.
- Actifs réels PDF.js 6.4.299, licence Apache 2.0, provenance et empreintes. Worker local dans le vrai navigateur, CSP sans `unsafe-eval` ni connexions, extraction multipage FR/CA, toutes les propositions/lignes ignorées, validation humaine et comparaison sans écriture. PDF raster orienté vers le contrôle manuel.
- CSV : toutes les propositions et lignes invalides restent consultables ; comparaison des opérations ressemblantes en devise native ; deux achats identiques restent distincts ; même fichier/même ligne déjà importés non réimportés. Les incertitudes restent pending.
- Cache PWA du laboratoire seul : manifeste distinct, portée limitée à sa page, cache statique de 62 fichiers avec empreinte de contenu. Rechargement complet et worker PDF testés sans réseau.
- Export JSON local vérifié, refus d'écrasement et inventaire ; restauration physique et restauration portable dans une autre instance PostgreSQL fictive.
- Migration 07 restrictive candidate testée : propriétaire des documents comptes/placements, lecture du foyer conservée, pas de réécriture des données. Les réglages personnels et les conflits de sauvegarde restent des blocages distincts.

Les SHA de chaque lot figurent dans [HANDOFF](TRACE-5.37.0-HANDOFF.md). Les changements aux points d'entrée de production, au JS 5.36.5 et aux workflows sont nuls depuis le HEAD initial de mission. Aucun déploiement ni accès financier Supabase réel n'a été effectué.

## Campagne effectivement exécutée

| Preuve | Exécution | Résultat | Ce que cela ne prouve pas |
|---|---|---|---|
| Syntaxe | Node v24.22.1, `--check` | 46 fichiers réussis | Comportement d'exécution |
| Suites natives | 54 fichiers `*.test.cjs`, exécutés séparément | 911 scénarios rapportés, aucun fichier en échec | Tous les tests ne sont pas des intégrations ; certains isolent des fonctions avec VM/DOM simulé |
| Régression héritée | `tests/trace-regression.test.cjs`, incluse dans le runner | Réussie, 150 contrôles rapportés | Parcours intégral de l'ancienne application dans un navigateur authentifié |
| Navigateur réel | Chromium 153.0.8010.0 via Playwright, sécurité web conservée | 32 scénarios réussis, aucune exception/erreur console ni requête externe | Safari/WebKit, App Store, iPhone, données durables, Auth/Supabase hébergé |
| Base réellement persistante | PGlite 0.4.5, PostgreSQL 17.5 WASM, répertoire disque temporaire fictif | 17 contrôles réussis ; anomalies attendues reproduites et annulées | Supabase hébergé, JWT réel, HTTP PostgREST, Realtime, performances ou concurrence réelle de deux navigateurs |
| Taux publics | API Valet HTTPS réelle, moteur du dépôt, quatre devises × deux dates | 8 contrôles réussis | Taux actuel, CORS du navigateur ou disponibilité future du fournisseur |
| Production | Non exécutée | **Non qualifiée** | Aucune publication à déduire des succès précédents |

Les rapports JSON sont fournis dans `docs/qa/`. Le manifeste de qualification contient leurs SHA-256 et les SHA-256 des sources. Les ports localhost dans le rapport navigateur sont éphémères ; aucune de ces URL n'est une préversion publiée. Les horloges des fixtures navigateur sont figées au 24/10/2026 ; les taux qu'elles affichent sont explicitement fictifs.

Le dépôt a été testé dans un vrai checkout. Les quatre échecs initiaux de harnais (collision `module` CommonJS, extraction de fonction périmée et comparaisons VM de tableaux/objets) ont été réparés, puis toutes les suites rejouées. Cela ne remplace pas les corrections fonctionnelles trouvées dans Chromium.

### Commandes reproductibles

Depuis la racine du dépôt, sans CI et sans connexion à une base réelle :

```bash
node scripts/test-trace-native.mjs --report /tmp/trace-native.json
node scripts/verify-trace-pdfjs.mjs --preview-enabled
node scripts/build-trace-preview-pwa.mjs --check
TRACE_CHROMIUM_PATH=/chemin/vers/chromium node tests/trace-candidate.browser.cjs --report /tmp/trace-browser.json
TRACE_PGLITE_MODULE=/chemin/vers/node_modules/@electric-sql/pglite node tests/trace-database.integration.cjs --report /tmp/trace-database.json
TRACE_ALLOW_PUBLIC_RATE_QA=1 node tests/trace-valet-public.integration.cjs --report /tmp/trace-valet.json
node scripts/trace-release-preflight.mjs --report /tmp/trace-preflight.json
```

Prérequis test uniquement : Playwright et Chromium local ; `@electric-sql/pglite@0.4.5` pour le SQL. Les dépendances de test ont été installées hors du dépôt ; aucune ressource payante ou hébergée n'a été créée. Les tests Node ordinaires ne demandent pas PGlite et ne lancent aucun appel Valet. La dernière commande retourne **2 volontairement** tant qu'une porte obligatoire reste ouverte ; elle n'écrit ni branche ni base ni déploiement.

Après modification d'un actif du labo : `node scripts/build-trace-preview-pwa.mjs`, puis tests. Le contrôle `--check` refuse un cache périmé. Ne pas modifier le SW généré à la main. Ne pas utiliser la page laboratoire pour des données réelles : ses changements sont en mémoire et réinitialisés au rechargement.

### Scénarios financiers et niveaux atteints

| Scénario fictif | Node | PostgreSQL fictif | Vrai Chromium |
|---|---|---|---|
| Achat immédiat 40 EUR | Oui | Oui, montants natif et CAD figé | Oui, baisse native unique de 40 EUR, budget 64 CAD au taux fictif 1,6 |
| Achat carte 100 CAD puis règlement 100 CAD | Oui | Oui | Oui, une dépense, un transfert neutre et dette correcte |
| Achat 50 USD payé 46,20 EUR | Oui | Oui | Oui, prix USD, banque EUR et valorisation 73,92 CAD distincts |
| Virement 150 CAD → 95 EUR, frais inclus 2 CAD | Oui | Oui | Oui, débits/reçus réels, pas de deuxième dépense |
| Remboursement partiel d'une avance proche | Oui | Oui, 60 avancés puis 20 remboursés = 40 restants | Pas de parcours complet ajouté dans cette mission |
| Différé réglé en plusieurs fois | Moteur isolé uniquement | **Pas de journal intégré** | Démo isolée seulement |
| Principal CAD → EUR et Couple | Oui | Historique inchangé après réouverture | Oui, confirmation/annulation, budget historique CAD préservé |
| Épargne EUR, dépôt CAD→EUR, retrait EUR | Oui | Oui, journal natif et valorisation | Oui, montants réellement reçus, budget neutre |
| Ouverture CHF absente | Oui | Non nécessaire pour ce cas de présentation | Oui, patrimoine incomplet, aucun zéro fabriqué |
| Données couple en devises différentes | Moteur et filtres | Persistance/droits locaux partiels | Vue Couple et comptes natifs ; pas de deux sessions cloud |

Le PDF mensuel ne crée aucune transaction. Dans le cas français multipage, le navigateur retrouve trois mouvements confirmés et une ligne à vérifier ; l'application dit explicitement que le relevé complet n'est pas certifié. Les lignes non interprétées restent visibles. Les PDF raster, structures ambiguës et devises incompatibles débouchent sur le contrôle manuel.

Pour Valet, dates 20/06/2025 et 21/06/2025 : le jour ouvré renvoie ses observations, le samedi reprend le dernier jour disponible. Sources/dates sont conservées. Cette vérification publique ne transmet aucun compte ou montant de l'utilisateur.

## Anomalies ouvertes et risques financiers

| Identifiant | État et preuve | Risque / travail nécessaire |
|---|---|---|
| RLS-PARTNER-WRITE | Reproduit sur SQL hérité ; corrigé localement par 07 pour `accounts` et `investment_accounts` | Qualifier puis appliquer seulement sous autorisation sur environnement approprié. Aucun état du Supabase réel n'a été observé |
| RLS-PERSONAL-SETTINGS | Toujours reproduit après 07, probe annulée | Modifier les valeurs d'ouverture du partenaire via `households.settings` reste possible dans le schéma local. Protection serveur des clés personnelles nécessaire |
| STALE-WRITE | Deux snapshots périmés puis deux upserts, première modification perdue ; probe annulée | Validation atomique de version, interface de conflit/rechargement et test à deux clients nécessaires |
| FOREIGN-VALIDATION | CSV étranger accepté en pending natif ; clic de validation étrangère toujours protégé/bloqué | Parcours financier incomplet, ne pas convertir en confirmé via un formulaire CAD ou un taux inventé |
| DEFERRED-INTEGRATION | Moteur isolé testé, création réelle désactivée | Brancher et persister achats/dates/frais/remboursements/règlements multiples ; rapprochement/idempotence à tester |
| BUDGET-REFERENCE | Budget et partage restent CAD, même si principal EUR | Référence personnelle et Couple indépendante non finalisées ; changement prospectif sans réécriture historique à implémenter |
| DAILY-IMPORTS | CSV et contrôle PDF mensuel testés ; captures/OCR/PDF quotidien non qualifiés intégralement | Le module hérité référence des CDN ; ne pas confondre chargement du module et extraction fiable ni élargir la CSP sans contrôle |
| CLOUD-QUALIFICATION | Aucune Auth/PostgREST/Realtime hébergée fictive testée | Permissions, RLS réellement appliquées, retries, séparation du couple et unicité inter-imports restent à qualifier |
| SAFARI-PWA | Chromium seulement, cache du labo statique et persistance mémoire | Aucun test Safari/iPhone réel ni preuve de reprise d'écritures financières hors ligne |
| PROD-CACHE | SW stable inchangé ; son activation supprime tous les autres caches | Préparer une stratégie de cache 5.37 compatible, nommée et ciblée. La portée étroite du labo n'empêche pas un ancien SW de nettoyer ses caches sur une origine partagée |
| ROLLBACK-FX | Pas de retour réel éprouvé vers 5.36.5 après nouvelles écritures | L'ancien moteur peut interpréter les nouveaux montants différemment ; gel des écritures et retour compatible à préparer |

La réussite des tests qui démontrent une faille signifie que le diagnostic est reproduit, **pas que la fonctionnalité est prête**. Les deux failles restantes de base sont déclarées comme `release-blocker` dans le rapport SQL.

## Sauvegarde, migration et restauration avant toute production

**Aucune sauvegarde réelle n'a été effectuée : l'accès aux données réelles n'est pas autorisé par cette mission.** La procédure ci-dessous prépare l'étape ultérieure et ne l'exécute pas.

1. Désigner un opérateur et une fenêtre approuvés ; choisir le commit de sortie seulement après fermeture des portes. Geler les écritures pendant la capture et empêcher les anciens clients hors ligne de réémettre une écriture après bascule. Ce gel effectif reste à implémenter et qualifier.
2. Produire sous autorisation un export frais complet de la base (schéma, fonctions, politiques, tables et droits) avec la méthode de sauvegarde approuvée du projet. Inclure séparément les dépendances Auth/Storage/configuration nécessaires : l'utilitaire JSON local ne sauvegarde pas tout Supabase.
3. Pour les données métier d'un foyer, exporter les lignes complètes `households`, `household_members` et `documents` dans `{household,household_members,documents}` ; conserver toutes les collections et métadonnées, pas seulement les opérations confirmées. Relever séparément les comptages par collection/membre et les totaux de contrôle dans les devises natives, l'inventaire des comptes et des taux historiques. Protéger l'export contenant des données privées.
4. Utiliser `scripts/trace-snapshot.mjs create export.json snapshot.json --source-commit SHA`, puis `verify snapshot.json --expected-documents N`. L'empreinte prouve l'intégrité du fichier, **ni son authenticité ni l'exhaustivité de la source**. Le nombre indépendant seul ne certifie pas davantage la nature des lignes. Aucun taux ou montant n'est recalculé.
5. Restaurer d'abord dans une instance isolée approuvée. Comparer comptages, clés, JSON financiers, réglages, membres, soldes natifs, historiques CAD, remboursements et droits. Refaire les scénarios de lecture/écriture avec les rôles réels. La mission a prouvé deux restaurations fictives ; la restauration d'une sauvegarde de production reste à éprouver.
6. Inspecter la version de schéma effective avant de choisir les migrations ; ne pas réexécuter aveuglément 05/06. Les champs natifs sont additifs dans les JSON ; aucun besoin validé de convertir massivement l'historique CAD. Les lignes sans devise native réellement connue doivent rester à vérifier.
7. La migration 07 candidate ne réécrit aucune ligne et refuse les comptes/placements sans propriétaire `la` ou `partner`. Qualifier notamment les éventuels comptes historiques spéciaux avant application. Elle ne suffit pas pour les réglages personnels ni les conflits ; les migrations correspondantes restent à préparer. Le snapshot `trace_v5_backups` créé par 05 est historique, **pas une sauvegarde fraîche de sortie**.
8. Après migration isolée : comparer l'export avant/après, appliquer deux fois le candidat lorsqu'il est prévu idempotent, vérifier qu'aucun solde/historique n'a changé et exécuter les tests multi-utilisateurs. Toute divergence inexpliquée reste NO-GO.

Exemple de restauration **vers un fichier local uniquement**, pas vers une base :

```bash
node scripts/trace-snapshot.mjs unpack snapshot.json restored-export.json
```

Les fichiers de sortie sont créés sans écraser un fichier existant, avec permissions 0600. L'outil n'a aucun client réseau ni commande de réinitialisation. Une restauration de base réelle demanderait une procédure et une autorisation séparées.

## Retour arrière et caches

- Avant toute écriture 5.37 : un retour du code peut être envisagé uniquement après comparaison de la compatibilité des données et des politiques ; garder le commit stable `02c70f50e7e51da79b77a91dde96a03c6c719909` comme référence, sans fusion automatique.
- Après des écritures internationales 5.37 : **ne pas basculer directement sur l'ancien moteur 5.36.5**. Mettre les écritures en pause, exporter aussi l'état incident et le delta depuis la sauvegarde, utiliser une version compatible en lecture seule ou un correctif qualifié. Ce mode de repli reste à construire/tester avant GO.
- Si restauration nécessaire : restaurer dans une nouvelle instance isolée, réconcilier toutes les écritures postérieures à la sauvegarde puis comparer les invariants. Un ancien snapshot ne doit jamais écraser silencieusement les comptes, budgets ou historiques courants.
- Les gardes d'accès corrigées doivent normalement rester en place lors d'un rollback d'interface. Retirer les trois politiques `trace_account_owner_*` de 07 réouvrirait les droits hérités : ce n'est pas le rollback financier recommandé et ne doit pas être automatisé.
- Production aujourd'hui : index/manifeste/version/SW restent 5.36.5. Le laboratoire possède son manifeste et son SW distincts ; ses caches sont préfixés `trace-lab-537` et seuls ses propres anciens caches sont nettoyés. Il ne met jamais en cache les PDF sélectionnés, les réponses cloud, config.js, index.html ou les requêtes POST.
- Avant sortie : aligner entrée, version, fichiers versionnés, manifeste, liste des actifs et SW ; tester mise à jour depuis 5.36.5, refus d'un mélange ancien/nouveau, fermeture/réouverture, retour réseau et clients restés hors ligne. Toute révision des actifs du labo doit régénérer son empreinte. Aucun de ces contrôles n'autorise une publication.

## Recette ciblée sur un vrai iPhone

La simulation de largeur et de toucher Chromium n'est pas Safari. Après autorisation explicite d'une préversion **isolée et fictive**, relever modèle d'iPhone, iOS/Safari, commit et mode navigateur/PWA.

1. Safari normal puis installation « Sur l'écran d'accueil » : vérifier l'identité de laboratoire, le manifeste distinct et l'absence de connexion/compte réel. Commencer avec un jeu fictif neuf.
2. Portrait petit écran, paysage, texte agrandi et clavier : cinq onglets, Patrimoine sur une ligne, aucun débordement, safe areas, champs à 16 px sans zoom indésirable, scroll et fermeture de chaque feuille.
3. Accueil : ordre des sept blocs ; consulter CAD/EUR sans changer le principal, annuler puis confirmer le changement, revenir au principal, vérifier la carte liée et la séparation Couple.
4. Comptes : création EUR/CAD, solde absent versus zéro explicite, édition du nom, devise bloquée avec historique, réassociation de carte, archivage et restauration. Vérifier historique et soldes identiques.
5. Budget : trois familles, reprise du mois précédent, comparaison prévu/réel, dépassement, détail catégorie puis Activité, douze mois et marge.
6. Ajouter les cas 40 EUR, 100 CAD carte + paiement, 50 USD/46,20 EUR, virement 150 CAD/95 EUR/frais inclus et épargne EUR. Contrôler les centimes et le budget avant/après. Vérifier les erreurs sans taux et sans montant reçu.
7. Import CSV CA/FR : toutes les lignes, similitudes, deux achats identiques, réimport, statut à vérifier. Le parcours de validation étrangère doit rester déclaré incomplet tant qu'il n'est pas développé.
8. PDF FR et CA multipages via Fichiers : bon compte/devise, références page/ligne, liste des non-interprétés, adoption sans validation, attestation explicite puis comparaison. Tester PDF raster, fichier illisible, mauvaise devise, changement rapide de fichier et de compte. Aucun enregistrement automatique, aucune prétention d'exhaustivité.
9. Attendre l'indication hors connexion, mode avion, fermer Safari/la PWA et rouvrir : shell et PDF disponibles ; les données du **labo** doivent se réinitialiser comme annoncé. Retour réseau et nouvelle version : pas de mélange de fichiers ni rechargement inattendu d'un formulaire. Ceci ne valide pas une file d'écritures cloud.
10. Dans un environnement Supabase fictif distinct, après qualification des corrections : deux vraies sessions, refus inter-foyers et inter-propriétaires, modifications concurrentes, retour réseau/retry sans doublon, déconnexion/séparation et restauration. Ne jamais faire cette étape avec les données financières réelles.

## Décision et autorisations

**NO-GO** tant que les barrières listées restent ouvertes. Les fonctionnalités du labo sont concrètes et testées ; elles ne constituent pas une version complète et stable prête à publier. Aucune date de production garantie n'est déduite de cette campagne.

Une éventuelle Vercel Preview du laboratoire, même fictive, exige l'autorisation explicite de l'utilisateur. La présente mission n'en crée aucune. Fusion vers main, migration réelle, sauvegarde réelle et publication nécessitent une revue et une autorisation distinctes après fermeture des portes applicables.

## Inventaire des fichiers modifiés dans la mission

60 fichiers, y compris actifs, tests et preuves documentaires. L’inventaire correspond à la consolidation et ne comprend aucune donnée réelle.

- `docs/TRACE-5.37.0-HANDOFF.md`
- `docs/TRACE-5.37.0-INTERNATIONAL-AUDIT.md`
- `docs/TRACE-5.37.0-PDFJS-PROVENANCE.json`
- `docs/TRACE-5.37.0-RELEASE-CHECKLIST.md`
- `docs/TRACE-5.37.0-UX-VALIDATED-GAP-AUDIT.md`
- `docs/TRACE-5.37.0-WORK-VALIDATION.md`
- `docs/qa/README.md`
- `docs/qa/TRACE-5.37.0-QUALIFICATION.json`
- `docs/qa/trace-5.37.0-chromium.json`
- `docs/qa/trace-5.37.0-native.json`
- `docs/qa/trace-5.37.0-postgresql.json`
- `docs/qa/trace-5.37.0-valet.json`
- `migrations/07-trace-account-owner-write-guard.sql`
- `scripts/build-trace-preview-pwa.mjs`
- `scripts/generate-trace-pdf-fixtures.py`
- `scripts/test-trace-native.mjs`
- `scripts/trace-release-preflight.mjs`
- `scripts/trace-snapshot.mjs`
- `scripts/verify-trace-pdfjs.mjs`
- `tests/fixtures/statements/ambiguous-columns.pdf`
- `tests/fixtures/statements/ca-cad-multipage.pdf`
- `tests/fixtures/statements/fr-eur-multipage.pdf`
- `tests/fixtures/statements/image-only.pdf`
- `tests/trace-account-lifecycle.test.cjs`
- `tests/trace-budget-progress-ui.test.cjs`
- `tests/trace-candidate.browser.cjs`
- `tests/trace-database.integration.cjs`
- `tests/trace-international-account-details.test.cjs`
- `tests/trace-international-couple-home.test.cjs`
- `tests/trace-international-csv-source-rows.test.cjs`
- `tests/trace-international-friend-ledger-fx.test.cjs`
- `tests/trace-international-lab.test.cjs`
- `tests/trace-international-money-integrity.test.cjs`
- `tests/trace-international-monthly-pdf-ui.test.cjs`
- `tests/trace-international-premium-layout.test.cjs`
- `tests/trace-international-savings.test.cjs`
- `tests/trace-international-statement-evidence.test.cjs`
- `tests/trace-international.test.cjs`
- `tests/trace-pdfjs-real-extraction.test.cjs`
- `tests/trace-pdfjs-vendor.test.cjs`
- `tests/trace-preview-pwa.test.cjs`
- `tests/trace-snapshot.test.cjs`
- `tests/trace-valet-public.integration.cjs`
- `trace-insights-1.0.0.js`
- `trace-international-1.0.0.css`
- `trace-international-1.0.0.js`
- `trace-international-preview-sw.js`
- `trace-international-preview.html`
- `trace-international-preview.webmanifest`
- `trace-international-ui-1.0.0.js`
- `trace-operation-ui-1.0.0.js`
- `trace-pdfjs-local-loader-1.0.0.mjs`
- `trace-preview-pwa-1.0.0.js`
- `trace-statement-monthly-ui-1.0.0.js`
- `trace-statement-pdfjs-adapter-1.0.0.js`
- `v5-app-5.37.0.js`
- `vendor/pdfjs/LICENSE`
- `vendor/pdfjs/pdf.mjs`
- `vendor/pdfjs/pdf.worker.mjs`
- `vendor/pdfjs/trace-vendor-manifest.json`
