## 25 octobre 2026 — preuve CSV longue et intégrité multi-foyer (code candidat)

Dernier HEAD **avant commit doc** `9ef4e4e37831bf235f6ffb45aa7408915551ec83`, branche exclusive `trace-5.37.0-international-accounts-fx`. `main` et 5.36.5 non touchés.

**Correctifs :** au lieu de tronquer sans explication les noms longs (110 caractères maximum) et les extraits bancaires (650 caractères conservés), le candidat refuse un fichier au nom trop long et signale `rawTruncated=true` dans le stockage et la fiche de revue. Le fichier CSV d'origine doit rester disponible pour confirmer la fin d'une ligne trop longue. `rawFingerprint` couvre l'intégralité de la ligne au moyen de FNV-1a 64 bits **NON cryptographique** pour distinguer les réimports longs ayant les mêmes 650 premiers caractères mais un texte final différent. Les champs demeurent des preuves NON FINANCIÈRES `imports.csv_unparsed`; aucune transaction, budget, FX ou virement créé, et pas de suppression automatique. `rawTruncated/rawFingerprint` sont ajoutés au snapshot de revue pour bloquer un changement asynchrone. Migration SQL 11 non appliquée, donc aucune assurance serveur.

**Commits :**
- `cd94b0a5bd1631fd58ad76d06feafaa51ab9eeea` — source CSV explicite et avertissement des extraits incomplets.
- `2da832a6613a0a7727cf304a750646309aac204e` — empreinte déterministe du contenu complet et tests FNV64.
- `f49610b013e243c4038f358a8e233dbcf261ac4c` + `9ef4e4e37831bf235f6ffb45aa7408915551ec83` — test PostgreSQL fictif troisième membre / autre foyer, absence de lecture et écriture cross-tenant, suppression admin cascade ; correction fixture JSONB. Tests SQL NON exécutés.

**Couverture de cette session : `98/98` vrais tests client/contrats sources via simulateur V8, y compris SQL statique lexical uniquement ; suite native pas exécutée. Répartition 28+6+7+5+24+6+10+8+4. Le banc PostgreSQL a été validé seulement pour syntaxe JavaScript, pas SQL, pas RLS. Contrôles Realtime, Auth multi-session, PostgreSQL, CAS serveur, sauvegarde/restauration et effacement fonctionnel restent le blocage. Le trigger 11 interdit actuellement les suppressions individuelles de preuve et pourrait empêcher des cascades d'effacement utilisateur : **à tester avant release et à corriger selon une autorisation serveur vérifiée**, pas en levant aveuglément cette règle. Documentation Supabase : ne pas utiliser `payload.old.data` sous RLS comme source fiable pour Realtime.

**Environnement :** conteneur sans serveur PostgreSQL/PGlite ni checkout réseau; aucun projet Supabase réel accédé; GitHub connector uniquement. Pas de changements à `main`, `sw.js`, workflows, prod ou Supabase. Estimation 58 % qualitative, PRODUCTION NO-GO. La conversation devient longue : démarrer la suite dans un nouveau chat sur les 3 docs.

---

## 25 octobre 2026 — audit de la migration 11 : correction d'un SQL non exécutable

**HEAD de code :** `a6bd854de0a3618786d58fc056431708611a65d3` avant actualisation du présent fichier. Branche internationale exclusive, stable `main` non modifiée.

**Incident bloquant trouvé :** la migration `11-trace-csv-unparsed-owner-privacy.sql` contenait une chaîne regex `sourceIndex` tronquée, provenant de l'expansion spéciale JavaScript `$'` utilisée par la forme `String.replace(old,newString)`. Le premier commit tentative `595e66965dbfabf00e5067805beb3c0b7ebdd579` reproduisait l'anomalie en dupliquant le reste du fichier : **à ne jamais utiliser comme référence**. La version corrigée `26dcc704446798a900aed5623479d6867d2b3a6e` reconstruit le SQL depuis le dernier bon contexte par un callback `replace(old,()=>replacement)` qui préserve littéralement l'ancre regex, et utilise un `CASE` validant les chiffres avant `::integer`. Aucun SQL appliqué. Ce défaut prouve que les 85 tests V8 précédents ne validaient PAS la validité du SQL.

**Prévention pérenne :** `71739b3da130a37a69125517cf41c1418a7f6ee2` crée `tests/trace-sql-lexical-integrity.test.cjs` : contrôle des quotes/dollar quotes et commentaires des migrations 07–11, regex sourceIndex et CASE, exemple mutant volontairement cassé devant échouer, unicité des définitions SQL. Ce test est découvert automatiquement par `scripts/test-trace-native.mjs` en checkout complet, mais ici seulement exécuté via V8 avec `node:*` simulé. Ce n'est PAS un parseur PostgreSQL et ne constitue PAS une migration testée.

**Intégrité source CSV :** `4b0377016059c4366cb597fd539d18a457cab031` bloque maintenant la direction inverse de collision. Si `imports.csv_unparsed` a gardé une preuve au même compte/nom fichier/numéro de ligne, un nouveau CSV modifié ne peut créer une transaction `pending` à cet emplacement sans revue explicite. Idem si la preuve est `reviewed`. Contrôle en preview, au démarrage de l'import, avant chaque ligne ; aucune écriture financière automatique. `a6bd854de0a3618786d58fc056431708611a65d3` synchronise l'ancien test de contrat avec ce nouveau garde-fou.

**Résultats V8 actuels : 91/91** (24+6+7+5+24+6+7+8+4), avec sources réelles et bibliothèques Node/DOM/RPC simulées. Les **tests PostgreSQL 05–11/Auth/RLS/CAS ne sont pas exécutés**, pas plus que vrai Safari, Chromium ou node natif. La migration corrigée demeure un simple fichier candidat dans GitHub ; aucun projet Supabase connecté n'a été touché. Les collisions CSV entre deux sessions distinctes restent à qualifier côté serveur : le test actuel est client uniquement.

**Suite nécessaire :** réunir un vrai checkout et PGlite ou PostgreSQL fictif ; exécuter `tests/trace-cas-writes.integration.cjs` et les autres suites PG (avec vrais rôles/JWT fictifs et réversibilité), Realtime, interface/navigateur ; traiter les échecs avant tout cutover. Stable 5.36.5 protégé, global 58 % qualitatif, **NO-GO production**.

---

## 25 octobre 2026 — barrière serveur de confidentialité avant stockage CSV

**Commits techniques** : `2e675a6492fcd317fd47b91dcd8d97214e6e8606`, `452f265162f8dd6b93cde2a13e58182195949ca6`, `e3cfdda7d23ccd70ddb87a92d3c45162db0e8611`, `7230365b49685b2458d1e7f30cb54d1de3550444`, `498ea5f99f3a47bd994a7e78a29be7d13436dca8`. Branche unique 5.37 International, tous `[skip ci]`.

**Qualité côté client :** avant tout stockage d'une preuve `imports.kind=csv_unparsed` ou clôture `reviewed`, RPC `trace_csv_evidence_guard_ready` doit renvoyer exactement TRUE. Si migration 11 absente / RPC indisponible / policy ou trigger désactivés / erreur réseau, refus d'écriture et message explicite. Après chaque attente RPC, revalider les comptes et sources de la prévisualisation ou l'extrait de la revue. Les autres CSV, déjà interprétables, restent sur l'ancien parcours `pending`. Aucune transaction ni dépense créée par le contrôle d'une preuve illisible. UI labo fictive exempte du contrôle SQL car aucune persistance. Test CSV et revue en attente asynchrone ajouté.

**SQL migration 11 candidate (NON APPLIQUÉE) :** fonction de sonde `security invoker` inspecte la présence de RLS, policy SELECT restrictive et trigger activé ; permissions EXECUTE retirées à PUBLIC et anon, accordées aux authentifiés. Le trigger `trace_guard_csv_unparsed_evidence` permet désormais la maintenance/restauration sans JWT seulement en session PostgreSQL où `current_user=session_user='postgres'`, pas en session authenticated sans JWT ni via RPC utilisateur. Les 2 nouvelles situations et les désactivations temporaires de la policy/trigger ont des tests fictifs PGlite ajoutés mais **non exécutés**.

**Environnement vérifié :** Node v22.16 disponible mais pas de repo local, ni PostgreSQL/PGlite ni DNS GitHub/npm. Pas de SQL natif possible ici ; aucune connexion à un projet Supabase existant. Ne pas confondre les tests JS avec des preuves RLS.

**Tests V8 du dernier HEAD : `85/85`** (22+6+7+5+24+6+7+8), dont 8 vérifications statiques SQL, avec vraies sources et mocks. Vrais tests `node --test`, suite PGlite, sécurité Realtime, pairage authentifié, performance et Safari **à exécuter** dans un checkout isolé.

**Prochaine étape obligatoire :** lancer `tests/trace-cas-writes.integration.cjs` sur PostgreSQL fictif, qualifier Auth/RLS/CAS et les privilèges DBA, puis réaliser la vérification Realtime et la recette réelle multi-comptes. `scripts/check-trace-537-release-gates.cjs` reste le garde-fou général (read-only); SW preview à régénérer exclusivement avec le générateur officiel. Les chiffres globaux restent à 58 % qualitatif, production **NO-GO**.

---

## 25 octobre 2026 — migration candidate 11, séparation des preuves CSV entre titulaires

**HEAD de code de ce lot :** `ce0fae9030c280a7d5f620b7aa2ee99c171a6b43` avant commit documentation. Sur branche internationale, commits `[skip ci]`, aucune intervention sur `main`.

**Motif :** `imports.csv_unparsed` contient des extraits de mouvements bancaires non interprétés, persistants dans le foyer. L'UI 5.37 empêche les autres membres de voir leurs listes, mais elle ne garantit aucune confidentialité réseau. Le modèle `documents` d'origine partage ses SELECT au foyer et les RPC CAS 09 `SECURITY DEFINER` n'imposaient aucune validation spécifique sur `imports`. L'audit a identifié un risque de lecture et de modification par le partenaire.

**Implémentation candidate NON APPLIQUÉE :**
- `migrations/11-trace-csv-unparsed-owner-privacy.sql` créé (prérequiert 05–10, pas de reset) avec politique restrictive SELECT propriétaire spécifique à `imports.kind='csv_unparsed'` ; vieux `smart_draft` et opérations partagées restent inchangés. Code de politique aligné sur les principes Supabase `TO authenticated`, `auth.uid()` et sélection membre foyer.
- Trigger `trace_guard_csv_unparsed_evidence` vérifiant JWT `auth.uid()`, propriétaire du compte, données source et transitions de revue, y compris pour RPC `SECURITY DEFINER` et écritures directes legacy, avant INSERT/UPDATE/DELETE. Un membre ne peut créer ou modifier la preuve bancaire d'un autre, changer `owner` / `accountId` / `rawText` / `sourceFileName`, ni effacer physiquement la preuve via une session. Conservation du seul changement de statut `pending_review → reviewed`, avec `reviewedBy` du membre. Source hors budget et hors transaction.
- `tests/trace-cas-writes.integration.cjs` inclut cinq nouvelles vérifications PGlite fictives, encore **non exécutées**, avec deux utilisateurs d'un foyer, preuve privée, smart_draft partagé, tentatives directes et via RPC, revue/DELETE et migration 11 réappliquée. Correctif d'argument JSONB dans la fixture.
- Limite `CSV_UNPARSED_REVIEW_LIMIT=100` plus message refusant les fichiers avec plus de 100 lignes illisibles, sans écrire ni trancher sur les 1000 lignes CSV interprétées ; donne priorité à la correction du mapping plutôt qu'à des centaines de RPC.
- Nouveau `tests/trace-csv-evidence-server-contract.test.cjs` : six assertions **statiques** non SQL.

**Résultat : `77/77` scénarios réussis sous V8 uniquement** (18/6/7/5/24/6/5 + 6 tests statiques SQL). Aucun PGlite/PostgreSQL natif, aucun serveur Supabase, auth JWT, RLS, Realtime, Safari, test Node CLI complet, backup ou restauration. Le fichier migration candidat n'a pas été généré par Supabase CLI (outil/checkout absent) ; le contrôler soigneusement avant toute application.

**Risques ouverts :** SELECT RLS propriétaire non validé, comportement sous `SECURITY DEFINER`, risques de Realtime `REPLICA IDENTITY FULL`, autres vues/backups, rétention/effacement et restauration admin (trigger refuse les écritures sans `auth.uid()`), sémantique collaborateur vs confidentialité des membres, synchronisation entre deux clients, limites/performance au-delà de 100 erreurs, SW preview à générer officiellement, contrôle PDF et UX iPhone. La migration n'implique aucune protection serveur avant application officielle et tests réels.

**Prochaine priorité :** obtenir un checkout local complet avec PGlite et la suite native + test deux utilisateurs, puis corriger tout échec sur base fictive avant de discuter un déploiement. En parallèle Couple/FX, imports premium, UX mobile. Global estimé **58 %**, production **NO-GO**.

---

## 25 octobre 2026 — conservation et clôture humaine des lignes CSV illisibles

**HEAD technique avant mise à jour :** `bdb16d12350ade57c9ccebf50a220bcf913c20e9`. Branche de travail unique, pas de changement `main`.

**Travaux code candidats intégrés :** nouvelles preuves `imports` de type `csv_unparsed`, `pending_review` issues de chaque ligne CSV illisible, après case de consentement expliquant la conservation. Nom du CSV/compte/index/extrait borné, identifiant stable pour réimportation ; aucune banque `transactions`, aucun `amountCAD`, aucun budget, aucune certification de journée. Le rapprochement CSV n'est donc pas incomplet silencieusement ; les extraits apparaissent sous Activité → Importer puis sous l'Accueil « À faire ». L'utilisateur ne peut marquer `reviewed` que par une action explicite après vérification du relevé et traitement séparé des éventuelles transactions. Aucune écriture financière par la clôture. Le stockage du détail bancaire constitue une nouvelle donnée sensible à vérifier via droits et rétention.

**Commits [skip ci] :**
- `b13297ce7baf5926c2c0183a54f56c7cc0108ac9` : preuve, import CAS dans `imports`, collision; CSS
- `69a621f44ba2b6690f3cc4f1287457e4d5103f46` : affichage Home/Activity et revue manuelle
- `0215dad8ec2bcfe71852ac12a0bbd6af5acb5d11` : nouveaux tests d'import interrompu, tout illisible, réimportation
- `744fae90dec3ae9bf489ae77242f8753e4a3d938` : fix du conflit `sourceFileName` vs `importFileName` réellement détecté par test
- `c6d7e36c44731b41315ebbf576b1fdc28f5a9751` : tests anciens actualisés, confirmation locale invalide si l'extrait a changé
- `bdb16d12350ade57c9ccebf50a220bcf913c20e9` : tests de revue UX et anti-injection HTML.

**Résultats : 70/70 tests sous V8 simulé** sur code actuel : `17` import complet CSV + `6` compte/preview + `7` source + `5` import partiel + `24` CAS client + `6` Accueil + `5` file de revue. Aucune exécution Node CLI native, aucun PostgreSQL/PGlite, vrai navigateur, Safari, Auth/RLS, Supabase ni PDF natif. Une vraie anomalie a été corrigée après échec de 1/17 pendant l'implémentation. Aucune autre ancienne fonctionnalité modifiée intentionnellement.

**Points ouverts critiques :** protection d'accès aux extraits bancaires dans espace Couple à auditer côté RLS/server avec deux comptes fictifs ; rétention des preuves et fichiers bruts absents ; très grands imports potentiellement lents/non atomiques ; source de fichier/index ne garantit pas identité globale ; document CSV tronqué à 650 caractères ; mois PDF encore labo lecture seule non raccordé en persistance ; services SW preview périmés et Safari non qualifié. Ne pas confondre les tests 70/70 V8 avec une recette end-to-end réelle.

**Prochaine priorité :** qualité serveur/migrations 07–10 fictives, transactions CAS simultanées, vrai navigateur desktop/Safari et performance lots, puis Couple/FX et UI premium complète. Environnement conteneur sans accès checkout natif GitHub/npm ou PGlite. Production **NO-GO**, estimation globale qualitative `58 % ±10`.

---

## 25 octobre 2026 — test intégré CSV → rapprochement mensuel (simulé)

**Commits [skip ci], branche internationale exclusivement :**
- `f83c7fc091333950e80819c5b232e3b17d8a5868` : `tests/trace-csv-reader-flow.test.cjs` créé ; tests du parcours concret `FileReader` fictif, parser et UI CSV authentiques, clic prévisualisation → sauvegarde `pending` simulée, réimport sans doublon, deux achats égaux mais lignes indépendantes, collisions, mappage changé, compte modifié en cours de lot, devise EUR native, revue partielle humaine.
- `d687df3f1496c37025f511b1ff49e595d010d925` : corrige **uniquement le harnais** (séquences `\n` fictives et `console` de test) ; premier lancement signalait des erreurs du harnais, **8/8** après réparation. Aucun changement de logique bancaire de l'app dans ces commits.
- `832a821f9e60a5db7cb1491a9fc865cf0b448f8e` : trois tests intégrant `trace-statement-reconcile-1.0.0.js` **en lecture seule**, après staging des CSV fictifs via les vrais moteurs. Vérifie `pending` distinct de `matched`, plusieurs lignes identiques `ambiguous`, et mouvement manquant `missing`. Le rapport affiche `writes:0` et `financialChanges:0`, aucune dépense/revenu créé par le rapprochement.

**Tests effectivement exécutés : `58/58` sous V8 simulé**, répartis `11 + 6 + 7 + 5 + 24 + 5` ; 6 fichiers authentiques et véritables sources app/International/moteur mensuel, fausses API Node, RPC, DOM et FileReader. Ne pas annoncer Node CLI natif / PostgreSQL/PGlite / Auth/RLS / Chromium / Safari. Aucune migration SQL appliquée, aucune donnée Supabase réelle lue. Conteneur Node 22.16 mais pas de checkout Github/npm ni PGlite (DNS indisponible). Les anciens tests Node/Chromium sur un commit antérieur ne sont pas des résultats de ce HEAD.

**Limites de qualité :** le moteur mensuel utilisé est un moteur laboratoire candidat non chargé par l'app de production stable ; pas d'analyse réelle PDF dans ce lot. Les PDF mensuels doivent rester des preuves manuelles, jamais une écriture automatique ; CSV restant `pending` jusqu'à qualification de la nature/FX/source. Aucune preuve d'unicité réelle entre deux utilisateurs ou de droits SQL directs. Le SW de preview doit être régénéré exclusivement via générateur officiel après modifications précédentes JS/CSS.

**Étape suivante prioritaire :** vrai checkout Node + PGlite fictif pour migrer 07/08/09/10 et tester deux sessions Auth/RLS/CAS/grants, puis scénarios Chromium/FileReader réels, PDF multi-pages et revues incomplètes, Safari iPhone, Cou ple/FX et moteur différé sécurisé ; préserver 5.36.5 et exiger backup/restore/rollback avant toute activation. **57 % global estimatif, production NO-GO.**

---

## 25 octobre 2026 — grand lot CSV : contrôle de source, contexte et lignes illisibles

**Commits code [skip ci] :**
- `67ba2cd314d7f1dc20a00562136958d6b74882f9` : fonction pure `csvImportAccountSnapshot` ; gel de la correspondance des colonnes, du sens, du format de date et du compte choisi entre prévisualisation et écriture. Relecture de la banque active avant chaque RPC `pending`. Invalidation si owner/devise/pays/modèle/liaison de carte changés ou compte archivé. Anciennes cartes typeless prises en compte via `accountType`, cartes différées exclues.
- `352e03be722df1f3d8696e3f56b524193fde6577` : `csvSourceRowsAtIndex`, `csvConflictingSourceRows`. Un autre CSV de même nom, pour le même compte et numéro de ligne, mais avec données bancaires différentes devient un conflit visible ; pas d'écriture pour ce lot. La vraie répétition identique reste un no-op ; des achats identiques à des lignes distinctes restent indépendants. Aucun doublon supprimé automatiquement.
- `3c6e0707a07fbe90d172a1b1979bb03044231cef` : `csvPartialImportAllowed` et case explicite « J'ai examiné les lignes illisibles » avant import partiel. Les lignes invalides affichées **ne sont pas persistées** en journal ni comptabilisées ; le contrôle de complétude mensuel reste partiel et devra suivre cette liste hors contexte de preview.

**Tests exécutés ce cycle : 47/47** sous V8 sur véritables tests + code candidat et dépendances Node/test/fs/DOM/RPC simulées. Répartition : 6 contexte ; 7 source ; 5 import partiel ; 24 CAS ; 5 Accueil. Une première simulation CAS avait 23/24 à cause d'un défaut du faux `assert.rejects` (mauvaise conversion d'objet Error), résolu dans l'infrastructure de simulation ; rerun **24/24** sans modification de l'app. Aucun Node CLI natif, test PostgreSQL, navigateur, CSS visuel ou Safari exécuté sur ce HEAD.

**Risques ouverts :** le nom du fichier et index de ligne ne sont pas un identifiant bancaire cryptographique ; un nouveau relevé de même nom déclenche un contrôle manuel, mais le renommage en période ne garantit pas l'unicité bancaire. C'est une barrière cliente additionnelle, pas une contrainte serveur. Persistance partielle des lignes `pending` possible lors d'une interruption (sans doublon de l'identifiant de source exact). Cas à deux utilisateurs et anciennes opérations à tester sur base fictive. Aucune preuve que PDF/captures et CSV ont une réconciliation exhaustive en production. Le SW de preview est périmé ; ne le reconstruire que via le script officiel sur checkout entier.

**Prochaine étape :** créer/rejouer parcours réel FileReader/DOM fictif et tests de non-régression sur CSV ; récupérer environnement PGlite/PostgreSQL 07–10 ; finaliser Couple/FX, imports multi-formats et QA des 5 onglets, sauvegarde/restauration/rollback. `main`, production et Supabase réel intacts. **57 % global qualitatif, NO-GO.**

---

## 25 octobre 2026 — intégration de « À faire » dans l'Accueil premium

**HEAD technique :** `362fdec5861b781391b310eadba981a46f1bfa38` avant commit de ces documents. Commits `[skip ci]` sur seule branche internationale :
- `9a6d3d71bdb7f69964067fc977fbd588a5984ebe` : `v5-app-5.37.0.js` + `trace-international-1.0.0.css` : la rubrique existante `#homeReviewAccounts` conserve les fiches des comptes et propose trois actions tactiles premium, import vers Activité → Importer, rapprochement bancaire existant, réglages de rappels existants ; aucun flux financier nouveau ni enregistrement.
- `362fdec5861b781391b310eadba981a46f1bfa38` : correction de la fausse validation « Tout est à jour » lorsqu'il reste des lignes OCR non résolues dans `import_days.unresolvedCount`. Message séparé sans majorer le compteur `pending`, pour éviter le double comptage avec les brouillons déjà présents.
- `tests/trace-home-next-actions.test.cjs` créé : interactions, compteurs et dédoublonnage, absence de comptes, refresh et OCR à contrôler ; **5/5 cas V8 réellement exécutés** sur vraie section de l'app, dépendances Node/DOM simulées. Régression des 24 tests CAS **24/24 exécutés sous V8 simulé sur le nouveau HEAD**. Zéro test Node CLI, SQL PG, navigateur ou iPhone en ce lot.

