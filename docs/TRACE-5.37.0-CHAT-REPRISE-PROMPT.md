# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — BLOCAGE D'EFFACEMENT DES FOYERS HISTORIQUES

**HEAD à revérifier à la reprise** : ne jamais supposer le SHA de cet addendum. Branche exclusive `trace-5.37.0-international-accounts-fx`, `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909`, commits `[skip ci]`. Interdits inchangés : PR, merge, CI, déploiement, migration réelle, Supabase réel et tout reset.

**Nouveaux commits** : `c195aeeb6ba5ec43200f1bfc4ea3812919ed1e47` (test multi-foyer différé), `666c86668e8ec31a65b9473f6e9ff832e419324e` (UUID fictif SQL paramétré), `333c2c98f2ee378f46fe53034ce5b1c565ef6d08` (limites + immutabilité CSV). Dans `tests/trace-cas-writes.integration.cjs`, un quatrième utilisateur fictif crée un second foyer d'archive contenant avant migration 10 une carte EUR différée et un achat historique. **Comportement actuellement attendu à confirmer sur moteur PostgreSQL :** la suppression administrateur du foyer est refusée par `TRACE_DEFERRED_NOT_RELEASED`. C'est une **barrière produit**, PAS un test de suppression réussie. La suppression par membre est aussi non autorisée (schéma V4). Autre scénario : source CSV trop longue, nom >110, index hors plage, `rawFingerprint` / `rawTruncated` immuables.

**Preuve de cette session : compilation syntaxique V8 du fichier test seulement** ; aucune exécution PostgreSQL/PGlite, aucune confirmation des nouveaux scénarios, pas de Node CLI sur checkout complet, ni Safari. Les `98/98` V8 du lot précédent ne doivent pas être attribués à ces nouveaux scénarios. Le conteneur n'a ni Postgres/PGlite ni accès DNS GitHub. Les migrations 10/11 restent candidates et non appliquées.

**Prochaine priorité :** obtenir un PostgreSQL/PGlite isolé fictif, exécuter migrations 05–11 et les suites intégration. Qualifier un chemin d'effacement légitime *sans supprimer les protections contre la destruction d'une preuve isolée ou les écritures différées* ; qualifier aussi les accès des partenaires/foyers, CAS, RLS, Realtime, sauvegarde/restauration et rollback. Débit différé toujours en quarantaine, production **NO-GO**, progression **58 % ±10**. Continuer ensuite les fonctionnalités financières et l'UX premium déjà validées.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — INTÉGRITÉ DES PREUVES CSV LONGUES ET TEST MULTI-FOYERS

**HEAD technique AVANT commit documentaire :** `9ef4e4e37831bf235f6ffb45aa7408915551ec83`. Résoudre le vrai HEAD de `trace-5.37.0-international-accounts-fx` au début de toute prochaine mission. Stable `main` inchangée connue `02c70f50e7e51da79b77a91dde96a03c6c719909`. Aucun déploiement, merge, PR, CI, modification SW production, Supabase réel, SQL appliqué, reset, ou donnée financière personnelle manipulée. Commits `[skip ci]`.

**Travaux code candidat de cette session :**
- `cd94b0a5bd1631fd58ad76d06feafaa51ab9eeea` : `csvUnparsedRecord` refuse désormais un nom de fichier CSV dépassant 110 caractères au lieu de le tronquer silencieusement (évite des collisions avec deux noms longs ayant le même préfixe). Pour les lignes bancaires dépassant 650 caractères, conserve l'extrait à 650 mais enregistre `rawTruncated:true` et affiche un avertissement clair dans la fiche Activité → Importer : le relevé CSV original doit être vérifié avant d'attester la revue. Contrôle d'immuabilité de ce flag pendant l'UI ; tests.
- `2da832a6613a0a7727cf304a750646309aac204e` : ajoute `csvRawEvidenceFingerprint` (empreinte **NON CRYPTOGRAPHIQUE FNV-1a 64 bits**, stable et déterministe sur la chaîne UTF-16 complète de la ligne) stockée comme `rawFingerprint`. Sert uniquement à repérer des modifications accidentelles après les 650 caractères visibles. La réimportation d'une ligne longue présentant le même préfixe mais une fin modifiée est maintenant signalée comme conflit de source. **Ne pas présenter comme un hash SHA, preuve bancaire, signature, système de sécurité, garantie d'unicité, ni résistance à un adversaire.** Les documents anciens sans empreinte qui étaient tronqués demandent une revue prudente. Tests de réimport identique, divergence en fin de ligne et changement en cours de revue.
- `f49610b013e243c4038f358a8e233dbcf261ac4c`, `9ef4e4e37831bf235f6ffb45aa7408915551ec83` : enrichissent `tests/trace-cas-writes.integration.cjs` d'un test fictif : troisième utilisateur forme un **deuxième foyer indépendant**, crée un compte et une preuve CSV privée, utilisateurs du premier foyer ne peuvent ni la SELECT ni l'écrire en RPC, puis une suppression **administrative** du second foyer doit déclencher une cascade sans blocage de restauration ; fixture JSONB corrigée. **Test PostgreSQL préparé, NON exécuté.** Vérifier aussi la suppression légitime d'un foyer via RPC utilisateur : le trigger SQL 11 refuse les DELETE individuels de preuve et sa compatibilité avec les cascades autorisées demeure une porte qualité ouverte.

**Preuve actuelle : `98/98` tests V8 exécutés sur les vrais sources candidate avec modules Node, RPC, DOM et FileReader simulés.** Répartition `28` CSV FileReader, `6` comptes, `7` collisions, `5` revue partielle, `24` CAS client, `6` Accueil, `10` revue UI, `8` contrats statiques SQL, `4` lexique SQL. `tests/trace-cas-writes.integration.cjs` passe un contrôle de syntaxe JavaScript V8 seulement : **aucun SQL compilé ni exécuté**, zéro PostgreSQL/PGlite, Auth/RLS/CAS sous base native, vrai Chromium ou Safari physique. Node 22 est présent dans le conteneur mais aucun `postgres/psql/initdb` ou PGlite, DNS GitHub/npm indisponible ; GitHub connector sert uniquement aux commits sur branche. Le module `trace-sql-lexical-integrity.test.cjs` n'est pas un parseur PostgreSQL.

**Éléments de documentation externe vérifiés :** Supabase Realtime sous RLS ne garantit pas la disponibilité des valeurs complètes de `payload.old` même avec `REPLICA IDENTITY FULL`. Vérifier les comportements Realtime et les droits sur deux abonnements fictifs avant GO. Actuellement `v5-app-5.37.0.js` charge les documents par SELECT et n'a pas de gestionnaire direct `postgres_changes` dans ce fichier ; ne pas prétendre que synchronisation live est qualifiée.

**Prochain objectif INCHANGÉ :** qualification fictive complète des migrations 05–11 par `tests/trace-cas-writes.integration.cjs`, `trace-database.integration.cjs` et `trace-personal-settings-ownership.integration.cjs` sur vrai PostgreSQL/PGlite local avec deux membres ET deux foyers, JWT/RLS, DELETE en cascade / effacement légitime, cas de restauration/admin, Realtime et révisions CAS. Sans cela, NO-GO. Puis vrai navigateur, iPhone Safari, SW preview régénéré uniquement par `scripts/build-trace-preview-pwa.mjs`, PDF contrôle, transactions FR/CA/FX couple et débit différé avant GO explicite. Prioriser les vraies fonctionnalités financières sans réinitialiser les décisions et sans toucher aux budgets historiques CAD ni à `main`.

**Estimation globale qualitative inchangée : 58 % ±10 points (~42 % restant), PRODUCTION NO-GO.** Conversation longue : recommander un nouveau chat après ce point ; commencer par lire intégralement les trois documents de `docs/`.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — FIX MIGRATION SQL 11 ET COLLISION CSV BIDIRECTIONNELLE

**HEAD de code au moment de la rédaction** : `a6bd854de0a3618786d58fc056431708611a65d3`. Vérifier et utiliser le vrai HEAD de la branche `trace-5.37.0-international-accounts-fx` avant écriture. `main` stable connu `02c70f50e7e51da79b77a91dde96a03c6c719909` demeure intouché ; `[skip ci]` partout. Pas de PR, merge, CI, déploiement, PostgreSQL réel, lecture ou écriture Supabase réel.

