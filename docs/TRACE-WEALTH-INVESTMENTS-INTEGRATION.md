# TRACE 2.0 — Integrer Investissements **sans remodeler Patrimoine**

Statut : **preuve d'intégration et diagnostic isolés — aucune fusion, migration ni production**.
Branche de laboratoire : `feature/trace-537-patrimoine-investissements-lab`.
Baseline publique auditée : `main`, `fbe144364253137588ed521f180e238a2190bde3`.
Dernière prévisualisation : `experiments/wealth-investments-lab/patrimoine-host.html`.

## 1. Constat précis dans la 5.37.0

L'onglet existant (`index.html`, `section.page[data-page="wealth"]`) contient, dans cet ordre :

1. `#wealthTotal` — patrimoine net, avec son explication `#wealthSub`.
2. `#wealthSavingsGrid` — épargne et CELI classés épargne.
3. `#wealthInvestmentsGrid` — placements et bouton `#wealthAddCard`.
4. `#assetGrid` — trésorerie et comptes bancaires.
5. `#wealthTrend` et `#wealthAnalysis` — analyse patrimoniale.

Le vrai `renderWealth()` dans `v5-app-5.37.0.js` remplit ces panneaux à partir de `investment_accounts`, `investment_operations` et `accounts`. Les ouvertures de compte et la saisie de mouvements utilisent déjà `openInvestmentAccount()`, `openInvestmentOperation()` et `portfolioLedger()`. Une section supplémentaire remplacant ces calculs, ou un nouveau portefeuille PEA répliquant un PEA existant, risquerait un double comptage : ce n'est pas la stratégie retenue.

## 2. Choix UX minimal et démontré

Dans l'en-tête de la section **Placements**, ajouter uniquement un bouton texte discret **« Suivi des titres »** à droite du titre. Ne jamais toucher aux données/cartes déjà rendues dans `#wealthInvestmentsGrid`. Ce bouton ouvre une vue de détail Investments (portefeuilles → positions → opérations → analyse) et permet de revenir immédiatement au Patrimoine. **Pas de cinquième onglet, pas de nouvelle page principale.**

Le prototype `patrimoine-host.html` recopie seulement le DOM du Patrimoine pertinent avec des valeurs neutres et un PEA **explicitement de démonstration**. Il ne charge pas `v5-app-5.37.0.js`, `config.js`, Supabase ni les comptes. Le bouton est monté via `integration-contract.js` en mode **explicitement opt-in**, vérifie la présence des cinq conteneurs avant intervention, évite les doubles montages et se désinstalle sans altération des panneaux. La démo affiche l'interface d'investissement dans une fenêtre imbriquée et isolée.

**Attention : l'iframe de la prévisualisation est un dispositif de présentation seulement.** L'intégration finale doit employer les composants natifs TRACE (feuille/dialogue/routage interne) et les protections d'accès existantes, sans introduire une iframe ni des transactions dans un second espace déconnecté.

## 3. Diff de principe pour une intégration future (NON APPLIQUÉ)

Une fois validé, le point d'insertion pourrait consister à ajouter le seul bouton via un contrôleur opt-in qui s'exécute après `renderWealth()` :

```js
// Illustration technique uniquement — NE PAS coller en production maintenant.
const entry=window.TraceWealthIntegrationContract.mount(document,{
  enabled: approvedFeatureFlag === true, // désactivé par défaut
  onOpen: () => openInvestmentsNativeDetail({
    scope: wealthScope, // évalué au clic, jamais figé au chargement
  }),
});
```

Le contrat est *idempotent* : `renderWealth()` peut être relancé sans dupliquer le bouton. Il refuse de modifier le DOM si un conteneur attendu manque. Le chemin d'ouverture n'appelle ni `navigate('home')` ni les composants Budget/Activité, et ne modifie pas `wealthScope`.

## 4. Réutilisation des données existantes sans double comptage

**Une enveloppe = une seule identité `investment_accounts.id`.** L'écran de suivi Investments doit s'ouvrir avec les identifiants déjà présents, jamais créer automatiquement `PEA Fortuneo (2)`.