**Décisions préservées :** 5 onglets, ordre de l'Accueil, plein accès aux workflows précédents sans créer de 6e onglet, comptes natifs et FX intacts, suppression de zéro ligne financière, aucune donnée réelle Supabase. Le CSS mobile est un contrat de style, **pas** une preuve Safari.

**Statut et limites :** global 57 % qualitatif environ ; PG migrations 07–10 toujours non exécuté, SW de preview périmé après modifications JS/CSS (seul générateur officiel permis), Chromium/offline et vrai Safari à faire, Couple/FX et imports bancaires complets toujours partiels, migration et rollback non autorisés. Production NO-GO.

---

## 25 octobre 2026 — cartes typeless historiques et détour par les placements

**Commits :** `8323cc64d3ac333c358e660f9f11ffe4af18f23d`, `dfed7afab3611c84a0e31e16827f7bf5260cfa5e`, sur la seule branche `trace-5.37.0-international-accounts-fx`, chaque commit `[skip ci]`. `main` inchangée.

1. `accountType()` savait reconnaître une ancienne Mastercard/Carte par son nom si `type` était absent, mais `traceRefuseUnqualifiedDeferredWrite` et la fonction SQL 10 exigeaient `type==='card'` pour `paymentMode:'deferred'`. Les deux gardes refusent maintenant tout `paymentMode:'deferred'` dans `accounts` et identifient les références à ces cartes historiques dans les autres documents, même sans type. L'ancienne carte demeure non éditable/supprimable durant la quarantaine ; aucun historique migré.
2. `investment_operations` est maintenant une collection surveillée des deux côtés ; `bankAccountId` rejoint les références inspectées, puisque les anciennes écritures directes peuvent contourner les validations de la RPC 09. Mouvements ordinaires vers des comptes courants non différés non bloqués par la garde cliente.
3. Nouveau test réel V8 sur les anciennes cartes sans type, un autre sur les mouvements de placement. Des scénarios dans `tests/trace-cas-writes.integration.cjs` couvrent typeless legacy et les insertions directes sur `investment_operations`, mais **aucune vérification PostgreSQL n'a été exécutée**.

**Niveau de preuve :** `24/24` cas du véritable test client CAS passés en V8 avec fausses dépendances Node/fs/DOM/RPC. Analyse de syntaxe JS réussie ; pas de Node CLI/PGlite/PostgreSQL native, Auth/RLS réelle, Safari, Chromium ou SW mis à jour. Conteneur sans accès GitHub/npm DNS, PGlite absent. Vérifier précisément le comportement de la migration candidate 10 sur PG avant toute conclusion financière.

**Statut 57 % qualitatif inchangé, NO-GO production**. Prochain chantier critique : qualification 07–10 dans checkout isolé ; puis sécurité de création atomique des écritures différées, flux banques/Couple/FX, interface premium et tests mobiles. Aucune PR, merge, déploiement, Actions ou accès données réelles.

---

## 25 octobre 2026 — reprise : alias différés et collections de suppression

**SHA code :** `023c9130861df6c48eefb5c525ac6dbe9ce97577` — `fix(trace): guard deferred allocation aliases and persisted collection deletions [skip ci]` (branche internationale uniquement). Nouveau HEAD documentaire à résoudre après ce bloc.

- Défaut réel supplémentaire de `removeDocument` : les anciennes clés `smartImports` et `importDays` empêchaient de retrouver les imports/jours persistés sous `imports` et `import_days` avant le refus de suppression. Aligner les deux et contrôler aussi `reconciliations`. La garde SQL demeure indispensable, car le client ne suffit pas à faire respecter les autorisations.
- Garde `traceRefuseUnqualifiedDeferredWrite` + candidate SQL 10 renforcées contre les champs `deferredPurchaseId`, `deferredPurchaseIds`, `deferredFeeIds`, `deferredSettlementMode`, `deferredDueDate`, `deferredBankEvidence`. Le client vérifie la présence effective du champ ; SQL utilise `jsonb ?| array[...]`. Même avec un compte non chargé, les alias réservés sont mis en quarantaine.
- `tests/trace-cas-client.test.cjs` : 2 tests nouveaux pour alias internes et refus de suppression des collections réelles. `tests/trace-cas-writes.integration.cjs` : scénario fictif nouveau sur alias différés en RPC + écriture directe, **non exécuté**.
- **Preuve du cycle : 22/22 vrais scénarios client exécutés en V8 avec Node/assert/RPC/DOM simulés**, zéro échec. Syntaxe JavaScript compilée ; **aucun SQL natif ni Node CLI complet**. Environnement toujours sans DNS GitHub/npm côté conteneur et sans PGlite ; fichier PG seulement relu et compilé en JS.
- **Porte 07–10 inchangée : BLOQUANTE.** Tests Auth/RLS/CAS à deux sessions, refus direct, quarantaines historiques, validation serveur des doubles preuves, modèle de rollback restant à qualifier. `main`, workflows, Supabase réel et production inchangés. **NO-GO**.
- **Avancement qualitatif : 57 % environ (±10 points).** Le prochain lot prioritaire est un checkout isolé PostgreSQL/PGlite, puis intégration des parcours Couple/imports et visuels premium existants, SW preview par générateur, Chromium/iPhone.

---

## 25 octobre 2026 — défaut de noms de collections CAS, corrigé ; relais de conversation

Les collections réellement utilisées par `saveDocument` dans `v5-app-5.37.0.js` sont **`imports`** et **`import_days`**, comme dans la liste blanche du RPC 09. La protection cliente `traceRefuseUnqualifiedDeferredWrite` employait par erreur les noms des structures mémoire `smartImports` / `importDays`, omettant ainsi certaines écritures d'imports : **défaut concret corrigé**, sans aucune écriture réelle.

- `9ff2e6d71d939aec7c1254b7d7b8525dfd58af08` (`[skip ci]`) : garde CAS réalignée sur `['transactions','imports','import_days','reconciliations']`, et scénarios de refus des imports liés à une carte différée ou possédant une nature différée explicite même sans compte chargé.
- `455eafe7fbabf7bf222ae0e5b09a52a2e57bbb33` (`[skip ci]`) : anciens tests réalignés sur les noms réels `imports` et `import_days`. Premier re-test V8 **19/20**, avec test ancien signalant l'écart attendu ; après correction **20/20** cas V8 du contrat client CAS réussis, sous requêtes RPC et modules Node simulés. Ne pas déclarer que les tests natifs du repo sont passés.
- `1f8ae90e94ac040a1ddd16eadb861d107ace571f` (`[skip ci]`) : scénario du fichier `tests/trace-cas-writes.integration.cjs` exigeant refus serveur des `transactions`, `imports`, `import_days` et `reconciliations` pointant vers l'ancienne carte différée fictive, **même si le document n'a aucun marqueur `deferredKind`** ; plus virement dont `toAccountId` pointe vers carte différée. **Le test SQL est prêt, pas exécuté.**

**Limite d'exécution :** dans l'environnement local de ce cycle, `node v22.16.0` est disponible, mais `git ls-remote` ne résout pas `github.com`, `npm view @electric-sql/pglite` ne résout pas `registry.npmjs.org` et le package PGlite n'est pas disponible localement. Aucun checkout complet dans le conteneur. Le test d'intégration PostgreSQL a été vérifié au niveau **syntaxe JavaScript** via V8. Impossible de confirmer les contraintes ou transitions réelles PostgreSQL/Auth/RLS/CAS ; `migrations/10-trace-deferred-write-quarantine.sql` n'a été appliquée nulle part.

**Toujours NO-GO production**. Prochain départ : résoudre le HEAD, lire les 3 documents complets, obtenir un checkout isolé + PGlite et lancer vrai `scripts/check-trace-537-release-gates.cjs` ; si indisponible, continuer à traiter les chantiers utilisables sans simuler le succès serveur. Poursuivre aussi contrôles bancaires atomiques, Couple/FX, écrans premium iPhone, SW de preview via script uniquement, tests offline/Safari/rollback. `main` stable 5.36.5 intact, aucun CI/PR/merge/deploy/Supabase réel.

