# TRACE 2.0 · Patrimoine → Investissements · Audit et laboratoire isolé

Statut : **PROTOYPE ISOLÉ / PAS D'INTÉGRATION PRODUCTION**. Branche : `feature/trace-537-patrimoine-investissements-lab`.
Point de départ production audité : `main` au commit `fbe144364253137588ed521f180e238a2190bde3` (TRACE 5.37.0).

## Périmètre vérifié

- `index.html` : Patrimoine existe déjà dans `section.page[data-page="wealth"]` avec `wealthTotal`, `wealthSavingsGrid`, `wealthInvestmentsGrid`, `assetGrid`, `wealthTrend`, `wealthAnalysis`.
- `v5-app-5.37.0.js` : `renderWealth`, `portfolioLedger`, `savingsLedger`, `openInvestmentAccount`, `openInvestmentOperation`, `openPortfolioAnalysis`.
- Collections Supabase existantes : `investment_accounts` et `investment_operations` (plus `accounts`, `budgets`, `transactions`, etc.).
- `TraceInternational` gère déjà plusieurs devises et conversions patrimoniales CAD. `TraceInsights.renderWealth` fournit l'analyse globale.
- Les comptes personnels sont identifiés par propriétaire `la` ou `partner`; les données de couple conservent leurs propres règles.
- Un premier journal d'investissement existe déjà (versement/retrait/achat/vente/dividende/frais/cours manuel), mais les calculs et l'UX actuels ne satisfont pas encore toutes les exigences d'un courtier : ISIN et place de cotation, PRU initial sans transaction, snapshot historique, performance corrigée des flux, prix daté avec source, analyse géographique et stratégie.

## Décision d'architecture pour l'intégration future

**Réutiliser le Patrimoine existant, sans nouveau ledger concurrent en production.**

1. Garder les blocs de synthèse de patrimoine, épargne, comptes bancaires et leur navigation.
2. Enrichir la partie `Investissements` avec une hiérarchie progressive : synthèse → portefeuille → position → opérations, avec feuilles modales iPhone.
3. Isoler un moteur arithmétique pur, l'adapter ultérieurement au modèle déjà persisté dans `investment_operations` et le qualifier contre l'historique existant. Ne pas reproduire une même position à partir d'une ancienne opération *et* d'un inventaire initial.
4. Ajouter les champs ISIN/place, coût d'ouverture, métadonnées, cours sourcés et snapshots via un schéma versionné seulement après qualification et autorisation expresse.
5. Aucun changement de `Accueil`, `Budget`, `Activité`, `sw.js`, `index.html`, `manifest.webmanifest` ou des migrations en production à ce stade.

## Prototype autonome

Fichiers :
- `experiments/wealth-investments-lab/index.html` : écran mobile sans SDK Supabase.
- `engine.js` : calcul en unités entières (centimes et micro-actions), achats successifs, ventes partielles au coût moyen, frais inclus dans le PRU/plus-values, dividendes, liquidités et corrections par recalcul complet.
- `ui.js` + `style.css` : représentation premium inspirée des couleurs et espacements TRACE 2.0, sans reprise d'un tableau Excel.
- `app.js` : navigation et formulaires pilotant un objet de démonstration en mémoire. Pas de synchronisation, de persistance locale, de courtage, d'ordre ou d'accès aux données financières réelles.

### Démonstration PEA Fortuneo

Reprise des positions données au 4 novembre 2026, **sans import en production** :
- Dassault Systèmes 40 ; TUI AG 92 ; Air Liquide 3 ; Amundi PEA S&P 500 8 ;
  Compagnie des Alpes 15 ; SAF-Holland 11 ; BNP STOXX Europe 600 10 ; Sanofi 2.
- Valeur totale de référence 3 788,69 EUR (un **seul point historique**).
- Espèces de référence 138,29 EUR **estimées, à confirmer**.
- Cotations, dates d'achats, PRU, ISIN, secteurs, géographies **inconnus** et non inventés.
- Pas de plus-value globale, de répartition valorisée ou de rendement calculé sans cours et PRU fiables.
- Une autre devise ne s'additionne jamais à l'EUR sans FX daté et validé.
- Les apports/retraits ne comptent jamais comme performance. Pour deux snapshots datés, une estimation de rendement de Dietz modifiée peut être montrée comme telle (et non comme TWR exact).

### Contrôles qualifiés

`node --test tests/trace-wealth-investments-lab.test.cjs tests/trace-wealth-investments-ui.test.cjs`

Incluent : données exactes des huit positions, absence d'historique inventé, strict centimes/quantités, achat et frais, vente partielle au PRU, gains réalisés/latents, dividende, retrait, correction atomique, refus de liquidités négatives, refus d'une vente à PRU inconnu, multi-devise sans conversion fictive, rendement conditionné aux snapshots, navigation simulée et verrouillage des fichiers existants. Workflow isolé : `.github/workflows/trace-wealth-lab.yml`.