**Défaut critique découvert par audit manuel :** `migrations/11-trace-csv-unparsed-owner-privacy.sql` contenait un littéral regex SQL non terminé près de `sourceIndex` : `'^[0-9]{1,6}` (guillemets/fin d'expression absents). **Ce fichier n'était pas exécutable tel quel.** Cause racine confirmée : `String.replace(old,newString)` interprète le jeton JavaScript `$'` dans une chaîne de remplacement comme « reste de la chaîne source », ce qui déformait le SQL. `595e66965dbfabf00e5067805beb3c0b7ebdd579` a été une première tentative de correction **défectueuse et remplacée aussitôt** ; le commit correctif final est `26dcc704446798a900aed5623479d6867d2b3a6e` reconstruit depuis le contenu antérieur par `replace(pattern,()=>replacement)` sans interpolation `$'`. La migration actuelle contient un `CASE WHEN ... ~ '^[0-9]{1,6}$' THEN ...::integer not between 2 and 1001 ELSE true END` pour refuser les index non numériques sans conversion dangereuse.

**Nouvelle barrière de test :** `71739b3da130a37a69125517cf41c1418a7f6ee2` ajoute `tests/trace-sql-lexical-integrity.test.cjs`, quatre tests contrôlant les chaînes SQL, commentaires et corps dollar-quotés des migrations candidates 07–11 ; regex `sourceIndex` strictement terminée, règle CASE validée, simulation d'une regex volontairement amputée qui DOIT faire échouer le contrôle, unicité de la policy/trigger/RPC. Ceci est un **contrôle lexical, PAS un parser PostgreSQL** et ne remplace pas l'exécution des migrations ni les tests Auth/RLS.

**Deuxième lacune corrigée (fonctionnelle) :** `4b0377016059c4366cb597fd539d18a457cab031` ajoute `csvConflictingUnparsedEvidence` côté `v5-app-5.37.0.js`. Un même fichier CSV, même compte et même numéro de ligne déjà conservé comme preuve **illisible**, même si la preuve a ensuite été marquée `reviewed`, ne peut plus être silencieusement importé comme nouvelle transaction `pending` après modification du CSV. Vérification en prévisualisation, avant lot, avant chaque transaction ; pas d'effacement de la preuve, pas de dépense/revenu fictif, avis de conflit et nouvelle revue nécessaire. 2 nouveaux cas en harnais FileReader. `a6bd854de0a3618786d58fc056431708611a65d3` met à jour l'ancien test de collision pour vérifier les deux voies (transactions et preuves non interprétées).

**QA réexécutée sur ce dernier HEAD de code : `91/91` tests V8 simulés**, répartis 24 parcours CSV end-to-end fictif, 6 compte, 7 collision, 5 import partiel, 24 CAS client, 6 Accueil, 7 revue des preuves, 8 contrat SQL statique, 4 lexique SQL. Tests exécutent les vrais sources GitHub dans V8, mais les modules Node, l'interface DOM, FileReader et les RPC sont simulés ; **aucune exécution PostgreSQL/PGlite**, aucun `node --test` depuis un checkout complet, aucun navigateur/Safari iPhone. Le test lexical prouve seulement que le bug de littéral tronqué est absent ; une syntaxe SQL valide au sens PostgreSQL et une sécurité RLS correcte restent À PROUVER sur un vrai moteur.

**Gates majeurs non atteints :** qualification sur base PGlite/PostgreSQL fictive des migrations 05–11 avec 2 membres/foyers + JWT, droits SELECT/RLS et RPC SECURITY DEFINER, trigger insert/update/delete, restauration DBA, Realtime `REPLICA IDENTITY FULL`, CAS & écritures legacy, unicité inter-sessions de source CSV ; audit d'accès, rétention/effacement des preuves, UX native Safari + offline/SW généré officiellement, Couple/FX et débit différé atomique. Le conteneur courant a Node mais n'a ni PostgreSQL/PGlite ni DNS pour clone/install. **Jamais substituer le Supabase réel au banc d'essai.**

**Avancement qualitatif maintenu 58 % ±10 points, environ 42 % restant, production NO-GO**. Les nouveaux tests évitent une régression bloquante, mais la vraie qualification reste indisponible.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — PROTECTION FAIL-CLOSED DES PREUVES CSV + RESTAURATION SQL

**HEAD technique avant mise à jour des documents :** `498ea5f99f3a47bd994a7e78a29be7d13436dca8`. La présente mise à jour documentaire créera un HEAD nouveau, à relire au démarrage. Branche de développement EXCLUSIVE : `trace-5.37.0-international-accounts-fx`; `main` référence `02c70f50e7e51da79b77a91dde96a03c6c719909`. Aucune fusion, PR, Actions, déploiement, intervention sur données réelles Supabase, ni application SQL ; tout commit `[skip ci]`.

**Objectif prioritaire de cette itération :** qualifier la confidentialité de `imports.csv_unparsed` avant production. Tentative de moteur isolé : conteneur vérifié `node v22.16.0` disponible, **aucun checkout local**, `psql`, `postgres`, `initdb`, `pg_ctl`, `@electric-sql/pglite` installés ; `git ls-remote` ne peut résoudre GitHub (DNS). Il est donc IMPOSSIBLE de revendiquer une exécution SQL native dans cette session. **Aucun accès au projet Supabase réel n'a été réalisé.** Documentation officielle Supabase consultée (skill + recherche documentaire, sans projets utilisateurs).

**Changements candidats effectifs, commits [skip ci] :**
1. `2e675a6492fcd317fd47b91dcd8d97214e6e8606` : migration `11-trace-csv-unparsed-owner-privacy.sql` autorise une maintenance/restauration sans JWT **uniquement** lorsque `current_user='postgres' AND session_user='postgres'`. Autres accès non authentifiés et utilisateur direct `authenticated` continuent à être refusés. Deux tests PGlite fictifs ajoutés pour l'administrateur et un rôle authentifié sans JWT. Attention : test SQL **non exécuté**.
2. `452f265162f8dd6b93cde2a13e58182195949ca6` : la migration 11 expose un RPC **SECURITY INVOKER**, `public.trace_csv_evidence_guard_ready()`, qui ne renvoie TRUE que si RLS est activé sur `public.documents`, la policy SELECT restrictive `trace_csv_unparsed_private_select` existe et le trigger `trace_csv_unparsed_evidence_guard` est activé. Le client 5.37 requiert maintenant `client.rpc('trace_csv_evidence_guard_ready')` avant d'enregistrer **la première preuve CSV illisible du lot**, et avant d'en clôturer une. Si RPC absent/erreur/false, l'opération sensible est refusée sans écritures ; les CSV entièrement interprétables restent importables en attente comme auparavant. Relecture du contexte bancaire après `await`, de l'extrait lors de sa clôture. Le laboratoire local fictif est exempté seulement via `internationalPreviewMode()` (pas de sauvegarde cloud). Cette sonde est un **marqueur de cutover**, pas une garantie que la RLS/Realtime ont passé des tests.
3. `e3cfdda7d23ccd70ddb87a92d3c45162db0e8611` : 6 cas V8/contrat (3 CSV, 1 revue, 2 statiques) et 1 cas PGlite préparé concernant les grants/ready. `7230365b49685b2458d1e7f30cb54d1de3550444` : 2 cas V8 supplémentaires de modification du compte et de l'extrait pendant l'attente de la sonde.
4. `498ea5f99f3a47bd994a7e78a29be7d13436dca8` : test PGlite préparé pour `trace_csv_evidence_guard_ready` en cas de trigger désactivé, policy supprimée, puis réparation par réapplication de la migration 11. **Non exécuté**.

**Résultat frais sur le HEAD de code : 85/85 scénarios V8 simulés**, huit suites utilisant les vrais fichiers 5.37.0 et les vrais tests, dépendances `node:*`, DOM, FileReader et RPC simulées. Répartition : 22 CSV FileReader, 6 contexte compte, 7 collisions, 5 lignes invalides, 24 CAS client, 6 Accueil, 7 revue CSV, 8 contrats statiques de SQL. Aucun `node --test` natif sur checkout complet, aucune base SQL/PGlite, RLS/Auth/JWT réel, navigateur Chromium, Safari iPhone ou Realtime. Les nouvelles vérifications PostgreSQL se trouvent DANS le test d'intégration mais ne sont PAS des tests passés.

**Procédure exigée dans un checkout isolé et CLEAN, sans Supabase hébergé :**
- Vérifier branche `git branch --show-current` == `trace-5.37.0-international-accounts-fx` et `git status --porcelain` propre, Node fonctionnel.
- Installer `@electric-sql/pglite` uniquement dans l'environnement fictif autorisé (ou définir `TRACE_PGLITE_MODULE` vers son chemin local réel), sans CI/Actions ni identifiants du projet réel ; pas de téléchargement possible depuis cette session.
- Exécuter `TRACE_PGLITE_MODULE=<chemin-local> node tests/trace-cas-writes.integration.cjs` et les autres tests PG `tests/trace-database.integration.cjs`, `tests/trace-personal-settings-ownership.integration.cjs`. Ne jamais substituer `execute_sql` sur Supabase réel.
- Tester intégralement: migrer les 05–11 sur données fictives ; propriétaire et partenaire du foyer, outsider, écritures directes legacy/RPC SECURITY DEFINER, révisions CAS, JWT absent, test de restauration DBA, trigger désactivé/policy supprimée et retour à FALSE, test Realtime avec abonnements de 2 utilisateurs. Corriger tout échec AVANT d'approcher la prod.
- Reconstruire SW **de prévisualisation seulement**, via `node scripts/build-trace-preview-pwa.mjs` puis `--check` sur checkout autorisé ; Safari physique, UX premium, FX/Couple, banque différée, performance, backup/restore/rollback puis GO humain restent obligatoires.

**Progression globale qualitative : 58 % ±10 points, 42 % restant, production NO-GO.** Ne pas augmenter le % uniquement pour cette sécurité supplémentaire non qualifiée. Aucun reset ni migration effective.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — CONFIDENTIALITÉ DES PREUVES CSV, MIGRATION 11 NON EXÉCUTÉE

**HEAD candidat technique avant mise à jour des documents :** `ce0fae9030c280a7d5f620b7aa2ee99c171a6b43`. Revérifier le HEAD réel à la reprise. Écritures EXCLUSIVES sur `trace-5.37.0-international-accounts-fx` ; `main` référence `02c70f50e7e51da79b77a91dde96a03c6c719909`. Tous commits `[skip ci]`. Pas de merge/PR/Actions/déploiement, accès Supabase réel, migration appliquée, suppression ni reset. 5.36.5 reste stable.

**Nouvelle migration candidate à auditer avant toute activation :** `migrations/11-trace-csv-unparsed-owner-privacy.sql`. Prérequiert 05–10 ; fichier créé à la main dans le repo car CLI et checkout natif non disponibles, **NON généré par supabase migration new / NON testé sur SQL réel**. Deux commits :
- `27c521e0a5d0fef59949cdde926c85349bcc69c9` : policy **RESTRICTIVE FOR SELECT TO authenticated** sur `public.documents`, filtrée uniquement sur `collection='imports' AND data.kind='csv_unparsed'`. Une preuve d'import CSV est censée être visible seulement pour le membre dont `data.owner` correspond à son `household_members.slot`. Les autres imports et transactions demeurent sous RLS foyer actuel. Un contournement via vue/Realtime/sauvegarde n'a pas été audité.
- `47dab520cd78f5259f75f815d0b5a479c4281eaf` : trigger `BEFORE INSERT OR UPDATE OR DELETE` sur `documents`, pour détecter les documents `csv_unparsed` anciens et nouveaux même à travers un `SECURITY DEFINER` CAS qui peut contourner RLS. Exige `auth.uid()`, slot membre, compte bancaire du même propriétaire, id/document cohérent, source CSV et limites de longueur/index ; création uniquement en `pending_review`; modification autorisée uniquement `pending_review→reviewed` avec revue attestée par son titulaire ; source, compte, propriétaire et texte bancaire immuables ; DELETE interdit aux sessions utilisateurs. Pas de réécriture de données historiques. Anciennes écritures directes des autres collections restent ouvertes tant que 09 n'est pas qualifiée/cutover. ATTENTION : aucun essai réel SQL ni preuve de comportement en restauration administrative, Realtime ou multi-session.
- `d5626c77fe2f9d9ea01e2057338c7acebec411bc` : cinq scénarios fictifs PostgreSQL ajoutés à `tests/trace-cas-writes.integration.cjs` couvrant lecture propriétaire/partenaire, forgery RPC et direct, immutabilité, clôture et suppression, idempotence migration. `86c2632a374452603e4d23a466f40f5244b64122` corrige la sérialisation JSONB d'une attaque simulée. Tests SQL **écrits, non exécutés**.
- `9a97a700f1291627b48a1fd7428f2a09e01938c7` : limite `CSV_UNPARSED_REVIEW_LIMIT=100` lignes CSV illisibles par fichier pour empêcher 100+ RPC unitaires non bornées (erreur explicite AVANT toute persistance et consigne de vérifier le mapping/fractionner), et test FileReader/DOM fictif. Le reste des lignes valides n'est pas silencieusement tronqué.
- `ce0fae9030c280a7d5f620b7aa2ee99c171a6b43` : `tests/trace-csv-evidence-server-contract.test.cjs`, six contrôles **statiques** de la migration, des tests PostgreSQL et du contrat de non-comptabilisation, sans exécution PostgreSQL.

**Preuve V8 actualisée sur vrai code candidat : `77/77` scénarios sous V8 avec mocks Node/DOM/RPC/FileReader.** Décompte `18` lecteur CSV, `6` contexte, `7` collision, `5` partiel, `24` CAS client, `6` Accueil, `5` revue des extraits, `6` contrôles statiques SQL. Ces `77` ne sont PAS des tests natifs `node --test`, une compilation SQL, une validation RLS, ni une recette Chromium/iPhone.

**Portes qualité priorisées :** PGlite/PostgreSQL fictif migrations 05–11, vérification SELECT/RPC/direct SQL et deux vrais JWT utilisateurs de foyers distincts ; sécurité du `SECURITY DEFINER`, politiques existantes, Realtime et publication `documents` avec `REPLICA IDENTITY FULL`, backup/restauration, rétention et droit d'effacement des extraits ; test des 101 lignes illisibles, batch RPC/performance, vrai FileReader/CSV, PDF de contrôle, iPhone Safari. Le SW de prévisualisation est périmé et doit être régénéré UNIQUEMENT via `scripts/build-trace-preview-pwa.mjs` et `--check` dans checkout isolé. `main`, budgets historiques CAD, Couple/FX et débit différé strictement protégés. Aucune donnée personnelle réelle utilisée.

**Estimatif global TRACE maintenu `58 % ±10` (~42 % restants), car la migration est codée mais la sécurité serveur reste complètement non qualifiée. Production NO-GO.**

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — LIGNES CSV ILLISIBLES CONSERVÉES ET REVUES

**HEAD technique avant ce commit documentaire :** `bdb16d12350ade57c9ccebf50a220bcf913c20e9`. Vérifier le HEAD réel avant prochaine écriture. Branche autorisée exclusivement `trace-5.37.0-international-accounts-fx`; `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909`. Aucun merge, PR, déploiement, action GitHub, application de migration, accès ou écriture aux données Supabase réelles. Tous commits `[skip ci]`.

**Fonctionnalité désormais intégrée dans le CODE CANDIDAT** (ni qualifiée en navigateur ni en SQL) :
- `b13297ce7baf5926c2c0183a54f56c7cc0108ac9` ajoute `csvUnparsedRecord` et `csvUnparsedSourceConflict` : après attestation explicite, chaque ligne CSV non interprétée est conservée dans la collection persistante `imports`, `kind:'csv_unparsed'`, `status:'pending_review'`, titulaire, compte, nom et index de ligne, extrait original tronqué à 650 caractères, identifiant déterministe borné à 240 caractères. Aucun `transactions` créé pour cette ligne, aucun montant`amountCAD`, aucun calendrier certifié et aucune écriture budgétaire. Le stockage des preuves non financières précède les lignes valides en attente ; interruption ultérieure ne les efface pas. Un même nom/compte/index source + autre contenu (ou ancien enregistrement financier au même endroit) bloque l'import. Rejouer le même CSV n'ajoute pas de preuve identique. Un CSV entièrement illisible peut conserver ses preuves si l'utilisateur accepte explicitement. Modification du CSS candidat, pas du style de `main`.
- `69a621f44ba2b6690f3cc4f1287457e4d5103f46` rend ces preuves visibles dans `Activité → Importer` et dans `Accueil → À faire` (comptabilisées comme **éléments** à vérifier, pas transactions), avec revue ouvrant le relevé et confirmation humaine nécessaire pour passer à `status:'reviewed'` ; la revue n'ajoute aucune transaction. Boutons adaptés mobile.
- `0215dad8ec2bcfe71852ac12a0bbd6af5acb5d11` enrichit de 6 cas le banc `tests/trace-csv-reader-flow.test.cjs`. `744fae90dec3ae9bf489ae77242f8753e4a3d938` corrige un vrai défaut détecté par ces tests : ancienne ligne bancaire dans `transactions.importFileName` vs nouvelle preuve dans `imports.sourceFileName`, collision oubliée au premier essai. `c6d7e36c44731b41315ebbf576b1fdc28f5a9751` corrige les tests d'anciens comportements et protège la revue contre modification en place après affichage. `bdb16d12350ade57c9ccebf50a220bcf913c20e9` ajoute `tests/trace-csv-unparsed-inbox.test.cjs` avec vérification d'échappement HTML, périmètre titulaire, consentement, statut revu, zéro opération et changement concurrent local.

**QUALIFICATION CIBLÉE SUR HEAD COURANT : `70/70` tests exécutés en V8**, 7 fichiers réels, véritables sources 5.37.0/International/reconciliation, dépendances Node/DOM/FileReader/RPC simulées. Détail 17 CSV lecture/enregistrement + 6 compte preview + 7 source + 5 partiel + 24 CAS + 6 Accueil + 5 revue Activity. Tests Node CLI natifs, vrai Chromium, Safari iPhone, Supabase, RLS/Auth, PGlite/PostgreSQL et migrations SQL 07–10 **NON exécutés**. Pas de checkout réseau utilisable dans ce conteneur, GitHub/npm DNS et PGlite non accessibles, SW de prévisualisation périmé (ne jamais le modifier manuellement : régénérer uniquement par `scripts/build-trace-preview-pwa.mjs` puis `--check`).

**Risques à traiter avant GO :** cette fonctionnalité prévoit la persistance d'extraits de données bancaires dans le foyer Supabase (consentement explicite affiché) : vérifier RLS, séparation des accès des membres, confidentialité, rétention/suppression et sauvegarde. Un identifiant fondé sur nom de fichier+compte+index est un garde-fou de réimportation et non une preuve d'unicité bancaire universelle. Les extraits sont limités à 650 caractères : besoin de revoir le relevé original, et de vérifier les longs noms de fichier. L'import de grand lot avec nombreuses preuves utilise actuellement une RPC par ligne ; **performance/atomicité inter-clients et limites de taille sont non qualifiées**. Aucune preuve de complétude 100 %, aucune connexion automatique au vrai PDF mensuel, aucun débit différé réel activé.

**Prochaine étape :** checkout natif isolé, tests 07–10 deux utilisateurs Auth/RLS/CAS/grants, tests de confidentialité des imports du couple et concurrence ; Chromium avec FileReader réel, OCR/PDF mensuel et longue liste, adaptation iPhone Safari ; SW de preview officiel ; Couple/FX, carte crédit/différée, patrimoine, sauvegarde/rollback. Ne pas déployer sans GO humain.

**Avancement global estimatif : 58 % ±10 points (42 % restant)** grâce au nouveau parcours utilisateur complet côté candidat, **pas grâce au seul nombre de commits/tests**. Production NO-GO.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026 — QUALIFICATION DU PARCOURS CSV + CONTRÔLE MENSUEL

**HEAD technique avant cette mise à jour documentaire :** `832a821f9e60a5db7cb1491a9fc865cf0b448f8e`. Revérifier le HEAD exact de la branche `trace-5.37.0-international-accounts-fx` avant reprise. Branche stable `main` de référence `02c70f50e7e51da79b77a91dde96a03c6c719909`, absolument hors périmètre. Aucun déploiement, PR, fusion, action CI, écriture financière réelle Supabase ni migration SQL appliquée. Chaque commit comporte `[skip ci]`.

**Chantier livré (tests exclusivement, code bancaire préservé) :** `tests/trace-csv-reader-flow.test.cjs` teste la chaîne réelle `FileReader → parseCsv → mappage → preview DOM → clic de validation → saveDocument pending simulé` sur le véritable `v5-app-5.37.0.js` et le vrai `trace-international-1.0.0.js`. Des fixtures CSV fictives CAD/EUR sont utilisées ; le lecteur de fichier, le DOM et les RPC sont **simulés**. Les cas couvrent les comptes CAD/EUR sans FX fictif, le réimport exact, deux achats similaires à des lignes distinctes, la collision de source, la modification des colonnes après prévisualisation, la modification de la devise pendant un lot, et la revue partielle des lignes invalides. La version initiale du test a révélé deux défauts du banc d'essai (fin de ligne source et absence de `console` dans V8), corrigés **dans le test uniquement**, sans modification bancaire de l'application.

**Passerelle contrôle mensuel :** avec le vrai moteur **lecture seule** `trace-statement-reconcile-1.0.0.js`, 3 tests supplémentaires vérifient que les achats CSV `pending` ne sont pas présentés comme `matched` confirmé, que deux lignes même date/montant restent `ambiguous`, et que les mouvements du relevé absents de TRACE apparaissent `missing`. `writes:0` et `financialChanges:0` attendus sur le moteur. Cette passerelle demeure une simulation d'intégration ; l'interface PDF mensuelle correspond à la **prévisualisation/laboratoire**, PAS à un flux de production complètement intégré.

**Commits :** `f83c7fc091333950e80819c5b232e3b17d8a5868` (harnais initial), `d687df3f1496c37025f511b1ff49e595d010d925` (correction des fixtures et erreurs simulées), `832a821f9e60a5db7cb1491a9fc865cf0b448f8e` (couverture de rapprochement mensuel sans écriture). Les trois portent `[skip ci]`.

**Preuve fraîche globale ciblée : `58/58` scénarios exécutés sous V8**, 6 fichiers de test authentiques, sources app/International/reconciliation authentiques et mocks Node/DOM/RPC : `11/11` parcours CSV complet+mensuel, `6/6` contexte de compte, `7/7` collision, `5/5` partiel, `24/24` client CAS, `5/5` Accueil. **Ne pas interpréter ces 58 comme des tests Node CLI natifs, Chromium, Safari iPhone, PostgreSQL, PGlite, Supabase ou Auth/RLS.** Réseau de checkout toujours bloqué dans le conteneur par DNS GitHub/npm ; PGlite indisponible ; Node v22.16.0 présent. Aucun `scripts/check-trace-537-release-gates.cjs` ni `tests/trace-cas-writes.integration.cjs` lancé sur un vrai checkout.

**Garde-fous et blocages inchangés :** import CSV fiable côté test candidat mais pas d'unicité inter-clients native serveur ; lignes illisibles affichées et attestées mais non persistées ; relevé mensuel PDF non prouvé exhaustif ; migration 10 de quarantaine toujours non appliquée et débit différé interdit ; métier Couple/FX prospectif, UI premium, navigateur offline et vrai Safari iPhone encore incomplets. Service worker de prévisualisation potentiellement périmé ; NE PAS éditer manuellement, uniquement `node scripts/build-trace-preview-pwa.mjs` puis `--check` sur checkout complet. Reprendre en priorité les migrations 07–10 Auth/RLS/CAS en PostgreSQL fictif et le parcours UI réel; pas de GO sans tests + sauvegarde/rollback autorisés.

**Avancement global qualitatif inchangé : 57 % (±10 points), 43 % restant. Production NO-GO.**

---

# REPRISE PRIORITAIRE — 25 OCTOBRE 2026 — LOT CSV INTÉGRITÉ DU RELEVÉ ET REVUE HUMAINE

**HEAD technique de ce lot (avant commit documentaire) :** `3c6e0707a07fbe90d172a1b1979bb03044231cef`. Résoudre le HEAD GitHub au début de la prochaine mission. Branche exclusive `trace-5.37.0-international-accounts-fx`, `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` à préserver. Aucune PR, fusion, déploiement, Actions, Supabase réel ou migration appliquée. Commits toujours `[skip ci]`.

**Lot fonctionnel terminé dans le CODE CANDIDAT (pas recette navigateur) :**
1. `67ba2cd314d7f1dc20a00562136958d6b74882f9` — prévisualisation CSV → contrôles de contexte au moment de l'enregistrement et avant **chaque** ligne : correspondance des colonnes, format date, signe, compte, titulaire, archivage, modèle bancaire, devise native, pays, carte liée. Le modèle `paymentMode:'deferred'` est interdit. Si l'état change, ne pas enregistrer de nouvelles lignes ; les lignes `pending` déjà créées restent conservées et le message invite à re-prévisualiser.
2. `352e03be722df1f3d8696e3f56b524193fde6577` — rapprochement de source physique `csvSourceRowsAtIndex` : même fichier/compte/numéro de ligne avec empreinte identique = réimportation sans doublon ; empreinte différente = **conflit**, import suspendu avant toute écriture de ce lot. Il peut s'agir d'un nouveau relevé portant le même nom, d'un export modifié ou d'une ancienne transaction changée : aucune décision bancaire automatique. UI conseille de comparer les relevés et, seulement si distincts, renommer le fichier avec la période avant réimport ; ce garde-fou demeure documentaire, pas une unicité serveur entre appareils.
3. `3c6e0707a07fbe90d172a1b1979bb03044231cef` — lignes CSV invalides restent visibles ; une importation *partielle* des lignes lisibles exige maintenant une confirmation explicite de la vérification séparée des lignes non interprétées. Les lignes invalides ne sont **pas** enregistrées en tant que documents pour l'instant : ne pas prétendre que la complétude des relevés est garantie ou que les 100 % des lignes sont persistées.

**Preuves exécutées sur le HEAD de code de ce lot :** `47/47` cas V8, cinq fichiers tests réels de la branche et vrai `v5-app-5.37.0.js` avec modules `node:fs`, `node:test`, assertions, DOM, RPC **simulés** :
- `tests/trace-csv-preview-context.test.cjs`: 6/6
- `tests/trace-csv-source-collision.test.cjs`: 7/7
- `tests/trace-csv-partial-review.test.cjs`: 5/5
- `tests/trace-cas-client.test.cjs`: 24/24
- `tests/trace-home-next-actions.test.cjs`: 5/5.

**IMPORTANT :** aucune preuve d'exécution Node CLI native depuis le checkout entier, aucun PostgreSQL/PGlite, Auth/RLS, navigateur Chromium, iPhone Safari ni service worker régénéré à ce nouveau HEAD. Le conteneur a Node 22.16 mais DNS `github.com` inaccessible et `@electric-sql/pglite` absent. Tests SQL 07/08/09/10, `node scripts/check-trace-537-release-gates.cjs`, concurrence à deux utilisateurs, vraie validation bancaire restent bloquants. Le SW de preview est **périmé** après JS modifié : régénération UNIQUEMENT par `node scripts/build-trace-preview-pwa.mjs` et `--check` dans checkout complet ; ne pas éditer manuellement.

**Suite recommandée :** qualification DB fictive et script portes, puis un vrai test d'intégration import CSV avec FileReader/DOM et données fictives, validation du conflit de fichier aux changements inter-clients, identification du relevé bancaire par lot et contrôle de toutes ses lignes, liaison au contrôle mensuel PDF, couple/FX, débit différé atomique, QA premium Chromium + iPhone, backup/restauration/rollback. Ne jamais ouvrir en production sans GO humain exprès.

**Avancement global maintenu à 57 % (approx., incertitude ±10 points).** Ce lot apporte un vrai garde-fou fonctionnel au chemin CSV mais ne qualifie pas les parcours globaux. **Production NO-GO**.

---

# REPRISE PRIORITAIRE — 25 OCTOBRE 2026 — ACCUEIL « À FAIRE » PREMIUM

**Dernier HEAD technique observé avant cette actualisation :** `362fdec5861b781391b310eadba981a46f1bfa38` (le présent commit documentaire crée un HEAD plus récent). Branche exclusivement autorisée : `trace-5.37.0-international-accounts-fx`. Stable `main` : `02c70f50e7e51da79b77a91dde96a03c6c719909`. Aucun déploiement, fusion, PR, Actions, écriture ou lecture des données Supabase réelles. Tous commits `[skip ci]`.

**Chantier UX intégré :** `9a6d3d71bdb7f69964067fc977fbd588a5984ebe` enrichit directement `renderHomeReview` dans `v5-app-5.37.0.js` avec trois boutons premium tactiles « Importer », « Rapprocher », « Rappels », qui appellent exclusivement les **parcours déjà présents** `navigate('activity'); showTab('import')`, `openReconcileSettings()`, `openNotificationSettings()`. Aucun module bancaire créé, aucun RPC depuis ces boutons, aucune modification de `index.html` stable ni de `sw.js` production. Adaptation CSS 320–430 px, focus accessible, préférence de mouvement réduit. Sans comptes, conserve la consigne de configuration et masque les actions inutilisables.

**Fiabilité de l'état « À faire » :** `362fdec5861b781391b310eadba981a46f1bfa38` empêche « Tout est à jour » lorsque `import_days.unresolvedCount` signale encore des lignes OCR. Les comptes bancaires `pending` et les lignes OCR restent des indicateurs séparés afin de ne pas compter deux fois les brouillons d'import comme transactions. Les nombres proviennent toujours des données existantes ; aucune opération n'est créée.

**Preuve actuelle après ces deux commits :** `5/5` cas du nouveau `tests/trace-home-next-actions.test.cjs` passés sous V8 en exécutant la vraie section d'Accueil, avec `node:test`, assertions, `fs`, DOM et navigateurs **simulés**. `24/24` tests client CAS de `tests/trace-cas-client.test.cjs` aussi rejoués sur le code candidat courant sous V8 avec RPC simulées, zéro échec. **Pas de vrai navigateur Chromium ni Safari iPhone, pas de Node CLI natif sur checkout complet, pas de PG/PGlite/SQL 07–10.** Le conteneur dispose de Node 22 mais pas de checkout réseau ni PGlite (`github.com` et `registry.npmjs.org` sans DNS). Le SW de preview, déjà signalé périmé, l'est toujours davantage après les modifications JS/CSS : ne pas le modifier manuellement ; utiliser uniquement `node scripts/build-trace-preview-pwa.mjs`, puis `--check` dans un checkout complet et autorisé.

**Suite ordonnée :** 1) qualification locale PG/PGlite migrations 07–10 et RLS/Auth/CAS/anciens documents/double utilisateur ; 2) vérification visuelle Chromium sur les raccourcis et états OCR (320/390/430) avec SW labo officiellement reconstruit ; 3) QA Safari iPhone et parcours réels d'imports, Couple/FX, premium ; 4) contrôles financiers, sauvegarde/restore/rollback et GO humain explicite. En absence de PG, continuer les lots isolables mais ne pas ouvrir la persistance des écritures différées.

