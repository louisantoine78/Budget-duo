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