## Fournisseurs de cours : aucun branchement ou coût engagé

Comparaison préliminaire (conditions à revérifier à la signature) :
- Euronext Web Services : API directe avec données live/différées/historiques et cadre contractuel de redistribution, particulièrement pertinent pour les titres Euronext.
- Twelve Data : stocks/ETF internationaux, place et ISIN possibles ; accès ISIN et marchés européens dépend du plan/add-on, notamment Cboe Europe.
- Autres fournisseurs EOD : à comparer seulement après avoir fixé l'univers réel par ISIN + MIC et la fréquence de valorisation voulue.

Avant toute API : tester les huit ISIN réels, vérifier le marché de cotation primaire, source, statut live/différé/close, date/heure et fuseau, devise de cotation, corrections d'événements sur titres, jours fériés, limites API et droits de redistribution. Les clés doivent rester **hors du client public**, avec quotas et proxy côté serveur si nécessaire. Autoriser une cotation manuelle horodatée comme repli, jamais un prix inventé.

## Limites explicites / Prochaine étape

Ce laboratoire n'est pas connecté aux documents Supabase ni aux vrais portefeuilles. Il ne constitue **pas** une qualification Safari native sur les deux iPhone et ne prouve pas l'exactitude fiscale canadienne sur le PEA. Il ne stocke rien au rechargement.

Après revue UX explicite par l'utilisateur : recette Safari/iPhone, validation de l'enveloppe et des positions source, comparaison des formules aux données de courtage réelles, spécification de la persistance et RLS, tests de non-régression sur 5.37.0, puis **nouvelle demande de validation avant toute fusion ou déploiement production**.


## Itération UX 2 — amélioration sans intervention en production

- La synthèse d'accueil du laboratoire est allégée : seuls les indicateurs calculables apparaissent comme performances.
- Une carte discrète `Compléter les données` indique les cours et PRU disponibles par portefeuille, avec actions directes vers le premier titre incomplet.
- Les positions affichent l'identification de la place de cotation MIC, distincte de l'ISIN. Si l'utilisateur entre un ISIN, la clé de contrôle ISO 6166 est validée (checksum Luhn), les codes MIC ont quatre caractères et un même couple ISIN/MIC est refusé deux fois.
- Une nouvelle grille `Relevés & sources` affiche des valorisations datées. Ouvrir un relevé expose la source, les titres, dates de cours et leur nature ; la valeur initiale fournie reste marquée comme référence non reconstituée.
- `engine.snapshotAt(portfolio,date)` rejoue uniquement les opérations connues à cette date et sélectionne, pour chaque titre réellement détenu, le dernier cours manuel dont la date n'est pas future par rapport au relevé. Le système mémorise désormais `quoteHistory` par titre ; l'entrée d'un cours plus ancien ne remplace pas le dernier cours affiché. Une observation plus ancienne que la date du relevé est qualifiée d'`estimated`.
- Les actions, ETF et autres actifs, les secteurs et géographies n'affichent des poids qu'avec une valorisation complète, sans cours inventé.
- Tests supplémentaires : saisies de cotations hors ordre, correction de cours sur une même date, rejet des cours futurs dans un relevé passé, vente partielle rejouée à sa date, checksum ISIN, MIC, doublons et consultation de provenance.
- Limite : la méthode de performance indiquée est Dietz modifiée *approximative* quand deux snapshots datés sont disponibles ; elle n'est pas une certification de TWR ou de fiscalité.
- Aucune ouverture à des API de marché externes : les sources de cotations sont pour le moment **uniquement renseignées manuellement**. La formule de reprise et les paramètres d'identification sont à valider sur des justificatifs réels avant intégration finale.

### Mesures de sécurité de la branche

Le workflow `trace-wealth-lab.yml` contrôle les nouveaux scripts, les scénarios financiers et l'interface, **puis compare les fichiers importants à `origin/main` pour exiger zéro changement de la production**. Les fichiers de la prévisualisation ne chargent ni SDK Supabase ni `config.js` ni script de la véritable application. Le laboratoire est intégralement en mémoire et ne revendique pas de compatibilité Safari prouvée tant que la recette iPhone n'a pas été effectuée.


## Itération UX 3 — saisie rapide et lecture immédiate (laboratoire uniquement)