**Avancement global maintenu 57 % qualitatif ±10 points, environ 43 % restant, production NO-GO.** Accueil « À faire » : navigation code intégrée et testée sous V8, QA visuelle/mobile et expérience installée **encore à réaliser**.

---

# ADDENDUM PRIORITAIRE — 25 OCTOBRE 2026, TYPES BANCAIRES HISTORIQUES ET PLACEMENTS

**Dernier HEAD technique :** `dfed7afab3611c84a0e31e16827f7bf5260cfa5e` ; le commit de ces documents suit. Branche d'écriture unique `trace-5.37.0-international-accounts-fx`. `main` `02c70f50e7e51da79b77a91dde96a03c6c719909` intacte. Pas de fusion, PR, CI, déploiement, Supabase réel, reset ou migrations appliquées.

**Deux correctifs supplémentaires liés à la migration candidate 10 :**
- `8323cc64d3ac333c358e660f9f11ffe4af18f23d` : détection des cartes `paymentMode:'deferred'` **même sans champ `type`**. L'interface `accountType()` reconnaît des cartes historiques par leur nom, tandis que les deux gardes exigeaient auparavant `type==='card'`. Les créations, modifications/déclassements, transactions associées, suppressions directes et mises à jour d'une ancienne carte différée typeless sont donc mises en quarantaine au client et dans le SQL candidat ; scénarios fictifs ajoutés.
- `dfed7afab3611c84a0e31e16827f7bf5260cfa5e` : ajoute `investment_operations` à la quarantaine et `bankAccountId` aux références surveillées pour qu'une écriture directe legacy ne puisse pas lier un mouvement de placement à une carte différée ancienne. Un virement vers un vrai compte courant ordinaire reste autorisé dans le contrat client, et les RPC 09 ont déjà leur contrôle propre de compte courant, mais les grants SQL directs restent en place jusqu'au cutover.

**Preuves fraîches :** `24/24` tests réels du fichier `tests/trace-cas-client.test.cjs` exécutés dans V8 sur le véritable `v5-app-5.37.0.js`, avec Node/assert/fs/RPC/DOM **simulés**. Syntaxe V8 des fichiers JS modifiés vérifiée. Scénarios PostgreSQL fictifs enrichis **mais non exécutés** ; pas de PGlite/PostgreSQL. Dans le conteneur, Node 22.16 est présent, `github.com` et `registry.npmjs.org` restent inaccessibles et PGlite absent, aucun checkout complet. Ne jamais requalifier les 24/24 comme des tests natifs Node ou PG. `node scripts/check-trace-537-release-gates.cjs` reste non exécuté dans un checkout isolé.

**Priorité de reprise :** obtenir checkout + PostgreSQL/PGlite fictif, relancer toutes les portes natives 07–10 et migrations idempotentes, rôles réels, deux utilisateurs, anciens comptes sans type, placements `bankAccountId`, blocages d'INSERT/UPDATE/DELETE directs et RPC. Inspecter le risque de droits directs sur les autres collections, `SECURITY DEFINER` et stratégie cutover/rollback. En parallèle traiter Couple/FX, imports, UX premium déjà décidée, offline/preview SW via générateur officiel, iPhone Safari, sauvegarde/rollback. Ne pas ouvrir le débit différé. **57 % qualitatif (±10), 43 % restant, production NO-GO**.

