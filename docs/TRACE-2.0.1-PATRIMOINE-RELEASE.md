# TRACE 2.0.1 — Patrimoine / Investissements

## Périmètre de production

**Version publique : TRACE 2.0.1.** Numéro de build interne : `5.37.1`.
Le site et la navigation existants restent les mêmes. Une seule commande **« Suivi des titres › »** apparaît à droite de **Placements** dans **Patrimoine**.

L'onglet Patrimoine conserve :
- Son patrimoine net global `#wealthTotal` et son information de couverture `#wealthSub`;
- Épargne `#wealthSavingsGrid` (y compris les CELI existants) ;
- Placements `#wealthInvestmentsGrid` et l'ajout de comptes ;
- Trésorerie `#assetGrid` et les banques ;
- L'analyse globale `#wealthTrend`.

**Les moteurs d'agrégation `portfolioLedger()`, `savingsLedger()`, Budget, Accueil, Activité, les règles de partage et le journal bancaire original restent inchangés.** Le suivi avancé n'est **pas** ajouté automatiquement au patrimoine net, pour éviter de compter deux fois une écriture ou de fabriquer des soldes historiques.

## Contenu livré

Un suivi natif, ouvert dans la feuille TRACE existante, par portefeuille associé à son `investment_accounts.id`. Aucune création automatique de compte ou d'opération réelle.

- Positions initiales par quantité, coût d'acquisition, symbole, ISIN contrôlé par Luhn, MIC, secteur et géographie ; aucune position de démonstration injectée.
- Configuration de la date et des liquidités à partir d'un relevé courtier. Aucun solde n'est deviné.
- Achats, ventes partielles, dividendes, frais, apports et retraits sur journal spécifique, avec recalcul exact (centimes, quantités au millionième) et prévisualisation des liquidités.
- Corrections d'opérations rejouées dans le journal complet pour éviter les ajustements manuels incohérents.
- Cours manuels datés et sourcés, conservés en historique, différenciant clôture, différé et manuel. Pas de fournisseur de cours automatique ou de promesse « live ».
- Analyses (liquidités, apports, gains réalisés/latents, qualité des données) et courbe de valorisations **uniquement datées** avec bascule « Valeur totale / Hors apports ». Le second mode n'est pas un rendement TWR.
- Relevés de valorisation totale enregistrables séparément des prix des titres, avec la source du courtier.
- Stratégie et seuils purement informatifs, sans ordre ou alerte automatisée.
- Rapprochement d'une référence courtier (date, valeur, source, confirmation explicite) : refus si prix/cash insuffisants ou si l'évaluation ne correspond pas exactement au relevé. Ce statut n'autorise **pas** à lui seul l'agrégation au patrimoine net (virements bancaires à rapprocher dans une évolution distincte).

Les comptes du partenaire sont accessibles uniquement selon le périmètre déjà autorisé par TRACE et restent en **consultation seule** pour l'autre membre.

## Stockage et sécurité

Réutilise **exclusivement** les documents de `investment_accounts` et leur propriété actuelle. Nouvelle propriété facultative **`investments201`**, versionnée `schema: 1`. Les anciens champs restent inchangés. La sauvegarde passe par le RPC `trace_cas_save_document` et le contrôle de révision déjà présent ; un échec de sauvegarde ne doit jamais être présenté comme une réussite.

Aucune nouvelle table, migration, altération du service worker, accès service-role, copie de transactions, fusion d'anciens comptes, migration de CELI ou fournisseur de prix externe.

La branche de sauvegarde **`backup/trace-2.0.0-pre-201-20261106`** pointe sur le SHA de production précédent :
`fbe144364253137588ed521f180e238a2190bde3`.
Le retour arrière du seul frontend se fait par le commit précédent ; les métadonnées additives `investments201` restent conservées, sans suppression ni conversion destructive.

## Inventaire en lecture seule — avant publication

Projet Supabase `eiqvabddtgfonouyeavi`, le 6 novembre 2026 :
- **302 documents financiers** ;
- 7 comptes bancaires, 20 budgets, 84 catégories, 37 journées d'import, 87 imports, 64 transactions ;
- 3 `investment_accounts` : 1 PEA et 2 CELI suivis comme épargne ;
- 0 document `investment_operations`.

Conséquence : la reprise automatique d'achats/ventes du PEA serait **fictive** et est interdite. Le propriétaire doit saisir/contrôler ses quantités et ses références de portefeuille depuis Fortuneo, sans importer les huit lignes du laboratoire comme des positions certifiées.

## QA et release

1. Vérifier le workflow GitHub **TRACE 2.0.1 Patrimoine Investments release qualification** et les tests de régression sur la PR.
2. Vérifier que la différence par rapport à `main` reste limitée à `index.html`, `v5-app-5.37.0.js` (pont borné et routing), `trace-version.json`, trois assets `trace-wealth-201*`, la documentation et les tests.
3. Vérifier que `config.js`, `sw.js`, `manifest.webmanifest`, `vercel.json`, les migrations et les autres scripts restent identiques.
4. Vérifier le chargement de l'URL existante et la concordance `window.__TRACE_BUILD__ === '5.37.1'` avec `trace-version.json`, pour éviter une boucle de rafraîchissement.
5. Vérifier le comportement sur deux comptes et Safari iPhone, notamment l'onglet Patrimoine, le clavier et les corrections. Tant que la recette native iPhone n'a pas été réalisée, **ne pas prétendre qu'elle est validée**.
6. Vérifier que les 302 documents sont toujours présents et que le nombre d'opérations bancaires/investissement n'a pas changé à la seule suite d'un déploiement frontend.

## Limites explicites de la 2.0.1

Ce déploiement apporte un **suivi d'investissements persistant** et une interface premium, mais **ne synchronise pas encore** les cours Fortuneo, les taux intraday, les notifications, les imports de relevés ni l'intégration comptable du nouveau journal au Patrimoine net global. Ces points exigent un rapprochement des virements et une revue des sources/licences. Il ne faut ni affirmer que la valeur du PEA est en direct, ni que les gains représentent la fiscalité française ou canadienne.
