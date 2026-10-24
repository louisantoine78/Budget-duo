# TRACE 5.37.0 International — contrôle de mise en production

> État constaté le 23 octobre 2026. Document de **go/no-go** indépendant des taux de complétion déclaratifs. **NO-GO production** tant que les obstacles bloquants restent ouverts. Le code de la candidate et la démonstration fictive ne prouvent pas encore l'intégration sécurisée avec des données financières réelles.

## Périmètres strictement distincts

- **Production réelle :** `main`, TRACE 5.36.5, commit de référence `02c70f50e7e51da79b77a91dde96a03c6c719909`. Ne pas modifier sans validation du passage en production.
- **Développement candidat :** `trace-5.37.0-international-accounts-fx`, code actuel + tests + documentation uniquement. Aucun merge ni PR automatique.
- **Préproduction fictive :** projet Vercel indépendant `trace-v5-preview` (ID `prj_NvXLdQg1KAmDlcYzdjNhFpYls0Bj`), page `trace-international-preview.html`, CSP `connect-src 'none'`, fixtures et taux déclarés fictifs. La page n'est pas une simulation de la persistance Supabase ou du travail à deux sur vrais comptes.

## Fonctions déjà développées mais à qualifier en intégration

| Domaine | Confirmé dans le code candidat | Avant feu vert production |
|---|---|---|
| Comptes CA/FR et devises CAD/EUR/USD/GBP/CHF | Moteur international, montants natifs, date des taux | Scénarios réels simulés de bout en bout, création, édition, suppressions et rapprochement |
| Compte principal et vue Moi/Couple | Calculs internationaux et affichage laboratoire | Valider les changements de devise/compte, les filtres et l'historique sans conversion rétroactive |
| Budgets et patrimoine | Vues héritées 5.36.5 avec adaptations candidates | Valider les 12 mois, la répartition, les graphiques, les comptes multi-devises |
| Imports CSV, PDF, OCR | Modules isolés, brouillons et comparateurs | Tester les fichiers représentatifs, les doublons inter-imports, erreurs de banque/devise et prévention d'écritures automatiques |
| Paiement carte et transferts | Transferts internes historiques et résolution internationale | Garantir transfert sans revenu/dépense additionnels et rapprochement côté compte/carte |
| Débit différé, remboursements et frais | Simulateur isolé, règlement partiel et rapprochement fictif | **Bloquant :** comptabilisation dans le vrai grand livre, règlements multiples réels/fictifs persistés et intégration import ; création de carte toujours désactivée |
| Édition des dépenses EUR/USD | Libellé + catégorie sécurisés sur dépenses confirmées (candidate) | Test du parcours UI et des permissions multi-utilisateurs ; édition de montants, revenus et retours commerçants encore bloquée |
| Navigation 5 onglets | Maquette de préversion et bootstrap synthétique | Revue Safari iPhone, raccourcis, ergonomie et navigation depuis comptes/catégories |
| Données personnelles + couple | Moteur et historique conservés dans code | Tester persistance et règles d'accès sur **base fictive isolée**, jamais sur données réelles de l'utilisateur |

## Portes de validation obligatoires — toutes ouvertes pour l'instant

- [ ] **QA native complète** : récupérer un véritable checkout, `node --check`, lancer toutes les suites 5.37.0 ainsi que les régressions 5.36.5 sur l'exact commit à publier. Les tests V8 à dépendances simulées ne constituent pas cette validation.
- [ ] **Parcours authentiques sur navigateur** : iPhone Safari/PWA, ajout/édition/import, hors-ligne/retour réseau, boutons et cinq onglets. Un statut Vercel `READY` n'est pas un test navigateur.
- [ ] **Intégration des opérations financières** : dépense, paiement carte, frais, remboursement commerçant, avance de proches, débit direct/crédit/différé, taux daté, virement CAD↔EUR, sans double comptage.
- [ ] **Imports et rapprochement mensuel** : CSV FR/CA, PDF mensuel utilisé pour vérification, brouillons OCR, doublons, statuts et preuves, aucune confirmation automatique dangereuse.
- [ ] **Persistance sécurisée sur données fictives** : session, couple, séparation, authorization/RLS, migrations et unicité inter-imports, sauvegarde/restauration.
- [ ] **Plan de sortie** : sauvegarde exportable des données existantes, stratégie de migration réversible, vérification main/SW/manifest/version, commit prêt et rollback explicite.
- [ ] **Validation finale explicite** : revue des résultats et approbation pour déployer sur le domaine réel. Ne pas traiter un « continue » comme une autorisation automatique de publier en production.

## Lot technique du 23 octobre : édition descriptive des dépenses étrangères