---

# MISE À JOUR PRIORITAIRE — REPRISE DU 25 OCTOBRE 2026, GARDES DIFFÉRÉS COMPLÉMENTAIRES

**HEAD de code vérifié après reprise :** `023c9130861df6c48eefb5c525ac6dbe9ce97577` ; ce bloc documentaire ajoute ensuite un nouveau HEAD à relire. Branche exclusive `trace-5.37.0-international-accounts-fx`. `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909`, sans aucune écriture. Tous commits `[skip ci]`. Aucun déploiement, merge, PR, activation CI, ni écriture/lecture financière Supabase réelle.

**Travaux réellement commités :** le client `v5-app-5.37.0.js` a été corrigé dans `removeDocument` : recherche des `imports` dans `state.smartImports`, des `import_days` dans `state.importDays`, et des `reconciliations` dans `state.reconciliations`, avant la demande de suppression. L'ancien code utilisait encore `smartImports` et `importDays` (identifiants mémoire, pas collections persistées), créant un défaut du contrôle préalable. La garde client et `migrations/10-trace-deferred-write-quarantine.sql` couvrent désormais aussi les alias internes d'allocation différée `deferredPurchaseId`, `deferredPurchaseIds`, `deferredFeeIds`, `deferredSettlementMode`, `deferredDueDate`, `deferredBankEvidence`, y compris si la carte n'est pas présente dans le cache. Champs présents même vides vérifiés au client et en SQL. Tests client et scénarios PG fictifs ajoutés ; **migration 10 toujours candidate et non appliquée**.

**Preuve fraîche et limitée :** 22/22 cas de `tests/trace-cas-client.test.cjs` réussis dans V8 en utilisant la vraie source 5.37.0 et le vrai fichier test, avec `node:fs`, `node:test`, assertions, RPC et DOM **simulés**. Syntaxe des trois fichiers JS modifiés compilée sous V8. **Ce n'est PAS une exécution Node CLI native, PG/PGlite, Auth/RLS/CAS à deux vraies sessions, Chromium ou Safari.** Le scénario ajouté à `tests/trace-cas-writes.integration.cjs` n'a pas été exécuté : PGlite absent, `github.com` et `registry.npmjs.org` non résolus depuis le conteneur, pas de checkout complet. `scripts/check-trace-537-release-gates.cjs` non lancé sur checkout. Aucune preuve d'exécution SQL 07–10.

**À faire sans attente de décision :** obtenir checkout fictif isolé + PGlite ; exécuter script portes de sortie et tests DB 07–10, permissions/anciens enregistrements/grants directs/deux utilisateurs et corriger les défaillances. Qualifier les allocations atomiques et doubles preuves serveur avant ouverture du différé. En parallèle finaliser multi-devises/Couple, imports/validation, interface premium sur les 5 onglets, SW de preview uniquement via générateur, Chromium offline, vrai iPhone Safari, sauvegarde/restauration/rollback. Production **NO-GO** jusqu'à accord exprès.

**Avancement global qualitatif maintenu 57 % (±10 points), 43 % restant** : ce durcissement améliore la sécurité candidate mais n'autorise pas d'augmentation artificielle tant que PostgreSQL et les parcours intégrés restent non qualifiés.

---

# RELAIS PRIORITAIRE — FIN DE CONVERSATION DU 25 OCTOBRE 2026 — TRACE INTERNATIONAL 5.37.0

**Branche exclusivement autorisée :** `trace-5.37.0-international-accounts-fx` sur `louisantoine78/Budget-duo`. **HEAD technique connu à vérifier avant toute modification :** `1f8ae90e94ac040a1ddd16eadb861d107ace571f` suivi du commit des présentes docs. `main` 5.36.5 demeure sur `02c70f50e7e51da79b77a91dde96a03c6c719909`. **Interdit :** écriture main, merge, PR, CI/Actions, production, déploiement, Supabase réel. Tous commits `[skip ci]`.

**Dernier chantier :** audit de la barrière d'écritures différées des RPC et de la migration SQL fictive 10. Défaut réel découvert dans `v5-app-5.37.0.js` : `traceRefuseUnqualifiedDeferredWrite` surveillait `smartImports` et `importDays`, alors que les collections CAS persistées sont `imports` et `import_days`. Commit `9ff2e6d71d939aec7c1254b7d7b8525dfd58af08` corrige la barrière pour ces vrais identifiants et ajoute des tests. Commit `455eafe7fbabf7bf222ae0e5b09a52a2e57bbb33` corrige les deux anciennes fixtures qui utilisaient encore les noms mémoire. Commit `1f8ae90e94ac040a1ddd16eadb861d107ace571f` ajoute des cas **PostgreSQL fictifs NON exécutés** montrant qu'un import, jour, rapprochement ou virement même non marqué `deferredKind` doit être refusé s'il pointe vers une ancienne carte différée.

**Preuves obtenues :** `20/20` tests du vrai code client `tests/trace-cas-client.test.cjs` réussis **dans un harnais V8 avec require/assert/RPC simulés**, pas en Node CLI ; syntaxe du test `trace-cas-writes.integration.cjs` vérifiée. État antérieur `101/101` tests V8 de relevés PDF / différé : **historique, non rejoué** ce dernier cycle. **Aucun SQL 07–10 ni PGlite/PostgreSQL exécuté.** Tentative du checkout GitHub depuis le conteneur : DNS `github.com` inaccessible. Node 22.16.0 présent, mais PGlite `@electric-sql/pglite` introuvable et `npm view` échoue sur DNS `registry.npmjs.org`. Aucune tentative de substituer un Supabase hébergé à la base fictive. Ces contraintes bloquent la qualification native/PG. Ne jamais prétendre que migrations 07–10 sont validées tant que `scripts/check-trace-537-release-gates.cjs` et `tests/trace-cas-writes.integration.cjs` ne sont réellement exécutés sur checkout isolé.

**Code actuel :** `migrations/10-trace-deferred-write-quarantine.sql` est une migration **candidate, NON APPLIQUÉE**, avec garde SQL `SECURITY DEFINER` + trigger BEFORE INSERT/UPDATE/DELETE interdisant achats, prélèvements, imports et comptes différés même par écritures directes. La migration 09 ne retire pas les anciens grants directs généraux. Le parcours PDF → preuve différée est strictement en prévisualisation et non persistable. Les vrais flux bancaires restent incomplets ; aucun GO.

**Étapes suivantes ordonnées :**
1. Acquérir un checkout isolé autorisé du HEAD candidat et l'installation locale **sans secrets** de PGlite, exécuter `node scripts/check-trace-537-release-gates.cjs`, `node tests/trace-cas-writes.integration.cjs` avec vrais utilisateurs et transactions **fictifs** ; corriger tout échec SQL 07–10 / 2 sessions Auth-RLS-CAS. Vérifier aussi migration 10 idempotente, anciennes lignes, untagged imports, direct insert/delete et comptes séparés.
2. Concevoir/valider les écritures atomiques différées avec double justificatif indépendant, dates achat/budget/débit, allocation des paiements/frais/remboursements, unicité bancaire et permissions serveur. Ne pas déverrouiller tant que la sécurité n'est pas qualifiée.
3. Terminer multi-comptes/devise personnelle et Couple, import PDF/CSV/OCR, rapprochements, design premium validé pour les 5 onglets et Safari iPhone. Reconstruire service worker **de preview uniquement par script officiel**, QA Chromium offline, sauvegarde/restauration/rollback, GO humain explicite.

**Suivi demandé :** annoncer souvent % global et % chantier. Global **57 % environ** (incertitude ±10 points) : **43 % reste**, sans avance chiffrée fictive faute de qualification PostgreSQL. **Production NO-GO.**

---

# REPRISE PRIORITAIRE — 25 OCTOBRE 2026 — QUARANTAINE DES ÉCRITURES DIFFÉRÉES

**HEAD de départ à résoudre de nouveau :** `7e9c0528d6708f149f9c05932ac1fedc4358ce84`, suivi du commit documentaire de ce lot. Seule branche modifiable : `trace-5.37.0-international-accounts-fx`; `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` intact. Tous les commits ont `[skip ci]`. Aucune production, fusion, CI/Actions, PR, accès/donnée Supabase réelle ou déploiement.

**Contexte :** la précédente reprise a créé un chemin **preview uniquement, lecture seule** pour préparer les justificatifs d'achat différé et de prélèvement après revue PDF. Les vrais `pending` différés restent **NON persistables** ; Auth/RLS/CAS/PG et validation bancaire ne sont pas terminés.

**Nouveaux commits sur la branche :**
- `c0cbdac8f4c1d467fffd1883795a2f40948656a1` : `traceRefuseUnqualifiedDeferredWrite` ajouté au client `v5-app-5.37.0.js`, sur `saveDocument` et `removeDocument`. Cartes `paymentMode:'deferred'`, achats `deferredKind`, paiements vers une carte différée connue, imports et rapprochements liés refusés avant RPC. Normal `pending→confirmed` de comptes ordinaires inchangé.
- `274fd1a82a57de5df946b2c90e2e6c04135351e6` : même contrôle relancé **dans la file CAS sérialisée** immédiatement avant RPC, empêchant une modification de compte/objet intervenue pendant l'attente d'être sauvée.
- `5a69e0e415464434fd0706a2af728dae180f2bbc` puis `7e9c0528d6708f149f9c05932ac1fedc4358ce84` : formes de transactions, allocations, règlements différés complets/partiels, `purchaseIds`, `feeIds` et champs de preuve refusés. Aucune écriture valide ne peut être autorisée en différé par ce **chemin client**.
- `a9294f634be24cdcadfc6a4d0d8b9b9b1701a59f`, `a87f15b7eab3be6cff433d84af04b87f50d6dc9b`, `932be3cdd27bb1cda114567a0c40c9e1fed06de0` : nouvelle **migration candidate non déployée `migrations/10-trace-deferred-write-quarantine.sql`**, après 09. Fonction `SECURITY DEFINER` (pour éviter les angles morts RLS), déclencheur sur **INSERT / UPDATE / DELETE** dans `public.documents` refusant les écritures différées même hors RPC, et tentative de modification/suppression des anciennes écritures différées ; couvre cartes, transactions, imports, dates d'import, rapprochements, références de comptes natifs. Tests fictifs étendus dans `tests/trace-cas-writes.integration.cjs`, y compris anciens enregistrements, suppression et relance idempotente. **MIGRATION NON EXÉCUTÉE et NON VALIDÉE SQL.**
 
**Preuves réelles ce cycle : `18/18` tests du client CAS exécutés en V8 avec RPC et Node/test simulés**, sur le code source candidate réel ; le test PostgreSQL a sa syntaxe JavaScript vérifiée par V8 et l'existence du déclencheur a été relue statiquement. **Aucun vrai PostgreSQL/PGlite 07/08/09/10**, aucune exécution `node --test` du checkout complet, aucun test RLS/concurrence navigateur, ni Safari iPhone, ni confiance bancaire. Le `101/101` V8 des suites précédentes est historique et **non rejoué** sur ce nouveau HEAD. Migration 09 garde encore les autorisations de writes directs pour compatibilité : seule la quarantaine différée est proposée par 10, pas un verrouillage CAS général.

**Avancement global estimé : 57 %, 43 % restant (incertitude ~±10 points).** On ne compte pas la validation PG comme acquise. **NO-GO production**.

**Prochain chantier prioritaire :** qualification de `tests/trace-cas-writes.integration.cjs` et migrations 07–10 sur **checkout + PGlite/PostgreSQL fictifs isolés** ; corriger les écarts SQL et exécuter deux sessions Auth/RLS/CAS. Ensuite seulement élaborer une ouverture progressive de l'écriture différée avec validation serveur de la double preuve, unicité et journal atomique, protection des frais/refunds, et retrait coordonné des grants directs. Reprendre Couple/multi-devises et UX premium, reconstruire SW de preview uniquement via générateur, QA Chromium/iPhone, backup/restore/rollback avant GO explicite.

---

# REPRISE — 25 OCTOBRE 2026 — FILTRAGE D'ACCÈS DE LA REVUE PDF DEBIT DIFFÉRÉ

Résoudre le **vrai HEAD** au démarrage. HEAD de code vérifié après ce lot : `9ac3033f428668ac6e5209d57cbbb14786c0ebcd`. Branche d'écriture unique `trace-5.37.0-international-accounts-fx`, `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` inchangé. Tous commits `[skip ci]`, zéro PR, CI, fusion, déploiement, Supabase réel.

**Avancement estimé — 57 % global, 43 % restant (incertitude ±10 points, indicative et non calculée à partir des tests).** Cet avancement n'est PAS un GO.

- `922b5b67633f83b565e0062e391b20924cf0143b` : garde `TraceDeferredStatementReviewUI.eligible(account,linkedAccounts)` permettant l'interface de préparation PDF différé uniquement pour une **carte différée** associée à un courant actif compatible propriétaire/pays/devise, ou ce compte courant avec carte différée liée. Validation à l'ouverture et à la restitution de la preuve. `TraceMonthlyStatementUI` fournit ses comptes visibles ; un compte ordinaire est exclu. Nouvelle carte FR EUR à débit différé **fictive seulement** dans `trace-international-preview-fixtures-1.0.0.js`, sans activer la création différée en production. Tests d'éligibilité et d'expiration.
- `9ac3033f428668ac6e5209d57cbbb14786c0ebcd` : correction de syntaxe async du nouveau test d'écran, `[skip ci]`.

**Preuve de ce lot : 101/101 cas ciblés V8 réussis sur 9 suites authentiques du candidat** (17 write plan + 22 intake + 12 intake et vrais modules + 9 bridge + 7 intégration staged PDF/CSV + 5 labo UI + 5 vraie preview + 18 nouveau composant PDF + 6 écran mensuel complet). Les sources sont authentiques mais `node:test`, `fs`, `vm` et DOM sont **simulés** sous V8. **Aucune suite native Node du checkout entier, PGlite/PostgreSQL 07/08/09, Auth/RLS/CAS 2 sessions, Chromium, PDF bancaire réel, ni Safari iPhone** n'a été exécutée. Le bilan historique 219/219 V8 reste historique.