**Avancement qualitatif : 57 % global, environ 43 % restant.** Ce bilan n'est pas calculé depuis le nombre de tests.

---

## 25 octobre 2026 — Protection candidate des écritures différées, client + SQL

**Contexte** : le parcours PDF/CSV différé existant reste local/lecture seule ; la sélection des comptes liés ne suffit pas à garantir les écritures en base. Une revue ou un snapshot de navigateur ne doit jamais être assimilé à une preuve bancaire authentifiée.

**Nouveaux commits** ([skip ci], branche candidate uniquement) : `c0cbdac8`, `274fd1a8`, `5a69e0e4`, `a9294f63`, `a87f15b7`, `932be3cd`, `7e9c0528`.

- `v5-app-5.37.0.js` : `traceRefuseUnqualifiedDeferredWrite` stoppe dans `saveDocument` la création/modification de comptes de type carte différée, transactions/imports/rapprochements référençant une carte différée reconnue, documents avec `deferredKind`, `type:'deferred_purchase'`/`deferred_settlement`, `settlementMode`, `purchaseIds`, `feeIds`, `transferPurpose:'deferred_settlement'`, champ de revue bancaire différée. Même contrôle juste avant l'envoi de RPC **à l'intérieur** de `traceSerialWrite` afin de refuser un item devenu différé en attendant la file. Suppression de transactions différées identifiées localement bloquée. Les transactions classiques et leur CAS `pending→confirmed` restent disponibles.
- Nouvelle migration **candidate, NON appliquée** `migrations/10-trace-deferred-write-quarantine.sql` : fonction `SECURITY DEFINER` `trace_is_unreleased_deferred_doc` identifiant les écritures différées, et trigger `trace_deferred_write_quarantine` **avant INSERT/UPDATE/DELETE** pour refuser les écritures différées dans `public.documents`, y compris les écritures directes legacy et la falsification d'anciens enregistrements. Cette quarantaine est temporaire : elle ne constitue PAS une implémentation de réservation/validation/écriture différée, et nécessite une stratégie explicite de remplacement sous Auth/RLS/CAS avant ouverture. Les droits d'écriture directs de 09 ne sont pas retirés sur cette branche.
- Scénarios `tests/trace-cas-writes.integration.cjs` étendus pour migration 10, carte différée, achat `pending` et `confirmed`, settlement, direct insert/delete, ancien compte et achat fictifs créés **avant** l'installation du trigger, tentative de nettoyage des marqueurs, idempotence et maintien des opérations ordinaires. **Attention : ce test n'a PAS été exécuté en PostgreSQL.**

**Vérification effectivement faite** : `18/18` cas du vrai client CAS en V8 avec modules Node/RPC simulés, sans échec ; syntaxe JS de l'intégration PGlite contrôlée, lecture statique des points d'entrée SQL et du release gate. Cette validation ne vérifie **aucune** contrainte/erreur native PostgreSQL ; il faut l'exécuter dans un checkout complet avec PGlite ou PostgreSQL fictif et corriger tout échec. Les `101/101` cas précédents ne sont pas réexécutés sur ce HEAD. Pas de QA Chromium, offline, Safari ni GO.

**Portes restantes** : tests 07–10 + Auth/RLS/CAS (avec 2 clients et écritures directes), analyse de sécurité SQL, flux `pending→confirmed` réel et journal financier/carte/courant/frais/remboursement, devises personnelles et Couple, composants premium, service worker preview reconstruit via script, sauvegarde/restauration/rollback et consentement au déploiement. Estimation qualitative globale **57 %**. La stable 5.36.5, `main`, Supabase réel et production restent intacts. **NO-GO**.

---

## Lot du 25 octobre 2026 — parcours PDF différé limité aux comptes bancaires liés

Commits `[skip ci]` : `922b5b67633f83b565e0062e391b20924cf0143b` (5 fichiers), puis `9ac3033f428668ac6e5209d57cbbb14786c0ebcd` (test écran asynchrone corrigé). Sur `trace-5.37.0-international-accounts-fx` uniquement ; `main` stable et production hors périmètre.

**Problème corrigé :** la revue locale d'un relevé pouvait proposer une preuve de carte à débit différé pour une carte classique, sans lien de règlement différé. `TraceDeferredStatementReviewUI.eligible` n'autorise désormais que :
- carte `paymentMode:'deferred'` liée à un compte courant actif, même propriétaire/pays/devise ;
- compte courant avec **carte différée** active le désignant comme compte de règlement, avec les mêmes contrôles.

`TraceMonthlyStatementUI` fournit uniquement les comptes visibles, l'interface vérifie de nouveau l'éligibilité à la récupération de la preuve. Une éligibilité perdue ne peut pas réanimer une attestation précédemment locale. `trace-international-preview-fixtures-1.0.0.js` comprend maintenant une carte différée EUR **strictement fictive** associée au courant français fictif ; aucun modèle bancaire réel, solde ou historique n'a été modifié. L'ensemble n'est chargé que dans la preview dédiée, sans nouvelle écriture financière.

**Tests réellement exécutés :** 101/101 **scénarios V8** ciblés sur les vraies sources de cette branche dans des simulations de Node/fs/vm/DOM. Neuf suites : 17+22+12+9+7+5+5+18+6. Les suites du nouvel écran montent le véritable `TraceMonthlyStatementUI` avec DOM fictif et classent une ligne depuis un PDF fictif en mémoire. La suite native du dépôt, vrais navigateurs et PostgreSQL/PGlite **n'ont PAS été lancés**. Aucun GO. Estimation prudente d'avancement global : 57 %, incertitude ±10 points, fondée sur une appréciation qualitative des chantiers.

**Blocages restants inchangés :** connexion à une vraie validation bancaire/serveur; Auth/RLS/CAS PostgreSQL fictif migrations 07/08/09 deux clients; conformité de tous les imports FR/CA multi-devises et OCR; achèvement différé et remboursements/frais avec écritures atomiques sécurisées; couple et patrimoine; design premium et mobile; reconstruire uniquement SW preview via générateur officiel; Chromium offline / vrai iPhone Safari; sauvegarde/restauration/rollback autorisés et GO explicite. L'outil `TraceDeferredStatementReviewUI` est **preview-only** et le SW actuel potentiellement périmé. **NO-GO production**.

---

## Lot 25 octobre 2026 — chaîne de preuve du relevé préparé à la revue différée

**Code candidat ajouté :**
1. `224f73dc08ed3aca44af437071033a8e8042693b` — `TraceDeferredStatementBridge.convert` transforme, **sans écriture**, un `TraceStatementEvidence.stage` avec revue complète des lignes en document de relevé exploitable dans `TraceDeferredPurchaseEvidence.review` (achat, crédit, frais, paiement de carte) ou `TraceDeferredBankReview.compare` (courant). Entrées explicites et obligatoires : type carte/courant, source `pdf_extracted` / `csv` déjà structurée, identité physique/import, approbations de chaque ligne et classifications/sens de chaque ligne liés à `statementKey`, attestation de complétude du nombre attendu de lignes. Conserve page, ligne, extrait original, centimes/devise/date. Toute ambiguïté, édition ou attestation expirée renvoie `status:'blocked'`. `statement.complete:true` signifie **seulement complétude localement déclarée** ; pas de garantie OCR/PDF réelle, pas d'authentification bancaire ni unicité serveur.
2. `b9e97ad965f94f0489720a6e52f15bc5fe15e1fc` — nouveau test `tests/trace-deferred-statement-real-integration.test.cjs` avec les **vraies sources** des deux contrôleurs, moteur FX, write-plan, `TraceStatementEvidence`, bridge et intake. Montre deux attestations indépendantes en EUR, classification obligatoire, origine bancaire non substituable, token périmé, aucune écriture.
3. `176a46fc2a13884d6be4bb1e932a334c9470580b` — modification de la **seule** preview fictive et de `trace-deferred-evidence-lab-1.0.0.js`, qui utilise désormais réellement le staging et bridge sur ses deux sources fictives (achat carte 40 €, prélèvement 12,35 €), sans écriture. Les boutons de modification font expirer séparément les versions source. Test UI historique adapté pour charger les nouveaux moteurs.
4. `7fba0e68bb58f5dc33f7d591ae37e3bba7e36708` — `tests/trace-deferred-evidence-preview-real-modules.test.cjs` vérifiant la démo entière avec 9 modules candidat, DOM simulé, jamais production.

**Tests effectivement rejoués sur le dernier HEAD de code : 77/77 V8 ciblés réussis, zéro échec**, avec Node/fs/vm simulés :
- 17 préparation achat, 22 contrôles intake, 12 tests intake/moteurs réels ;
- 9 tests du bridge, 7 tests croisés staging/import structuré/contrôleurs réels ;
- 5 tests UI avec sous-contrôleurs simulés, 5 tests UI avec les neuf modules réels et DOM simulé.
- Un essai interactif supplémentaire V8 montre les états `needs_human_review → manual_review_current → stale_review` lors du changement du document carte et du courant. **Aucun** test de vrais navigateurs, PDF, CSV parseur, PostgreSQL/PGlite ou Node CLI complet n'est revendiqué.

**BLOQUANTS :** ce raccordement utilise des lignes de source déjà structurées et des données fictives ; il n'est PAS encore branché au traitement des uploads de l'utilisateur ni au flux de sauvegarde `pending`. Le vrai Node CLI complet / SQL 07/08/09 Auth/RLS/CAS deux sessions restent à exécuter dans un checkout isolé. Le SW de laboratoire est périmé après changement de HTML/JS et doit être reconstruit via générateur, jamais à la main. Tests Chromium offline, Safari iPhone, couverture Couple/FX, frais/remboursements/allocations, sauvegarde/rollback et autorisation avant production. Production 5.36.5, `main`, Supabase réel, GitHub Actions, PR, fusion et déploiement intacts. **NO-GO.**

---

## Lot du 25 octobre 2026 — plafonnement des prélèvements exclusifs au centime natif

**Commit** `1d85b2adb3bdd27b9d6f90d8fcc78a036e925046` (`[skip ci]`) sur la seule branche candidate. Après le contrôle du lien `checkingAccountId` et de `purchaseIds`, le module `TraceDeferredEvidenceIntake.review` contrôle maintenant un cas déterministe supplémentaire : **plusieurs prélèvements partiels exclusivement affectés à un achat unique, sans frais de carte, ne doivent pas dépasser le montant natif de cet achat**. Comparaison en centimes exacts, y compris test de sous-centimes malformés ; un total exactement égal au prix de l'achat reste présentable en **revue locale** et ne devient jamais une écriture.

Un prélèvement destiné simultanément à plusieurs achats ou frais, ainsi que les remboursements marchands, nécessite toujours une vérification complète des allocations avec `TraceDeferredDebit` et les opérations du journal. L'adaptateur ne se substitue **pas** au moteur financier ni à une contrainte CAS/RLS serveur ; les champs `persistable:false`, `eligibleForServerConfirmation:false`, `writes:0` restent constants.

**Exécution réelle du 25 octobre :**
- Local isolé Node 22.16.0, `node --check trace-deferred-evidence-intake-1.0.0.js` et `node --test trace-deferred-evidence-intake.test.cjs trace-deferred-evidence-lab.test.cjs` : **27/27** tests natifs isolés, avec sous-contrôleurs/DOM simulés (22 + 5), zéro échec.
- Sources candidate GitHub interrogées après commit : 3 suites chargées dans un environnement **V8 mock Node/fs/vm**, **51/51 scénarios** (17 préparation, 22 adaptateur, 12 modules financiers réels ensemble), zéro échec. **Cette exécution n'est PAS Node CLI natif**, ni une vraie DB ou un navigateur.
- Tests du dossier entier `scripts/check-trace-537-release-gates.cjs` toujours **non exécutés** ; aucune preuve PostgreSQL/PGlite/SQL 07-08-09, Auth/RLS/CAS deux clients, SW preview régénéré, Chromium offline ou Safari. Le précédent 219/219 V8 reste historique, pas une nouvelle régression complète.

**Prochaine priorité** : qualification native du candidat en checkout isolé, tests Auth/RLS/CAS SQL fictifs, contrôles d'allocation multi-achats/frais/refunds contre `TraceDeferredDebit`, import relevés PDF/CSV structurés et raccordement aux vrais parcours de revue `pending` sans persister, devise Couple et UI premium, reconstruction SW par script, Safari iPhone, sauvegarde/restauration/rollback. Aucune mutation de `main` stable, production, Supabase réel, CI, PR, fusion ou déploiement. **NO-GO strict**.

---

## Lot du 25 octobre 2026 — vérification du compte courant et de l'allocation d'achat

Commits candidats **[skip ci]** : `360ad42997a569e980d14c212d07f5f111677ff7` (code et tests), `fd1a241c7d23aa70e8fa739f098005f3b4682573` (test corrigé de consentement périmé).

- **Plan sans écriture** : `TraceDeferredWritePlan.prepare` ajoute `checkingAccountId` à l'objet candidat figé. Le compte courant devait déjà être lié à la carte et détenu par son propriétaire ; le contrôle réutilise cette liaison plutôt que de croire un ID arbitraire passé plus tard à la revue.
- **Comparaison double justificatif** : `TraceDeferredEvidenceIntake.review` refuse le remplacement du courant par un autre, les relevés du courant de devise différente, les règlements non attribués à `plan.document.id`, allocations absentes/vides/dupliquées et les contrôles divergents même si les deux sous-contrôleurs renvoient des revues locales. Une ligne déjà revue reste non persistable. Le cas `purchaseIds` contenant plusieurs achats distincts passe le contrôle d'appartenance, **mais modifier cette liste invalide le snapshot de la preuve de prélèvement** et nécessite une nouvelle attestation.
- **Exécutions réellement effectuées** : dans le répertoire local isolé `/mnt/data/trace537-intake`, `node --test trace-deferred-evidence-intake.test.cjs trace-deferred-evidence-lab.test.cjs` (Node 22.16.0) : **23/23 réussis** (18 + 5), contrôleurs/DOM simulés et fichiers concernés présents localement, **pas** un checkout entier du dépôt. Le test initial contenait une fixture de relevé courant sans devise ; elle a été corrigée puis tous les cas ont été rejoués.
- **V8 sur vraies sources candidate GitHub** : **45/45** simulations avec modules Node/fs/vm fictifs (17 `trace-deferred-write-plan.test.cjs`, 18 `trace-deferred-evidence-intake.test.cjs`, 10 `trace-deferred-evidence-intake-real-modules.test.cjs`). Un scénario multiachats a révélé la péremption correcte du snapshot et son attente a été corrigée, avec nouvelle attestation explicite. Parcours interactif des **sept vrais modules JS** testé sous V8/DOM simulé : pré-revue, deux confirmations purement locales, changement de source carte puis courant, états indépendants expirés ; 0 écriture.
- **Limites bloquantes** : pas d'exécution native Node des suites complètes ou des sources financières réelles intégrées, pas de checkout GitHub local entier / PGlite, pas de migrations fictives 07/08/09, pas de vrai navigateur iPhone/Chromium, pas d'Auth/RLS/CAS deux sessions, pas de test backup/rollback. Le SW de preview doit être reconstruit **uniquement** avec le générateur officiel avant toute QA offline. Aucune activation carte différée ou écriture `pending`; **NO-GO**.

Prochaine priorité : connecter les sources des imports structurés aux contrôleurs de preuve dans l'interface candidate, sans sauver ni confirmer, puis qualification financière des allocations et tests multi-clients SQL avant toute persistance. `main`, production 5.36.5, Supabase réel, CI, PR, fusion et déploiement inchangés.