- Saisie par **6 segments tactiles** : Versement, Retrait, Achat, Vente, Dividende, Frais. Le formulaire s'adapte à l'opération, sans afficher simultanément des champs non pertinents.
- Une fiche de position donne accès directement à **Acheter** ou **Vendre**, avec le titre pré-sélectionné. Les autres opérations restent disponibles au niveau portefeuille.
- **Aperçu financier non mutant** : `E.previewOperation` appelle le même moteur de rejouabilité et validation que `E.appendOperation`. Avant confirmation, le formulaire montre la variation d'espèces, le solde après l'opération, le montant brut, les frais, la quantité après et, pour les ventes, le gain réalisé estimé. Une correction montre **la différence causée par la correction**, pas le montant brut d'une transaction supplémentaire.
- Si les liquidités de départ sont estimées comme pour le PEA Fortuneo (138,29 € à confirmer), le formulaire le rappelle explicitement.
- L'écran portefeuille présente une lecture par classe d'actifs avec filtres **Tous / Actions / ETF / Autres**, uniquement lorsque le portefeuille s'y prête. Le filtre ne modifie ni les positions ni les calculs.
- Les indicateurs de performance indisponibles ne sont plus reproduits dans plusieurs cartes : une fiche de complétude offre les liens vers le prochain cours/PRU à saisir.
- Aucune interaction n'est persistée dans TRACE réel ; aucune opération d'investissement n'est passée à une banque ou à un courtier.
- Nouveaux cas vérifiés automatiquement : prévisualisation non mutante d'achat avec frais, refus de découvert, correction sans doublon, vente partielle et PRU inconnu, boutons de transactions contextuels, filtrage des huit positions d'exemple.

La qualification couvre la syntaxe JavaScript, les scénarios financiers et la comparaison automatique des fichiers à `origin/main`. Le rendu Safari iPhone reste à valider par l'utilisateur via l'URL privée de la branche.


## Itération UX 4 — performances vérifiables et politique de cours (sans production)

### Visualisation interactive

- Sous `Patrimoine → Portefeuille → Analyser`, le graphique dispose de 2 modes : **Valeur totale** (instantanés datés) et **Hors apports** (mêmes instantanés, corrigés de l'effet en euros des versements/retraits externes depuis le premier relevé montré).
- Les filtres 1 / 3 / 6 / 12 mois / origine gardent uniquement les **points réellement disponibles**. L'espacement horizontal suit les dates réelles, pas un faux espacement temporel constant.
- Des contrôles iPhone accessibles permettent de sélectionner une date pour consulter son montant, l'origine du relevé et la nature des preuves (`référence fournie`, `cours reportés` ou `valorisation datée`).
- Le mode « Hors apports » n'est **pas** un indice TWR, ni une plus-value fiscale. Le rendement en pourcentage reste séparé et présenté comme **estimation de Dietz modifiée**. Son intervalle observé est le même que celui du graphique ; correction des fenêtres de dates de fin de mois.
- Avec l'unique référence PEA (3 788,69 € au 4 novembre 2026), aucun graphique, indice, rendement ou historique n'est fabriqué.
- Les cours de titre et PRU affichent jusqu'à **quatre décimales** lorsque la précision de la cotation l'exige.

### Préparation des cotations automatiques (non branchée)

Fichier autonome `experiments/wealth-investments-lab/quote-policy.js` : validateur **pur** d'un futur paquet de cotation. Il refuse sans accès réseau toute incohérence ou absence parmi : ISIN validé, marché MIC, devise native, prix positif précis, date de séance, heure UTC, source, type direct/différé/clôture, et autorisation de diffusion explicite. Il rejette les cours « dans le futur » par rapport à une horloge fournie et ne devine jamais une conversion FX.

Aucune clé, synchronisation ou tâche externe n'est utilisée dans le laboratoire. Un simple booléen `redistributionAllowed` est **une exigence du contrat d'intégration**, pas une preuve juridique : l'autorisation du fournisseur doit être vérifiée contractuellement avant activation.

Sources consultées le 6 novembre 2026, à revalider avant décision commerciale :

| Source | Atouts | Limites essentielles |
|---|---|---|
| Euronext Web Services — https://www.euronext.com/en/data/how-access-market-data/web-services | Données de référence, temps réel, différé et historique sur les places Euronext | Nécessite un contrat et ne couvre pas à lui seul les lignes hors Euronext du PEA |
| Twelve Data — https://twelvedata.com/docs ; https://twelvedata.com/pricing | Catalogues mondiaux, séries temporelles actions/ETF, paramètres de place MIC et ISIN | Droits ISIN en supplément, accès EOD/actions ETF européennes et redistribution selon forfait ; le plan gratuit ne garantit pas notre univers |
| FMP — https://site.financialmodelingprep.com/faqs | Flux EOD et documentation sur les corrections de clôture | Vérifier individuellement les 8 instruments, les données historiques et les droits de redistribution |

**Décision : ne sélectionner aucun fournisseur maintenant.** Première condition : vérifier **les huit ISIN+MIC réels** des actions/ETF du PEA, faire une preuve de couverture par une source contractuellement autorisée et comparer coût/quotas/délais/licences. L'API externe devra rester côté serveur, jamais dans la PWA publique.

### Validation

Le laboratoire dispose de tests du moteur, de la prévisualisation UX, des flux externes, des filtres historiques de fin de mois, du rendu à quatre décimales et du contrat de données de marché. La CI isolée refuse toute modification des fichiers de production ou une modification hors du dossier autorisé.