- Les mouvements historiques dans `investment_operations` (versement, retrait, achat, vente, dividende, frais, `quote`) sont conservés tels quels. Les mouvements liés aux comptes bancaires via `bankAccountId` ou `linkedTransactionId` ne sont ni copiés ni recréés dans les transactions.
- Le ledger historique utilise des `symbol` sur les achats/ventes et des nombres JS. Il ne connaît pas nativement l'ISIN/MIC, les instantanés de référence avec position initiale et l'horodatage de cotations indépendant. Un identifiant de symbole n'est **pas** une preuve d'ISIN ou de place de cotation.
- `integration-contract.auditAccountMapping(accounts, operations)` produit à ce stade **seulement un diagnostic en lecture seule** (codes de titres historiques, devise, cotations sans provenance, transferts liés et éventuelles preuves manquantes). Aucun champ ne migre ni ne modifie les documents Supabase.
- Les CELI déjà classés épargne par TRACE 5.37.0 restent épargne : leur classement en portefeuille de titres serait **une décision explicite et versionnée**, pas une conséquence automatique du nom « CELI ».
- Pour un compte dont le journal complet depuis l'ouverture est disponible et fiable : conserver le journal comme source canonique, enrichir les métadonnées à part après rapprochement, puis qualifier calculs anciens / nouveaux.
- Pour un portefeuille repris au milieu de son histoire : choisir une date de reprise, contrôler avec un relevé du courtier les quantités, coût de revient par ligne et solde espèces, et **n'appliquer dans le nouveau ledger que les opérations postérieures à la reprise**. Ne jamais cumuler inventaire de reprise et achats antérieurs une deuxième fois.
- Si le courtier ne fournit pas encore le PRU ou les cours, laisser les performances, weights et allocations correspondantes « À renseigner » ; ne pas inférer des achats fictifs.
- Les taux de change datés déjà maintenus par `TraceInternational` doivent rester la référence pour la traduction patrimoniale, tout en préservant les montants et devises natifs. Les calculs fiscaux canadiens restent séparés.
- Les scopes « Moi / Couple » doivent respecter la propriété des comptes et les règles de visibilité actuelles ; les données partagées ne doivent pas être modifiées.

## 5. Stratégie de stockage future

Aucune migration appliquée. À valider par un audit des schémas et droits RLS :

1. Réutiliser `investment_accounts` comme enveloppe et `investment_operations` comme journal canonique, sans changement destructif.
2. Conserver séparément les métadonnées d'instrument (ISIN/MIC, secteur, géographie), les positions initiales approuvées et les snapshots/cours historiques, reliés par l'identifiant de compte et par un identifiant de titre stable.
3. Adopter des champs de version, d'auteur, d'horodatage, de provenance et des identifiants uniques pour prévenir doubles importations / corrections concurrentes.
4. Ajouter les règles de sécurité `owner`/household et l'étanchéité entre utilisateurs ; garder les catégories, budgets et transactions bancaires hors de cette évolution.
5. Ne rien injecter dans `portfolioLedger` ni les totaux Patrimoine avant une **double réconciliation** avec les états courtier et les agrégats TRACE existants.

## 6. Ordre de validation requis

1. **À faire maintenant :** retour sur la prévisualisation `patrimoine-host.html` dans Safari iPhone (profondeur de la feuille, fermeture, hiérarchie, retour au patrimoine). En parallèle, test autonome du lab `index.html`.
2. Approuver le choix « bouton discret sous Placements → détail intégré ».
3. Rapprocher les comptes d'investissement existants avec les relevés utilisateur et confirmer le PEA Fortuneo (notamment les 138,29 € d'espèces estimées).
4. Qualifier un adaptateur **lecture seule** sur des données de test anonymisées et comparer à `portfolioLedger`, `savingsLedger` et `renderWealth`.
5. Définir la persistance additive, les autorisations, les migrations non destructives et les tests d'intégration.
6. Obtenir la **validation explicite** avant tout changement réel de `index.html`, `v5-app-5.37.0.js`, service worker, migrations, Supabase et publication en production.

### Invariants de non-régression

- Aucun changement des écrans Accueil, Budget ou Activité, des finances partagées ni des transactions bancaires.
- Aucun effacement ou réinitialisation ; aucune copie automatique du PEA de démonstration.
- Aucun double comptage de comptes, positions, mouvements ou liquidités.
- Aucun indicateur de performance provenant de valeurs inconnues ou de conversions FX absentes.
- Aucun déploiement production avant approbation et tests réels sur iPhone.