Le SW de preview doit être régénéré exclusivement par `scripts/build-trace-preview-pwa.mjs` dans un checkout complet : état actuellement périmé. Le parcours PDF et la classification restent **strictement preview/local/lecture seule**, aucune permission de persister/valider les achats ou prélèvements ; n'en faire aucune publicité comme fonctionnalité de production. Prochaine priorité : runner natif et tests PG/Auth/RLS/CAS sur données fictives ; ensuite intégration prudente des vrais imports au journal `pending`, couverture FR/CA/international & Couple, flux financiers et remboursements/frais, maquettes premium, SW/offline, Safari iPhone, backup/restore/rollback avant GO exprès. **NO-GO.**

---

# REPRISE 25 OCTOBRE 2026 — ADAPTATEUR DE RELEVÉS STRUCTURÉS POUR LE DIFFÉRÉ

**HEAD à revérifier au prochain lancement :** `7fba0e68bb58f5dc33f7d591ae37e3bba7e36708` (commit de test). Branche d'écriture **exclusivement** `trace-5.37.0-international-accounts-fx`. `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` intacte ; aucun déploiement, PR, fusion, CI, Supabase réel ou modification de production.

**Nouveaux commits candidats `[skip ci]` :**
- `224f73dc08ed3aca44af437071033a8e8042693b` — ajout de `trace-deferred-statement-bridge-1.0.0.js`, pur/read-only, qui transforme les résultats de `TraceStatementEvidence.stage/reviewedRows` issus de lignes PDF/CSV **déjà structurées** en relevés de carte ou de courant utilisables par les contrôleurs existants. Toutes les lignes doivent être approuvées, classées et rattachées au snapshot intégral du document ; source physique/import, compte, devise, période, page/ligne et texte d'origine conservés. Classification achetée/débit/frais/remboursement explicite et sens cohérent. Complétude seulement **attestée localement par un humain**, pas une preuve automatique de couverture du PDF ni une authentification bancaire. `persistable:false`, `writes:0`.
- `b9e97ad965f94f0489720a6e52f15bc5fe15e1fc` — sept scénarios d'intégration croisée sur les vrais modules source : achat fictif 40 EUR, valorisation fictive 64 CAD, prélèvement 12,35 EUR, documents PDF et CSV structurés, contrôles séparés, péremption, zéro mutation.
- `176a46fc2a13884d6be4bb1e932a334c9470580b` — l'interface de **laboratoire uniquement** `trace-deferred-evidence-lab-1.0.0.js` crée désormais les deux documents en passant réellement par `TraceStatementEvidence.stage` et `TraceDeferredStatementBridge.convert`, au lieu de fabriquer directement des documents complets. Ajout du bridge aux scripts de `trace-international-preview.html`, pas à la production.
- `7fba0e68bb58f5dc33f7d591ae37e3bba7e36708` — cinq tests de parcours preview utilisant neuf vrais modules et DOM simulé.

**Preuve reproductible ce lot : 77/77 tests V8 simulant Node, fs et vm sur sept suites** (17 write-plan + 22 intake + 12 intake avec vrais modules + 9 bridge + 7 source-to-intake + 5 UI simulée + 5 preview avec neuf vrais modules). Tests localement exécutés sous V8 avec les vraies sources GitHub ; **CE NE SONT PAS des exécutions Node CLI natives**, ni PostgreSQL/PGlite, RLS/Auth/CAS, Chromium ou Safari. Un test `node --test` de 27 cas isolés du chantier précédent a été réexécuté dans le conteneur **avant** les changements UI de ce lot, il ne qualifie donc pas le nouveau HEAD. Les 219/219 V8 initiaux restent historiques.

**Important :** `trace-international-preview-sw.js` est encore potentiellement **périmé**, ne pas éditer manuellement : regénérer uniquement par `node scripts/build-trace-preview-pwa.mjs` depuis un checkout local complet, puis `--check`. Aucun vrai fichier PDF/CSV, parseur de banque, import persisté, flux `pending` ou confirmation serveur n'est livré par ce pont. Il reste à connecter l'interface des imports existants à une revue sûre, après contrôle du moteur et des permissions en PostgreSQL fictif avec deux clients ; ensuite multi-devises/Couple, frais/refunds, UX premium, PWA offline/iPhone et restauration/rollback avant GO explicite.

**NO-GO production.**

---

# ADDENDUM 25 OCTOBRE 2026 — PLAFOND DES RÈGLEMENTS PARTIELS EXCLUSIFS

Branche exclusive `trace-5.37.0-international-accounts-fx`. HEAD de code connu `1d85b2adb3bdd27b9d6f90d8fcc78a036e925046`, à revérifier. `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` intact.

En complément des associations carte/courant/`purchaseIds`, le commit `1d85b2adb3bdd27b9d6f90d8fcc78a036e925046` protège la revue locale d'un **achat unique sans frais** : chaque règlement exclusivement associé à cet achat est contrôlé au centime natif et leur somme ne peut pas excéder le montant de l'achat, y compris en plusieurs prélèvements. Toute valeur fractionnaire de centime refuse la comparaison ; paiement exactement égal au montant reste acceptable **pour comparaison seulement**. Les règlements mêlant plusieurs achats ou frais et les remboursements exigent encore une vérification complète du journal financier — ce module ne certifie PAS leur allocation. Aucune écriture `pending`, aucune confirmation, aucun changement bancaire.

**Preuves du lot :** `27/27` tests **Node natifs isolés** (22 adaptateur avec contrôleurs simulés + 5 UI avec DOM/contrôleurs simulés), syntaxe JS contrôlée ; `51/51` cas **V8 simulant Node/fs/vm** sur les vraies sources GitHub (17 write-plan, 22 adapter, 12 vraies sources en combinaison). Pas de suite complète native du repo, PostgreSQL/PGlite 07/08/09, RLS/CAS, Chromium réel, Safari iPhone, QA offline, ni Supabase réel. L'ancien total 219/219 V8 est historique et ne qualifie pas le nouveau HEAD. La preview SW est encore périmée jusqu'à reconstruction via le script officiel. **NO-GO**.

**Prochain chantier** : validation financière complète et sources réelles d'import **avec données fictives**, allocation des frais/refunds/prélèvements avec moteur différé et journal; checkout natif + SQL Auth/RLS/CAS deux clients, puis intégration UI `pending`, devises personnelles/Couple, UX premium, preview SW, Safari et rollback. Tout nouveau commit `[skip ci]`; aucune production, PR, CI, fusion, `main` ou donnée Supabase réelle.

---

# ADDENDUM 25 OCTOBRE 2026 — RÈGLE D'ASSOCIATION ACHAT / PRÉLÈVEMENT

Dernier HEAD **code** à résoudre de nouveau au démarrage : `fd1a241c7d23aa70e8fa739f098005f3b4682573`. Branche exclusive `trace-5.37.0-international-accounts-fx`; stable `main` `02c70f50e7e51da79b77a91dde96a03c6c719909` préservée.

Les commits `360ad42997a569e980d14c212d07f5f111677ff7` et `fd1a241c7d23aa70e8fa739f098005f3b4682573` consolident la jonction locale des deux justificatifs différés. Le plan `TraceDeferredWritePlan.prepare` conserve désormais `checkingAccountId` associé à la carte dès la préparation. `TraceDeferredEvidenceIntake.review` refuse toute substitution du compte courant, pièce de courant dans une autre devise, paiement non explicitement alloué à l'achat (`purchaseIds` absent/doublonné ou ne contenant pas cet achat). La modification de la répartition des achats rend l'attestation antérieure **périmée**; une nouvelle attestation locale est requise. Le règlement de plusieurs achats explicitement listés est accepté à la revue locale après renouvellement, **sans autorisation de persistance**.

**Tests de cette reprise :** `23/23` tests **Node CLI natifs isolés** sur le module adaptateur avec contrôleurs simulés (18) et l'UI de démo avec DOM/contrôleurs simulés (5). Sur le code GitHub courant, `45/45` vérifications **V8, Node/fs/vm simulés** sur trois suites (17 préparation, 18 association, 10 modules réels) ; une incohérence de snapshot a été détectée dans le test multiachats puis corrigée, pas masquée. Un parcours de clics V8 utilise les sept modules réels avec DOM simulé. **Aucun** test natif Node du dépôt complet, vrai SQL 07/08/09 PGlite/PostgreSQL, navigateur Chromium/Safari ou deux clients. Le dernier bilan historique `219/219` simulations V8 est distinct et non rejoué globalement. SW labo potentiellement périmé. Aucun GO.

**Suite prioritaire :** checkout isolé + exécution authentique du runner `scripts/check-trace-537-release-gates.cjs`, SQL/Auth/RLS/CAS sur données fictives, lien du parcours d'import PDF/CSV réel (données fictives structurées) aux deux attestations, contrôles de répartition et règlement partiel par moteur financier, devises Couple, écrans premium, régénération SW uniquement par script, Chromium offline et Safari iPhone, backup/rollback. Interdiction absolue de production/CI/main/Supabase réel/PR/fusion/déploiement. Tous nouveaux commits `[skip ci]`. **NO-GO**.

---

## Durcissement — complétude des relevés du courant (25 octobre 2026)

Le regroupement `TraceDeferredEvidenceIntake` ne marque plus deux preuves comme revues si `TraceDeferredBankReview.compare` signale un **autre document du lot bancaire invalide**, même si le prélèvement sélectionné a une attestation locale. Le champ `checkingSourcesComplete` le signale explicitement. **12/12 tests natifs Node isolés** sur l'adaptateur avec contrôleurs simulés ; 5/5 tests UI natifs isolés précédents ; 6/6 scénarios multi-modules V8 fictifs supplémentaires sur les sources réelles, ainsi qu'un clic-test V8 avec les sept modules réels (statuts initiaux, deux attestations, deux expirations). Ceci **n'est pas** un test Node intégré du dépôt, ni SQL, PG/PGlite ou Safari. Toutes les dépenses restent non persistables, NO-GO. HEAD initial de ce lot `de5782ed5299b6af4993fd93ed2f9cb06f00fe58`; aucun changement main, prod ou Supabase réel.

---

## Addendum de vérification — 25 octobre 2026

Après le circuit double preuve, `e825556372103f64d54149acd0fd5487017cc37d` ajoute `tests/trace-deferred-evidence-intake-real-modules.test.cjs` : **six scénarios sur les vraies sources** `TraceInternational`, `TraceDeferredDebit`, préparation d'achat, preuve carte, preuve courant et adaptateur. Ils sont **6/6 réussis dans un harnais V8 avec Node/fs/vm simulés** ; le fichier est présent pour sa future exécution **native Node** dans un checkout complet, mais **celle-ci n'a PAS été réalisée**. Montants 40 EUR → 64 CAD au taux fictif, deux attestations, invalidation indépendante, remboursement non accepté comme achat, impossibilité de confirmer/persister. Le SW de laboratoire est toujours périmé ; pas de PG/PGlite/Chromium/Safari ni GO. L'ancien bilan 219/219 V8 demeure historique et non rejoué sur ce nouveau HEAD.

---

# REPRISE DU 25 OCTOBRE 2026 — DEUX JUSTIFICATIFS DIFFÉRÉS EN LABORATOIRE

HEAD de départ confirmé : `dd0201f45b24a51ac61ecea9824f21fc283c2da9`. Sur la branche exclusive `trace-5.37.0-international-accounts-fx` :
- `8a71018ebb139d8905469cf1fb497cd76dd89982` : adaptateur autonome `TraceDeferredEvidenceIntake.review` réunissant les contrôles **distincts** d'achat sur relevé carte et de prélèvement sur compte courant, sans substituer une preuve à l'autre. Refus des sources physiques réutilisées, comptes/devises incompatibles et effets financiers non nuls. Toujours `persistable:false`, `confirmed:false`, `eligibleForServerConfirmation:false`.
- Lot suivant : démonstration interactive chargée **uniquement** dans `trace-international-preview.html` avec deux attestations locales séparées, chacune périmée si son propre relevé fictif change. Pas de mise à jour de `index.html` ni du service worker production.

**Preuves sur poste isolé :** 11 tests `node --test` natifs de l'adaptateur avec contrôleurs simulés, plus 5 tests `node --test` natifs de l'interface avec faux DOM/contrôleurs, soit **16/16 tests nouveaux**, et `node --check` de ces deux sources. Ce sont des tests **isolés**, pas la suite native entière du dépôt ; pas de vrais navigateurs/SQL/PGlite, pas de flux bancaire/import PDF utilisable. Le bilan historique 219/219 V8 n'a pas été rejoué ici. Le nouveau service worker de laboratoire est périmé après ajout d'assets : regénération impérative via `scripts/build-trace-preview-pwa.mjs` dans un vrai checkout avant essai PWA/offline, **jamais** par édition manuelle.

**Suite prioritaire :** parcours d'import structuré PDF/CSV avec lignes et sources réelles mais **fictives**, validation de bout en bout des modules déjà présents, écriture `pending` sous permissions CAS/RLS Auth/PostgreSQL simulées puis seulement plus tard confirmation sûre ; 07/08/09 natif PGlite, concurrence 2 clients, multi-devises/Couple, fin premium, Chromium/iPhone Safari, backup/rollback. Rien d'activé en production. **NO-GO**.

---

# ADDENDUM 25 OCT 2026 — PREUVE D'ACHAT DIFFÉRÉ VS PREUVE DU PRÉLÈVEMENT

Résoudre le HEAD de `trace-5.37.0-international-accounts-fx` au début de toute reprise, dernier HEAD de **code** connu `b0ae1129c307e59ddd62546450326ef26371b32c`. Stable `main` `02c70f50e7e51da79b77a91dde96a03c6c719909` intact. Ne pas modifier production stable, CI, données Supabase réelles, PR/fusion ou déploiement. Commits `[skip ci]`.

Depuis `7a0e6b4` : `e4dee650` normalise en toute sécurité `40,00` et `50,25` (achat devise étrangère) dans `trace-deferred-write-plan-1.0.0.js`, sous-centimes rejetés. `dc71b913` crée **`trace-deferred-purchase-evidence-1.0.0.js`**, module autonome en lecture seule de revue des lignes d'achats **carte différée** (différent de `trace-deferred-bank-review-1.0.0.js` dédié aux prélèvements du courant) : PDF/CSV **déjà structurés**, ligne source explicite, dates/compte/devise/sens/montant au centime et statuts, anti-doublons physiques/import, attestation manuelle à snapshot périmant sur changement. `b0ae1129` permet un relevé de carte mixte achats, remboursements, paiements et frais sans accepter une ligne non-achat comme preuve d'achat.