---

## Durcissement — complétude des relevés du courant (25 octobre 2026)

Le regroupement `TraceDeferredEvidenceIntake` ne marque plus deux preuves comme revues si `TraceDeferredBankReview.compare` signale un **autre document du lot bancaire invalide**, même si le prélèvement sélectionné a une attestation locale. Le champ `checkingSourcesComplete` le signale explicitement. **12/12 tests natifs Node isolés** sur l'adaptateur avec contrôleurs simulés ; 5/5 tests UI natifs isolés précédents ; 6/6 scénarios multi-modules V8 fictifs supplémentaires sur les sources réelles, ainsi qu'un clic-test V8 avec les sept modules réels (statuts initiaux, deux attestations, deux expirations). Ceci **n'est pas** un test Node intégré du dépôt, ni SQL, PG/PGlite ou Safari. Toutes les dépenses restent non persistables, NO-GO. HEAD initial de ce lot `de5782ed5299b6af4993fd93ed2f9cb06f00fe58`; aucun changement main, prod ou Supabase réel.

---

## Addendum de vérification — 25 octobre 2026

Après le circuit double preuve, `e825556372103f64d54149acd0fd5487017cc37d` ajoute `tests/trace-deferred-evidence-intake-real-modules.test.cjs` : **six scénarios sur les vraies sources** `TraceInternational`, `TraceDeferredDebit`, préparation d'achat, preuve carte, preuve courant et adaptateur. Ils sont **6/6 réussis dans un harnais V8 avec Node/fs/vm simulés** ; le fichier est présent pour sa future exécution **native Node** dans un checkout complet, mais **celle-ci n'a PAS été réalisée**. Montants 40 EUR → 64 CAD au taux fictif, deux attestations, invalidation indépendante, remboursement non accepté comme achat, impossibilité de confirmer/persister. Le SW de laboratoire est toujours périmé ; pas de PG/PGlite/Chromium/Safari ni GO. L'ancien bilan 219/219 V8 demeure historique et non rejoué sur ce nouveau HEAD.

---

## Lot du 25 octobre 2026 — circuit double preuve d'achat et de prélèvement en labo

- Code : `8a71018ebb139d8905469cf1fb497cd76dd89982` + commit laboratoire de cette entrée. `trace-deferred-evidence-intake-1.0.0.js` relie les contrôleurs existants sans les fusionner, empêche la réutilisation d'une même pièce physique carte/courant et toute conversion d'une attestation en écriture.
- `trace-deferred-evidence-lab-1.0.0.js` propose **uniquement dans la preview fictive** un affichage à deux colonnes : achat carte 40 EUR, prélèvement partiel courant 12,35 EUR, deux attestations manuelles, expirations indépendantes quand les sources changent. Sources PDF/CSV **préalablement structurées et fabriquées pour le laboratoire**, pas de parser ni connexion bancaire.
- **Tests réellement exécutés avec Node 22.16.0 dans un répertoire isolé** : 11 nouveaux scénarios adaptateur + 5 interface, **16/16**, mais dépendances/données et DOM simulés ; vérifications syntaxiques des 2 JS. Ce n'est pas la suite native complète, ni l'exécution réelle des anciens modules ensemble, ni une recette navigateur, ni PGlite/PostgreSQL/RLS.
- Suite historique 219/219 V8 (9 suites) documentée au HEAD initial, **non rejouée**. Pas de tests réels SQL 07/08/09, Safari, Chromium offline, deux clients, ni rollback.
- Après ajout des assets à `trace-international-preview.html`, le SW de laboratoire est **périmé** : ne pas utiliser la preview offline avant construction par `scripts/build-trace-preview-pwa.mjs` et `--check` dans un checkout complet ; aucune génération manuelle, aucun SW de production.
- Pas de création de compte différé activée, aucune sauvegarde `pending`, aucune confirmation, aucune mutation d'argent. Aucune donnée Supabase réelle, aucun `main`, PR/fusion/CI/deploiement modifiés. **NO-GO**.

**À faire ensuite :** connecter les imports PDF/CSV structurés et les fiches de validation réelles de la candidate, empêcher doublon/confirm concurrent côté serveur, tester en SQL/Auth/RLS/CAS fictifs (07/08/09), finir multi-devises/Couple et écrans premium, tester Safari iPhone, restaurations et rollback ; validation explicite avant production.

---

## Lot du 25 octobre 2026 — rapprochement du justificatif d'achat différé (distinct du prélèvement)

**Trois commits de code sur `trace-5.37.0-international-accounts-fx` seulement (tous `[skip ci]`) :**
- `e4dee650b760ea12fcc7a92069c09792e0333805` : le module `TraceDeferredWritePlan.prepare` accepte désormais les montants à virgule français dans `fields.amount` et `fields.purchaseAmount` (ex. `40,00 EUR` et `50,25 USD`), comme le formulaire différé, en normalisant **avant** `resolveBooking`. Pas de sous-centime, notation exponentielle, ni conversion FX implicite.
- `dc71b9136388bd9181e129832d04ce7f308325a1` : nouveau module pur `trace-deferred-purchase-evidence-1.0.0.js` et suite `tests/trace-deferred-purchase-evidence.test.cjs`. `TraceDeferredPurchaseEvidence.review` compare un **plan de dépense différée `pending`, non persistable** à une ligne précisément **sélectionnée** d'un relevé de **carte** source structuré, et surtout **pas** à la ligne de prélèvement bancaire du compte courant (déjà traitée séparément par `trace-deferred-bank-review-1.0.0.js`). Valide source PDF/CSV complètement structurée, identité source/version/compte/carte, devise native, date achat, sens débit, montant au centime, statut confirmé, unicité des lignes et des importations physiques, détection de plusieurs achats possibles et des revendications concurrentes. Une correspondance parfaite reste `needs_human_review` ; un reçu utilisateur exact et à jour donne seulement `manual_review_current`, toujours **`persistable:false`, `confirmed:false`, `createdTransactions:0`**, sans Auth/banque/PGlite certifiée. Jeton de snapshot JSON **non cryptographique**, périmé si justificatif entier, version source, plan ou sélection évolue ; la revérification serveur est impérative plus tard.
- `b0ae1129c307e59ddd62546450326ef26371b32c` : support des relevés de carte **mixtes** contenant achats, remboursements, paiements et frais, sans jamais permettre de choisir une ligne non-achats comme preuve de dépense. Contrôles de calendrier/date cohérents par type de ligne.

**Validation : 219/219 vérifications V8 fictives sur 9 suites** : 17 préparation, 23 revue achat, 27 revue règlement bancaire distincte, 12 date budgétaire, 14 revue échéances, 15 simulation achat, 14 détail comptes, 84 moteur différé, 13 UX premium. Ce sont des exécutions de tests sources sous V8 avec Node/VM/FS mockés ; **aucun** `node --test` natif, PostgreSQL/PGlite migrations 07/08/09, navigateur, Safari ni multi-session. L'environnement container a Node 22 mais ni checkout GitHub, ni accès DNS github.com, ni PGlite local ; les scripts de qualification dans `scripts/check-trace-537-release-gates.cjs` demeurent non exécutés.

**Limite de livraison impérative :** le nouveau contrôleur d'achat est **autonome, non branché à l'interface candidate ni à la preview PWA**, et ne peut ni créer de document ni marquer un achat comme confirmé. Il demande des sources de relevé structurées PDF/CSV et une sélection explicite de ligne. Un reçu `manual_review_current` est un état local insuffisant pour autoriser une écriture financière. Ne pas prétendre que le parcours d'import/revue complet est utilisable. Ne pas activer `deferred` dans le sélecteur de cartes.

**Suite prioritaires :** raccorder en laboratoire fictif les imports/relevés carte structurés aux preuves d'achat et les prélèvements aux preuves de règlement distinctes ; valider ensuite la sauvegarde `pending` et la transition `confirmed` sous Auth/RLS/CAS en PostgreSQL fictif, revérification serveur / unicité source / concurrence à deux clients. Qualifier toutes les opérations multi-devises/Couple/frais/refunds et les vues premium ; régénérer le service worker de preview via `node scripts/build-trace-preview-pwa.mjs` dans checkout isolé, `--check`, tests Chromium offline et iPhone Safari ; backup/rollback avant toute proposition de GO. `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` et code prod/Supabase réels intacts. **NO-GO absolu**.

---

## Lot du 25 octobre 2026 — séparation de la date budgétaire et préparation d'écriture différée

