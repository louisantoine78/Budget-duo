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