**Les modules restent autonomes et ne sont PAS câblés à l'UI ou à un flux persistable.** Même `manual_review_current` n'est qu'une vérification locale du justificatif et n'implique aucune autorisation serveur ou banque. `persistable:false`, `confirmed:false`, `createdTransactions:0`. **219/219 vérifications V8 simulées** sur neuf suites ; aucun Node CLI, vrai PostgreSQL/PGlite 07/08/09, navigateur, iPhone Safari. Environnement sans checkout ni DNS GitHub/PGlite ; runner local `scripts/check-trace-537-release-gates.cjs` non exécuté. Ne pas prétendre prêt au GO.

**Prochaines actions :** relier en labo les sources PDF/CSV carte et courant à leurs justificatifs **distincts**, introduire revue contrôlée `pending` sans écrire en production, développer l'autorisation robuste de confirmation uniquement après vrai PGlite SQL/Auth/RLS/CAS, tester concurrence et imports, fin multi-devises/Couple/debit différé et écrans premium. Regénération SW preview via script officiel en checkout isolé, browser Chromium offline, Safari iPhone, restaurations/rollback. **NO-GO**.

---

# ADDENDUM DE REPRISE — DATE BUDGÉTAIRE + DOCUMENT EN ATTENTE DIFFÉRÉ (25 OCT 2026)

Sur branche exclusive `trace-5.37.0-international-accounts-fx`, trois commits de code `[skip ci]` (HEAD de code dernier vérifié `908d46cfe40aa67b3c12c899dbc747e6a14296b4`, à re-vérifier au redémarrage). Main `02c70f50e7e51da79b77a91dde96a03c6c719909` reste intangible, pas de données Supabase réelles, PR, fusion, CI, SW prod ou déploiement.

- `445ee9642c98fcfe21b643ef78abf209ce7bd0ac` : `traceBudgetPostingMonth(t)` et `txs` utilisent le mois `budgetDate` **uniquement** pour achats différés `deferredKind:'purchase'` et remboursements différés `deferredKind:'merchant_refund'`. Transactions historiques non taguées et date bancaire `t.date` inchangées ; règlements carte toujours hors budget ; budget date manquante n'est jamais devinée.
- `7e7b2bb7b39de861bfdbba322a35f8757346249f` : revue différée de fiche carte reconnaît les achats tagués `purchase` (auparavant ils auraient été rejetés) ; marqueur inconnu verrouille la projection.
- `908d46cfe40aa67b3c12c899dbc747e6a14296b4` : nouveau module autonome `trace-deferred-write-plan-1.0.0.js` sans écriture et **non chargé dans l'interface**. Prépare une proposition candidate `pending`, `persistable:false` avec 3 dates, montant natif exact, catégorie active, propriétaire/compte lié, conversion CAD historique datée/sourcée et prix devise d'achat distinct, détection doublon sur compte/date/montant/nom natifs, répartition 100 % propriétaire et moteur `TraceDeferredDebit.simulate` sans paiement/dépense supplémentaire. Zéro écriture de base, aucun statut confirmé.

**166/166 tests V8 simulés** repassés sur sept suites. Ceci n'a PAS exécuté Node CLI, migrations PostgreSQL/PGlite 07/08/09, navigateurs ni Safari. `scripts/check-trace-537-release-gates.cjs` présent mais environnement sans checkout/PGlite. Le SW laboratoire peut être périmé après JS modifié et doit être reconstruit via script, jamais à la main.

**Prochaine étape réelle** : raccordement au flux de revue sans persister avant d'avoir validé les règles et permissions CAS en base fictive, réconciliation achat/règlement avec justificatifs, écriture `pending` puis confirmation autorisée seulement après QA, garantir budgets et répartitions Couple, dates et FX, tests natifs Node + PGlite, Chromium offline + iPhone Safari, backup/rollback. Ne pas activer le sélecteur de carte différée ou annoncer une release. **NO-GO** jusqu'à preuve et accord explicite.

---

# ADDENDUM DE REPRISE — ACHAT DIFFÉRÉ À TROIS DATES (25 OCT 2026)

**Branche exclusive :** `trace-5.37.0-international-accounts-fx`. Dernier HEAD **de code** confirmé : `d0953eda57dfc3f229f7462c64971ced8aa62992`; lire le HEAD GitHub courant à la reprise. Stable `main` `02c70f50e7e51da79b77a91dde96a03c6c719909` intangible. Ne pas modifier la production 5.36.5, les données Supabase réelles, déployer, fusionner, ouvrir PR ou lancer Actions ; tout commit candidate `[skip ci]`.

Deux commits additionnels : `898d961787667c34f5fe0e990837aebba14f3725` intègre le **simulateur d'achat différé** dans la fiche d'une carte différée personnelle avec saisie libre montant + **date achat / date budget / date prélèvement prévu** et moteur déjà présent `TraceDeferredDebit.simulate`. Le résultat est explicitement hypothétique, en devise native, sans débit bancaire ni budget CAD inventé, et sans écriture persistante. `d0953eda57dfc3f229f7462c64971ced8aa62992` corrige une régression : n'installer ces écouteurs que sur les **cartes différées du titulaire**, non sur comptes courants/cartes classiques du partenaire.

**138/138 vérifications V8 simulées** repassées sur cinq suites : 15 achats simulés, 12 échéanciers read-only, 14 détails des comptes, 84 scénarios moteur différé, 13 UX premium. **Aucun test natif Node CLI, PGlite SQL, navigateur/Safari.**

La version n'active PAS encore les comptes différés ni les écritures/achats/règlements réels. Les blocs restant importants : modèle document/catégorie/FX et import banques fiable pour achats avec 3 dates distinctes, rapprochement des prélèvements et fonds, tests postgres fictif 07/08/09 Auth/RLS/CAS deux clients, finir les parcours Couple et UI premium, SW preview régénéré via `scripts/build-trace-preview-pwa.mjs` dans checkout complet, offline Chromium et Safari iPhone, sauvegarde/restauration/rollback. `scripts/check-trace-537-release-gates.cjs` est commité mais non exécutable ici sans checkout/PGlite ; PAS de faux succès. **NO-GO** jusqu'à validation totale et autorisation explicite.

---

# ADDENDUM — INTÉGRATION READ-ONLY DU DÉBIT DIFFÉRÉ (25 OCT 2026)

Résoudre le HEAD réel de `trace-5.37.0-international-accounts-fx` à l'ouverture. Dernier HEAD **de code** connu `1f6ab1ec7dcc6bba83efca8f8d8e17374a3ff795`. Main stable `02c70f50e7e51da79b77a91dde96a03c6c719909` interdit de modification ; aucun SW prod/CI/Supabase réel/déploiement/PR/fusion. Commits `[skip ci]`.

**Avancée réelle** : branche candidat `v5-app-5.37.0.js` ajoute `traceDeferredAccountReview` dans la fiche des cartes `paymentMode:'deferred'`, utilisant le moteur `TraceDeferredDebit.simulate` déjà chargé uniquement dans la prévisualisation laboratoire. Affiche si et seulement si toutes les métadonnées sont explicites : solde natif théorique et échéances, avec règlement interne neutre budgétairement. Toutes les lignes pertinentes sont vérifiées ; un manque empêche un faux total. CSS ajouté. **12 nouveaux tests + 84 moteur existant + 14 fiches comptes + 13 UX premium = 123/123 tests sous V8 fictif**. AUCUN test Node CLI/SQL/PostgreSQL/Safari effectué.

**Ne pas surestimer** : l'activation de nouveaux comptes différés demeure explicitement désactivée ; le parcours de saisie achat/date budget/échéance et les paiements bancaires datés, rapprochements, justificatifs et écritures persistées ne sont toujours pas intégrés/qualifiés. Le moteur peut être absent d'une page : la vue affiche alors indisponible. Le SW de prévisualisation peut être périmé après modification app/CSS ; reconstruire via script générateur en checkout complet, jamais éditer à la main.

**Prochaines priorités** : vraie intégration différée sécurisée et données fictives, test native Node et SQL 07/08/09 Auth/RLS/CAS avec PGlite, couverture partage/devise Couple, QA PWA offline et Safari iPhone, backup/rollback. Toutes validations humaines avant production ; strict NO-GO.

---

# ADDENDUM — CREDIT/DÉBIT OCR TOUTES DEVISES (24 OCT 2026)

Branche d'écriture exclusive `trace-5.37.0-international-accounts-fx`. Dernier HEAD de code vérifié : `9a3fcdbc633e43eb864dbf5fa10a52520c9fbff4`; résoudre le HEAD réel lors de toute reprise. `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` à préserver. Aucun déploiement, CI, fusion, migration Supabase réel.

Le commit `9a3fcdbc633e43eb864dbf5fa10a52520c9fbff4` **corrige une incohérence financière CAD** : les captures dont l'OCR source a identifié un crédit (`bankDirection=in`) ne peuvent plus être postées comme dépenses, et un débit ne peut plus être posté comme revenu. Vérification au niveau `smartApproveDraft` et bouton UI pour CAD et comptes internationaux. L'absence de direction OCR reste inconnue. Quatre cas ajoutés et **97/97 tests V8 fictifs ciblés** réussis (dont cinq tests de forme SQL statiques). Ceci ne constitue pas une exécution de PostgreSQL, Node CLI, Safari ou vrai client.

Le runner read-only `scripts/check-trace-537-release-gates.cjs` est sur la branche mais impossible à exécuter dans l'environnement actuel (absence checkout GitHub, DNS GitHub et PGlite). NO-GO strict. Les chantiers principaux encore ouverts : intégration client du débit différé, flux multi-devises et Couple, finition des vues Accueil/Budget/Activité/Patrimoine premium, Node/PGlite SQL 07/08/09/2 clients, PWA offline, Chromium/iPhone Safari, sauvegarde/restauration/rollback et autorisation humaine explicite. Ne jamais annoncer une date précise ou un GO sans preuves. Commits `[skip ci]`.

---

# ADDENDUM — VUE COMPTES NATIVE + CAD (24 OCTOBRE 2026)

Dernier HEAD **code** vérifié au moment de cette reprise : `5d7aa719cfc976da1ddeb3140bd1c04a9c20d8c6`. Résoudre le HEAD GitHub réel à chaque nouvelle session. `main` stable = `02c70f50e7e51da79b77a91dde96a03c6c719909`, branche candidate exclusive `trace-5.37.0-international-accounts-fx`, commits `[skip ci]`.

Le nouveau commit `5d7aa719cfc976da1ddeb3140bd1c04a9c20d8c6` implémente dans l'Accueil « Tous mes comptes » les montants bancaires natifs + valeurs CAD indicatives séparées avec date/source du taux, état inconnu sans FX, et style compact mobile. Les taux manuels sont présentés honnêtement, sans confusion avec les taux Banque du Canada. Les taux en cache invalides sont redemandés via les gardes existants. Nouveau test UX 8/8 et régression bascule rapide de compte 9/9, **17/17 seulement dans V8 simulan t Node/VM**.

Le script de qualification native `scripts/check-trace-537-release-gates.cjs` est déjà commité ; mais **non exécuté réellement** : conteneur sans checkout GitHub local, DNS GitHub ni PGlite. Le SW de preview est potentiellement périmé. Les suites Node complètes, migrations PG 07/08/09, navigateur, Safari et tests multisessions manquent toujours. **NO-GO**.

Prochaine priorité: tests Node/SQL sur clone isolé avec PGlite fictif, puis régénération SW preview via script, navigateur et iPhone, poursuite flux internationaux/différé/Couple et UX premium, sauvegarde et rollback. Ne toucher ni `main` ni données Supabase réelles ni CI/déploiement sans autorisation.

---

# ADDENDUM — PROCHAINE ÉTAPE DE QUALIFICATION NATIVE TRACE 5.37.0

Dernier HEAD de **code** vérifié au départ de ce lot : `1955fbbd0418342e119f9527bbde9c44b3db0cb6`. Résoudre le HEAD réel GitHub à chaque reprise. Branche autorisée **uniquement** `trace-5.37.0-international-accounts-fx` ; stable `main` `02c70f50e7e51da79b77a91dde96a03c6c719909` intangible. Aucune modification de données Supabase réelles, déploiement, Actions, fusion, PR ou script de production.

Un véritable nouveau fichier `scripts/check-trace-537-release-gates.cjs` rassemble **les tests à lancer dans un checkout complet** : contrôle branche/snapshot Git, `node scripts/build-trace-preview-pwa.mjs --check` sans écriture, `node scripts/test-trace-native.mjs` et les trois intégrations PostgreSQL embarquées `trace-database`, `trace-personal-settings-ownership`, `trace-cas-writes`. Le runner isole l'environnement des secrets Supabase et reste NO-GO tant que tests manuels et GO explicite manquent. Dix tests V8 de ce runner ont été exécutés avec succès, **pas les vrais tests natifs**.

L'environnement de chat actuel possède Node v22 mais aucun checkout GitHub/DNS ni PGlite. C'est le blocage concret. Ne pas prétendre avoir passé une base PostgreSQL ni un navigateur. Faire fonctionner ces tests **en environnement fictif uniquement**, puis travailler les résultats avant les autres chantiers d'intégration. Un SW de preview éventuellement périmé doit être regénéré par `scripts/build-trace-preview-pwa.mjs` depuis le checkout isolé puis vérifié, jamais édité à la main. Poursuivre les fonctionnalités étrangères, débit différé, Couple, UI premium, tests iPhone, backup/rollback avant publication. Commmits `[skip ci]`, NO-GO strict.

---

# ADDENDUM DE REPRISE — DOUBLONS OCR ET AFFICHAGE DES DEVISES (24 OCTOBRE 2026)

Vérifie immédiatement le HEAD exact de `trace-5.37.0-international-accounts-fx` sur GitHub. Dernier HEAD **de code** de cette reprise : `fe29012e1e1033a92bae7014fd436089d06af0f3`; `main` stable = `02c70f50e7e51da79b77a91dde96a03c6c719909`, jamais modifiable.

