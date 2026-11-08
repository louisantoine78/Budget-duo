# TRACE 2.0.2 — qualification de la synthèse multidevise et des cours

Statut : **développement isolé, non publié en production** (branche `feature/trace-201-patrimoine-analyses-20261107`). Date de recherche : 7 novembre 2026.

## Périmètre réellement développé

1. Synthèse des investissements existants dans Patrimoine, sans onglet principal supplémentaire et sans modifier `portfolioLedger()`, `savingsLedger()`, les transactions bancaires ou l'agrégat de patrimoine net.
2. Chaque portefeuille reste calculé dans **sa devise propre**. Le modèle `investments201` n'importe pas les positions d'un courtier ni ses transactions historiques.
3. Synthèse CAD **conditionnelle** : seuls les comptes avec rapprochement confirmé, quantité/PRU/cours complets et un taux CAD admissible contribuent à la synthèse affichée. Si **un seul** portefeuille est incomplet, le total global est indisponible ; jamais de total partiel trompeur.
4. Devise CAD : identité sans taux. EUR, USD, GBP et CHF : réutilisation des champs existants du compte `fxCadPerUnit`, `fxRateDate`, `fxRateProvider` ; aucune requête nouvelle, aucune clé privée et aucune mutation.
5. `cadValue` arrondit les centimes avec des entiers `BigInt` et un taux décimal à huit positions maximum ; rejette les taux négatifs, sans source, futurs, de plus de sept jours, invalides ou menant à un débordement.
6. Le taux est présenté avec sa date ; sa conversion est **indicative**, différente d'une contre-valeur effectivement exécutée à la banque.
7. La performance approximative (Dietz modifiée) est affichée **par portefeuille uniquement** quand deux valorisations historiques datées sont disponibles. Une performance globale multidevise en % exigerait les taux historiques *à toutes les dates de flux et de valorisation*. Ne jamais la calculer avec le seul taux actuel.
8. Les CELI déjà liés à Épargne restent dans Épargne, pas dans le total détaillé des positions ; les comptes partenaires respectent les droits existants. Aucun portefeuille d'un espace différent n'est fusionné.
9. Une position cotée en devise différente de la devise du portefeuille ne peut **pas** être valorisée/transigée correctement par le moteur actuel. Il faut définir ultérieurement un journal des opérations FX avec taux, date, source et contre-valeur effectivement débité ou reçue. Ne pas simuler ces écritures.

## Recherche de fournisseurs de cotations (aucun connecté)

| Fournisseur | Observations officielles | Points à vérifier avant intégration |
| --- | --- | --- |
| **Marketstack** | EOD mondial, plans commerciaux payants, gratuit limité à 100 appels/mois pour usage non commercial ; API REST et données de marchés mondiaux | Couverture *titre par titre* des actions et ETF PEA en Europe, correspondance symbole/ISIN/MIC, droit de montrer et conserver les données à des tiers, distinction clôture/différé, support des événements sur titres. Le plan Basic est indiqué à **9,99 $ US/mois** en facturation mensuelle sur la page du fournisseur au 7/11/2026. |
| **Twelve Data** | Actions et ETF internationaux, sélection par ISIN et MIC dans la documentation, mais accès ISIN soumis à un add-on et disponibilité dépendante du plan ; EOD mondial et temps réel européen selon offres | Le fournisseur précise que les abonnements individuels n'autorisent pas l'affichage commercial à des tiers. Vérifier le tarif **Business/Venture**, la couverture réelle des instruments européens, les licences de bourse et le droit de redistribution. |
| **EODHD** | API EOD et cotations différées, documentation OpenAPI, vaste catalogue mondial ; fournisseur rappelle que certaines données indicatives ne proviennent pas directement des marchés réglementés | Vérifier qualité par ISIN et place, ETF, résolution des identifiants, délais et droits de redistribution. Pas d'intégration payante automatique. |

Sources officielles :
- https://marketstack.com/pricing
- https://docs.apilayer.com/marketstack/docs/api-documentation
- https://twelvedata.com/docs/markets/market-state
- https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage
- https://twelvedata.com/pricing-business
- https://eodhistoricaldata.github.io/EODHD-openapi/
- https://eodhd.com/
- https://www.bankofcanada.ca/valet-api-how-to/

## Protocole avant choix et intégration automatique

1. Soumettre au fournisseur un échantillon **vérifié**, en tenant compte de leur place de cotation : actions françaises (par exemple DSY et AI), ETF PEA, titres allemands (TUI / SAF-Holland), et le cas d'un titre coté sur plusieurs places. Pour chaque instrument, vérifier ISIN, MIC, symbole, devise, événement sur titres et dernier jour EOD.
2. Clarifier **par écrit** le droit d'affichage commercial (application familiale privée aujourd'hui, potentiellement multi-utilisateurs demain), le cache autorisé, les historiques conservables et le droit de redistribution. Prix et conditions peuvent évoluer.
3. Ne jamais placer une clé payante dans le JavaScript public, GitHub Pages ou le bundle PWA. Un éventuel connecteur passe par un serveur sécurisé avec contrôle des accès, quotas, cache, erreurs et limitation du trafic.
4. Le stockage du cours devrait inclure `isin`, `mic`, `symbol`, `currency`, `price`, `quoteDate`, `quoteKind` (`clôture`/`différé`/`direct`), `provider`, `retrievedAt` et l'origine. Ne jamais déclarer « live » si ce n'est pas garanti par le contrat.
5. Ne jamais remplacer une valeur confirmée par `0` en cas d'erreur API. Afficher « dernier cours disponible » et sa date, puis demander confirmation pour tout rapprochement courtier.
6. Écrire des tests de marché fermé, titre inconnu, symbole ambigu, devise différente, cours périmé, split, dividende, régularisation et limites de quotas.
7. Ne pas déployer en production sans validation de la recette iPhone, contrôles GitHub, sauvegardes et consentement explicite. Aucune migration Supabase dans cette itération.

## Limites et prochaine itération

- Le total CAD est une **indication datée**, et non un calcul fiscal canadien/québécois, un cours temps réel ou un bilan consolidé certifié.
- Le nouveau module n'ajoute toujours pas automatiquement son journal comptable au patrimoine net historique, pour éviter tout double comptage.
- Pour permettre des actions US détenues dans un PEA EUR ou des ETF cotés en USD dans un CTO CAD, créer un **schéma de contre-valeurs réelles des opérations**, et des cotations dans leur devise de marché. Ce travail exige un audit dédié avant écriture en base.
- La sélection du courtier reste libre et propre à chaque compte : « PEA » n'implique ni Fortuneo ni un autre établissement.
