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