Depuis `68b01a3bb1aa8a81327730502b74f7742eea889a`, trois commits :
- `465cfdcdce8605371d848b9fdee8e82c4642211d` : validité de la comparaison des doublons liée au détail de la capture et de ses semblables, attestation expirante et bouton bloqué tant qu'absence confirmation.
- `3807d3e9aa8aae8f404853f29b3723d4b3b0309b` : bouton de revue sans TraceMovement reste fail-closed ; fixtures anciennes V8 corrigées.
- `fe29012e1e1033a92bae7014fd436089d06af0f3` : cartes OCR et preuves en devise **native** EUR/USD (prévisualisation du budget CAD jamais inventée sur montant natif), comptes CAD préservés.

**93/93 vérifications sous V8 simulé** sur sources candidate (88 cas JS + 5 contrats SQL statiques) réussies après `fe29012`. Aucune exécution Node CLI, PostgreSQL, PGlite, navigateur, iPhone ou Supabase réel ; donc NO-GO. Aucun changement de `main`, assets production, workflows, CI, migration en base ni déploiement. Le conteneur ne dispose ni du checkout complet ni de PGlite ni de la résolution GitHub.

Prochaines étapes : prioriser environnement natif isolé, Node complet et SQL migrations 07/08/09 (dont restrictions placements / CAS), reconstruction SW de preview via script officiel, tests navigateur hors ligne, Safari iPhone, flux internationaux restants, différé, devise Couple et design premium. Ne recommence pas la conception validée, ne déploie pas, ne touche pas au SQL hébergé ni à la branche main. Tous commits `[skip ci]`. Lire `docs/TRACE-5.37.0-HANDOFF.md` et checklist à jour en tête.

---

# ADDENDUM PRIORITAIRE — INTÉGRITÉ FX ET PATRIMOINE (24 OCTOBRE 2026)

**Toujours résoudre le véritable HEAD GitHub avant de travailler.** Dernier HEAD de code vérifié avant cet addendum : `7adbb096b201d1840c7da5f20b06d62b8e8d465c`. Branche autorisée : `trace-5.37.0-international-accounts-fx`, jamais `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909`.

Nouveaux commits depuis le précédent handoff `32b320998b0d802a7f34f21a987e559d05806440` :
- `e8abbc556120274db5b2f1f3b30af80fd1d048dc` : un achat positif en devise étrangère valorisé 0,00 CAD après arrondi ne peut plus être confirmé.
- `f9ffc6b10e79d3453329a7402c587054be679ae5` : refus de valorisations FX infinies ou hors précision sûre.
- `7adbb096b201d1840c7da5f20b06d62b8e8d465c` : un solde natif étranger non nul ne peut être affiché comme valeur CAD zéro certaine ; retour incomplet, zéro natif réel préservé.

**78/78 vérifications ciblées V8 simulées** sur ce HEAD : 11 gardes FX, 11 tests d'intégrité monétaire, 18 CSV étrangers, 7 anciennes captures, 8 virements/cartes, 18 captures étrangères, 5 contrats **SQL statiques**. Ce n'est ni une exécution Node CLI native, ni SQL/PGlite/PostgreSQL, ni Safari/Chromium, ni test hébergé. Les migrations 07/08/09 n'ont toujours pas été exécutées et le SW de labo est périmé après changements JS. Ne pas annoncer GO.

Poursuivre sans rediscuter les décisions fonctionnelles/UX approuvées : prioriser checkout isolé + dépendances Node/PGlite, suites natives et SQL 07/08/09/RLS/CAS, reconstruction SW avec générateur puis --check, browsers/hors ligne/iPhone, finalisation étranger/différé/Couple/UX premium, sauvegarde/restauration/rollback sous autorisation. Ne pas toucher aux données Supabase réelles, ni déployer, ni main, ni CI. Commits `[skip ci]`. Voir HANDOFF et RELEASE-CHECKLIST mis à jour en tête du dépôt.

---

# ADDENDUM DE REPRISE — STATUT OCR ÉTRANGER / CAS PLACEMENTS (24 OCTOBRE 2026)

Ne pas reprendre depuis une ancienne valeur HEAD : interroger GitHub à chaque nouvelle session. Dernier HEAD de code vérifié avant cet addendum : `8b2a4e3ae931ca1afe369fdb0781b5b2049d3267`. Branche d'écriture unique : `trace-5.37.0-international-accounts-fx`. Stable `main` = `02c70f50e7e51da79b77a91dde96a03c6c719909`, à préserver impérativement.

Commits après `2ff5eab3e79c284c6b51c5e37afc48a782298f9f` :
- `a1ebbde9b7d81458f001eb51b0f132a0f31c5ba4` : les captures étrangères dont le sens bancaire OCR est un crédit (`bankDirection='in'`) sont refusées comme achat.
- `842ae604c95a9d4aaae12d2d7db4e332d1d5717c` : sécurisation proposée de `migrations/09-trace-cas-versioned-writes.sql` pour les opérations de placements, portefeuille/banque du bon propriétaire et vérification du propriétaire préexistant lors de UPDATE/DELETE ; cas PG ajoutés mais **jamais exécutés**, plus cinq tests statiques.
- `e026ee1993f82ae8f39d206df325e4e05eb3395b` : la revue asynchrone FX re-lit le compte et brouillon depuis le state courant après attente pour détecter des objets remplacés.
- `8b2a4e3ae931ca1afe369fdb0781b5b2049d3267` : fixture UI héritée corrigée ; relecture de **56/56 contrôles V8 fictifs** (51 JS fonctionnels + 5 SQL statiques).

Les résultats V8 **ne remplacent pas une exécution PGlite/PostgreSQL, Node natif, Chromium ou Safari**. Aucun test SQL n'est exécuté ici ; migration 09 reste candidat NO-GO. Aucune lecture/écriture financière Supabase réelle, aucun déploiement, CI, changement de main ou workflow. Le conteneur n'a toujours ni checkout ni DNS GitHub ni PGlite/psql ; les outils GitHub connectés fonctionnent.

Priorité : checkout isolé, Node CLI/PGlite et tests réels SQL 07/08/09 et nouveau placement CAS, restauration RLS/Auth/multisession ; reconstruire SW preview via script et --check ; finir imports/devise/différé/Couple et design premium, Chromium/Safari iPhone et backup/rollback avant toute demande GO. Ne recommencer ni la conception validée ni les correctifs acquis. HANDOFF et RELEASE-CHECKLIST en tête restent les références prioritaires. Tous commits `[skip ci]`.

---

# ADDENDUM DE REPRISE — ACHATS SUR CAPTURES ÉTRANGÈRES (24 OCTOBRE 2026)

**HEAD de code dernièrement vérifié : `59e1d451b439390e863064469342891f37ca8f91` ; résoudre le HEAD réel à chaque reprise.** La branche autorisée reste exclusivement `trace-5.37.0-international-accounts-fx` et `main` doit rester `02c70f50e7e51da79b77a91dde96a03c6c719909`. Trois commits nouveaux : `411a98349d3a8a92c461ce72caf78f8b1a7ccef6`, `aa4ce6fc6105071dfa282ab150d8a922fb29e842`, `59e1d451b439390e863064469342891f37ca8f91`.

- Un achat **ordinaire** depuis capture/OCR de compte EUR/USD/GBP/CHF peut désormais être confirmé **individuellement** par l'utilisateur après contrôle du compte, libellé, centimes natifs, nature explicite et taux CAD daté sourcé ; les autres natures étrangères restent en attente. La case de confirmation se décoche si date, montant, nom, type, sens ou devise/prix d'achat change ; les doublons et modifications concurrentes locales pendant recherche FX sont surveillés. Jamais d'invention de FX.
- Les contrôles ciblés ont été exécutés sur vrai code extrait de ce HEAD dans un **harnais V8 fictif** : 46/46 (CSV 18, statuts/capture 7, virements/cartes 8, nouvelle revue OCR étrangère 13). Aucun PostgreSQL/PGlite, Node CLI natif, Chromium, Safari, Supabase réel, CI ni déploiement. L'accès DNS GitHub au container, checkout local et PGlite restent indisponibles. Ne surtout pas transformer ces résultats en preuve de production.
- Les documents `docs/TRACE-5.37.0-HANDOFF.md` et `docs/TRACE-5.37.0-RELEASE-CHECKLIST.md` sont les vérités prioritaires ; reconstruire le service worker preview uniquement via son générateur après checkout.
- Poursuivre sans rediscuter la conception. Priorité absolue au checkout isolé, à Node / SQL 07/08/09, droits RLS, CAS et tests d'intégration ; compléter en parallèle les flux étrangers/différé et l'UX validée, puis tests PWA Chromium/Safari, sauvegarde/restore/rollback autorisés. Ne modifier ni main ni Supabase réel, ne pas lancer de CI ni déployer. Tous commits `[skip ci]`. **NO-GO inchangé.**

---

# ADDENDUM PRIORITAIRE — NOUVEAUX LOTS FX ET CARTES (24 OCTOBRE 2026)

Résous d'abord le véritable HEAD GitHub de `trace-5.37.0-international-accounts-fx` ; **dernier HEAD de code** précédant cet addendum : `bc7f5e738457d33e430e25a1599d0d766083566b`. `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` reste absolument interdite de modification.

Nouveaux commits après `0d6295d1d7b6bce1ddb6bfe4251e98589b192424` :
1. `070b8e76d64ad978937b6e23e154dd37024a4e7b` : contrôle des ressemblances bancaires refait après recherche asynchrone du taux FX sur validation CSV étrangère ; nouveaux tests de concurrence pendant l'attente.
2. `bfb38d3a03bc270e94d8e313b9a353bdd2ae0350` : `toBankCurrency` conservée sur virement depuis un compte CAD vers compte étranger ; montant reçu exact, rejet subcentime et absence de montant.
3. `0c957b0a3c10ac58252caa18ed4af5b159d7511a` : carte liée ou source courante unique si héritage, pays et devise identiques pour paiement de carte, pas de dette attribuée au mauvais compte.
4. `bc7f5e738457d33e430e25a1599d0d766083566b` : tests de paiement carte avec véritable module `TraceMovement`.

`tests/trace-international-foreign-csv-confirm.test.cjs` 18/18, `tests/trace-international-capture-confirm-guards.test.cjs` 7/7, `tests/trace-smart-cross-currency-transfer-guards.test.cjs` 8/8 : **33/33 scénarios réellement réexécutés sous V8 avec modules Node et cloud simulés** sur ce HEAD. **Aucun nouveau test Node CLI, PostgreSQL/PGlite, Chromium/Safari ou hébergé.** Aucun SQL/migration réel, aucune lecture/écriture financière Supabase, aucun déploiement, aucune modification de `main` ou des fichiers d'entrée production.

Le prochain chantier obligatoire reste : checkout fictif et dépendances → tests Node + migrations 07/08/09 réels → correction → reconstruction du SW laboratoire via script → navigateur/QA authentique → flux étrangers restants, différé, devise Couple, sauvegarde/restauration/rollback sous autorisation. **NO-GO** jusqu'aux preuves et autorisation explicite. Le HANDOFF et la RELEASE-CHECKLIST en tête du dépôt détaillent les limites.

---

# ADDENDUM DE REPRISE LE PLUS RÉCENT — CAPTURES BANCAIRES / STATUTS (24 OCTOBRE 2026)

**À lire avant le reste.** Toujours résoudre le HEAD réel de `trace-5.37.0-international-accounts-fx`, sans se fier aux anciennes valeurs. Dernier HEAD **de code** contrôlé avant cet addendum : `6bca9ab80caf1c7dfb1255db4f6285587c0dda5c`. `main` 5.36.5 doit rester à `02c70f50e7e51da79b77a91dde96a03c6c719909`.

- `650462a6c2e35199a1d230ed412ac1e54648e8a2` : validation rapide CSV étrangère strictement `pending` et protection contre les mutations locales pendant l'attente d'une cotation FX ; tests ajoutés.
- `74e823f7deee512dc7021e7f3f824fdf7b328331` : import étranger `pending` non confirmable par les validations de lot ; test de non-contournement.
- `104e2c6854f0873a2f6416b8c848bcbd209d22c9` : HANDOFF et checklist précédente à jour.
- `274414664eb480f73666b9a409437cee67dce54a` : capture/OCR de compte étranger reste en attente, aucune écriture `confirmed` par le parcours CAD ; seules les lignes `pending` sont admises par les validations de lot.
- `6bca9ab80caf1c7dfb1255db4f6285587c0dda5c` : bouton de confirmation étranger désactivé, texte explicatif ; poursuite normale des parcours CAD.
- Suites réellement rejouées sur le dernier code sous **V8 avec modules Node simulés et données fictives : 23/23** (16 CSV, 7 capture/lots/UI). Aucun nouveau test Node natif, Chromium, Safari, PGlite, PostgREST/Supabase hébergé ni CI ; **NO-GO**.
- Les fichiers `docs/TRACE-5.37.0-HANDOFF.md` et `docs/TRACE-5.37.0-RELEASE-CHECKLIST.md` précisent limites et suite. Le checkout GitHub reste inaccessible depuis le conteneur (Node v22 disponible, pas de DNS GitHub/PGlite/serveur PostgreSQL). Toujours tenter un checkout fictif autorisé pour les tests 07/08/09 et natifs ; sinon continuer le développement code/test sans invoquer de CI. `trace-international-preview-sw.js` doit être reconstruit par son script et non modifié manuellement.
- Ni `main`, ni fichiers d'entrée production 5.36.5, ni `.github/`, ni Supabase financier réel, ni pages Vercel/GitHub Pages ne doivent être modifiés. Pas de lancement de migrations réelles, aucun GO tant qu'Auth/RLS/CAS/Safari/rollback n'est pas qualifié.

---

# ADDENDUM PRIORITAIRE AU PROMPT — NOUVEAUX COMMITS DU 24 OCTOBRE 2026

Lis cet addendum avant le prompt intégral ci-dessous. **Le HEAD indiqué dans le prompt d'origine n'est plus le dernier.** Résous le véritable HEAD sur `trace-5.37.0-international-accounts-fx` au début de la mission et compare-le avec `main` (stable connu `02c70f50e7e51da79b77a91dde96a03c6c719909`).

