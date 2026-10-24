# TRACE 5.37.0 — audit de conformité aux cinq onglets UX/UI validés

> **23 octobre 2026 — audit contradictoire conception ↔ code candidat**, depuis le HEAD `ef3fbbd0bc3cc4c71bb0d34364662ab27aea49f9`. Ce document est la source de vérité des écarts UX/UI restant à corriger, **sans rouvrir les choix de conception déjà validés**. L'analyse repose sur le cahier de reprise `TRACE_5_37_0_PROMPT_REPRISE` du 23 octobre et sur `trace-international-preview.html`, `v5-app-5.37.0.js`, `trace-international-ui-1.0.0.js`, `trace-international-1.0.0.css`. **Une fonction présente dans le JS ne signifie pas qu'un parcours utilisateur est fini ni testé sur Safari.**

## Verdict

**Conception sauvegardée : oui. Reproduction intégrale dans la préversion : non. Production : NO-GO.** La préversion déployée sur Vercel au commit `2c312f0021d2df92d3fb98e906c169cc76f82698` dispose d'une base fonctionnelle et de laboratoires financiers, **mais pas de tous les écrans et enchaînements validés**. Ne pas promettre que le rendu des cinq onglets est finalisé.

**Légende** : Présent dans UI/code candidat = un composant existe ; Partiel = parcours incomplet ou ordre/hiérarchie non conforme ; Absent = comportement/écran validé non trouvé dans le parcours examiné ; Non vérifié = impossible à certifier sans navigateur/base fictive.

## 1. Architecture générale à conserver, SANS modification de la décision

- Cinq onglets exacts et dans cet ordre : **Accueil | Budget | + | Activité | Patrimoine**. **Présent** dans `<nav class="nav">` de la préversion ; bouton central **+** ouvre l'ajout d'une **opération**, pas un poste budgétaire.
- Identité graphique : TRACE existant, vert profond, fonds clairs, cartes, arrondis, espaces soignés, titres/montants hiérarchisés et graphiques discrets. **Partiellement conservée** ; rendu premium final **non vérifié**.
- Safari iPhone au premier plan : touche, scroll, safe areas, aucune superposition, zoom clavier involontaire, ni retour à la ligne du libellé **« Patrimoine »**. **Non vérifié sur appareil** ; l'actuelle CSS de `.navbtn` ne constitue pas une preuve de non-retour à la ligne sur toutes les tailles. Ne pas renommer Patrimoine ni créer de sixième onglet.

## 2. Accueil — ORDRE VALIDÉ NON RESPECTÉ

Ordre **non négociable** : (1) **Solde estimé** / comptes / compte principal et cartes liées ; (2) **Disponible sur mon budget** ; (3) **Ce mois-ci** revenus/dépenses/marge ; (4) **À faire** validations/imports/rappels/rapprochements ; (5) **Budget en direct** synthèse/anneau + catégories ; (6) **Évolution** carte compacte ; (7) **Partage** raccourci.

| Exigence validée | État observé | Preuve / correction attendue |
|---|---|---|
| Solde estimé affiché **en premier**, puis Disponible | **Non conforme** | Le HTML commence par une `grid-2` dont le premier article est **Disponible** et le second **Solde estimé** ; reprendre l'ordre et la hiérarchie mobile |
| Ce mois-ci = revenus, dépenses, marge | **Présent partiellement** | Les 3 KPI existent, mais sous forme de cartes individuelles et non d'une section clairement intitulée « Ce mois-ci » |
| À faire = valider, imports, rappels, rapprochements | **Partiel** | Bloc « Opérations à vérifier » + comptes à revoir, mais tous les déclencheurs et raccourcis prévus ne sont pas réunis |
| Budget en direct (progression visuelle + catégories) | **Partiel** | `homeBudgetCategories` et `TraceInsights.renderCategories` existent ; la synthèse/anneau et sa disposition définitive ne sont pas confirmés |
| Évolution compacte avec accès aux détails | **Présent, à affiner** | Carte `homeTrendCard`, `TraceInsights.renderTrend` et bouton Analyses ; vérifier lisibilité et navigation mobile |
| Partage = raccourci, non module intégral | **Raccourci présent** | Carte `shareCard` présente ; le partage complet est encore exposé via une modale `openSharing()` issue de l'Accueil |
| Panel **Comptes** accessible depuis le Solde estimé | **Partiel / non conforme** | `traceIntlHome` propose un `select` du compte principal et un `details` « Voir tous mes comptes » ; pas le vrai panneau Comptes avec fiches convenues |
| Trésorerie personnelle de **tous les comptes pertinents**, épargne hors Accueil | **Partiel** | L'affichage principal met en avant principal + carte associée, le global est replié ; distinction patrimoine assurée en intention |
| Compte principal **étoilé**, choix **confirmé** explicitement | **Partiel** | Sélecteur et action enregistrant `primaryBankAccountByOwner` dans `internationalHome`; **pas de confirmation explicite** dans ce flux et l'étoile n'est pas visible dans le sélecteur |
| Devise personnelle liée au principal, **devise Couple indépendante** | **Partiel** | Montants natifs/couple CAD présents ; paramétrage indépendant de la devise Couple non vérifié |
| Fiche Compte : solde natif, conversion, type, carte liée, dernier rapprochement, **2 dernières opérations**, « Voir toutes les opérations » → **Activité filtrée** | **Absent en tant que fiche complète** | Aucune réalisation de cette fiche/transition filtrée démontrée dans le HTML international ; les lignes du `details` sont des résumés simples |

