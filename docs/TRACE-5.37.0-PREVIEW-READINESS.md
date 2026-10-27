# TRACE 5.37.0 — visibilité rapide sans compromettre les finances

État établi le 26 octobre 2026. **Seule branche autorisée** : `trace-5.37.0-international-accounts-fx`. `main`/5.36.5 restent stables. Le service `trace-v5-preview` dispose déjà d'une ancienne démonstration Vercel READY au SHA `2c312f0021d2df92d3fb98e906c169cc76f82698`, **pas** au SHA 5.37.0 actuel ; sa protection SSO est active. Ne jamais confondre la dernière démonstration publiée avec le HEAD GitHub.

## Trois niveaux de livraison distincts

### A. Démonstration de l'interface sur données fictives — objectif de visibilité prioritaire

Il ne s'agit **pas** d'une mise en production et ce niveau ne requiert **pas** l'activation des écritures du débit différé. Conditions de préparation et vérifications à faire **avant toute nouvelle prévisualisation** :

- [x] La page `trace-international-preview.html` inclut une CSP `connect-src 'none'`, des fixtures de démonstration et `noindex`.
- [x] `vercel.json` désactive le déploiement Git **automatique** de la branche candidate.
- [x] Un laboratoire différé existe ; les réglages de calendrier sont prévisualisés sans `save` et le bouton « Choisir les jours » conduit maintenant aux champs effectifs.
- [x] Le runner Node candidat refuse les fichiers de test sans scénarios exécutés, avec erreur explicite ou sortie contradictoire (7/7 tests du **seul nouveau module de contrôle exécutés sous Node 22 réel**, octets Git vérifiés ; ne pas extrapoler).
- [ ] Obtenir un checkout complet et propre du dernier SHA ; lancer `node scripts/test-trace-native.mjs` sur **les suites du dépôt entier** et corriger les échecs.
- [ ] Sur ce checkout, régénérer **exclusivement** `trace-international-preview-sw.js` par `node scripts/build-trace-preview-pwa.mjs`, puis `--check`. Ne jamais éditer `sw.js`.
- [ ] Vérifier réellement la page avec Chromium (petits écrans, formulaires, console, navigation, mode fictif et hors ligne) et Safari iPhone.
- [ ] Inspecter l'accès SSO Vercel ; décider de manière **explicite** quand et à qui partager la démonstration.
- [ ] Lorsqu'une nouvelle prévisualisation sera autorisée séparément, vérifier son **SHA de déploiement** et son mode fictif avant de partager son URL. Ne pas déployer par une simple écriture Git.

### B. Candidate complète avec comptes fictifs et données persistées

- [ ] Qualification sous PostgreSQL/PGlite isolé des migrations 05–12, Auth/RLS et CAS avec deux utilisateurs, conflits et accès croisés.
- [ ] Persistance versionnée des jours du différé, des justificatifs séparés carte/courant, et des mouvements réels sans doublon de dépense ; quarantaine **maintenue** jusqu'aux preuves.
- [ ] Devise personnelle, devise Couple indépendante, trois modèles bancaires FR/CA, imports CSV/PDF/OCR, budget, activité, partage et patrimoine intégrés.
- [ ] Test de bout en bout avec authentification et données **100 % fictives**, y compris rechargement, hors ligne, sauvegarde et restauration.

### C. Utilisation sur données financières réelles / production

**NO-GO.** Nécessite en plus validation financière explicite, revue de sécurité, qualité et accessibilité iPhone Safari, protocole de sauvegarde/restauration/rollback, décision d'autorisation de déploiement distincte et absence de régression 5.36.5. Aucun message « go » de développement n'autorise une migration Supabase réelle, une fusion, une PR ou un déploiement production.

## Repères du 26 octobre

