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