## 3. Budget — FAMILLES VALIDÉES À PRÉSERVER

| Exigence validée | État observé | Preuve / correction attendue |
|---|---|---|
| Création via les 3 familles **Revenus / Dépenses fixes / Dépenses variables** | **Présent** | `renderBudget()` possède ces **trois** sections et les boutons `data-budget-add` ; ne pas remplacer cette structure |
| Catégories personnalisées, reprise mois précédent, Moi/Couple | **Présent** | `manageBudgetCategories`, `budgetCopyPrevious`, `budgetScope` |
| Réel/prévu par catégorie, %, barre, restant, dépassement | **Partiel** | `budgetCategoryImpact` alimenté par `TraceInsights.renderCategories` ; vérifier état détaillé et s'assurer qu'aucun indicateur n'est supprimé |
| Détail catégorie → opérations → **lien Activité filtrée** | **Partiel** | `insightCategoryDrilldown` ouvre une **modale** des transactions ; pas de navigation explicite vers Activité filtrée |
| Vue annuelle **« Mon année en clair »**, 12 mois | **Présent, QA à compléter** | `annualBudgetCard`, `annualBudgetChart`, `TraceInsights.renderAnnual` existent |
| Aucune conversion FX rétroactive des budgets anciens | **Garde-fou présent, QA à approfondir** | Protéger `amountCAD` historique et source/date de taux dans ajout/édition/import |

## 4. Bouton + — UN AJOUT D'OPÉRATION

- **Présent** : `quickAdd` utilise le formulaire `openManualTransaction` ; n'ajouter **aucun onglet supplémentaire**. Tester iPhone, modal, devises natives, validation et impact comptable avant sauvegarde.
- **Partiel** : les cas exceptionnels (débit différé, montants étrangers incomplets, PDF en attente) ne sont pas tous intégrés dans le vrai parcours de saisie.

## 5. Activité — PRINCIPAL ÉCART DE NAVIGATION FONCTIONNELLE

Organisation **validée** dans le même onglet : journal **par jour**, opérations **À valider**, **Imports** quotidiens, **Partage** complet (sections **Couple puis Proches**), filtres compte/période/catégorie/nature/devise/statut. La section Partage **ne crée pas un sixième onglet**.

| Exigence validée | État observé | Preuve / correction attendue |
|---|---|---|
| Journal groupé **par jour** | **Partiel / non conforme** | `renderActivity()` trie les opérations confirmées par date et les concatène via `ts.map(txRow).join('')` ; pas de regroupement journalier visible |
| Filtres compte, période, catégorie, nature, devise, statut | **Absent pour la plupart** | Le HTML possède mois + 2 onglets (`Transactions`, `Importer`) seulement ; filtres avancés à intégrer et lier aux vues |
| Opérations « À valider » accessibles directement | **Partiel** | `importPendingTransactions` est rangé sous le panneau Importer, au lieu du parcours clairement distinct attendu |
| Imports images/OCR/CSV/PDF quotidiens + calendrier | **Partiel** | Import et `importCalendar` présents ; end-to-end sur captures/PDF/CSV et protection des erreurs non validés |
| PDF mensuel **contrôle**, sans création automatique d'achats | **Module isolé, pas fini côté parcours** | `trace-statement-reconcile` et `trace-statement-evidence` ne lisent pas le PDF brut ; contrôle pages/lignes, écarts et revue complète restant à raccorder |
| Partage complet dans Activité : **Couple**, puis **Proches**, avances, remboursements partiels et multiples | **Absent à son emplacement validé** | `openSharing()` est un panneau modale, accessible essentiellement depuis l'Accueil ; logique avancée débiteurs partiellement développée, pas d'écran complet Activité |
| Navigation depuis fiche Compte/catégorie → historique préfiltré | **Non mise en évidence / incomplète** | Pas de contrôles d'arrivée et de filtres complets dans le chemin Activité inspecté |
| Aucun import confirmé ni doublon supprimé sans revue humaine | **Garde-fous isolés présents** | Test complet, unicité persistante et authentification des sources manquent |