- Baseline de la reprise : `6945fb18431b551db0062b6bcdbc889f5ae8b756`.
- Raccourci vers les champs du différé : `a77f15765cc2c2345db76a3d43192700fd1c71a5`, tests `cc6b0762dd8de52a431108124ad05b754099062b` (11 contrôles ciblés V8 simulés).
- Qualité du runner : `6bf0267c9b7a9b1e8bc7a0b94641220d25fdd1c1`, tests `86a6ffb299219ea07507edd58a645eb5f8a917ff`, branchement natif `8b298a03fbb5354f6b9049daf715d18d00b164a9`.
- **Validation native réelle limitée mais vérifiée :** les empreintes Git des deux fichiers CJS du garde-fou correspondent exactement aux blobs de ce commit, et `node --test` (v22) a passé **7/7 tests**. Aucune suite native de l'application entière ni migration PostgreSQL exécutée par cette opération.

La progression générale était précédemment estimée à environ **58 % ±10 points**. Ce chiffre n'augmente pas parce que la démonstration fictive devient plus facile d'accès : les portes de qualification et les fonctionnalités non intégrées sont toujours distinctes.


## Qualification réexécutée sur le HEAD de ce lot

Sur le code candidat au SHA `832bbbb8186cd99fac41637cdb322444b595625b`, les contrôles ciblés V8 ont été relancés : **364 / 364 réussis, zéro échec, 17 suites**. Répartition : 98 preuves bancaires/relevés, 150 comptabilité/calendriers/contrat SQL statique, 83 comptes/budget/paramètres, 19 Mastercard CA + amis et 14 laboratoire fictif. Les 6 contrôles SQL du groupe comptabilité vérifient du texte source seulement, pas PostgreSQL. Lors de la reprise d'un harnais d'intégration, des dépendances de test factices (`console`, `assert.throws`) manquaient : les tests concernés ont ensuite été relancés avec les dépendances adéquates et réussis. Ce comptage ne comprend pas les exécutions interrompues.

**Exécution réellement native et séparée : 7/7 sous Node 22**, exclusivement pour `tests/trace-native-suite-evidence.test.cjs` et sa dépendance `scripts/trace-native-suite-evidence.cjs`. Les copies locales ont été validées par `git hash-object` contre les SHA des **deux blobs exacts** du dépôt (`f1c1922d449639d6cf0d4e78c5c36d29270b16da` et `6677e7b2195632505871cf5aa787b07feae4c13d`). Pas d'exécution native de la suite entière, ni de serveur SQL, ni de Safari.

Verdict inchangé : **la démo fictive est un objectif distinct et plus proche que la production**, mais un nouveau déploiement ne doit pas être présenté comme terminé ; sa vérification de cache et son autorisation restent à obtenir. Pour les vraies finances, production **NO-GO**.


## 26 octobre 2026 — renforcer le vrai parcours de démo fictive

