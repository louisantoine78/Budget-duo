## Portes additionnelles — captures étrangères et lots (24 octobre 2026)

**NO-GO maintenu.** Les deux commits `274414664eb480f73666b9a409437cee67dce54a` et `6bca9ab80caf1c7dfb1255db4f6285587c0dda5c` ne touchent que le laboratoire candidat et ses tests, jamais `main`, Supabase réel ou le déploiement.

- [x] Captures/OCR sur compte étranger : confirmation directe refusée et brouillon `pending` conservé ; bouton désactivé dans l'interface avec explication explicite.
- [x] Validations groupées restreintes à `pending`, aucune réactivation d'une ligne ignorée/traitée.
- [x] 7/7 tests captures/lots + 16/16 tests CSV exécutés dans un harnais V8 avec faux modules Node et transports, soit **23/23 simulés**. Ne pas leur attribuer le niveau de preuve Node natif/SQL/navigateur.
- [ ] Implémenter et qualifier un vrai parcours individuel OCR étranger (le rejet sûr actuel n'est pas une fonctionnalité terminée).
- [ ] Exécuter suites Node natives et SQL migrations 07/08/09 en PGlite/PostgreSQL fictifs, tester rôles, CAS et concurrence.
- [ ] Reconstruire le service worker via le générateur et requalifier Chromium et hors ligne, puis Safari iPhone et PWA installée.
- [ ] Préparer sauvegarde réelle fraîche autorisée, restauration isolée, rollback FX et décision GO explicite.

---

## Contrôles supplémentaires — revue étrangère et validations groupées (24 octobre 2026)

**NO-GO inchangé.** Les commits `650462a6c2e35199a1d230ed412ac1e54648e8a2` et `74e823f7deee512dc7021e7f3f824fdf7b328331` renforcent l'approbation CSV étrangère et bloquent la validation groupée des imports étrangers `pending` (CSV/OCR/PDF/captures). Changements strictement sur la branche de candidate avec `[skip ci]`, sans modification de `main`, CI ou déploiement.

- [x] Statut `pending` strict pour l'éditeur de dépense étrangère CSV ; révision de l'état de transaction et de compte après une attente de taux FX.
- [x] Garde commune de validation par lot : import étranger non-CAD `pending` jamais confirmé en masse ; revue individuelle obligatoire.
- [x] 16/16 scénarios réels du fichier de test exécutés **sous V8 simulant les modules Node**, sans PostgreSQL, navigateur ou données réelles ; syntaxe des actifs modifiés vérifiée sous V8.
- [ ] Rejouer ce test en Node CLI et toutes les suites historiques sur le checkout candidat final.
- [ ] Qualifier 07/08/09 en PostgreSQL fictif, deux sessions, rôles, droits, RLS et concurrence ; protéger les écritures directes uniquement après un cutover explicitement approuvé.
- [ ] Régénérer `trace-international-preview-sw.js` via le générateur, vérifier hors ligne et navigateur ; Safari iPhone natif restant à faire.
- [ ] Finaliser les autres flux internationaux de validation (les rejets sûrs actuels ne constituent PAS une fonctionnalité achevée).
- [ ] Sauvegarde/restauration/rollback sous autorisation et GO explicite avant tout déploiement.

---

## Contrôles ajoutés après la reprise catégorie/CAS/CSV (24 octobre 2026)

**NO-GO conservé.** Aucun nouveau test PostgreSQL, Chromium ou Safari natif n'a été exécuté.

- [x] Code de reprise additive des catégories, cache révision par ID, conservation des catégories personnalisées/archivées et des budgets présents ; **8/8 tests isolés V8 avec RPC fictif**.
- [x] RPC CAS candidate restreinte aux neuf collections connues, suppression physique refusée pour comptes et patrimoine ; **tests SQL ajoutés mais NON exécutés**.
- [x] Contrôle CSV étranger plus strict (montant initial natif et devises cohérentes, CAD encore absent, pas de FX déjà valorisée) ; **12/12 tests V8 avec moteur financier TRACE et faux DOM**, pas de test Node CLI.
- [ ] Exécuter les nouvelles suites avec **vrai Node** et les migrations 07/08/09 en PostgreSQL local fictif ; corriger les échecs.
- [ ] Vérifier les privilèges, RLS, contraintes et verrouillages CAS à deux sessions PostgreSQL/PostgREST isolées ; interdire les direct writes après une transition 5.36.5 autorisée.
- [ ] Régénérer et tester le SW laboratoire (actuellement périmé après changements JS/CSS), puis Chromium hors ligne/retour réseau et Safari iPhone authentique.
- [ ] Tests complets de catégories, budgets, comptes, transactions, imports et débits différés. Garder NO-GO jusqu'aux preuves et à la migration/rollback autorisés.

Détails et commits dans `docs/TRACE-5.37.0-HANDOFF.md`. Ne pas confondre « code présent », « test V8 avec faux transport », « intégration SQL » et « prêt pour production ».

---

## Contrôle de sortie après raccordement client CAS — 24 octobre 2026

**Statut actuel : NO-GO.** Le client 5.37.0 a maintenant le mécanisme de révisions et une UI de conflit ; l'ancienne ligne « raccorder le client » ci-dessous doit être interprétée comme **code présent mais non qualifié en PostgreSQL/Cloud**. Les RPC SQL 09 conservent temporairement les droits d'écriture directe par compatibilité, ce qui rend toujours le contournement possible.

- [x] App cliente 5.37.0 : lecture des révisions, RPC sur création/édition/suppression/settings, séquence locale, blocage des sauvegardes après conflit, alerte de récupération sur iPhone.
- [x] Contrats du vrai code extrait et tests de contrat exécutés sous V8 avec RPC fictives : 6/6 et 8/8 ; syntaxe JS vérifiée (distinct d'une exécution Node réelle).
- [ ] **Rejouer `node tests/trace-cas-client.test.cjs`** et les suites 5.36.5/5.37.0 sur un checkout local réel. Aucun nouveau résultat Node CLI n'a été obtenu.
- [ ] **Exécuter les deux tests d'intégration PostgreSQL des migrations 08/09** (et les 17 contrôles historiques) ; identifier et corriger les erreurs éventuelles.
- [ ] **Régénérer `trace-international-preview-sw.js`** à l'aide du générateur local puis relancer `--check` : le cache référencé sur GitHub est périmé après modification du JS et CSS. Aucun test hors ligne nouveau n'a été réalisé.
- [ ] Qualifier PostgREST/RLS/Auth/Realtime fictifs multi-session, coupures réseau, écriture persistante, rollback de conflits et privilèges `GRANT`/`REVOKE` avant de considérer `STALE-WRITE` clos.
- [ ] Finaliser la validation d'import étranger et les natures banque/carte/virement/remboursement ; raccorder le différé et la devise Couple indépendante.
- [ ] Refaire une recette sur **vrai Safari iPhone**, puis préparer sauvegarde réelle autorisée, migration et rollback financier avant toute publication.

Le HANDOFF en tête du dépôt contient les SHA du lot et les commandes. Aucun SQL n'a été déployé. `main` et GitHub Actions sont inchangés.

---

## Portes ajoutées après la reprise des migrations 08 et 09

**NO-GO maintenu.** Les fichiers SQL ont été créés sur la branche, jamais appliqués à un Supabase réel. Les anciens résultats d'essais du 24 octobre restent historiques et ne qualifient pas les nouvelles migrations.

- [x] Migrations candidates 08/09 et harnais fictifs d'intégration enregistrés avec `[skip ci]`, sans changer `main`.
- [x] 26 vérifications statiques V8 sur les signatures, contrôles de propriété, interdiction des mises à jour obsolètes et compilation JS des deux tests. **Pas un test PostgreSQL exécuté.**
- [ ] Lancer `tests/trace-personal-settings-ownership.integration.cjs` et `tests/trace-cas-writes.integration.cjs` sur PGlite 0.4.5 dans un checkout isolé, corriger toute erreur SQL et mettre à jour les preuves.
- [ ] Vérifier le schéma et les politiques réelles uniquement dans un clone Supabase fictif autorisé : JWT `auth.uid()`, RLS, `SECURITY DEFINER`, droits `EXECUTE`, rôle anon, propriétaires et changements simultanés.
- [ ] Raccorder `v5-app-5.37.0.js` aux RPC de version pour chaque création/édition/suppression, y compris les brouillons imports, les réglages, les comptes, les placements et les écritures hors ligne. En cas de version périmée : refuser l'écrasement et proposer le rechargement/la conciliation.
- [ ] Après qualification de la transition et compatibilité des anciens clients, retirer les écritures directes de tables afin que les RPC ne puissent plus être contournées. **09 est non contraignante tant que les anciens grants persistent.**
- [ ] Réexécuter ensuite toutes les anciennes suites, les deux nouvelles suites d'intégration, les scénarios à deux sessions et la recette Safari iPhone.
- [ ] Auditer la couverture complète des préférences personnelles dans `households.settings` (08 ne couvre que cinq familles de champs).
- [ ] Ne jamais appliquer ces migrations à des données financières réelles sans export frais, restauration isolée, autorisation explicite et scénario de rollback compatible FX.

### Justificatifs

Commits précis et commandes de tests dans `docs/TRACE-5.37.0-HANDOFF.md`. Après les commits SQL/doc uniquement, les chiffres précédemment publiés pour Node/Chromium/PostgreSQL ne doivent pas être attribués aux changements 08/09. Aucun nouveau résultat Safari n'est revendiqué.

---

# TRACE 5.37.0 — checklist de décision de sortie

**Verdict actuel : NO-GO.** Mission du 24 octobre 2026. Code qualifié localement : `94c613cd4e1c547a38671083c1da773967bded70` ; consolidation documentaire ultérieure. Les empreintes de source permettent de contrôler que les essais correspondent au code présent. Une réussite Node ou Chromium ne vaut pas feu vert production.

## Périmètre vérifié

- [x] HEAD initial candidate `6eb6c17e5c9eba2d3727ebea404cce5fec0424c6` ; `main` stable `02c70f50e7e51da79b77a91dde96a03c6c719909` revérifiée sur GitHub.
- [x] Branche autorisée uniquement, tous les commits `[skip ci]`, aucune fusion, PR ou publication.
- [x] Entrées production 5.36.5, application stable et workflows inchangés ; déploiement Git automatique de la candidate désactivé.
- [x] Tests financiers fictifs ; aucune lecture/écriture financière Supabase réelle.
- [x] 46 fichiers syntaxiques et 54 suites Node natives : 911 scénarios rapportés, zéro fichier en échec.
- [x] 32 scénarios Chromium réel, cinq onglets et largeurs 320/390/430, formulaires natifs/FX, comptes, patrimoine, CSV et worker PDF local.
- [x] PDF.js réel 6.4.299, licence, SHA-512 du paquet et SHA-256 des actifs ; extraction locale FR/CA et repli manuel sans enregistrement automatique.
- [x] Rechargement complet du **laboratoire fictif** hors ligne et extraction PDF sans réseau ; cache statique propre à son périmètre.
- [x] 17 contrôles PostgreSQL fictifs : persistance disque, isolation inter-foyers, sauvegardes/restaurations, migration 07 et anomalies explicites.
- [x] 8 contrôles HTTPS publics Valet pour quatre devises sur dates historiques, y compris le week-end. Aucun identifiant financier transmis.

## Portes de sortie restant ouvertes

| Domaine | Code présent | Unitaire | Intégration | Navigateur | Prêt production |
|---|---|---|---|---|---|
| Accueil/comptes/principal et archivage | Oui | Réussi | Partiel | Chromium réussi | Non : droits serveur/race/Safari |
| Budget prévu/réel/trois familles/douze mois | Oui | Réussi | Partiel | Chromium réussi | Non : référence personnelle/Couple incomplète |
| Immédiat/crédit/paiement/FX/frais | Oui | Réussi | SQL fictif réussi | Scénarios ciblés réussis | Non : parcours cloud/concurrence incomplets |
| Épargne internationale/valorisation | Oui | Réussi | SQL fictif réussi | Scénarios EUR et inconnus réussis | Non : couverture autres devises/UI/cloud à étendre |
| PDF mensuel | Oui, actifs réels | Réussi | Extraction réelle réussie | Chromium et hors ligne réussis | Non : Safari et corpus bancaire représentatif |
| CSV CAD | Oui | Réussi | En mémoire | Téléversement réel réussi | Non : unicité inter-clients/transport cloud |
| CSV étranger | Import pending oui | Réussi | Partiel | Native EUR sans effet financier vérifiée | **Non : validation finale bloquée** |
| Captures/OCR/PDF quotidien | Partiel | Partiel | Incomplet | Non qualifié | Non |
| Débit différé/règlements multiples | Moteur isolé | Réussi | **Pas intégré au journal** | Démo isolée seulement | Non, création désactivée |
| RLS propriétaires | Migration 07 candidate | N/A | Réussi sur PostgreSQL fictif | UI seule | Non appliquée ; réglages personnels ouverts |
| Verrou optimiste / conflits | Absent côté serveur | Reproduction de l'échec | Perte de modification démontrée | Non qualifié | Non |
| Auth/sync à deux utilisateurs | Héritée | Partiel | Pas de Supabase hébergé | Pas de deux sessions réelles | Non |
| PWA Safari iPhone | Candidate labo | Contrôles statiques | Chromium fictif seulement | **Aucun Safari natif** | Non |
| Sauvegarde/migration/retour arrière | Outil et procédure | Réussi | Deux restaurations fictives réussies | N/A | Non : sauvegarde réelle et rollback compatible à qualifier |

- [ ] Fermer `RLS-PERSONAL-SETTINGS` et `STALE-WRITE` avec contrôles atomiques côté serveur et reprise des conflits.
- [ ] Qualifier la migration 07 sur un environnement Supabase fictif autorisé, avec Auth, rôles et Realtime réels ; précontrôle des propriétaires sans attribution automatique.
- [ ] Finaliser l'éditeur/validateur des opérations étrangères en attente et les modèles virement/carte/remboursement associés.
- [ ] Raccorder le débit différé et les règlements partiels au vrai journal, puis tester persistance et import.
- [ ] Finaliser les devises de référence personnelles/Couple avec effet prospectif et historique figé.
- [ ] Qualifier captures, OCR, PDF quotidien et ambiguïtés inter-imports avec corpus fictif FR/CA.
- [ ] Exécuter la recette sur un vrai iPhone Safari et sur la PWA installée, y compris fermetures/retour réseau/écritures en attente.
- [ ] Préparer le SW de production : ressources 5.37 complètes, cache nommé, migration des anciens clients et absence de nettoyage global d'autres caches.
- [ ] Obtenir une sauvegarde réelle fraîche sous autorisation, vérifier l'inventaire indépendant et restaurer en environnement isolé.
- [ ] Éprouver le gel des écritures et un rollback conservant les écritures FX postérieures à la sauvegarde ; ne pas revenir aveuglément en 5.36.5.
- [ ] Rejouer les contrôles sur le commit final choisi, examiner les risques puis obtenir l'autorisation explicite de fusion/publication.

Le contrôle `node scripts/trace-release-preflight.mjs` est local et en lecture seule. **Code de sortie 2 = NO-GO attendu**, zéro déploiement. Les rapports détaillés, commandes, anomalies et procédure Safari sont dans [WORK-VALIDATION](TRACE-5.37.0-WORK-VALIDATION.md). Ne pas présenter une ancienne URL Vercel comme la version de cette mission.