## 6. Patrimoine — ORDRE VALIDÉ NON RESPECTÉ

- **Validé :** sections **Épargne** puis **Placements**, en premier ; ensuite **Patrimoine net accessible** plus bas. Ne pas centrer l'écran d'entrée sur le total de patrimoine avant épargne/placements.
- **Observé :** le HTML démarre par `<h1>Mes actifs</h1>`, suivi d'une grande carte **Patrimoine suivi**, puis une section **Comptes** et ensuite **Comprendre mon patrimoine** : **non conforme à l'ordre et à la dénomination**.
- **Présent dans le code** : `renderWealth()`, `assetGrid`, `portfolioLedger`, gestion placements et soldes ; ne pas les perdre lors de la réorganisation.
- **À finaliser** : séparer visuellement **Épargne** et **Placements**, afficher les devises natives et contre-valeurs indicatives, regrouper les dettes sans les ajouter aux actifs, déplacer le net sous ces listes.
- **Blocage financier existant** : `trackedSavingsAccounts()` et `isReadySavingsAccount()` ne gèrent actuellement comme épargne liée que `currency==='CAD'`. L'épargne liée multi-devises **reste à intégrer**, et ne doit pas afficher de faux taux de conversion.

## 7. Mes comptes, design transversal et validations

- **Profil → Mes comptes : base déjà présente** (`openAccountSettings` : renommer, soldes d'ouverture, principal, comptes partenaire en consultation), mais la fiche compte complète/archiver/liens d'historique et certains modèles bancaires ne sont pas terminés.
- Modes **immédiat / crédit / différé** : sélection `deferred` toujours **disabled** tant que le moteur isolé n'est pas branché au grand livre réel fictif avec sauvegarde/idempotence.
- Couleur, arrondis, espaces et composants 5.36.5 à **améliorer**, non remplacer ; vérifier verticalement chaque modale sur iPhone Safari, notamment le mot **Patrimoine** dans la navigation.
- Ne pas supprimer / dégrader remboursements proches, cartes crédit Mastercard, catégories, vue annuelle, solde d'ouverture, rapprochements, notifications, accès Moi/Couple et imports existants.

## 8. Ordre correct d'exécution pour sortir la version

**L'objectif est de terminer la 5.37.0 telle que validée, pas de refaire des ateliers de conception.**

1. **Conformité visible immédiate** : Accueil réordonner 7 modules, créer un vrai panneau/fiches Comptes, Patrimoine restructurer Épargne/Placements/net, corriger affichage nav mobile.
2. **Budget et Activité** : conserver les 3 familles, finaliser indicateurs par catégorie et son lien Activité ; restructurer Activité (journal jour par jour, filtres, À valider, Imports, Partage complet Couple/Proches).
3. **Intégration financière et imports** : finaliser les parcours FR/CA/multi-devises sur base fictive, débit différé, rapprochement CSV/PDF avec garde-fous et sans double comptage ; ne pas bloquer les progrès UX en confondant les modules isolés avec la PWA réelle.
4. **QA préproduction** : vrai checkout Node/CI autorisée, tests fonctionnels et Safari iPhone, sécurité couple/base totalement fictive, PWA hors ligne et rollback. Seulement après, discuter activation prod.

## 9. Critères de livraison par onglet (acceptance gate)

- [ ] **Accueil** : 7 blocs dans l'ordre exact sur viewport iPhone, comptes pertinents/compte principal, fiche + sélection confirmée, filtre couple.
- [ ] **Budget** : trois familles visibles, réel/prévu/restant/dépassement/catégories et vue annuelle 12 mois, lien Activité filtrée.
- [ ] **+** : ajout d'une opération avec bon type, monnaie, impact, no accidental writes.
- [ ] **Activité** : journal journalier filtrable, opérations à valider, imports quotidiens/PDF de contrôle, Partage Couple et Proches.
- [ ] **Patrimoine** : Épargne puis Placements au-dessus du patrimoine net accessible, devises natives et valeurs FX non inventées, « Patrimoine » sur une ligne sur Safari.
- [ ] **Transversal** : préserver 5.36.5, sécurité données fictives, tests réels, aucune activation silencieuse de fonctions comptables non validées.

## Sécurité GitHub et Vercel

Modifications et documentation **uniquement sur `trace-5.37.0-international-accounts-fx`**. Aucun code changé par cet audit. Aucun merge, action CI, déploiement, PWA active ou Supabase réel. `main` `02c70f50e7e51da79b77a91dde96a03c6c719909` inchangée. Nouveaux commits `[skip ci]`. Le dernier déploiement Vercel déclaré READY est une **préversion fictive**, ne pas le présenter comme une livraison finale des cinq onglets.


## Avancement du visuel premium validé — lot Accueil / Patrimoine, 23 octobre 2026

**Travail réel sur la candidate :** les améliorations UX ne sont plus seulement décrites, elles sont maintenant inscrites dans le HTML, la CSS et le JS **de la page laboratoire** `trace-international-preview.html` et de `v5-app-5.37.0.js`. Pas de refonte du `index.html` de production.

### Ce qui a réellement avancé
- **Accueil :** ordre HTML désormais strictement `Solde estimé → Disponible sur mon budget → Ce mois-ci (revenus/dépenses/marge) → À faire → Budget en direct → Évolution → Partage`. Le solde est une carte mise en avant sur toute la largeur, suivie d'une carte budget distincte. Tous les IDs utilisés par les moteurs existants sont conservés.
- **Patrimoine :** deux sections visibles et distinctes `Épargne` puis `Placements`, suivies de la carte `Patrimoine net accessible` puis `Trésorerie et comptes`. `renderWealth()` classe les comptes d'épargne liés ou de type `CELI/Épargne/Livret/Savings` dans Épargne, les autres comptes de placements dans Placements. Les banques/cartes restent dans Trésorerie ; les anciens handler/fonctions d'ajout, détail et valorisation sont conservés. Un solde/taux manquant conserve `Total incomplet`.
- **Finition visuelle premium progressive :** cartes à hiérarchie plus affirmée, montants tabulaires, dégradés très discrets, bordures et ombres douces, responsive étroit, `focus-visible`, `prefers-reduced-motion` et règle `white-space:nowrap` pour que **Patrimoine** ne se coupe pas dans le menu du bas. Pas de nouvelles polices.
- **Les calculs financiers** `bank()`, `portfolioLedger()`, `TraceInternational`, `amountCAD`, taux et conversions n'ont pas été modifiés pour ce lot. Les actifs ne sont pas présentés comme de l'argent immédiatement disponible.

### Tests effectués, limitations, SHAs
- Après relecture du code GitHub sauvegardé : **13/13** nouveaux scénarios `tests/trace-international-premium-layout.test.cjs` (structure exacte, navigation, aucun doublon d'ID, classement épargne/PEA, montant total, absence de faux taux, focus et CSP), **7/7** tests de démarrage synthétique, **12/12** de l'UI, **8/8** du labo, **7/7** de câblage et **19/19** garde-fous financiers, soit **66/66 dans 6 suites ciblées**.
- Tests via JavaScript V8 + **modules Node/fs/path/DOM simulés**, **ni vrai navigateur ni Safari iPhone, ni Node CLI sur checkout, ni 32 suites complètes de régression**. Aucun succès navigateur revendiqué.
- Commits `[skip ci]` : HTML `3a3e1c3444ddc24d37d29de6246773fa59541c3c`, CSS `74ef4cbd05b297b03abf9b83d0879be343d3fbc7`, JS `0cef178a6e8deda9d93995128e70aec7e111fe71`, tests `71dfeed32ef01b79484e2de7c45c9b30d961e7b5`.
- **Pas de nouveau déploiement Vercel**, conformément à la correction explicite de l'utilisateur (« pas déployer les versions… faire les améliorations »). Le site de démonstration déployé précédemment au commit `2c312f` **n'affiche pas encore ces nouvelles modifications UX**. Elles sont visibles dans les fichiers GitHub candidate seulement.

### Encore NON livré / à tester

- **Accueil :** vrai panneau fiches Comptes (deux dernières opérations + Activité filtrée), étoile et dialogue de confirmation du principal, devise Couple autonome, module `À faire` enrichi et anneau Budget en direct.
- **Budget :** détail catégorie avec navigation Activité filtrée, finition premium des indicateurs et vue annuelle.
- **Activité :** journal regroupé par jour, filtres complets, `À valider`, Partage plein écran Couple/Proches, import PDF mensuel en contrôle.
- **Patrimoine :** finesse de présentation patrimoine net accessible, devises de l'épargne liées non CAD, QA chiffrée des dettes, expérience complète Safari iPhone.
- **Transversal :** modales premium, tailles touches/typo, zéro saut en bas d'écran, tests Safari réel, données fictives en base isolée et régression exhaustive.

**Suite prioritaire** : détails de comptes et confirmation du principal pour Accueil, puis Activité filtrée et Partage. Ne pas refaire la conception ; poursuivre les décisions validées. **Production : NO-GO**.