**Code candidat examiné :** \`9693735854f59461718c455c3c110fa02d26b5e7\`. Cette section complète, sans remplacer, le plan des trois niveaux de livraison ci-dessus.

### Avancements enregistrés

- **Carte française à débit différé fictive** : possède maintenant un calendrier versionné depuis le \`2026-09-01\` (clôture au 20, prélèvement prévu au 5). Elle sert uniquement à **simuler** une future modification et l'échéance d'un achat. Aucune transaction bancaire réelle.
- **Données fictives cohérentes** : le prélèvement initial de la carte fictive est **0 EUR explicite**, avec date et mode de référence, plutôt qu'un solde de carte absent. Le virement fictif CAD → EUR possède désormais une **jambe de réception \`toBankCurrency:'EUR'\` et \`toBankAmount:95\`**, en plus du débit source de 150 CAD. Aucune conversion/taux déduits du néant.
- **Démarrage de la préversion** : 7/7 scénarios de bootstrap de l'**application candidate réelle** (mais DOM/Node simulés dans V8) passent avec ces données : session fictive isolée et sans Supabase, Accueil CAD, changement de principal → EUR (solde ~1 208,80 EUR), Couple, taux tests, ajout compte fictif, absence de redirection.
- **Tests de fixture** : 6/6 vérifications ciblées dans V8, calendrier effectif, historique non rétroactif, ouverture de carte explicitement 0 EUR et jambe CAD/EUR. Le test boot inclut en plus les nouvelles assertions.
- **Runner Node natif** : distingue une suite \`node:test\` d'un **script historique** lancé via \`node --test\`. Ce dernier peut produire une enveloppe TAP avec \`# tests 1\` même lorsqu'**aucun** scénario métier n'a réellement tourné ; désormais seuls les marqueurs \`PASS\` explicites qualifient un script historique. L'analyse de code source distingue les véritables appels \`require('node:test')\`/\`import from 'node:test'\`.
- **Preuve Node réelle** : les fichiers CJS \`scripts/trace-native-suite-evidence.cjs\` et \`tests/trace-native-suite-evidence.test.cjs\` ont été reconstitués octet pour octet dans un répertoire de QA isolé, \`git hash-object\` égal aux blobs GitHub respectifs \`4e01b47ebda981912c33f91a9e9314fc09004cdf\` et \`7485266824371cd47b2f246a17e5b3b877182249\`. **\`node --test --test-reporter=tap\` sous Node v22.16.0 : 11 tests / 11 réussis, 0 échec.** Deux scripts jetables (sans aucun \`PASS\` puis avec deux \`PASS\`) ont confirmé via vrai sous-processus Node qu'un script vide échoue malgré exit 0, mais deux scénarios \`PASS\` sont comptés. Les fichiers jetables sont **hors dépôt**, sans données réelles.

### Commits associés (tous \`[skip ci]\`)

- \`5854dd24\` / \`9f057c59\` : calendrier versionné sur carte fictive et ses contrôles.
- \`202c4c10\` / \`1adca0d2\` / \`4f3aa1dc\` : classification du runner, tests et raccordement à la QA native.
- \`80d021b4\` / \`8d5613a0\` / \`96937358\` : correction de la jambe reçue EUR, solde de carte et test de bootstrap.

### Important : cet avancement ne déploie rien

Le \`trace-international-preview-sw.js\` courant du dépôt est **potentiellement obsolète depuis les changements de fixture et d'UI**. Il doit être régénéré **uniquement** par \`node scripts/build-trace-preview-pwa.mjs\` sur checkout propre, puis passé en \`--check\`; **ne pas publier** une preview qui ne passe pas cette porte. Le déploiement Vercel READY découvert précédemment correspond à \`2c312f00\`, et non au HEAD de cette reprise ; SSO activé, déploiement automatique de la branche candidat désactivé.

**À faire en priorité :** checkout entier → Node natif complet et SW labo généré/contrôlé → véritable navigateur Chromium + Safari iPhone → autorisation explicite **d'une nouvelle prévisualisation fictive isolée**, distincte des écritures financières. Aucun test PostgreSQL 05–12/RLS/CAS ni certification navigateur n'a été effectué ici. **PRODUCTION NO-GO**.


## 26 octobre 2026 — Activité quatre rubriques, validation multi-mois et protection des montants

**Code vérifié :** `e4220adf294a425b05f75132761ce4db097e1b35`. Toujours sur la branche `trace-5.37.0-international-accounts-fx`, sans merge ni publication.

**Fonctionnellement visible dans `trace-international-preview.html` :** l'onglet Activité contient désormais exactement les **quatre sous-rubriques approuvées** `Historique | À valider | Partage | Imports`, avec quatre boutons de taille tactile adaptée en CSS, attributs d'accessibilité `role=tablist/tab` et `aria-selected`, et quatre vues distinctes.

- **Historique** : journal quotidien, filtres mois/compte/catégorie/nature/devise/statut inchangés ; liens depuis compte et catégorie conservés.
- **À valider** : **vraie vue indépendante des imports**, affiche toutes les opérations non confirmées des **comptes bancaires actifs du membre connecté**, y compris celles des mois passés ; clic ouvre l'éditeur de vérification existant, sans création de mouvement au simple affichage. Les montants présentés sont **uniquement les montants natifs de la jambe bancaire source** via `TraceInternational.amountOnAccount`; en l'absence de preuve, message `Montant bancaire à vérifier` et jamais de contre-valeur CAD requalifiée en EUR. Le raccourci Accueil et les liens historiques vers `review` ouvrent cette vue.
- **Partage** : modules Couple puis Proches et avances/remboursements conservés ; aucun sixième onglet principal, aucun second grand livre.
- **Imports** : calendrier quotidien, CSV non interprétés et contrôle PDF, laboratoires fictifs inchangés ; la liste des transactions déjà enregistrées et en attente a été déplacée vers « À valider » pour éviter de la mélanger avec les sources importées.

Les données **100 % fictives** de la préversion ajoutent `demo-previous-eur-pending` (8,75 EUR non confirmés, datés du mois précédent) à `demo-eur-pending` du mois courant. Aucune de ces opérations ne change le budget confirmé, les soldes ou les preuves bancaires ; la jambe CAD→EUR du transfert fictif reste explicitement datée et valorisée séparément.

**Protection financière supplémentaire :** `traceRefuseUnqualifiedDeferredWrite` côté client refuse désormais les champs réservés `deferredDebitDay`, `deferredClosingDay`, `deferredScheduleVersions` même pour une carte falsifiée `paymentMode:'credit'`, ainsi que les alias transactionnels `scheduledDueDate` et `allocationDueDate`. Harmonisation avec la migration SQL candidate 10, **sans exécuter ni appliquer cette migration**.

### Vérifications réellement effectuées

- **291/291 scénarios ciblés V8 simulés, 13 suites**, zéro échec, au HEAD `e4220adf` : 186 contrôles Activité/Partage/Mastercard/calendriers/moteur différé et 105 de quarantaine/lecture de carte/preuve bancaire/rendu premium.
- **7/7 scénarios bootstrap avec le vrai code 5.37 en DOM synthétique**, sans Supabase ni navigateur réel. **7/7** contrôles des fixtures de démonstration. Ils sont distincts des 291.
- `v5-app-5.37.0.js` validé syntaxiquement via V8. Les tests V8 emploient des doublures `fs/path/vm/node:test`. Le lot **n'a pas exécuté la suite entière avec Node natif, ni une vraie instance PostgreSQL, ni Safari**.

### Prochain seuil pour montrer une démo réellement à jour

**Toujours non franchi** : récupérer un checkout complet, exécuter `node scripts/test-trace-native.mjs`, reconstruire **uniquement** `trace-international-preview-sw.js` avec `node scripts/build-trace-preview-pwa.mjs`, vérifier `--check`, essayer dans Chromium et sur Safari iPhone, puis demander une autorisation distincte pour un **déploiement de prévisualisation isolé**. La dernière preview READY sur Vercel demeure celle du **SHA historique `2c312f00`**, pas ces 14 nouveaux commits ; elle est protégée par SSO. Ne pas lui attribuer cette nouvelle interface avant une publication vérifiée.

La production demeure **NO-GO**, `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909`, aucun changement Supabase ni données réelles. Avancement global toujours indicatif autour de **58 % ±10 points** faute de qualification serveur/PWA globale.

## 26 octobre 2026 — Activité plus fluide et porte cache confirmée (reprise depuis `bb326c9c`)

**Lots enregistrés uniquement sur la branche candidate, tous en `[skip ci]` :**

- `c9a6b835` : « À valider » affiche au maximum 40 opérations au premier rendu ; chaque clic sur « Voir plus » révèle 40 lignes supplémentaires. La liste source continue de couvrir toutes les dates et uniquement les comptes actifs accessibles ; aucun solde, statut ou montant natif n'est modifié.
- `5ad71fa1` : commande « Voir plus » compatible petits écrans, cible tactile ≥44 px, focus visible et animations respectueuses des préférences.
- `d64a2b0e` : vérification de la pagination de 97 opérations fictives (40, 80 et totalité), y compris historique antérieur et absence d'écriture à la consultation.
- `3f62b2db` : navigation clavier entre les quatre sous-onglets (flèches, Début/Fin), tabindex cohérent et retour du focus sur la première nouvelle ligne après « Voir plus ».
- `7cbc58a0` : associations HTML explicites entre chaque onglet et son panneau (`aria-controls` / `aria-labelledby`).
- `eb878a36` : nouveaux tests d'accessibilité et de navigation des onglets.

**Qualification réellement effectuée :** 14/14 scénarios ciblés en V8 avec `fs/path/node:test` simulés et avec les sources finales de l'app, du HTML et du CSS lues sur GitHub ; analyse syntaxique du JS 5.37 sous V8. Ce ne sont **pas** 14 tests Node natifs sur checkout intégral, ni des tests navigateur/Safari/PG. Les scénarios antérieurs de la session précédente ne sont pas à additionner comme une campagne globale requalifiée.

**Blocage concret de l'aperçu hors ligne :** lecture statique du service worker de laboratoire sur GitHub (`trace-international-preview-sw.js` : 62 ressources cachées) et des références `script/link` du HTML. Six scripts chargés par la page ne figurent pas dans son inventaire actuel : `trace-deferred-write-plan-1.0.0.js`, `trace-deferred-purchase-evidence-1.0.0.js`, `trace-deferred-evidence-intake-1.0.0.js`, `trace-deferred-evidence-lab-1.0.0.js`, `trace-deferred-statement-bridge-1.0.0.js`, `trace-deferred-statement-review-ui-1.0.0.js`. C'est une **preuve de cache périmé**, pas une exécution du générateur ou de son `--check`.

**À faire avant de montrer une nouvelle prévisualisation hors ligne :** checkout complet du HEAD, `node scripts/test-trace-native.mjs`, génération `node scripts/build-trace-preview-pwa.mjs` **uniquement via son générateur**, puis `--check`, Chromium sur petits écrans, Safari physique et contrôle strict des données fictives/SSO. Le conteneur de cette reprise ne résout pas `github.com` en Git ; le connecteur GitHub a permis les commits, pas un checkout intégral. Aucun SW modifié, aucune prévisualisation publiée, aucune connexion Supabase réelle, quarantaine maintenue et **production NO-GO**. L'ancienne preview Vercel `2c312f00` reste obsolète.

## 26 octobre — Reprise suivante : filtre de validation par compte et bootstrap rétabli

**Base reprise sans réécriture de conception :** `e4e14910e59846a7afc0a2a3fba7bca9e23933e8`. Tous les changements de cette reprise sont dans `trace-5.37.0-international-accounts-fx`, avec `[skip ci]`.

### Livraison réellement enregistrée

- La rubrique **Activité → À valider** dispose désormais d'un sélecteur de compte indépendant des filtres de l'historique. Il présente les **comptes actifs appartenant au membre courant**, la devise native et le nombre d'opérations à examiner pour chacun, y compris zéro. Le mode « Tous mes comptes » continue d'afficher les mouvements de toutes les périodes.
- La sélection ne persiste pas en banque : elle ne filtre que l'interface. Si le compte n'est plus accessible, a été archivé ou appartenait à l'autre membre, le filtre revient sur « Tous mes comptes ». Modifier le filtre réinitialise la pagination à 40 sans changer le journal. Les montants EUR ne sont jamais déduits d'une valorisation CAD.
- Formulaire premium à cible tactile de 44 px, libellé explicite, contraste et focus visibles. L'état vide spécifique évite de laisser penser que l'intégralité du foyer n'a aucune opération.
- **Défaut de bootstrap détecté et corrigé :** le branchement des quatre boutons d'Activité utilisait par erreur `$('#activityTabs .tab').forEach` au lieu du sélecteur multiple `$$('#activityTabs .tab').forEach`. Ce défaut bloquait l'initialisation de la page de laboratoire. Correction définitive au commit `403dde415889b8f5945617294df65c87feb6df52` et test de régression `35c1947575bb81b7afa1b1bf394352e798530ec2`. Une première tentative de correction n'avait pas modifié effectivement le sélecteur ; le démarrage a été relancé et la correction finale vérifiée.

### Contrôles réellement exécutés sur les dernières sources GitHub

- **23/23 scénarios ciblés V8 simulés** : 9 Activité + pagination, 6 navigation/clavier dont régression du sélecteur, 8 filtre par compte et isolation par propriétaire. Zéro échec.
- **7/7 scénarios de bootstrap avec les vrais modules JavaScript de la candidate chargés ensemble dans un DOM synthétique V8**, sans réseau, ni Supabase. Après diagnostic de l'erreur du sélecteur, les 7 contrôles repassent : entrée fictive, carte canadienne, principal EUR, Couple, taux fictifs, création de compte local et absence de redirection.
- Analyse syntaxique V8 de `v5-app-5.37.0.js` : réussite.

**Interprétation impérative :** ni ces 23 assertions ni les 7 scénarios bootstrap ne sont des tests Node natifs du checkout intégral, ni des tests PostgreSQL, Chromium réel ou Safari. Les modules `fs/path/node:test` du harnais ciblé sont des doublures V8 ; le bootstrap est un DOM synthétique.

### Portes maintenues ouvertes

1. **Checkout local complet** encore indisponible : l'environnement conteneur ne résout pas `github.com`; la modification de code par le connecteur GitHub ne fournit pas un clone local utilisable.
2. **Service worker du laboratoire non régénéré :** l'ancien manifeste de 62 ressources ne référence pas les six modules différés introduits depuis ; relancer seulement `node scripts/build-trace-preview-pwa.mjs` puis `--check` sur un checkout complet, jamais modifier le SW manuellement.
3. Runner Node natif du dépôt entier, rendu réel Chromium, Safari iPhone, PGlite/PostgreSQL migrations 05–12, Auth/RLS/CAS, restauration et protocole de publication restent **non qualifiés** dans cette reprise.
4. L'ancienne prévisualisation Vercel au SHA `2c312f00` reste distincte de cette version GitHub. Aucune demande ni opération de déploiement ici.

**Sécurité :** `main` / 5.36.5 et données bancaires réelles non modifiées. Quarantaine `TRACE_DEFERRED_NOT_RELEASED` maintenue. Production **NO-GO** ; avancement général maintenu indicativement à **58 % ±10 points**, en attente des qualifications natives et serveur.

## 26 octobre — Reprise complémentaire : clavier et vérité du statut hors connexion

**Base de reprise vérifiée :** `ffbe25a0d64c7858791905c4b03eb54b94b2213b` ; cette référence de départ n'est pas le HEAD final. Branche candidate seule ; `main` préservée.

### Défaut d'accessibilité confirmé et corrigé

Le gestionnaire `activityTabKey(event,button)` utilisait encore `$('#activityTabs .tab')` pour déterminer l'onglet suivant puis appelait `.indexOf` sur **un seul élément DOM**. L'ancien test injectait incorrectement une liste même pour `$` ; il masquait donc l'erreur réelle. Correction à `$$('#activityTabs .tab')` au commit `9eb0e244db06ed677976d64a96491a52890cd103`. Le test `tests/trace-activity-keyboard.test.cjs` distingue désormais la requête unique de la requête multiple et exerce flèches, Home, End et focus.

### Plus de faux « Disponible hors connexion »

Dans `trace-preview-pwa-1.0.0.js`, le badge hors connexion ne devient `ready=true` que si un **même cache privé de laboratoire** contient, après le chargement complet de la page, tous les fichiers statiques référencés par ses `script[src]` et `link[href]`, son HTML et **PDF.js + pdf.worker.mjs chargés dynamiquement**. Cette vérification se fait avec `CacheStorage` en **lecture seule**, sans téléchargement, accès Supabase ou documents bancaires. Aucun cache de production ne peut satisfaire la vérification. Les ressources manquantes sont signalées et le statut reste non prêt.

**Limite volontaire :** c'est une preuve de **présence de fichiers nommés**, **pas** une preuve cryptographique que chaque octet du cache correspond au HEAD ni un véritable parcours Safari hors ligne. La version de cache sera garantie par le générateur au moment du checkout, puis par tests navigateur. Ne jamais utiliser ce voyant comme autorisation de publication.

**Vérification de l'état GitHub le 26 octobre :** l'ancien SW du laboratoire présente toujours 62 ressources et manque exactement six modules différés appelés par le HTML :
- `trace-deferred-write-plan-1.0.0.js`
- `trace-deferred-purchase-evidence-1.0.0.js`
- `trace-deferred-evidence-intake-1.0.0.js`
- `trace-deferred-evidence-lab-1.0.0.js`
- `trace-deferred-statement-bridge-1.0.0.js`
- `trace-deferred-statement-review-ui-1.0.0.js`

La nouvelle garde **ne remplace pas** la régénération : **exécuter exclusivement** `node scripts/build-trace-preview-pwa.mjs`, puis `node scripts/build-trace-preview-pwa.mjs --check` depuis le checkout intégral et vérifier l'installation/offline dans un vrai navigateur.

### Qualification sur les sources GitHub après corrections

- **24/24 scénarios ciblés V8 simulés**, source réelle du HEAD candidat : 9 Activité, **7** navigation clavier, 8 filtres par compte ; syntaxe V8 du moteur validée.
- **6/6 scénarios ciblés CacheStorage V8 simulés**, isolant présence/absence des fichiers statiques, des modules différés, PDF.js, cache de production et attente de l'événement `load`. Le `vm` et les primitives Node sont simulés pour ce contrôle.
- **7/7 scénarios de bootstrap de l'application en DOM synthétique V8** avec sources réelles, sans Supabase ou accès bancaire.

**Non testés dans cette reprise :** Node natif sur dépôt complet, Chromium réel, Safari physique, PGlite/PostgreSQL et migrations, PWA installée réellement. Aucun déploiement, aucun changement `main`, aucune migration réelle, quarantaine `TRACE_DEFERRED_NOT_RELEASED` maintenue. **Production toujours NO-GO**.


## 26 octobre, reprise du soir — contrôle des deux jambes des virements en attente

**Départ vérifié :** `dd36208e0eef873918e667a378924094685b0d83`. Le HEAD évolue ; toujours reconsulter GitHub. `main` est restée au stable `02c70f50e7e51da79b77a91dde96a03c6c719909`.

**Défaut corrigé :** « Activité → À valider » ne référençait que `t.accountId`. Un virement en attente était donc absent du compte destinataire `t.toAccountId` (notamment CAD → EUR et les virements reçus du partenaire). `renderActivity` et le compteur du bouton « À valider » prennent maintenant en compte chacune des jambes **uniquement pour les `type==='transfer'`**, et seulement si ce compte appartient à `visibleBankAccounts(me)`. L'opération est **comptée une seule fois** dans « Tous mes comptes » ; chaque compte actif impliqué augmente individuellement son propre compteur de 1.

**Preuve et UX :** le filtre du compte destinataire, ou une opération reçue dont la source n'est pas visible au membre courant, emploie `TraceInternational.amountOnAccount(t,account,'destination')`, et jamais le montant CAD source ou `amountCAD`. Le filtre du compte source emploie la jambe `'source'`. Les lignes précisent « Virement émis » / « Virement reçu ». La date et la pagination intermensuelle sont préservées. En cas de preuve destination absente, incohérente ou fractionnaire au-delà du centime, affichage « Montant bancaire à vérifier ». Aucune création/mutation du journal et aucune deuxième dépense.

**Tests vérifiés en V8 isolé avec le code candidat réel :** `35/35` scénarios de navigation/activité/comptes en attente (9 quatre onglets, 7 clavier, **19** filtre et transfert). Les nouveaux tests couvrent source et destinataire CAD/EUR, reçu depuis un compte partenaire sans révéler sa devise bancaire, comptes non accessibles/archivés, statut confirmé, unicité globale, compteurs et précision **du moteur International réel** (46,20 EUR et refus de 72,30 EUR déduit d'un montant CAD). Syntaxe JavaScript candidat interprétable : OK. Les `7/7` scénarios de bootstrap fictif ont aussi été relancés avec succès.

**Limites explicites :** ce sont des harnais V8 synthétiques ; pas de test Node natif sur clone, PGlite/PostgreSQL/Auth/RLS/CAS, navigateur Chromium réel ni Safari iPhone. Le conteneur avec Node 22 n'a toujours pas accès DNS à `github.com`, empêchant le checkout complet. Le SW hors ligne **n'a pas été régénéré** et continue à manquer six scripts différés. Ne le modifier que via `node scripts/build-trace-preview-pwa.mjs` + `--check` sur checkout complet. Aucun déploiement, aucune migration, aucune CI ; quarantaine `TRACE_DEFERRED_NOT_RELEASED` ; **production NO-GO**.

## 26 octobre 2026 — Garde-fou service worker contrôlant la page

**Départ de session confirmé :** `c1e5d4daf2f21f59e7fe9440e0804671018e091e`. Toutes modifications exclusivement sur `trace-5.37.0-international-accounts-fx`, chaque commit avec `[skip ci]`.

### Amélioration enregistrée

- Le contrôleur `trace-preview-pwa-1.0.0.js` n'affiche plus `ready=true` simplement parce qu'une inscription PWA existe et que des noms de fichiers apparaissent en cache. Le navigateur doit être **effectivement contrôlé** par le service worker du laboratoire (`navigator.serviceWorker.controller.scriptURL` égale à l'URL exacte du SW fictif).
- Lors du premier chargement sans contrôleur, la PWA reste **non prête** et se recontrôle lors de `controllerchange`, sans prétendre que le mode hors connexion est utilisable.
- Le contrôle des ressources refuse la présence de **plusieurs générations** de cache `trace-lab-537` ou leur absence, même si un ancien cache contient tous les noms de fichiers. Les caches de production ne sont jamais consultés.
- Une mise à jour en attente (`registration.waiting`) révoque immédiatement le statut prêt, y compris lorsqu'elle survient **après** une première vérification réussie. Le message existant propose la réactivation manuelle du seul laboratoire fictif.
- Aucun accès Supabase, aucun chargement réseau, aucun effacement de cache, aucune modification du SW généré ou du SW de production n'est introduit par ces vérifications.

### Qualité attestée dans cette session

- **11/11 tests ciblés de l'indicateur hors connexion en environnement V8 simulé**, complétant les 6 cas précédents : prise de contrôle tardive, mauvais SW, deux générations de cache, mise à jour en attente et arrivant après une précédente réussite.
- **35/35 scénarios ciblés d'Activité en V8 simulé** sur l'application candidate courante, syntaxe JS interprétable ; ce lot ne modifie pas les règles financières.
- Ce ne sont PAS des tests Node CLI natifs, ni des tests Safari/Chromium réels. Ils ne prouvent ni la correspondance cryptographique des octets du cache avec le HEAD ni son fonctionnement sur iPhone.

### Blocages inchangés

Le SW de laboratoire enregistré manque encore six modules différés et **n'a pas été régénéré**. Un vrai checkout est nécessaire pour `node scripts/build-trace-preview-pwa.mjs` puis `--check`, suivi de la suite native et d'essais de navigation/offline Chromium et Safari. Le conteneur ne résout toujours pas github.com pour Git ; le connecteur GitHub a servi seulement à lire et enregistrer le code. Aucun Vercel, CI, Supabase, PR, main ou donnée réelle modifié. `TRACE_DEFERRED_NOT_RELEASED` demeure. **Production NO-GO.**