- `v5-app-5.37.0.js` : nouveau chemin `editForeignExpenseMetadata` pour les **dépenses confirmées** sur compte non CAD et appartenant à l'utilisateur. Ne permet de changer que `name` et `categoryId` parmi les catégories de dépenses actives. Réutilise `saveDocument('transactions',next)` et garde intacts `bankAmount`, `amountOriginal`, `amountCAD`, devise, date, `bankRateCad`, `fxRateDate`, source d'import, allocations et bénéficiaires. Fiche invalidée si transaction ou compte a changé dans l'état local. Cela **ne remplace pas** un verrou optimiste en base multi-utilisateurs.
- Les autres opérations étrangères susceptibles d'emprunter le formulaire CAD sont bloquées ou renvoyées vers leur éditeur international validé. La carte différée reste toujours désactivée sur le formulaire réel.
- Commits candidat du code `1fa6293ca3f820cc9b157676d8dbcae589bedb73`, tests `649a15ad664a165383abdd0618e592c1260a4bec`, avec `[skip ci]`.
- **Contrôles exécutés :** 12/12 nouveaux tests d'édition + 7/7 tests de câblage + 8/8 laboratoire + 7/7 démarrage synthétique + 19/19 invariants financiers = **53/53 contrôles ciblés V8 à modules Node simulés** sur les fichiers du commit. Ce n'est ni une CLI Node native ni Safari/CI.
- **À redéployer en préversion Vercel sur le nouveau HEAD** ; relever URL/commit/état READY séparément dans le handoff. La production 5.36.5 reste inchangée.


## Préparation de sortie — point de contrôle du 24 octobre 2026 (sans autorisation de publication)

La date cible de la semaine suivante reste **un objectif**, pas une livraison garantie. `main` et les données réelles ne changent pas. Les maquettes et arbitrages UX déjà validés constituent la référence ; ne pas refaire un redesign. Commits du dernier lot : voir `docs/TRACE-5.37.0-UX-VALIDATED-GAP-AUDIT.md`.

| Test de sortie à documenter sur l'exact HEAD candidat | Exigence | Situation au 24 octobre |
|---|---|---|
| Accueil « Solde estimé » et boutons de consultation | CAD/EUR, carte liée, retour principal, aucun effet sur historique, focus tactile Safari | Code candidat + essais Node local/V8 fictifs, **pas Safari** |
| Accueil Couple | CA seul et CAD/EUR, comptes distincts, pas de sélecteur personnel, devise couple indépendante | Correctif CAD commité, essais V8 fictifs, **pas E2E** |
| Budget / catégories / réel vs prévu / reprise / 12 mois | Aucun `pending` dans dépenses confirmées, aucun budget historique recalculé | Modèles candidats, **requalification nécessaire** |
| Activité / Partage Couple & Proches | Navigation 3 sous-sections, deux utilisateurs, avances et remboursements sans duplication | Candidat + tests isolés, **base fictive multi-usagers manquante** |
| PDF mensuel FR/CA / carte crédit | Affichage de toutes les lignes, preuve page/ligne, relevé complet vérifié manuellement, écarts sans import auto | Visibilité lignes corrigée, **PDF.js réel et Safari manquants** |
| Débit immédiat, crédit, différé, FX CAD/EUR | Vérification native des débits, dettes, frais, règlements partiels, transferts neutres | Simulateurs en partie isolés, **débit différé bloqué** |
| Patrimoine, épargne, placements internationaux | Soldes natifs, taux datés, pas de patrimoine fictivement valorisé | **Intégration et essais incomplets** |
| PWA iPhone Safari | Chargement, clavier, clics, graphiques, caches hors-ligne, retours réseau | **Aucun essai Safari natif validé** |
| Test natif complet sur checkout exact | Régressions 5.36.5 + suites 5.37.0, exécution Node et navigation | **Bloqué dans ce conteneur : résolution DNS GitHub**, nouveaux tests localement et V8 partiels |
| Intégrité données + rollback | Sauvegarde/restauration, migration compatible, isolation Supabase fictif et RLS | **À construire et à prouver avant GO** |

**Précision sur la dernière QA :** 9 tests natifs Node de commutation compte sur une copie locale du module (9/9), 11 + 5 + 3 + 6 vérifications V8 ciblées exécutées directement sur les sources GitHub de l'interface et du moteur. Les nouveaux tests Node sauvegardés ne prouvent **pas** une campagne complète sur un checkout, un iPhone Safari ou une base fictive. Ne pas additionner ces chiffres à 198/198 V8 historique en prétendant une campagne unique.

**Critère indispensable** : aucune fusion ni déploiement avant validation explicite après revue de ces preuves de sortie. L'ancien lien Vercel est une préversion antérieure et ne correspond pas au HEAD candidat actuel.