Nouveaux travaux enregistrés après `fa99ffd33a6f287b37232ace10fdb756d3785927` :
- `v5-app-5.37.0.js` : initialisation des catégories de départ rendue idempotente. Avant création, lecture des IDs existants et de leurs révisions ; création seulement de ceux manquants ; en cas de conflit concurrent, vérification de l'ID au serveur ; état restauré avec révisions à jour. Bouton explicite « Ajouter les catégories de départ manquantes » même si certaines catégories/budgets existent. Aucune remise à zéro ni remplacement d'une catégorie personnalisée/archivée.
- `migrations/09-trace-cas-versioned-writes.sql` : validation d'une liste de neuf collections reconnues par le client et interdiction de supprimer physiquement les comptes bancaires, comptes d'investissement, imports, rapprochements ou journées. Les quatre collections autorisées pour la suppression sont catégories, budgets, transactions, opérations de placement. Un membre ne peut ni créer une collection arbitraire via la RPC, ni contourner l'archivage par cette RPC. Migration **jamais déployée et toujours non qualifiée en SQL**.
- `v5-app-5.37.0.js` : validation CSV étrangère rapide restreinte aux achats natifs *sans contre-valeur CAD préalable* et avec montant original/devises cohérents, pour ne pas inventer des jambes étrangères ou réécrire une preuve FX.
- Suites : `tests/trace-cas-category-bootstrap.test.cjs` **8/8 tests exécutés dans V8 avec fausse base** ; `tests/trace-international-foreign-csv-confirm.test.cjs` **12/12 dans V8, moteur financier réel extrait et faux DOM/transport** ; `tests/trace-cas-writes.integration.cjs` désormais **12 scénarios SQL écrits mais NON exécutés**. Ce ne sont pas des tests Node natifs, navigateur, PostgreSQL ou Supabase hébergé.
- Commits : `b6ec63e44fb8ef161568c3a874ab25cb170e7f59`, `ce18d6970e3c2b8369fb84f01c73005b92685841`, `2195998dedb23a6ab4cb5590c8379e2278b5fb22`, `7e62e828688bc3aa75435363f7819f2bdc3b3a74`, `e31a52bc0210edbf78eeb6536707ac60d72b5124`, `f6100912b92bc79bb6dd56a168779ab9cad28a29`, `e32f274d44d25ed450b06439ab6604ede14ef629`, `2ecfb56643391ce4c4a7001d3f07166b3960b209`, suivis des mises à jour du HANDOFF et de RELEASE-CHECKLIST.

Le blocage d'environnement a été diagnostiqué : container avec Node v22 disponible mais GitHub/DNS inaccessibles et pas de checkout, module PGlite ni PostgreSQL serveur. L'accès au dépôt fonctionne via le connecteur GitHub. **Ne revendique pas d'exécution des suites PostgreSQL**, ne touche pas aux données Supabase réelles et ne lance aucun déploiement/CI. La prochaine étape prioritaire est d'obtenir un checkout et des dépendances en environnement fictif autorisé, exécuter les suites SQL 07/08/09 et Node natives, corriger leurs erreurs, régénérer le SW laboratoire via son constructeur, puis poursuivre les parcours bancaires internationaux. Si toujours impossible, continuer un autre chantier code/test indépendant et tenir les preuves à jour.

**Toutes les interdictions et validations produit du prompt original restent en vigueur.** Aucune décision GO n'est justifiée.

---

# PROMPT DE REPRISE — TRACE 5.37.0 INTERNATIONAL (après travail du 24 octobre 2026)

Tu reprends la **même mission autonome de développement** de TRACE, PWA budgétaire personnelle et couple. Le projet a été conçu, développé et audité sur plusieurs jours. **Ne repars pas de zéro ; ne propose pas une nouvelle conception.** L'utilisateur souhaite achever une version premium, internationale, stable, testée et candidate à la production, uniquement lorsque les preuves de sécurité sont suffisantes. Tu es autorisé à enchaîner les lots cohérents sans demander « OK go » à chaque étape.

## Dépôt et périmètre impératif

- Repository : `louisantoine78/Budget-duo`.
- **SEULE** branche modifiable : `trace-5.37.0-international-accounts-fx`.
- Avant la reprise, **résous les HEAD réels** de GitHub. Dernier HEAD de code + HANDOFF précédant le présent fichier : `2799f5a39cdcdad43ac9b22476e04f3178991a8a`.
- `main` stable 5.36.5, SHA `02c70f50e7e51da79b77a91dde96a03c6c719909`, doit rester strictement inchangée.
- Références prioritaires : `docs/TRACE-5.37.0-HANDOFF.md` (lire en tête ; sections les plus récentes d'abord), `docs/TRACE-5.37.0-UX-VALIDATED-GAP-AUDIT.md`, `docs/TRACE-5.37.0-INTERNATIONAL-AUDIT.md`, `docs/TRACE-5.37.0-RELEASE-CHECKLIST.md`, `docs/TRACE-5.37.0-WORK-VALIDATION.md` et `docs/qa/TRACE-5.37.0-QUALIFICATION.json`.
- Inspecter le code/tests **avant modification** et préserver tous les comportements 5.36.5.

## Interdictions sans exception

1. Aucun changement/fusion/PR vers `main`, aucun déploiement GitHub Pages, Vercel Preview ou production sans autorisation explicite.
2. Ne lire, écrire, supprimer ni analyser **aucune donnée financière réelle Supabase**. N'utiliser que des bases et transactions fictives et isolées ; ne pas déployer les migrations sur Supabase réel.
3. Ne pas activer/modifier les GitHub Actions ni les rapports automatisés PickPoint ; ne pas déclencher de CI payante ou non autorisée.
4. Chaque commit uniquement sur la branche autorisée avec **`[skip ci]`**.
5. Aucune réinitialisation financière, suppression automatique de doublon, migration historique destructive, recalcul rétroactif d'un budget ou taux FX inventé (jamais 1 par défaut).
6. Aucun service payant ou ressource externe créé sans validation. La sauvegarde réelle, la restauration isolée, la migration et le rollback doivent être autorisés et prouvés avant publication.

## Expérience et règles déjà validées

- Design TRACE : vert profond, tons clairs chaleureux, cartes et ombres discrètes, montants lisibles, animations modérées, iPhone Safari prioritaire.
- Exactement 5 onglets : **Accueil — Budget — + — Activité — Patrimoine** (« Patrimoine » sur une ligne).
- Accueil, ordre impératif : Solde estimé / Disponible budget / Ce mois-ci / À faire / Budget en direct / Évolution / Partage raccourci. Solde premium : consultation d'autres comptes distincte de la sélection officielle du principal, confirmation du changement, dettes de cartes liées et conversions uniquement sourcées.
- Comptes : CAD/EUR/USD/GBP/CHF extensibles, devise native, pays, type immédiat/crédit/différé, comptes moi/couple, compte principal, archivage et historiques.
- Budget : trois familles revenu/fixes/variables, prévu-réel-progressions/dépassements, « Mon année en clair », 12 mois.
- Activité : historique journalier, filtres, imports, statuts pending/confirmed, Partage/Proches, avances et remboursements.
- Patrimoine : Épargne puis Placements puis Patrimoine net consolidé, devises natives.
- Comptabilité : débit immédiat = débit compte et budget ; crédit = dette carte + budget, puis paiement carte hors budget ; différé = achat/date budgétaire/date débit/règlements partiels sans double dépense ; transferts épargne et intercomptes hors budget, montants reçus/débités/frais conservés, répartition Moi/Couple/Proches sans recomptage ; historiques et taux datés/source figés.

## Ce qui avait été qualifié avant la dernière reprise

Selon le HANDOFF : présentation premium de base, 5 onglets, comptes avec consultation/principal, budget, épargne internationale, CSV en attente avec revue de doublons, PDF.js 6.4.299 véritable et extraction FR/CA locale, laboratoire PWA fictif hors ligne, sauvegardes/restaurations PostgreSQL fictives, migration candidate 07 RLS comptes/placements et taux Banque du Canada historiques. Anciennes preuves : 54 suites Node / 911 scénarios, 32 Chromium, 17 SQL fictifs et 8 HTTP Valet, **sur des commits antérieurs aux travaux décrits ensuite**. Pas de Safari réel ni Supabase hébergé qualifié.

## Développements réalisés lors de la reprise du 24 octobre (code GitHub enregistré)

### Lot A — sécurité serveur candidate

- `migrations/08-trace-personal-settings-owner-guard.sql` : trigger RLS auxiliaire/propriétaire des clés personnelles `households.settings` (soldes/dates/modes d'ouverture par compte, principal et diminutifs par membre).
- `migrations/09-trace-cas-versioned-writes.sql` : colonnes `documents.revision` et `households.settings_revision`, triggers incrémentaux, RPC CAS de création/mise à jour/suppression et réglages avec refus `TRACE_WRITE_CONFLICT`, authentification, propriété des comptes et `search_path` restreint.
- `tests/trace-personal-settings-ownership.integration.cjs`, `tests/trace-cas-writes.integration.cjs` : tests PGlite fictifs écrits **mais NON EXÉCUTÉS** dans le runtime de cette reprise, dépourvu de PGlite/checkout.
- **Important** : migration 09 ne révoque pas encore les écritures directes pour conserver la compatibilité des clients 5.36.5. Les RPC ne sont pas une sécurité complète jusqu'au cutover validé. Migrations jamais appliquées à une base hébergée.

### Lot B — client CAS et conflit

- `v5-app-5.37.0.js` : lecture des révisions avec refus des métadonnées absentes, remplacement des écritures directes centrales par RPC versionnées, file de sauvegardes par ressource, blocage des écritures après conflit, avertissement visible avec rechargement confirmé.
- `trace-international-1.0.0.css` : UI de conflit premium adaptée aux petits écrans.
- `tests/trace-cas-client.test.cjs` : huit scénarios client. **8/8 ont réussi lors d'une exécution du code de test sous V8 avec modules Node et transport cloud fictifs**, pas en Node CLI, PostgreSQL, Safari ou Supabase hébergé.
- Une correction ultérieure reconstruit les réglages au moment d'une écriture sérialisée pour éviter d'écraser les modifications récentes du même appareil.

### Lot C — dépense CSV étrangère

- Une validation volontairement **limitée aux dépenses simples importées en CSV sur un compte non-CAD**, depuis la fiche « À vérifier », existe dans `v5-app-5.37.0.js`.
- Montant natif/date/compte figés, choix catégorie et Moi/Partenaire/Couple, confirmation expresse de la nature, quote CAD Banque du Canada datée ou saisie manuelle datée/sourcée, vérification des lignes ressemblantes, CAS avant passage `confirmed`. L'achat fictif 40 EUR à 1,60 produit 64 CAD sans modifier les 40 EUR.
- `TraceImportGuide.safeForQuickApproval` bloque les libellés ambigus, virements Interac et paiements de carte. Les autres natures et Proches restent en attente ; **NE PAS déclarer les imports internationaux terminés**.
- `tests/trace-international-foreign-csv-confirm.test.cjs` : **9/9 scénarios réussis sous V8 avec modules Node et DOM/transport simulés** ; aucun nouveau test Chromium, Safari ou PostgreSQL.

### Preuves, limites et SHA

Consulter impérativement le début du HANDOFF mis à jour, qui contient tous les SHA des lots. Dernier HEAD avant ce prompt : `2799f5a39cdcdad43ac9b22476e04f3178991a8a`; résoudre le SHA du commit du présent prompt et tout HEAD ultérieur.

Les nouveaux scripts JS sont syntaxiquement compilés sous V8. La comparaison GitHub a confirmé, pour les 12 commits précédents, **aucun changement dans** `index.html`, `sw.js`, `manifest.webmanifest`, `trace-version.json`, `v5-app-5.36.5.js`, `.github/` ou `main`.

**Blocage additionnel de cache :** le fichier généré `trace-international-preview-sw.js` est **périmé** après modification des assets JS/CSS. Il faut exécuter sur un checkout local complet : `node scripts/build-trace-preview-pwa.mjs`, puis `node scripts/build-trace-preview-pwa.mjs --check`. Ne pas modifier le SW à la main ; ne pas présenter les anciens 32 scénarios Chromium comme des tests du nouveau code.

## Suite obligatoire — sans nouvel « OK go »

1. Exécuter dans un checkout isolé Node natif + `@electric-sql/pglite@0.4.5` tous les tests anciens et nouveaux. Tester et corriger SQL 08/09 **réellement**, notamment fonctions `SECURITY DEFINER`, RLS, droits des deux membres, concurrence, triggers et suppression. Pas de lecture du vrai projet Supabase.
2. Régénérer le cache laboratoire, vérifier les licences/intégrités PDF.js, exécuter les tests de navigateur isolé (Chromium si disponible), puis test offline après reconstruction des actifs. Rendre compte des tests réellement exécutés, pas simplement présents.
3. Valider les RPC dans un environnement Supabase *fictif séparé*, seulement si explicitement autorisé, avec Auth/PostgREST/RLS/Realtime à deux clients ; planifier et prouver un cutover retirant les écritures directes sans bloquer la stable.
4. Finaliser, par lots testables, les validations étrangères restantes (revenus, remboursements commerçants/proches, virements/cartes, allocations), les flux de captures/OCR/PDF quotidien et le contrôle mensuel PDF.
5. Brancher le moteur différé sur le journal réel, avec dates et paiements partiels, sans double comptage. Devise personnelle et Couple indépendantes/prospectives avec historique figé.
6. Faire la recette réelle Safari iPhone et l'expérience PWA installée, conservation des données, hors ligne/retour réseau, conflits, migrations et régressions 5.36.5.
7. Sauvegarde réelle fraîche **sous autorisation**, restauration isolée, plan de gel/rollback compatible avec de nouvelles écritures FX. Checklist GO/NO-GO avec preuves puis autorisation explicite avant fusion/publication.

Les changements doivent s'enchaîner sans solliciter un accord après chaque lot déjà validé. Commencer par vérifier GitHub et les documents, inspecter le code, lancer les tests possibles et avancer sur des corrections effectives ; si l'environnement ne permet pas une dépendance, passer à un chantier indépendant. À chaque bilan significatif : fichiers, commits exacts, tests **effectivement** lancés et niveaux de preuve, bugs corrigés, limites, NO-GO/GO. Surveiller la longueur de la conversation et préparer un nouveau prompt complet si nécessaire.