**3 commits de code uniquement sur `trace-5.37.0-international-accounts-fx` :**
- `445ee9642c98fcfe21b643ef78abf209ce7bd0ac` : sélection du mois budgétaire par `budgetDate` pour achats explicitement `deferredKind:'purchase'` et remboursements `deferredKind:'merchant_refund'` ; les opérations historiques non taguées restent dans leur ancien mois `date`. Aucun changement de date bancaire, ni nouvelle dépense lors du transfert de règlement. Une date budgétaire malformée n'est jamais remplacée implicitement par une autre date.
- `7e7b2bb7b39de861bfdbba322a35f8757346249f` : la revue read-only `traceDeferredAccountReview` reconnaît désormais le même marqueur explicite `deferredKind:'purchase'` ; les marqueurs inconnus sont refusés plutôt que comptés comme achats.
- `908d46cfe40aa67b3c12c899dbc747e6a14296b4` : nouveau moteur pur `trace-deferred-write-plan-1.0.0.js`, méthode `TraceDeferredWritePlan.prepare`. Il prépare un **document de transaction candidat, inexportable vers la base par ce module**, au statut strict `pending`, `persistable:false` / `confirmed:false`, et n'a **aucune fonction d'écriture**. Entrées obligatoires : carte différée + compte courant lié/autorisé/même devise+pays, titulaire, libellé, identifiant unique, montant exact natif, date achat, date budget, date prévue du débit et catégorie de dépense active. `TraceInternational.resolveBooking` exige taux CAD daté/sourcé pour compte EUR/USD/GBP/CHF (jamais taux 1 inventé, jamais zéro CAD d'arrondi), conservation de la devise de l'achat et du montant original ; avertissement doublon bancaire sur même compte/date/libellé/montant natif. `TraceDeferredDebit.simulate` valide le contrat d'échéance avec achat fictif, **sans règlement ni écriture**, et l'objet renvoie les effets **uniquement si confirmé ultérieurement**. Répartition personnelle 100 % du titulaire, pas d'appropriation de compte partenaire.

**Portée :** préparation du schéma et de la validation backend, mais **aucune saisie de transaction différée enregistrable**, aucun appel CAS/SQL et aucune modification de la vraie base ou de `main`. Le nouveau module n'est pas encore câblé à l'UI ou au service worker, il est autonome et testable : ne pas annoncer « débit différé activé ». La fonction read-only précédente et le simulateur restent disponibles dans la candidate laboratoire. Les cartes différées restent non activables dans les contrôles d'ajout de compte.

**Tests du lot : 166/166 vérifications sous V8 fictif** sur sept suites : 14 préparation document, 12 date budgétaire, 14 revue compte différé, 15 achat simulé, 14 détails comptes, 84 moteur différé, 13 parcours premium. Simulations réelles du code repo dans un environnement **Node/VM/FS mocké**, ce n'est pas Node CLI natif, PGlite ni Safari. L'outil `scripts/check-trace-537-release-gates.cjs` est toujours non exécuté faute de checkout local complet et PGlite dans cet environnement.

**Avant tout GO :** étendre la prise en compte `budgetDate` à tous les widgets de période applicables, construire une édition/revue documentée, créer la transition `pending` → `confirmed` sous CAS/RLS/auth et justification bancaire fiable, gérer règlements/frais/remboursements avec preuves, tests PostgreSQL **fictifs** 07/08/09 et multi-client, PWA Chromium offline/iPhone Safari, régénérer SW laboratoire par générateur (la modification du JS de l'app a pu périmer son cache), sauvegarde/rollback. Aucune production, Supabase réel, fusion, PR ni workflows CI. **NO-GO.**

---

## Lot du 25 octobre 2026 — simulateur d'achat différé à trois dates

**Nouveaux commits sur la seule branche `trace-5.37.0-international-accounts-fx` :**
- `898d961787667c34f5fe0e990837aebba14f3725` — `feat(trace): add three-date deferred purchase simulator in card details without ledger writes [skip ci]`.
- `d0953eda57dfc3f229f7462c64971ced8aa62992` — `fix(trace): bind deferred simulator only on owned deferred-card details [skip ci]`.

**Fonctionnel :** `v5-app-5.37.0.js` contient `traceDeferredPurchaseProjection`, `traceDeferredPurchaseForm` et `bindTraceDeferredPurchaseForm`, appelés depuis `openTraceAccountDetail` uniquement pour les cartes différées du titulaire courant, actives. La fiche de compte peut **simuler un achat hypothétique et non enregistré** avec quatre champs à renseigner : montant natif au centime, **date d'achat**, **date d'impact budgétaire**, **date prévue de prélèvement**. Les trois dates restent indépendantes et explicites, sans valeur inventée. Le simulateur utilise le moteur strict existant `TraceDeferredDebit.simulate` avec un **achat fictif isolé** et aucun transfert. Il affiche le mois budget natif, la dette théorique propre à cet achat, la date du prélèvement **prévu** et indique que le compte courant n'a été **ni débité ni modifié**. La sortie ne représente jamais la dette globale ni une réelle opération bancaire ; aucune conversion CAD sans taux historique sourcé. Aucune donnée de l'utilisateur n'est lue par la simulation au-delà du compte/courant lié et aucune transaction n'est créée.

**Validation UX et sécurité :** date calendrier stricte, date de prélèvement non antérieure à achat/date budget, devises/pays/propriétaires du duo banque-carte cohérents, saisie `40,00` ou `40.00`, maximum deux décimales, échec fermé sans moteur ou compte courant lié. Tout changement de saisie invalide la projection précédente. L'interface est responsive iPhone via `trace-international-1.0.0.css`. Le nouvel écouteur du formulaire a été limité aux cartes `paymentMode:'deferred'` détenues par `me`, pour ne pas affecter les comptes courants/cartes de crédit/compte du partenaire (régression détectée et corrigée avant validation).

**Tests ciblés sur le dernier code : 138/138 passés dans un harnais V8 fictif**, soit `tests/trace-deferred-purchase-forecast.test.cjs` 15/15, `tests/trace-deferred-account-readonly-integration.test.cjs` 12/12, `tests/trace-international-account-details.test.cjs` 14/14 (async exécutés), `tests/trace-international-deferred-debit.test.cjs` 84/84, `tests/trace-international-premium-layout.test.cjs` 13/13. **Attention : aucun Node CLI natif, vraie base PostgreSQL/PGlite, navigateur Chromium, Safari ni client iPhone n'a été exécuté.**

**Périmètre encore ouvert / NO-GO :** ces changements ajoutent un **parcours de simulation** et une revue read-only existante, mais **pas le stockage des achats différés ni la clôture du prélèvement**. La création des cartes différées demeure désactivée. Avant activation, il faut concevoir/vérifier le schéma et les écritures réelles dans PostgreSQL **fictif** avec CAS/RLS/auth, intégrer les imports/relevés, la séparation date achat/budget/débit réel, les remboursements, les frais, les transferts sans double comptage, la reprise de données sans migration risquée, puis tests Node et navigateur et iPhone Safari. `scripts/check-trace-537-release-gates.cjs` est prêt mais bloqué ici faute checkout complet/PGlite. Régénérer le SW preview avec `node scripts/build-trace-preview-pwa.mjs` puis `--check` exclusivement sur checkout de laboratoire ; ne pas éditer le SW à la main.

**Aucune modification de `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909`, de production 5.36.5, workflows/Actions, Supabase réel, PR/fusion ou déploiement.** Aucun GO ou calendrier de publication à promettre tant que le périmètre précédent manque.

---

## Lot du 25 octobre 2026 — raccordement lecture seule du débit différé

**Commit de code : `1f6ab1ec7dcc6bba83efca8f8d8e17374a3ff795`**, uniquement `trace-5.37.0-international-accounts-fx`, message `[skip ci]` ; `main` stable et production inchangées.

Avancement fonctionnel sur **un chantier encore inachevé**, sans activer les écritures dangereuses :

- Dans `v5-app-5.37.0.js`, nouveau `traceDeferredAccountReview(card)` branché à `openTraceAccountDetail` **seulement** pour les cartes `paymentMode === 'deferred'`. Il exploite le moteur existant `TraceDeferredDebit.simulate` déjà chargé dans `trace-international-preview.html` (laboratoire fictif). Il affiche, si les métadonnées sont explicitement complètes, dette native théorique, échéances dépassées, état de chaque lot, montant restant et montant réglé, sans créer de transaction ni modifier de budget/solde. CSS dédié compact dans `trace-international-1.0.0.css`.
- L'adaptateur lit les transactions existantes, ne retient que les achats natifs confirmés avec `date`, `budgetDate` et `dueDate` renseignées, les frais `deferredKind:'card_fee'` avec échéance, remboursements `deferredPurchaseId` et transferts courant→carte avec `deferredPurchaseIds`, `deferredFeeIds` et **vrai montant reçu** `toBankAmount`. Les justificatifs des règlements partiels sont délégués au moteur strict. Aucun calendrier de prélèvement, taux FX ni paiement de carte inventé. Un seul mouvement pertinent incomplet rend l'ensemble **non projetable**, pour éviter un faux solde.
- Le module est **délibérément absent des assets production stables** ; l'absence du moteur déclenche « Analyse indisponible », jamais une valeur inventée. L'activation des nouvelles cartes `deferred` dans l'interface demeure **désactivée** ; aucune écriture ni migration réelle n'est autorisée. Il s'agit d'une **intégration d'affichage read-only du candidat/labo**, pas d'une fonctionnalité de débit différé pleinement opérationnelle.
- Nouveau `tests/trace-deferred-account-readonly-integration.test.cjs` : **12 scénarios V8** réussis sur le code candidat et le vrai moteur de simulation (achat EUR 40, virement confirmé, remboursement, absence date/solde/compte/currency, absence module, carte crédit classique, erreur engine, intégration à la fiche). Régressions V8 fictives validées : **84** scénarios moteur différé existant, **14** tests compte/compte principal (async exécutés), **13** tests ordre/UX premium ; **123/123 contrôles V8 au total** dans ces quatre suites, pas des tests natifs Node/PG/browser.

**Étapes indispensables avant GO :** (1) achever le vrai schéma et les formulaires achat différé avec dates achat/budget/échéance et preuve d'import de règlement ; (2) relier correctement chaque ligne bancaire à un lot, frais/remboursements, sous garde de non-double comptage ; (3) autoriser les créations de cartes différées seulement APRÈS tests solides ; (4) reconstruire le SW du labo via `node scripts/build-trace-preview-pwa.mjs` depuis checkout complet (modification app+CSS = cache de preview potentiellement périmé), Node natif, PGlite migrations 07/08/09 Auth/RLS/CAS deux clients, Chromium hors ligne et Safari iPhone, backup/restore/rollback et GO humain explicite.

**NO-GO inchangé.** Le conteneur de chat n'a ni checkout Github ni PGlite ; seules simulations V8 ont été possibles. Aucun `main`, `index.html`, `sw.js`, GitHub Actions, données Supabase réelles, PR, fusion, déploiement ou migration en base.

---

## Lot du 24 octobre — sens bancaire immuable sur tous les comptes

**Dernier commit de code : `9a3fcdbc633e43eb864dbf5fa10a52520c9fbff4`.** Branche exclusive `trace-5.37.0-international-accounts-fx`, message `[skip ci]`, main et production intacts.

**Problème financier identifié puis corrigé :** la validation des captures OCR étrangères refusait déjà un crédit du relevé déguisé en dépense, mais une capture **CAD** avec une direction bancaire connue `bankDirection:'in'` pouvait, dans certains cas, être requalifiée en `expense` puis comptabilisée en sortie. Inversement un débit CAD pouvait être classé comme revenu. Le garde d'enregistrement `smartApproveDraft` compare désormais, pour **CAD comme pour EUR/USD**, le sens immuable `bankDirection` capturé et le sens bancaire attendu d'après la nature du mouvement, et refuse toute contradiction **avant toute écriture**. L'interface `trace-smart-inbox-3.5.0.js` applique le même contrôle au bouton : message explicite « Sens bancaire incompatible · À vérifier ». Une direction OCR inconnue reste soumise aux contrôles déjà présents et n'est pas inventée.

**Tests effectifs :** ajout de quatre scénarios CAD au fichier `tests/trace-international-foreign-capture-approval.test.cjs`, dont contrôle refus crédit→dépense, débit→revenu, acceptation dépense CAD avec débit cohérent, verrouillage UI. **97/97 vérifications ciblées V8 fictives** sur neuf suites après commit : 22 OCR étranger+CAD, 8 consentement doublons, 7 montants UI, 7 vieux gardes de capture, 18 CSV, 8 carte/virement, 11 garde FX au centime, 11 intégrité monétaire, 5 **SQL statiques**. Ces contrôles simulent Node, DOM et persistance ; ils ne sont ni des tests Node CLI réels ni du PostgreSQL/PGlite/Chromium/Safari.

**État de release : NO-GO.** Les parcours débit différé sont toujours isolés du client utilisable, la conception UI premium n'est pas entièrement intégrée, les migrations 07/08/09 doivent être testées en SQL réel fictif (RLS/Auth/CAS, deux clients), le SW labo est à régénérer avec son script et à tester offline/Chromium, iPhone Safari et restauration/rollback manquent. Le runner `scripts/check-trace-537-release-gates.cjs` existe mais ne peut toujours pas être exécuté dans cette conversation faute de checkout local/GitHub DNS/PGlite. Ne pas annoncer de calendrier artificiellement précis ni de production imminente sans preuves. Aucun déploiement/merge/PR, modification de `main`, workflows ou Supabase financier réel.

**Suite :** prioriser l'intégration du débit différé, audit des écritures bancaires réelles et de la devise Couple, parcours premium ; parallèlement établir checkout isolé pour lancer gates natives et SQL, puis tests Safari et rollback. Toute écriture GitHub reste candidate `[skip ci]`.

---

## Lot du 24 octobre — détail des comptes : devises natives + CAD indicatif

**Commit de code `5d7aa719cfc976da1ddeb3140bd1c04a9c20d8c6`**, uniquement sur `trace-5.37.0-international-accounts-fx`, `[skip ci]`. Cette reprise travaille sur les fonctionnalités visuelles approuvées, pas seulement sur les protections comptables.

- `trace-international-ui-1.0.0.js` : la section de l'Accueil « Voir tous mes comptes et ma trésorerie globale » affiche chaque solde dans la **devise native bancaire**, plus, pour chaque compte étranger valorisable, la **contre-valeur CAD indicative** distincte avec date et source de la cotation. Aucune conversion fictive ou conversion implicite 1:1. Si taux indisponible, invalide, solde inconnu ou montant non représentable, affichage d'une conversion à vérifier plutôt que d'une somme trompeuse. Les données textuelles de source des taux sont échappées dans le HTML.
- Si un taux présent dans le cache est inutilisable pour valoriser un solde natif connu, la demande de taux historique est maintenant déclenchée, sous réserve des gardes de requête déjà présents dans `requestInternationalRates`. Les soldes natifs manquants ne déclenchent pas de requête FX inutile. Le libellé précise qu'un taux peut venir de la Banque du Canada **ou d'une saisie manuelle**.
- `trace-international-1.0.0.css` : affichage lisible sur écran étroit en deux niveaux hiérarchiques : nom/devise native et petite ligne de conversion, montant natif maintenu à droite.
- Nouveau `tests/trace-international-home-native-cad-conversion.test.cjs` : 8/8 tests V8 fictifs sur le **vrai moteur FX** + UI (EUR 40 -> CAD 64 à taux fictif 1,60, date/source, taux manquant/invalide, zéro natif, texte malveillant échappé, autre titulaire exclu, solde inconnu, structure responsive). Régression `tests/trace-home-account-switch.test.cjs` : 9/9 V8 réussis, y compris bascule de compte sans changement du principal. **17/17 tests de ces deux suites sous V8 mock Node/VM, pas dans Node CLI natif.**

**Statut toujours NO-GO :** aucun checkout complet utilisable dans le conteneur, DNS GitHub indisponible, PGlite/PostgreSQL absent ; seules lectures/commits GitHub connectés et simulations V8 isolées possibles ici. Aucune migration SQL 07/08/09 réellement lancée, aucune suite native complète, aucun Chromium/Safari ou iPhone réel. Toute modification du JS de laboratoire peut périmer le service worker de preview : reconstruire via `node scripts/build-trace-preview-pwa.mjs` puis `--check` dans un checkout de laboratoire avant tests PWA.

**Prochaines étapes :** (1) obtention du checkout isolé, exécution `node scripts/check-trace-537-release-gates.cjs`, Node natif, PGlite/Auth/RLS/CAS fictifs, (2) remise à jour SW preview exclusivement via le générateur et tests Chromium/iPhone, (3) fin des flux de débit différé, imports étrangers, devise personnelle/Couple, Accueil/Activité/Patrimoine premium et contrôles de réconciliation, (4) sauvegarde/restauration/rollback et validation GO avec autorisation explicite. `main`, code de prod 5.36.5, workflows et données Supabase réelles intacts.

---

## Nouvelle étape — unifier les tests natifs et les portes NO-GO (24 octobre 2026)

**Commit de code : `1955fbbd0418342e119f9527bbde9c44b3db0cb6`** sur `trace-5.37.0-international-accounts-fx`, avec `[skip ci]`. Deux fichiers ajoutés :
- `scripts/check-trace-537-release-gates.cjs` : point d'entrée local **en lecture seule** pour qualification automatisée, lancé depuis un clone complet et exclusivement sur la branche autorisée, avec `node scripts/check-trace-537-release-gates.cjs`. Vérifie d'abord la branche et si le snapshot Git est propre ; lance `node scripts/build-trace-preview-pwa.mjs --check` (jamais le générateur en mode écriture), `node scripts/test-trace-native.mjs`, vérifie la disponibilité de PGlite local puis exécute exactement trois suites isolées : `tests/trace-database.integration.cjs`, `tests/trace-personal-settings-ownership.integration.cjs` et `tests/trace-cas-writes.integration.cjs`. Aucune installation de dépendances, connexion distante, CI, migration sur Supabase ou déploiement. Les variables transmises aux sous-processus sont limitées à PATH/HOME/temp et `TRACE_PGLITE_MODULE` ; les secrets Supabase et NODE_OPTIONS sont exclus. Tout défaut = échec automatique.
- `tests/trace-537-release-gates.test.cjs` : dix cas de **simulation V8** réussis (branche main interdite, variables d'environnement, absence de module PGlite, cache périmé, échec Node/PG, snapshot Git sale, absence d'écriture SW/CI, non-production même si automatisation verte). Ces tests ne prouvent **PAS** que les suites Node ou SQL ont réellement tourné.

**Blocage d'exécution vérifié dans l'environnement de cette conversation** : Node v22.16.0 disponible, mais pas de checkout `.git` de TRACE dans le conteneur, résolution de `github.com` indisponible et `@electric-sql/pglite` absent. Les outils GitHub permettent uniquement la lecture/écriture de fichiers sur la branche. Donc les trois intégrations SQL et la suite native Node **restent non exécutées**. Aucun rapport fictif de succès ne doit masquer ce blocage.

**Pour effectuer la prochaine qualification en checkout isolé :** récupérer la branche autorisée sans altérer `main`, mettre à disposition PGlite local (module `@electric-sql/pglite` ou `TRACE_PGLITE_MODULE` explicite), exécuter le script ci-dessus. Le générateur SW reste délibérément extérieur au gate en lecture seule ; si son `--check` échoue, régénérer le SW **uniquement** dans le labo, contrôler son diff avant de requalifier. Le verdict `automatedPassed:true` ne peut jamais se substituer aux contrôles manuels Chromium hors ligne, Safari iPhone, finances, débit différé, sauvegarde/restauration/rollback et GO explicite.

Le `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` doit rester inchangé. Aucun SQL sur données réelles, PR/fusion, CI, SW production ou déploiement autorisé.

---

## Lot du 24 octobre — consentement de doublons et affichage natif des captures

**Production : NO-GO.** Nouveaux commits depuis le HANDOFF `68b01a3bb1aa8a81327730502b74f7742eea889a`, exclusivement sur `trace-5.37.0-international-accounts-fx`, tous `[skip ci]` :

1. **`465cfdcdce8605371d848b9fdee8e82c4642211d`** : `trace-smart-inbox-3.5.0.js` attache désormais l'attestation « Deux opérations distinctes » à une signature de la capture (date, nom, montant, nature) et des mouvements comparés (id, statut, nature de l'évidence, montant). Toute modification significative ou changement des ressemblances invalide la case précédemment cochée. Le bouton de confirmation reste désactivé tant qu'une ressemblance n'a pas été personnellement comparée. Le blocage d'une transaction déjà enregistrée demeure. Les natures `legacyOnly` sont interdites dans l'UI. Huit tests ciblés ont été ajoutés dans `tests/trace-smart-duplicate-review-consent.test.cjs`.
2. **`3807d3e9aa8aae8f404853f29b3723d4b3b0309b`** : le bouton « Confirmer » se verrouille sans erreur si le module des natures `TraceMovement` n'est pas initialisé. Les anciennes fixtures V8 d'interface ont été mises en cohérence avec le vrai contrat de ce module. Les huit suites V8 pertinentes ont été repassées.
3. **`fe29012e1e1033a92bae7014fd436089d06af0f3`** : `rowForm` affiche les montants OCR dans la devise **native du compte** (EUR/USD, pas un faux `CAD`) y compris en extraction de date inconnue et preuve OCR suggérée. `synchronizeRow` ne présente plus une prévisualisation du budget en CAD calculée à tort depuis le montant EUR/USD sans FX vérifié. Pour une opération étrangère, il affiche le montant natif et signale que la contre-valeur CAD n'est calculée qu'au taux historique daté lors de la confirmation. Les comptes historiques CAD conservent leur présentation existante. Sept tests ajoutés `tests/trace-smart-foreign-native-amount-ui.test.cjs`.

### Validation effective

**93/93 vérifications ciblées sous V8 isolé**, réparties sur deux lots réexécutés après le dernier commit de code : **88 simulations/cas JavaScript** sur les vraies sources du candidat et moteurs financiers avec Node/FS/DOM/transports fictifs, plus **5 contrôles SQL purement statiques** sur la migration 09 candidate. Suites : doublons 8, UI native 7, anciens statuts capture 7, OCR étranger 18, FX centime 11, intégrité monétaire 11, CSV étranger 18, virements/cartes 8, garde SQL statique 5.

**Ce n'est pas du Node CLI natif, ni SQL/PGlite/PostgreSQL réel, ni des tests navigateur/Chromium/Safari ou multi-clients.** Un nouveau parcours OCR dans Safari n'est donc pas qualifié. Le conteneur a Node v22 mais aucun checkout local, aucun DNS GitHub et aucune dépendance PGlite : les scripts `scripts/test-trace-native.mjs`, l'intégration SQL 07/08/09 et la génération SW ne peuvent toujours pas y être exécutés. Ne pas considérer `93/93` comme certification ni lancer production.

**Protections préservées :** `main` stable 5.36.5 et code de production intacts, aucun accès ou écriture Supabase financière réelle, aucune CI, fusion, PR, migration hébergée ou déploiement, aucun changement des workflows.

**Suite obligatoire :** checkout complet fictif et Node/PGlite, véritables migrations SQL 07/08/09 et test deux sessions/CAS/RLS, run `node scripts/test-trace-native.mjs`; régénérer `trace-international-preview-sw.js` exclusivement par `node scripts/build-trace-preview-pwa.mjs` puis `--check`, tester hors ligne Chromium/Safari natif iPhone, compléter parcours étrangers/différé/Couple/UX premium, sauvegarde/restauration/rollback sous autorisation explicite.

---

## Lot du 24 octobre — intégrité FX zéro CAD et patrimoine non valorisable

**NO-GO production maintenu.** Après le HEAD documentaire `32b320998b0d802a7f34f21a987e559d05806440`, trois commits de code ont été ajoutés sur la SEULE branche `trace-5.37.0-international-accounts-fx`, tous `[skip ci]` :

1. **`e8abbc556120274db5b2f1f3b30af80fd1d048dc`** : `TraceInternational.resolveBooking` refuse désormais une dépense bancaire native non nulle dont le taux CAD historique (même sourcé) conduirait après arrondi à **0,00 CAD** ; jamais de sous-évaluation artificielle du budget ou de taux de change inventé. Suite `tests/trace-international-fx-zero-budget-guard.test.cjs` ajoutée, avec exemples fictifs EUR 0,01 et EUR 40 -> CAD 64.
2. **`f9ffc6b10e79d3453329a7402c587054be679ae5`** : `TraceInternational.fxValue` refuse toute contre-valeur infinie ou hors précision entière sûre du centime, plutôt que d'inscrire un faux chiffre de patrimoine. Les soldes CAD/étrangers normaux restent utilisables.
3. **`7adbb096b201d1840c7da5f20b06d62b8e8d465c`** : `TraceInternational.snapshot` distingue un solde étranger réellement égal à zéro de la conversion d'un solde non nul arrondie à zéro. Le second cas rend la valorisation globale **incomplète**, sans chiffre patrimonial faussement précis. Le zéro réel reste traité comme zéro.

### Preuve et limites

Les **78/78 tests ciblés** ont été exécutés sans échec dans un harnais **V8 avec Node, FS, VM, DOM et transports simulés**, sur les vraies sources du candidat et les vrais moteurs FX/mouvements :
- `trace-international-fx-zero-budget-guard.test.cjs` : 11
- `trace-international-money-integrity.test.cjs` : 11
- `trace-international-foreign-csv-confirm.test.cjs` : 18
- `trace-international-capture-confirm-guards.test.cjs` : 7
- `trace-smart-cross-currency-transfer-guards.test.cjs` : 8
- `trace-international-foreign-capture-approval.test.cjs` : 18
- `trace-cas-investment-ownership-static.test.cjs` : 5 (**contrôles statiques SQL, aucun SQL exécuté**).

Ces 78 vérifications **ne sont pas des tests Node CLI natifs**, ni PostgreSQL/PGlite, RLS/Auth, Chromium, Safari ou deux clients en conditions réelles. Le conteneur fournit Node v22, mais **ni checkout du dépôt, ni accès DNS GitHub, ni PGlite/psql**. Ne pas annoncer des tests natifs ni un GO.

`main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` préservée ; aucun déploiement, fusion, workflow/CI ni données Supabase réelles touchés. Les assets JS du laboratoire ayant changé, `trace-international-preview-sw.js` **reste périmé** : régénérer uniquement via `node scripts/build-trace-preview-pwa.mjs` depuis un checkout complet avant tout test PWA/offline. L'intégration SQL 07/08/09 et le nouveau scénario sur `investment_operations` n'ont toujours **pas** été exécutés.

### Priorités suivantes

1. Accéder à un checkout isolé avec Node et PGlite/PostgreSQL fictif ; exécuter le script local `scripts/test-trace-native.mjs` et les tests PG 07/08/09, RLS/Auth/CAS deux sessions, corriger les échecs avant toute décision.
2. Recréer le SW labo par son générateur et `--check`; tester hors ligne, Chromium, puis Safari iPhone.
3. Terminer les autres parcours bancaires internationaux, débit différé relié, devise Couple, UX premium et vérifications sauvegarde-restauration/rollback, toujours avec autorisation avant les étapes touchant les données réelles.

---

## Lot du 24 octobre — sécurité OCR débit/crédit, placement CAS et synchronisation FX

**NO-GO inchangé.** Depuis `2ff5eab3e79c284c6b51c5e37afc48a782298f9f`, quatre nouveaux commits ont été enregistrés uniquement sur `trace-5.37.0-international-accounts-fx`, avec `[skip ci]` :

1. **`a1ebbde9b7d81458f001eb51b0f132a0f31c5ba4`** : la revue d'une capture étrangère d'achat rejette désormais explicitement une source OCR marquée `bankDirection:'in'`. Le test du sens bancaire existe également dans l'interface : un crédit entrant ne peut plus être qualifié à tort de dépense, même si l'attestation a été cochée. Une direction inconnue garde la revue individuelle explicite ; les achats montrés comme `out` restent possibles.
2. **`842ae604c95a9d4aaae12d2d7db4e332d1d5717c`** : durcissement de la migration candidate `09-trace-cas-versioned-writes.sql` : les RPC CAS `investment_operations` vérifient que le portefeuille natif appartient au membre, que le compte bancaire éventuel est un courant lui appartenant, que l'opération préexistante appartient à son portefeuille lors d'une modification ou suppression. Nouveau scénario fictif d'intégration ajouté dans `tests/trace-cas-writes.integration.cjs` (à exécuter réellement en PGlite/PostgreSQL) et cinq tests de contrat SQL purement statiques dans `tests/trace-cas-investment-ownership-static.test.cjs`. **Le SQL 09 modifié n'a PAS été exécuté contre une base et n'est pas qualifié.** Les écritures directes héritées demeurent autorisées, en attente d'un cutover explicitement validé.
3. **`e026ee1993f82ae8f39d206df325e4e05eb3395b`** : après l'attente du taux FX d'une capture étrangère, la signature de preuve relit l'objet compte et le brouillon **depuis le state courant**, plutôt que de se limiter à une référence avant synchronisation ; changement ou remplacement pendant l'attente => refus sans comptabilisation.
4. **`8b2a4e3ae931ca1afe369fdb0781b5b2049d3267`** : ancien simulateur d'interface complété avec `dataset.bankDirection`, puis reprise des cinq suites pertinentes.

### Qualification exacte de ce lot

- **51/51 tests financiers ciblés exécutés sous V8** avec vraies fonctions JS extraites du candidat et vrais modules FX, natures de mouvement et guide bancaire, mais faux Node, DOM et transports : CSV étranger **18**, captures / statuts **7**, virements et paiements de carte **8**, captures étrangères **18**.
- **5/5 tests statiques** exécutés sous le même V8 et vérifiant la présence des gardes SQL `investment_operations`. **Total : 56/56 contrôles V8**, mais seulement 51 sont des simulations de chemins financiers JS ; les 5 autres ne sont pas des tests SQL.
- **Aucun test Node CLI natif, aucune exécution PGlite/PostgreSQL, aucune authentification/Supabase hébergé, ni Chromium, Safari iPhone ou test de concurrence réseau sur ce HEAD.** Le conteneur possède Node v22 mais ne dispose pas de DNS GitHub/checkout et PGlite ou PostgreSQL sont absents. Ne pas transposer les 56 tests à ces catégories.
- Aucun changement de `main`, du client de production 5.36.5, des workflows ou de Supabase financier réel, aucune migration appliquée, CI ni déploiement.

### Prochaines étapes impératives

1. Récupérer un checkout isolé, dépendances Node et PGlite fictifs ; exécuter et corriger les migrations **07, 08 et 09** et les suites natives, y compris le nouveau test sur les opérations de placement ; vérifier RLS/Auth, rôles, droits, CAS et deux sessions.
2. **Reconstruire** `trace-international-preview-sw.js` via `node scripts/build-trace-preview-pwa.mjs`, puis `--check`, hors ligne/Chromium et Safari iPhone. Ne jamais éditer le SW généré à la main.
3. Terminer les flux étrangers non encore couverts, le débit différé, devise perso/Couple et l'UX premium validée. Vérifier sauvegarde/restauration/rollback avec autorisation explicite avant toute mise en production.
4. Aucun GO avant preuves réelles et autorisation.

---

## Lot du 24 octobre — premier achat OCR étranger confirmé sous revue (laboratoire uniquement)

**NO-GO production.** Après `fbfcba597f71c8ec88173941ddb2fca0fa05de20`, les commits suivants existent uniquement sur `trace-5.37.0-international-accounts-fx`, avec `[skip ci]` :

- `411a98349d3a8a92c461ce72caf78f8b1a7ccef6` : au lieu de bloquer toute capture provenant d'un compte non-CAD, `smartApproveDraft` admet **uniquement une dépense ordinaire explicitement revue**, avec `foreignNatureConfirmed=true`, titulaire du compte conforme, libellé non ambigu, montant bancaire à centimes exacts, montant d'achat d'origine si autre devise, cotation CAD datée avec source (historique ou manuelle). Les transferts, paiements de carte, remboursements, crédits ambigus et autres mouvements étrangers ne peuvent toujours pas être confirmés via ce parcours. `trace-smart-inbox-3.5.0.js` ajoute une case d'attestation au sein de la carte étrangère et une activation conditionnelle de sa confirmation. Instantané des transactions, brouillons, compte et preuve revérifié après cotation asynchrone ; écriture rejetée sans mutation locale si l'état a changé.
- `aa4ce6fc6105071dfa282ab150d8a922fb29e842` : tests anciens recalés sur le nouveau texte ; le bouton protège aussi les comptes sans titulaire reconnu, identité courante absente ou ancien module `TraceImportGuide` incomplet. Suite ancienne de capture rétablie.
- `59e1d451b439390e863064469342891f37ca8f91` : la case d'attestation étrangère se décoche automatiquement après modification de la date, du libellé, du montant, de la nature, du sens de mouvement, de la devise ou du montant d'achat d'origine ; retour immédiat à l'état non confirmable.

**Exécution de tests sur le HEAD de code `59e1d45` : 46/46 réussis dans un harnais V8 isolé, avec modules Node, FS/DOM et écriture simulés, mais moteur FX, référentiel des natures et guide bancaire réels extraits de GitHub :** 18 CSV étranger, 7 statut/capture, 8 transferts et paiements carte, 13 capture étrangère. La dernière suite comprend EUR 40 -> CAD 64 avec taux fictif explicite 1,60, taux historique fictif 1,55, refus si consentement absent, FX manquant, libellé de paiement de carte, virement, écriture CAS rejetée, mutation d'une autre opération ou du compte pendant cotation, changement de devise d'achat sans prix d'origine. Une vérification d'interface vérifie également l'invalidation du consentement au changement de la preuve.

**Limites formelles :** aucun test Node CLI natif, navigateur (Chromium/Safari iPhone), base PostgreSQL/PGlite, RLS/Auth, Supabase hébergé ou simultanéité à deux sessions sur le HEAD final ; les 46 tests fictifs ne les remplacent pas. Aucun fichier `main`, production 5.36.5, workflows, service réel, SQL hébergé ni CI touché. Le SW de preview est périmé après modification des JS ; reconstruire impérativement depuis le script officiel avant tout contrôle PWA. Aucune mise en production, aucun lancement de migration.

**Priorités suivantes :** obtenir checkout local complet et PGlite isolé, exécuter suites Node et SQL migrations 07/08/09 avec concurrence réelle, réexécuter tests Chromium et hors ligne après génération service worker, compléter les autres natures étrangères, débit différé, compte/devise Couple et écrans premium, puis tests Safari iPhone, sauvegarde/restauration/rollback sous autorisation et GO explicite.

---

## Reprise suivante — protection FX, paiements carte et transfert bancaire natif (24 octobre 2026)

**Statut : NO-GO.** Les correctifs suivants ont été enregistrés sur `trace-5.37.0-international-accounts-fx`, avec `[skip ci]`, après le HEAD documentaire `0d6295d1d7b6bce1ddb6bfe4251e98589b192424` :

- `070b8e76d64ad978937b6e23e154dd37024a4e7b` : dans la validation individuelle CSV étrangère, nouvelle comparaison complète des mouvements bancaires similaires après l'attente d'une cotation FX. Une opération qui apparaît ou change de montant/statut pendant l'attente interdit la confirmation. **18/18 scénarios V8 fictifs** dans la suite CSV.
- `bfb38d3a03bc270e94d8e313b9a353bdd2ae0350` : les captures d'un compte source CAD qui représentent un virement vers un autre compte conservent `toBankAmount` ET `toBankCurrency` du destinataire. Montant crédité à centimes exacts pour une devise différente, jamais un montant reconstruit depuis `amountCAD`. Refus de saisies fractionnaires ou manquantes, sans écriture financière.
- `0c957b0a3c10ac58252caa18ed4af5b159d7511a` : paiement de carte par capture limité au courant correspondant à la carte, de même devise et pays. Si la carte historique n'est pas explicitement liée, le compte courant de règlement doit être unique ; plusieurs comptes plausibles sont bloqués. Cela empêche les remboursements imputés à une mauvaise dette sans empêcher le cas CAD historique non ambigu.
- `bc7f5e738457d33e430e25a1599d0d766083566b` : tests des transferts et paiements de carte raccordés au vrai module `trace-movement-5.36.0.js` (source extraite sous V8), conservant `card_repayment` et aucun impact revenu/dépense.

**Preuve globale réexécutée sur le HEAD de code `bc7f5e7` : 33/33 tests V8 fictifs, zéro échec** — 18 scénarios CSV étranger, 7 capture/statut/interface, 8 virements/paiements de carte. Les suites testent le code candidat et les modules FX/mouvements réels avec DOM, transport et modules Node simulés. Ceci n'est **PAS** une exécution Node CLI, PGlite/PostgreSQL, Chromium, Safari, Supabase hébergé ni un test à deux clients. Les suites Node 911 / Chromium 32 / SQL 17 antérieures ne sont pas réattribuées à ces commits.

Les fichiers de production `index.html`, `sw.js`, `manifest.webmanifest`, `trace-version.json`, `v5-app-5.36.5.js` et les workflows sont inchangés. Aucune lecture/écriture des données Supabase réelles, aucun déploiement ni CI. `main` connu stable `02c70f50e7e51da79b77a91dde96a03c6c719909`.

**Prochaine porte bloquante :** retrouver un checkout isolé avec Node, PGlite 0.4.5, exécuter et corriger réellement migrations SQL 07/08/09 et suites natives ; reconstruire le SW laboratoire avec son script puis `--check`, qualifier Chromium/hors ligne et Safari iPhone. Fermer ensuite les flux étrangers restants, devises personnelles/Couple, différé connecté et préproduction sous sauvegarde/restore/rollback autorisés. Les captures de compte source non-CAD restent explicitement en attente : cette protection n'est pas leur finalisation. Ne proposer aucun GO.

---

## Lot suivant — captures internationales en attente et statut de validation strict (24 octobre 2026)

**NO-GO conservé.** Commits de code : `274414664eb480f73666b9a409437cee67dce54a` et `6bca9ab80caf1c7dfb1255db4f6285587c0dda5c` ; base : `104e2c6854f0873a2f6416b8c848bcbd209d22c9`. Seule la branche `trace-5.37.0-international-accounts-fx` a été modifiée, commits `[skip ci]`. `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` inchangée. Aucune CI, fusion, PR, deployment ou donnée Supabase réelle.

### Modifications effectives

1. **`v5-app-5.37.0.js` — captures / OCR étrangers :** `smartApproveDraft` refuse la confirmation financière directe d'une capture provenant d'un compte non-CAD tant qu'un parcours de revue internationale n'est pas qualifié. Le brouillon et sa preuve restent `pending`, sans création d'opération `confirmed` ni conversion inventée. Les comptes CAD continuent à accéder au circuit existant.
2. **Statuts de lot sûrs :** `TraceBankBridge.quickFinalizeApproved` et `openImportBatchReview` ne prennent plus que les lignes `pending` (et non tout statut différent de `confirmed`). Une ligne ignorée, déjà traitée ou reçue ne peut pas être rouverte et confirmée par le lot. Les garde-fous étrangers du lot précédent restent en place.
3. **`trace-smart-inbox-3.5.0.js` — interface cohérente :** le bouton « Confirmer l'opération » est désactivé sur compte étranger avec libellé « À vérifier · devise étrangère » ; un texte visible précise que la preuve est conservée et que l'opération n'a pas encore d'impact financier. Comportement CAD inchangé.
4. **`tests/trace-international-capture-confirm-guards.test.cjs` :** sept scénarios couvrent le rejet EUR/USD sans écriture, la continuation CAD, la non-réactivation des statuts ignorés/terminés/reçus et le bouton de revue. Résultat **7/7 sous V8 simulant les modules Node** ; l'ancienne suite CSV a été rejouée dans le même environnement : **16/16**. Total **23/23 V8 fictifs**, à distinguer de Node CLI, Chromium, PostgreSQL ou Safari, qui n'ont pas été exécutés sur ce HEAD. La syntaxe V8 des fichiers modifiés a été contrôlée.
   
### Blocages et suite

Container Node v22 présent, mais aucun checkout local, DNS GitHub inaccessible, ni PGlite/serveur PostgreSQL : aucun test SQL 07/08/09 ou Node natif n'a été exécuté ici. Le SW `trace-international-preview-sw.js` reste périmé après modification des assets. Régénérer seulement avec `node scripts/build-trace-preview-pwa.mjs` puis `--check` sur checkout complet ; ne pas éditer à la main. Les imports étrangers OCR restent volontairement **non validables**, ce qui est une protection temporaire et **non une fonctionnalité achevée**.

Priorité : checkout fictif + dépendances, exécution et correction tests SQL/Node, PWA hors ligne et Chromium, puis implémentation d'une revue individuelle OCR étrangère avec montants natifs, FX datée, nature et doublons vérifiés, sans revalidation automatique ni effet rétroactif ; poursuivre différé, devise Couple, Safari natif et sauvegarde/rollback sous autorisation.

---

## Lot de reprise autonome — verrouillage des validations étrangères (24 octobre 2026)

**NO-GO maintenu.** Deux corrections de code ont été enregistrées sur la SEULE branche `trace-5.37.0-international-accounts-fx` avec `[skip ci]` : `650462a6c2e35199a1d230ed412ac1e54648e8a2` et `74e823f7deee512dc7021e7f3f824fdf7b328331`. `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` n'a pas été modifiée. Aucun SQL hébergé, aucune CI, aucun déploiement ni données financières réelles consultées.

- `v5-app-5.37.0.js` : l'approbation rapide d'une dépense étrangère CSV est limitée au **statut `pending`** et refuse les statuts ignorés/terminés. Le compte et la transaction sont comparés à leur état initial immédiatement après la recherche de taux asynchrone ; une modification intervenue pendant cette attente refuse l'enregistrement.
- **Fermeture du contournement par lots :** `legacyImportNatureReady` refuse la confirmation groupée des importations `pending` sur des comptes non-CAD pour les sources CSV, OCR, capture ou PDF, même si une nature suggérée existe ou si `natureReviewed` est déjà vrai. Les saisies manuelles et l'enregistrement individuel expressément revu restent accessibles ; les imports étrangers prévalorisés sans parcours individuel adapté restent en attente. Le contrôle s'applique à la validation de lot, à `validatePendingAll` et à `TraceBankBridge.quickFinalizeApproved`.
- `tests/trace-international-foreign-csv-confirm.test.cjs` : 16 scénarios (12 antérieurs + 4 supplémentaires) **effectivement exécutés sous V8**, avec source de test récupérée sur GitHub, modules Node simulés, vrai moteur financier extrait, fausses UI/base et aucun réseau. **16/16 réussis, zéro échec**. Compilation syntaxique V8 des deux fichiers modifiés réussie. **Ce ne sont PAS** des tests Node natifs, Chromium, Safari, PostgreSQL ou Supabase hébergé.
- Le conteneur a Node 22 mais toujours ni checkout Git accessible, ni DNS GitHub, ni PGlite installé : les migrations 07/08/09 et les tests Node natifs restent **non exécutés sur ces commits**. Aucun service worker généré manuellement ; `trace-international-preview-sw.js` reste périmé et doit être régénéré via `node scripts/build-trace-preview-pwa.mjs`, puis contrôlé avec `--check`, une fois un checkout complet autorisé obtenu.

**Suite :** restaurer un checkout fictif Node/PGlite, exécuter les tests SQL et natifs, revoir les droits et la concurrence à deux sessions, régénérer/requalifier la PWA laboratoire, finaliser les natures étrangères et le débit différé, puis faire la recette Safari, la préparation de sauvegarde/rollback sous autorisation avant toute décision GO.

---

## Reprise technique suivante — robustesse des catégories, sécurité RPC, contrôle CSV (24 octobre 2026)

**NO-GO.** Aucune modification de `main`, aucun déploiement et aucune lecture/écriture des données Supabase réelles. Le conteneur disponible possède Node 22 mais **aucun checkout GitHub ni résolution réseau fonctionnelle**, et PGlite/PostgreSQL serveur ne sont pas installés : les deux tests d'intégration SQL restent **non exécutés**. Les essais ont été réalisés sur le code extrait de la branche avec transports fictifs sous V8 via le connecteur GitHub (ni CLI Node natif, ni navigateur, ni PostgreSQL réel).

### Correctifs effectivement commités sur la branche internationale

1. **Reprise sans écrasement des catégories de départ :** `v5-app-5.37.0.js` vérifie d'abord les IDs existants, n'exécute que des créations `CAS` manquantes, respecte un ID créé concurremment par l'autre membre après vérification de son existence et recharge les révisions dans `traceDocRevisions`. Le bouton « Ajouter les catégories de départ manquantes » apparaît en cas de catalogue incomplet même si des catégories ou budgets existent ; action humaine et ajout seulement, jamais remise à zéro ni écrasement de catégorie renommée/archivée. Test `tests/trace-cas-category-bootstrap.test.cjs` : **8/8 scénarios réussis sous V8 avec fausse base**, dont interruption/reprise, concurrence et budget conservé.
2. **Limites serveur des RPC :** `migrations/09-trace-cas-versioned-writes.sql` refuse des collections hors des neuf familles utilisées par la candidate, refuse les suppressions physiques de comptes bancaires, patrimoine, rapprochements, importations et suivis de journées ; seules catégories, budgets, transactions et opérations d'investissement disposent de suppression conditionnée à leur révision. `tests/trace-cas-writes.integration.cjs` contient désormais **12 cas** couvrant aussi ces gardes ; **les tests SQL n'ont pas été exécutés**, et aucune migration n'a été appliquée.
3. **CSV étrangers déjà datés/ambiguës :** validation simplifiée seulement si montant original, devise d'achat et devise bancaire sont cohérents, `amountCAD` encore `null` et aucune contre-valeur FX préexistante. Refus des taux/courants contradictoires au lieu d'inventer une nouvelle conversion. `tests/trace-international-foreign-csv-confirm.test.cjs` passe à **12/12 scénarios V8 fictifs réussis** ; il faut encore jouer ce fichier avec la CLI Node et Chromium.

Commits : `b6ec63e44fb8ef161568c3a874ab25cb170e7f59`, `ce18d6970e3c2b8369fb84f01c73005b92685841`, `2195998dedb23a6ab4cb5590c8379e2278b5fb22`, `7e62e828688bc3aa75435363f7819f2bdc3b3a74`, `e31a52bc0210edbf78eeb6536707ac60d72b5124`, `f6100912b92bc79bb6dd56a168779ab9cad28a29`, `e32f274d44d25ed450b06439ab6604ede14ef629`, `2ecfb56643391ce4c4a7001d3f07166b3960b209`.

**Attention :** les quatre changements de `v5-app-5.37.0.js` depuis l'ancienne qualification invalident toujours le cache laboratoire. Il faut **régénérer** `trace-international-preview-sw.js` avec `node scripts/build-trace-preview-pwa.mjs` sur un checkout complet, puis lancer `--check`. Ne jamais modifier ce fichier généré à la main ni déployer.

### Suite prioritaire

Obtenir un checkout fictif isolé et exécuter réellement les tests Node et migrations 07/08/09 en PostgreSQL, puis corriger les défauts détectés. Requalifier le laboratoire Chromium/Safari et cache SW. Tester Auth/RLS/PostgREST/Reatime fictifs et concurrence multi-membres, protéger les écritures directes par une transition planifiée avec 5.36.5, sécuriser les autres natures internationales (carte, virements, remboursement), débit différé, FX Couple/personnel. Pas de GO sans sauvegarde/restore/rollback et recette Safari réelle.

---

## Lot suivant — validation ciblée des dépenses CSV étrangères (24 octobre 2026)

Code **présent dans la candidate uniquement**, pas en production. `v5-app-5.37.0.js` propose désormais une fiche de **validation humaine d'une dépense CSV simple** pour un compte étranger CAD≠devise. Le montant bancaire, la date et le compte ne sont pas modifiables dans cette fiche. Le membre sélectionne explicitement catégorie, attribution Moi/Partenaire/Couple et confirme la nature de dépense. Un taux CAD daté et sourcé est exigé, soit Banque du Canada Valet historique disponible, soit taux manuel clairement identifié ; jamais de taux 1 fictif. Les lignes ressemblant à des transactions déjà confirmées nécessitent une reconnaissance explicite et les nouvelles ressemblances bloquent si elles apparaissent pendant la revue. En cas d'échec CAS, la ligne reste `pending`.

**Nature bloquée :** les libellés de paiement de carte, virement Interac ou autres libellés ambigus sont refusés par `TraceImportGuide.safeForQuickApproval`. Les remboursements, virements, achats multi-jambes, allocations Proches et imports hors CSV étrangers restent à finaliser séparément. Ne pas déclarer l'import étranger complet.

Tests de la fonction réelle sur les fixtures fictives : **7/7 scénarios V8** avec vrai moteur `TraceInternational.resolveBooking` et transport/DOM simulés. Le fichier de test `tests/trace-international-foreign-csv-confirm.test.cjs` a été commité ; son code a été exécuté sous V8 avec modules Node simulés : **9/9 scénarios réussis**, dont 40 EUR → 64 CAD avec 1,60 CAD/EUR, date/source conservées, refus sans confirmation/taux, échec serveur sans mutation, comparaison de doublons et rejet « Virement Interac ». Le véritable référentiel `TraceMovement` et le guide `TraceImportGuide` ont été chargés séparément et vérifiés pour cette distinction. **Ni tests Node natifs ni tests Chromium/Safari réexécutés après ce lot.**

Commits : `2651903f81ed001f345767e13abfdd215277096e` (UI de validation), `630fcbd72b23e7afa3488065ba8df81d5e1d6408` (test), `d736cafb3a92d1dca1589c7bb3beee3a3d0b3ca1` (garde contre virements), `1a49264f5cc818ebe06eaa1b2ccd84385bd7ef7e` (test de garde).

**NO-GO maintenu.** Toutes les limites d'intégration PostgreSQL, droits CAS, Safari et cache laboratoire indiquées plus bas restent ouvertes. L'actif `v5-app-5.37.0.js` a encore changé ; le SW fictif doit être régénéré sur checkout local avant tout test hors ligne.

---

## Reprise du 24 octobre — lot client versionné (plus récent que le premier bloc ci-dessous)

**Risque STALE-WRITE toujours bloquant pour la sortie.** Le vrai client de la **candidate 5.37.0** est désormais raccordé aux RPC de migration 09 mais ni les migrations ni les RPC ne sont déployées dans un environnement hébergé. La branche `main`, les entrées 5.36.5, les workflows et les données Supabase réelles restent inchangés.

- `v5-app-5.37.0.js` : la lecture initiale récupère `documents.revision` et `households.settings_revision` et refuse un index incomplet ; `saveDocument`, `saveHouseholdSettings`, `removeDocument` et l'initialisation des catégories appellent les RPC CAS. Les écritures identiques d'un même navigateur sont sérialisées par ressource. Lors d'un `TRACE_WRITE_CONFLICT`, les écritures suivantes sont bloquées et un panneau accessible invite à copier les saisies non enregistrées avant un rechargement avec confirmation. Le mode laboratoire sans réseau conserve ses écritures en mémoire uniquement.
- `trace-international-1.0.0.css` : alerte de conflit au-dessus de la navigation, utilisable sur petite largeur iPhone.
- `tests/trace-cas-client.test.cjs` : huit tests de contrat client, y compris concurrent local, conflit externe, suppression CAS, réglages versionnés et démo fictive. Leur logique **a été exécutée dans un harnais V8 avec modules Node et RPC fictifs : 8/8 réussis**, **pas en Node CLI**. La syntaxe JavaScript du client et du fichier de test a été vérifiée dans V8. Les 6 scénarios préalables exécutés depuis les fonctions réelles extraites ont aussi réussi contre un serveur simulé.
- Commits supplémentaires : `2327041d12c0ac76b8ae7f639ddcb7894dc24847` (raccordement client), `121ab4fee2cfc1c2d4f9ff5d406df6aad2f0c8e6` (UI conflit), `601254894bad63dfd60d94bd95c99ef09c6c125b` (tests), `dd278839774b4aaf3bf75f9895e70e269dbc74b0` (réglages sérialisés), `34841ad0619ed5f407e2afdd96782ae4d29e1b85` (test de régression).

**Limite nouvelle à corriger avant navigation hors ligne :** le JS et CSS du laboratoire ont changé, mais le SW généré `trace-international-preview-sw.js` conserve l'ancienne empreinte d'actifs, car cet environnement ne dispose pas d'un checkout complet et l'accès GitHub ne permet pas de reconstruire l'ensemble du cache de façon sûre. Le script `node scripts/build-trace-preview-pwa.mjs --check` doit donc **échouer tant que** `node scripts/build-trace-preview-pwa.mjs` n'a pas été exécuté sur un checkout local ; ne pas déclarer le laboratoire hors ligne qualifié sur le nouveau code. Aucune modification manuelle du SW ni déploiement.

**Ordre de reprise obligatoire :** (1) installer les dépendances de test hors du dépôt dans un environnement isolé ; lancer les deux tests SQL 08/09 avec PGlite et le test client Node natif ; corriger les anomalies réelles ; (2) régénérer et tester le SW laboratoire après toute correction JS/CSS ; (3) qualifier la migration 07/08/09 et le client avec Auth/PostgREST/Realtime fictifs à deux comptes, sans aucune donnée réelle ; (4) verrouiller les anciens droits d'écriture directe lors d'un cutover compatible 5.36.5 ; (5) fermer les imports étrangers et débit différé puis vraie recette Safari iPhone ; (6) requalifier les scripts QA et vérifier le plan de sauvegarde/rollback avant toute demande de GO.

Les 911 scénarios Node, 32 Chromium, 17 SQL fictifs et 8 Valet restent des **résultats historiques antérieurs à ce lot**. Rien dans ce travail ne les rejoue ni ne qualifie la mise en production.

---

## Mise à jour de reprise — sécurisation des écritures (24 octobre 2026, suite)

**Candidat NO-GO.** Cette section est plus récente que le bilan initial ci-dessous ; aucun changement à `main`, aucun déploiement, aucune lecture ou écriture Supabase hébergée. Commits exclusivement sur `trace-5.37.0-international-accounts-fx`, tous `[skip ci]`.

### Nouveaux fichiers de code et commits vérifiés

- `migrations/08-trace-personal-settings-owner-guard.sql` : trigger PostgreSQL défensif sur `households.settings` pour les trois cartes de soldes d'ouverture par compte, `primaryBankAccountByOwner` et `memberNicknames` ; contrôle de l'appartenance réelle via `auth.uid()` et propriétaire de `documents/accounts`. Empêche une mutation des clés personnelles de l'autre membre, y compris via un appel `SECURITY DEFINER` dont le JWT reste présent. Préserve les clés de répartition partagées. **La couverture n'est pas exhaustive sur tous les champs de settings** : auditer toute nouvelle préférence personnelle avant sortie.
- `migrations/09-trace-cas-versioned-writes.sql` : colonnes `documents.revision` et `households.settings_revision`, incrémentées par triggers serveur. RPC `trace_cas_save_document`, `trace_cas_delete_document`, `trace_cas_save_household_settings` avec comparaison de révision atomique, ID contrôlés, test d'appartenance et d'ownership explicites, `search_path` restreint et accès anonyme révoqué. Insertion `ON CONFLICT DO NOTHING` : une ligne existante n'est jamais remplacée comme une nouvelle création.
- `tests/trace-personal-settings-ownership.integration.cjs` et `tests/trace-cas-writes.integration.cjs` : scénarios de base PostgreSQL fictive prévus pour interdiction de l'écriture de l'autre, mutations personnelles autorisées, réglages partagés, doublon d'ID, écriture cliente périmée, conflit de suppression et restauration des versions.
- Commits (ordre) : `01c4b0c3e4a9f3918186fade66d7bbce837c3b79`, `b5b10258efe6e72d3ef26a61c76a76ea27b87ce8`, `4d41046848bcef158114d64eaf2ed1fd3e71864a`, `e6dd3069f6083b880bd509261ad6aac047630712`, `7cfce86bbf494ec971950fef9fdcf1fa4d0bc0cb`, `c558e9db04afe9e9d0c0c3ebc82b22a4ce97b2e8`.

### Niveau de preuve — NE PAS CONFONDRE

- **Présence du code : oui**, fichiers récupérés à nouveau sur GitHub.
- **Contrôles statiques exécutés : 26 / 26 réussis** dans un runtime JavaScript V8, dont compilation syntaxique des deux nouveaux tests. Cela ne valide ni leur exécution Node, ni SQL, ni les triggers.
- **Tests d'intégration PostgreSQL des nouvelles migrations : NON EXÉCUTÉS** pendant cette reprise : le conteneur ne dispose ni de PGlite, ni de la copie du dépôt et l'accès GitHub est uniquement via le connecteur. Scripts exécutables sur un checkout isolé disposant de `@electric-sql/pglite@0.4.5` :
  `TRACE_PGLITE_MODULE=/chemin/pglite node tests/trace-personal-settings-ownership.integration.cjs`
  et `TRACE_PGLITE_MODULE=/chemin/pglite node tests/trace-cas-writes.integration.cjs`.
- **Chromium/Safari/Cloud sur les nouveaux commits : non exécutés**. Les résultats historiques (911 scénarios Node, 32 Chromium, 17 SQL fictifs) décrits ci-dessous ne constituent pas des tests de ces migrations.
- **Aucun SQL de migration appliqué**, ni à la production ni à un environnement Supabase hébergé.

### Séquence impérative avant fermeture des risques

1. Qualifier 08/09 en PostgreSQL fictif avec deux sessions, owner/partner/anon/étranger, migration idempotente et refus de mutation sur compte de l'autre.
2. **Raccorder le vrai client 5.37.0** à la lecture des deux compteurs de révision, aux RPC, à la reprise explicite des conflits, aux mises à jour hors ligne et à la suppression conditionnelle ; garantir la compatibilité de toutes les procédures d'import, édition et création de foyer.
3. Après validation et plan de transition clients 5.36.5, supprimer les privilèges d'écriture directe qui permettent aujourd'hui de contourner les RPC. La migration 09 **ne les retire pas volontairement** et ne ferme donc pas seule `STALE-WRITE`.
4. Vérifier en Supabase **fictif et explicitement autorisé** les RPC exposées, les politiques RLS, le comportement HTTP PostgREST, Auth, Realtime et deux clients simultanés. Aucun test PGlite ne démontre ces propriétés hébergées.
5. Avant toute publication : recette Safari iPhone, validation des imports étrangers, débit différé, référence budgétaire personnelle/Couple, sauvegarde réelle autorisée et restauration isolée, procédure de rollback sans perte d'écritures FX, et décision explicite GO/NO-GO.

Les anciens rapports de qualification doivent être rejoués après le futur raccordement UI. **Ne pas présenter le SQL candidat comme un correctif en production.**

---

# TRACE 5.37.0 International — reprise opérationnelle

État de la mission du 24 octobre 2026. **NO-GO production.** Le développement et la qualification locale ont avancé ; les barrières financières et iPhone ci-dessous restent ouvertes. Lire ce résumé avant les chronologies anciennes. Ne pas reprendre la conception.

## Git et périmètre autorisé

- Dépôt `louisantoine78/Budget-duo`, seule branche modifiable : `trace-5.37.0-international-accounts-fx`.
- HEAD initial de mission vérifié sur GitHub : `6eb6c17e5c9eba2d3727ebea404cce5fec0424c6`.
- Dernier lot de code : `94c613cd4e1c547a38671083c1da773967bded70`. Le commit documentaire suivant ne peut pas contenir sa propre SHA : résoudre le HEAD réel.
- `main` vérifiée à nouveau : `02c70f50e7e51da79b77a91dde96a03c6c719909`, stable 5.36.5.
- `index.html`, `sw.js`, `manifest.webmanifest`, `trace-version.json`, `v5-app-5.36.5.js` et `.github/` inchangés depuis le début de mission. Déploiement automatique de la candidate désactivé par `vercel.json`.
- Commits `[skip ci]`. Aucune PR, fusion, exécution Actions, réactivation PickPoint ou livraison Vercel. Aucun accès aux données financières Supabase réelles, aucune ressource externe créée.
- Le laboratoire `trace-international-preview.html` utilise exclusivement des fixtures, une CSP `connect-src 'none'` et une sauvegarde mémoire perdue au rechargement. Son PWA ne constitue pas la PWA financière de production.
- L'utilisateur autorise l'enchaînement autonome des lots réversibles et des commits, sans nouvelle validation intermédiaire. Toute publication ou modification d'un environnement réel demande son autorisation explicite. Les anciennes consignes « une conversation = un seul lot » sont remplacées par cette mission.

## Livré dans la candidate et effectivement vérifié

1. Accueil : solde principal natif et carte liée, boutons de consultation distincts du principal officiel, confirmation du changement, accès comptes/détails/Activité. Les totaux incomplets restent inconnus. Ordre des sept blocs et cinq onglets conservés.
2. Budget : trois familles, anneau de consommation, pourcentage consommé distinct de la part des dépenses, dépassement, graphique prévu/réel compact, douze mois et liens de catégorie. Contraste de la carte Disponible réparé.
3. Comptes : création, nom/pays, devise verrouillée lorsqu'il existe un historique ou un solde, réassociation des cartes, archivage/réactivation sans suppression, historique filtrable des comptes archivés et consultation Couple en lecture seule dans l'interface.
4. Montants natifs et FX : centimes stricts, montants absents jamais convertis en zéro, devises des deux jambes vérifiées, taux datés et sourcés, frais de virement inclus sans deuxième dépense. Le formulaire premium conservait mal les champs internationaux : panne réelle corrigée dans le navigateur.
5. Épargne liée CAD/EUR/USD/GBP/CHF : ouvertures et mouvements natifs, dépôts/retraits neutres au budget, montants réellement reçus en cas de change, valorisation datée indicative et total incomplet si donnée manquante. CELI historique conservé.
6. PDF mensuel : véritables actifs locaux `pdfjs-dist@6.4.299`, licence Apache 2.0, intégrité npm/SHA-256, worker local sous CSP stricte ; fixtures FR/CA multipages et PDF raster. Propositions et lignes non interprétées visibles, revue humaine et comparaison sans écriture. Repli manuel maintenu.
7. CSV : toutes les propositions consultables, détails des opérations ressemblantes en devise du compte, lignes invalides visibles, achats identiques conservés, réimport identique idempotent, statut à vérifier sans effet financier.
8. PWA du laboratoire : manifeste et portée distincts, 62 actifs statiques en cache, rechargement complet et extraction PDF sans réseau dans Chromium ; aucun relevé utilisateur ni réponse Supabase en cache.
9. Sauvegarde : utilitaire JSON local avec inventaire, SHA-256 et refus d'écrasement ; restauration JSON et sauvegarde physique éprouvées dans deux instances PostgreSQL fictives.
10. Permissions : migration candidate 07 préparée et testée localement, protégeant les documents `accounts`/`investment_accounts` par propriétaire tout en conservant la lecture Couple. **Non appliquée sur Supabase.**

## Preuves actuelles, sans additionner les niveaux

| Niveau | Résultat réellement exécuté | Limite |
|---|---|---|
| Syntaxe Node | 46 fichiers | JavaScript uniquement |
| Suites natives | 54 fichiers, 911 scénarios rapportés, 0 échec ; dont suite historique 5.36.5 | Plusieurs tests utilisent encore des dépendances ou DOM simulés |
| Navigateur | 32 scénarios Chromium 153, vrais DOM/scripts/worker PDF et rechargement hors ligne | Données fictives en mémoire ; ni Safari ni persistance cloud |
| Base | 17 contrôles PGlite 0.4.5 / PostgreSQL 17.5 WASM | Auth fictive, transport HTTP remplacé, pas Supabase hébergé/Realtime |
| Source FX publique | 8 contrôles HTTPS Valet EUR/USD/GBP/CHF, jour ouvré et week-end historiques | Pas un taux actuel ni un test CORS Safari |
| Production | **Non qualifiée** | Aucun déploiement |

Rapports complets et empreintes : [`qa/TRACE-5.37.0-QUALIFICATION.json`](qa/TRACE-5.37.0-QUALIFICATION.json). Commandes, risques, recette iPhone et rollback : [`TRACE-5.37.0-WORK-VALIDATION.md`](TRACE-5.37.0-WORK-VALIDATION.md). Contrôle local : `node scripts/trace-release-preflight.mjs` ; sortie **2 attendue = NO-GO**, aucune action externe.

## Prochains lots prioritaires

1. **Écritures concurrentes et réglages personnels en base.** Reproduction locale : un membre peut encore modifier le solde d'ouverture du partenaire dans `households.settings` ; deux écritures de clients périmés perdent une modification. La migration 07 seule ne ferme pas ces failles. Protéger les clés personnelles et introduire une vérification atomique de version avec interface de conflit, en préservant les réglages et règlements partagés.
2. **Validation/édition internationale des imports.** Un CSV EUR est bien enregistré en attente, mais la fiche de validation étrangère reste bloquée ; ne pas annoncer un import étranger complet. Finaliser les natures carte/virement/remboursement et les répartitions natives/figées. Édition descriptive des dépenses étrangères confirmées déjà protégée.
3. **Débit différé intégré.** Simulateur, frais, remboursement et règlements partiels testés isolément ; pas branchés au journal persistant. La création `deferred` reste désactivée. Raccorder achat/date budgétaire/échéance/débits/allocation de règlements/import sans deuxième dépense.
4. **Devise budgétaire personnelle et devise Couple.** Le compte principal EUR change la trésorerie affichée ; les budgets et partages restent CAD. Le paramétrage de la référence personnelle/Couple n'est pas terminé. Définir et matérialiser un changement prospectif sans recalcul historique, conformément aux validations existantes.
5. **Imports quotidiens et recette cloud.** Le CSV et le PDF mensuel ne certifient pas les parcours captures/OCR et PDF quotidiens. Le module bancaire hérité référence encore des CDN ; la CSP du labo les bloque. Ne pas élargir la CSP pour faire disparaître un échec. Qualifier sur fichiers fictifs représentatifs.
6. **Safari iPhone/PWA financière/Supabase isolé.** Aucun vrai iPhone disponible. Auth/RLS hébergées, synchronisation à deux clients, file d'écritures hors ligne et cache de production à qualifier sur environnement fictif explicitement autorisé. Ne jamais brancher le labo aux données réelles.
7. **Sortie.** Sauvegarde réelle fraîche et restauration isolée, migration qualifiée, freeze des écritures et rollback compatible avec les nouveaux enregistrements FX. Le retour brut à 5.36.5 après écritures internationales n'est pas démontré sûr.

## Commits de la mission

Tous sur la candidate avec `[skip ci]`. La présente consolidation ajoute ensuite un commit documentaire.

| SHA | Lot |
|---|---|
| `a4a442cbf252650902d0b733dafefeeea7ee1b13` | test(trace): repair native regression harnesses and add complete local QA runner |
| `93ecf7a26f363d9eaaa19197ab7d32c4a25e8f36` | feat(trace): integrate audited local PDF.js and verify premium candidate in Chromium |
| `dd615ee9c671cde67ea5cfdef67025396cb7cb25` | fix(trace): preserve native cents, dated FX evidence and working international entry forms |
| `b82ab0deacf4521a14bf6226ffe231ddc05c3ffb` | feat(trace): finish budget progress, FX transfer fees and persisted-workflow qualification |
| `30a46ce0f7724bc090432b013574fb827f0bb6cd` | feat(trace): complete native-currency savings and truthful wealth/FX previews |
| `8e28f77bf07cb82005e8eee6afa49b63b3cbea65` | feat(trace): finish account settings, card reassociation and reversible archival |
| `b26e8b96aac9f869c173f00e5b8888364cf70e4e` | feat(trace): isolate fictional PWA cache and verify offline local PDF extraction |
| `11c4891afc9762763bb2b26750ac93b9565338bb` | feat(trace): verify portable snapshots and restore fictitious PostgreSQL data |
| `5758cf29b6f1e8710901a444fd1ed7b24f103731` | feat(trace): inspect every CSV proposal and compare native bank matches |
| `699bf5778e949153f2ff050d69392ebd3bfadcab` | fix(trace): prepare account ownership RLS guards and expose remaining data conflicts |
| `94c613cd4e1c547a38671083c1da773967bded70` | test(trace): verify public historical FX quotes and clarify laboratory PDF activation |

## Invariants à préserver

Soldes bancaires natifs ; taux traçable date/source et jamais 1 par défaut ; montants au centime ; `pending` distinct de `confirmed` ; paiement carte et transferts internes sans double dépense ; historique CAD figé ; remboursements selon leur nature et allocations conservées ; pas de réinitialisation, suppression automatique de doublon ou lecture des données réelles. Cinq onglets : Accueil — Budget — + — Activité — Patrimoine. Épargne puis Placements puis Patrimoine net. Identité TRACE validée conservée.
