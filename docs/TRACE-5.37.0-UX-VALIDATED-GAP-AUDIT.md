# TRACE 5.37.0 — audit de conformité aux cinq onglets UX/UI validés

## État prioritaire après mission du 24 octobre 2026

**Cette section remplace les diagnostics de présence/absence des audits historiques conservés plus bas. Les choix fonctionnels validés restent la référence. Production : NO-GO.** Code qualifié : `94c613cd4e1c547a38671083c1da773967bded70` ; preuves et limites dans [WORK-VALIDATION](TRACE-5.37.0-WORK-VALIDATION.md).

| Parcours validé | État du code actuel et preuve | Limite restante |
|---|---|---|
| Cinq onglets, Patrimoine sur une ligne | Chromium réel à 320/390/430 px, aucun débordement horizontal | Safari iPhone non testé |
| Ordre Accueil | Solde estimé → Disponible → Ce mois-ci → À faire → Budget en direct → Évolution → Partage, déjà intégré avant cette mission et conservé | Finalisation tactile/animations Safari |
| Solde estimé premium | Consultation par boutons, devise native, carte liée, principal confirmé, annulation et totaux incomplets vérifiés | Devise budgétaire personnelle/Couple encore CAD |
| Fiches comptes | Détails, deux opérations, rapprochement, Activité filtrée, édition/archivage/réactivation éprouvés | Autorisation des réglages en base et concurrence |
| Budget trois familles | Conservées ; anneau et pourcentage consommé, barres, dépassement et mini graphique prévu/réel affinés ; contraste de Disponible corrigé | Pas de référence budgétaire EUR prospective terminée |
| Mon année en clair | Douze mois et navigation de catégorie → Activité testées dans Chromium | Lisibilité Safari/appareil à valider |
| Activité | Historique journalier, filtres, statuts, comptes archivés et Partage Couple/Proches conservés et testés | Deux sessions cloud/recette exhaustive non réalisées |
| Patrimoine | Épargne → Placements → Patrimoine net ; épargne native multi-devises reliée et taux datés, inconnus non valorisés à zéro | Qualification cloud/placements et devises au-delà des scénarios UI EUR |
| CSV | Toutes les lignes inspectables, opérations ressemblantes détaillées, invalides visibles, aucun effet financier pending | Validation étrangère en attente toujours bloquée |
| PDF mensuel | Véritable worker local, extraction multipage, propositions et lignes non interprétées, attestation humaine, contrôle sans écriture | Pas de reconnaissance universelle ni Safari ; pas d'OCR raster |
| Hors ligne | Laboratoire rechargeable hors ligne, PDF local utilisable sans réseau | Aucun stockage financier durable dans ce labo ; PWA financière non qualifiée |

Le formulaire premium supprimait les champs internationaux que le moteur attendait : panne découverte dans le vrai navigateur et corrigée. Les contrôles clavier/focus et champs de saisie à 16 px améliorent le parcours, sans constituer une validation Safari.

**Écarts document/code réconciliés :** les anciennes mentions « pas de checkout natif », « PDF.js réel absent », « pas de confirmation du principal », « archivage absent » et « épargne liée CAD seulement » sont désormais périmées. Les mentions « devise Couple autonome terminée », « imports étrangers terminés », « différé intégré » ou « PWA iPhone validée » resteraient fausses.

## Historique daté des audits UX

Les observations ci-dessous décrivent leurs commits d'époque. Elles expliquent les choix et la chronologie ; leur statut ne doit pas être repris comme diagnostic du HEAD actuel.


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


## Lot Mes comptes réellement intégré (23 octobre 2026) — candidate seulement

**Portée :** `v5-app-5.37.0.js`, `trace-international-preview.html`, `trace-international-1.0.0.css`, tests correspondants. **Aucun déploiement**, aucune modification de `index.html`, PWA, `main`, Supabase réel ou CI.

### Fonctionnalités implémentées
- **Accueil → Comptes et trésorerie** : bouton ajouté dans la carte Solde estimé. Ouvre une vue **lecture seule** des comptes pertinents (Moi ou foyer selon filtre), soldes en devise native et contre-valeur CAD **indicative** ; absence de solde ou de taux = « à vérifier »/« conversion indisponible », jamais taux 1 ni zéro fabriqué.
- **Fiche Compte** : type bancaire, pays, devise, titulaire, étoile du principal, carte liée/compte de règlement, dernier rapprochement marqué confirmé, **deux dernières opérations** (confirmées ou à vérifier avec statut) et bouton **Voir toutes les opérations**.
- **Activité filtrée** : un select « Compte affiché » permet de choisir un compte ou Tous les comptes ; arrivée depuis la fiche préselectionne le compte et affiche le mois de sa transaction la plus récente. Les revenus/dépenses récapitulatifs sont calculés sur le périmètre sélectionné, **sans écrire ni reclassement**.
- **Compte principal** : depuis Accueil **ou** Profil → Mes comptes, le choix passe par **une modale de confirmation explicite** avant `saveHouseholdSettings()`. Annuler = zéro modification ; erreur de sauvegarde = restauration de l'ancienne sélection en mémoire ; sélection périmée, carte, compte partenaire ou inexistant refusés. Texte explicite sur le changement de devise personnelle, **sans changer la devise Couple ou les budgets historiques**. Le principal est représenté par une **étoile**.
- CSS iPhone premium ciblée : carte de compte, fiche et opérations avec hiérarchie typographique, montants tabulaires, contraste vert, actions tactiles, largeur étroite, focus et états inconnus lisibles. Aucun design réinitialisé.

### Tests et commits vérifiés après persistance
- Commits `[skip ci]` : JS `f828e2aa511855c841fb08011076c7c686d757ca`, HTML `081c377f273745ec692061000039fec5bcdccc20`, CSS `2c2ffd0b9c2856eb88468677b18f89e3ceafa9e8` ; correctif réel du mauvais appel `$('selector').forEach` → `$$('selector').forEach` dans JS `d76caeef60c1c735d8f544c71e5f01da07083041`.
- Tests existants mis à jour pour imposer la confirmation `09f0a416cdf9d7b3c6b8bdd6ac784d60d7ca994e`, reborner extraction smoke `fedb95648e808139820b4c99f0f67cc2598b0ad0`, mocks du filtre `73888f6a9b9082473b584d28f437d0ec10c775bd`.
- Nouveaux tests `tests/trace-international-account-details.test.cjs` commit `33590906ca459f39b9c10f15b895a70765025428` : **14/14** cas fictifs couvrant accessibilité des comptes Moi/Couple, partenaire en lecture seule, fiche, opérations récentes, carte liée, solde/taux inconnus, navigation Activité, annulation/confirmation/échec/stale du compte principal.
- Après nouvelle lecture de GitHub : **80/80 contrôles V8 simulés** sur **7 suites** (détail 14 ; bootstrap preview 7 ; UI 12 ; ordre premium 13 ; labo 8 ; wiring 7 ; invariants financiers 19). **Pas de navigateur Safari réel, pas de Node CLI natif, ni de campagne exhaustive multi-suites**.

### Restant non finalisé
- Le panneau Comptes est **nouveau** ; validation vraie Safari/iPhone, hauteurs, scroll, accès clavier, lecteurs d'écran et états avec quantité importante d'opérations restent requis.
- Activité a **seulement** un filtre Compte + Mois fonctionnel à ce stade ; catégorie/nature/statut/devise et historique par jour **restent à faire**.
- Budget → Activité filtrée par catégorie, Partage plein écran Couple/Proches, confirmation de change sur multi-device et verrou optimiste Supabase inter-utilisateurs, devise Couple indépendante, et archivage de compte restent à faire.
- Le compte principal est protégé contre les changements en mémoire entre ouverture/confirmation, **mais pas contre une écriture concurrente distante**. Ne pas annoncer un verrou en base.
- Relevé PDF mensuel, débit différé réel, intégration bancaire et QA release générale sont toujours bloquants.

**Prochaine priorité** : regroupement journalier et filtres d'Activité (compte, période, catégorie, nature, devise, statut) + navigation depuis les catégories Budget ; ensuite Partage Couple/Proches dans Activité. Toujours uniquement sur candidate avec tests fictifs.


## Activité : journal et Partage intégré — développement candidat du 24 octobre 2026 (suite du chantier du 23)

**Changement réellement commité, pas seulement spécifié.** La page fictive `trace-international-preview.html` présente maintenant trois sous-sections dans **Activité** : **Transactions, Importer, Partage**. La navigation principale reste **Accueil, Budget, +, Activité, Patrimoine**, donc aucun sixième onglet.

### Transactions : bloc livré en amont et consolidé
- Regroupement de l'historique par date, ordre décroissant ; filtres compte, mois, catégorie, nature, devise **du compte**, statut (confirmées, à valider, tous).
- Les flux des opérations en attente ne sont jamais ajoutés aux KPI confirmés ; montants manquants affichés « à vérifier ».
- Budget → détail catégorie → « Voir dans Activité » : mois et catégorie conservés, anciens filtres remis à zéro.
- Commits : JS `1e1691082428d8118c1f2d6a9c3f41fc0aa760df`, HTML `15902faea7f83acbe08924e5c6054a6a61023fcf`, CSS `76be5d148118ddd46841180d52535b031b3d859f`, correctif de liaison clic `fc35b651d53e05e21331f9fbb475300fd02ce939`, mise à jour smoke `d06c27b7a16b9ea5caffdcb6605324b278162031`, tests neufs `ddc8194ef308af6fe972931bf98ff63cc68441dc`.

### Partage : **nouvelle section visible et raccordée aux moteurs existants**
- **Couple, puis Proches** au sein d'Activité, avec hiérarchie premium/mobile ; l'Accueil devient un **raccourci vers Activité → Partage** (si pas de partenaire, ouverture des réglages/invitation).
- **Couple** : solde entre partenaires via `coupleBalance()` et `sharingHistory()`, historique confirmé, solde Tricount repris affiché ; boutons « Enregistrer un règlement » et « Solde initial Tricount » appellent **les éditeurs existants** `openSettlement()`, `editTricountOpening()`.
- **Proches** : groupes calculés **uniquement** par `TraceMovement.friendReceivables` sur transactions réelles déjà chargées, somme restant due, avances, remboursé, restant, opérations partiellement remboursées, anciennes avances sans prénom en état « À attribuer » et signalement des répartitions à vérifier. Aucun nouveau stockage ni double comptage.
- Boutons « Enregistrer un remboursement » et « Ajouter une avance » ouvrent le formulaire **existant** `openManualTransaction` en présélectionnant seulement la nature `friend_reimbursement` ou `expense`. Le formulaire continue à contrôler les montants, les associations aux avances et les validations. Un bouton ne valide ni ne sauvegarde automatiquement.
- Le mois d'Activité est masqué pendant le Partage car son solde est **cumulatif depuis le début**, sans suggérer un calcul limité au mois sélectionné. Retour aux autres onglets et lien historique/import existants inchangés.
- Commits `[skip ci]` : JS `efa749ebf382bdf33cce7a635a148e057e031492`, HTML `0924529d1ec4634dba5d05042af3af1e7373dd14`, CSS `a6697fb7e03589cf4c6f48cda29c8eec23a3de19`, test smoke adaptée `bdd1ba1cf7faed5ffcc9799c10332c3c7ecb1eb5`, **14 tests Partage** `b98643584700a9880436a4cf0ddd56eb3c21d8ba`.

### Validation, sans exagération
- **100/100 contrôles réussis au total, 9 suites ciblées, après lecture du code sauvegardé sur GitHub** : Partage 14, journal 6, bootstrap 7, smoke UI 12, premium 13, comptes 14, laboratoire 8, câblage 7, garde-fous financiers 19.
- Ces tests ont été exécutés en **V8 avec interfaces Node, fichiers et DOM simulées**, **pas** avec la suite native Node CLI complète ni un navigateur Safari. Pas de tests E2E multi-utilisateurs sur base fictive persistante. La concurrence distante, le calcul financier multi-devises complet, et les rapprochements bancaires restent non validés.
- Aucun commit sur `main` `02c70f50e7e51da79b77a91dde96a03c6c719909`, aucun déploiement Vercel, aucune opération sur Supabase réel, aucun changement de l'entrée 5.36.5. Le site Vercel préexistant au commit `2c312f0021d2df92d3fb98e906c169cc76f82698` **n'affiche toujours pas ces progrès**.

### Reste à livrer avant GO
- Activité : expérience de validation/import plus fluide, statut par compte, pagination/performance pour très longues listes ; contrôle PDF mensuel réellement connecté ; tests avec remboursements complexes et lots réels fictifs.
- Partage : QA visuelle réelle Safari iPhone, scénarios couple multi-utilisateurs et associations multiples en bout en bout ; vieux accès `openSharing()` conservé en compatibilité mais **la section principale est maintenant intégrée dans Activité**.
- Patrimoine : épargne liée en devise non CAD, restitution correcte du net et de la trésorerie, tests UX.
- Transversal : modes différés dans vrai grand livre, QA complète et plan de rollback, autorisation de mise en production.

**Prochaine priorité technique** : raccord PDF mensuel de contrôle (ne pas créer de transactions sans validation), puis intégration des mouvements différés uniquement sur données fictives, et Safari iPhone avant production.


## Contrôle mensuel du relevé PDF — intégration intermédiaire sécurisée (24 octobre 2026)

**Livré réellement sur la candidate fictive, sans déploiement :** dans Activité → Importer, un panneau « Contrôle mensuel PDF · revue manuelle sécurisée ». Un PDF bancaire local (signature %PDF-, taille max 12 Mo) peut être ouvert via un lien Blob, mais ses opérations ne sont **PAS extraites automatiquement**. Le titulaire retranscrit toutes les opérations (maximum 250 par contrôle) en indiquant pour chacune page/numéro de ligne, date, libellé, débit/crédit, montant dans la devise native et extrait fidèle de la preuve. Il déclare le nombre total de mouvements, vérifie chaque ligne, et atteste qu'aucune n'a été omise. **Cette saisie manuelle ne peut garantir l'exhaustivité réelle du PDF** : aucun OCR, aucune analyse automatique des pages, aucune certification des relevés.
 
La comparaison réemploie sans modification les moteurs préexistants TraceStatementEvidence.stage/compareReviewed et TraceStatementReconcile.compare. Les montants restent natifs, le compte et la période sont vérifiés, et une approbation par preuve est obligatoire. Le rapport indique correspondances uniques, lignes manquantes, lignes à valider, ambiguïtés et transactions TRACE non trouvées dans les lignes fournies ; tolérance de deux jours. Il reste en mémoire et **strictement en lecture seule** : aucune écriture Supabase, aucune nouvelle transaction ni impact budgétaire, aucun téléchargement de relevé vers un service. L'ancien import CSV et les imports quotidiens continuent sans changement. Un lien renvoie à Activité filtrée par compte.

**Bugs corrigés pendant le lot :** double ajout d'une ligne par des événements clic concurrents ; association erronée des cases d'approbation (le moteur de preuves ne renvoie pas de propriété index sur les lignes prêtes). Les approbations suivent désormais l'ordre explicite des preuves et sont invalidées dès qu'un champ source est modifié.

**Commits de code, tous [skip ci] :** module manuel PDF 932ef8df ; correctif double ajout f48a6ddc ; style premium iPhone 48cafde2 ; HTML laboratoire ddaacf65 ; montage application candidate 1d3792fd ; correctif indices de vérification 212c72e6 ; tests UX PDF fictifs 4c297281.

**QA après relecture GitHub : 167/167 tests ciblés V8 simulés**, 12 suites au total (100 anciens UX/finances, 56 moteurs de comparaison/preuves, 11 UI PDF). Cas couverts : document faussement nommé PDF, octets de signature, nombre de lignes, attestation par ligne, doublons ambigus, mutation de champs source qui invalide les approbations, comparaison et retour vers Activité, absence d'écriture financière. **Ni navigateur Safari iPhone, ni véritable PDF de banque testé, ni Node CLI exhaustif/CI, ni E2E multi-utilisateur**. Ne jamais décrire ce parcours comme OCR ou contrôle PDF complet.

**Interdits préservés :** aucune modification de main 02c70f50e7e51da79b77a91dde96a03c6c719909, aucune donnée Supabase réelle, aucun déploiement Vercel/production, aucune activation des cartes différées ni des workflows GitHub/PickPoint. Le vieux lien Vercel déployé au code 2c312f n'affiche pas ces changements.

**Prochain impératif :** véritable extraction locale fiable des couches texte PDF, références page/ligne, identification de colonnes bancaires et variantes de relevés, validation de l'exhaustivité sur relevés bancaires fictifs multipages, puis tests réels Safari avant d'envisager la production. La méthode manuelle actuelle est un filet de sécurité, pas la fonction finale approuvée.


## 24 octobre 2026 — texte PDF local : extraction PARTIELLE et sûre (candidate 5.37 uniquement)

**Travail codé, enregistré, sans déploiement** : `trace-statement-pdf-text-1.0.0.js` analyse localement, sans réseau ni stockage, certaines couches texte PDF simples, reconstruit l'ordre via l'arbre des pages, conserve une référence de **page / numéro de ligne / extrait original** et propose *uniquement* les mouvements au format déterministe « date | libellé | DÉBIT/CRÉDIT | montant ». Les propositions contenant une date impossible ou une valeur mal formée ne sont PAS converties, ni devinées. Montants natifs, aucune FX ni écriture. L'application candidate charge ce module avant `trace-statement-monthly-ui-1.0.0.js`.

**Parcours utilisateur** : Activité → Importer → Contrôle mensuel PDF → ouvrir PDF local, bouton « Proposer les lignes à partir du texte PDF » → visualiser le nombre de pages, les propositions et les lignes NON interprétées → **action explicite** « Recopier ces propositions » (refus si compte/période incorrects, avertissement et consentement avant écrasement de saisies manuelles). Chaque proposition rejoint alors uniquement les champs manuels, avec preuves de page/ligne ; aucune ligne n'est confirmée, aucune transaction créée. La procédure manuelle existante (nombre total de lignes, vérification d'extrait, attestation de complétude et approbation de CHAQUE ligne) reste entièrement obligatoire avant le comparateur déjà existant. Les rapports restent indicatifs et lecture seule.

**Support actuellement volontairement limité :** PDF non chiffré, flux directs non compressés ou Flate via `DecompressionStream` lorsqu'il est disponible, arbre de pages explicite, polices Type1 simples standard Helvetica/Courier/Times, caractères ASCII sans codage ToUnicode ; pages non pivotées ; pas de XObjects, scans image, OCR, polices embarquées complexes, structures ObjStm/XRef, sources PDF indirectes, ou pages dont le texte est incomplet. **Ne pas annoncer un parseur PDF généraliste** : les vraies banques peuvent employer des polices complexes, de multiples colonnes, du texte compressé différent ou des PDF scannés ; le moteur retourne alors « non pris en charge » et oriente vers la vérification manuelle. Limites prudentes : 12 Mo, 40 pages, 250 lignes détectées et 2 Mo par flux décompressé. Les lignes hors schéma reconnu s'affichent comme non interprétées et ne sont jamais converties en dépenses.

**Fiabilité et responsabilité** : même avec les suggestions présentes, TRACE ne peut pas prouver que TOUTES les opérations du PDF ont été détectées. Il ne doit ni valider ni enregistrer une transaction automatiquement, ni déclarer le relevé rapproché ou « 100 % complet » après extraction. Confirmation d'utilisateur de la totalité des lignes et comparaison visuelle toujours requises. Les erreurs de lecture des flux, polices et source causent un refus plutôt qu'un faux montant ; le fichier et ses preuves ne sortent pas du navigateur. **Aucune validation sur vrai Safari iPhone, aucun relevé bancaire réel ou multisource réel, aucun test E2E sur vraie base fictive persistante.**

**Commits [skip ci] :**
- scanner PDF strict : `6c22b45f762c7bf8696e2f9151a319edca6ca7cf` ;
- refus des polices à encodage inconnu : `af4f91bd4a5fbf8014ee435e227bcae112d4a248` ;
- connexion à l'interface de revue manuelle, avec non-écrasement par défaut : `747df2b8c80cd12b34afb05f90b366a9ad6946f9` ;
- chargement seulement dans la preview : `dd1ce259f5c2c3c0ba750169776c65da124bab4a` ;
- style de restitution et limites : `9dfce273ff6599aca92a8c4543a3cd171898fbd3` ;
- tests du parseur (PDF structure réelle synthétique multipage) : `c86893254001942f9c54b85949ff71e20a426105` ;
- ancienne suite corrigée pour refléter l'extraction limitée : `ca762882731e5e28e155b137b65a93dccf5896c8` ;
- tests UI d'adoption explicite : `e4f2a97aaf351e74aac2c9cef902b2075b9cb887` ;
- correction double clic pendant lecture : `b2b5698da5750e0d80d51920a8cf3c5980435161`.

**Résultats de test** : 186 / 186 contrôles ciblés V8 simulés sur 14 suites (ancien socle 167, nouveau parseur 11, UI propositions 8). Après le dernier fix de course, 30 / 30 contrôles des trois suites PDF retestés sur GitHub. Ces tests n'utilisent pas le navigateur Safari réel, ni des PDF bancaires réels ; les flux Flate ne sont pas encore validés sur vrai navigateur.

**Prochain chantier recommandé** : ne pas élargir naïvement les regex PDF. Évaluer/embarquer un moteur reconnu (ex. PDF.js local et version épinglée, sans CDN, licence et CSP auditées), puis construire des parseurs de colonnes de banques *sur relevés fictifs provenant des gabarits ciblés* avec une mesure explicite de couverture des pages/lignes, preuves visuelles et validation humaine. Ensuite fiabiliser l'UX Safari iPhone, les modèles FR/CA/internationaux, et les cas crédit/débit différé avant la décision de production. Aucun merge main / déploiement / Supabase réel / CI / PickPoint.


## 24 octobre 2026 — Adaptateur PDF.js local et moteur de colonnes (candidate uniquement)

**Code réel livré sur trace-5.37.0-international-accounts-fx, pas en production** : nouvel adaptateur `trace-statement-pdfjs-adapter-1.0.0.js` pour les couches texte PDF.js `getTextContent`, positionnement x/y, regroupement par lignes, et analyse **prudente et déterministe** des quatre colonnes `Date / Libellé / Débit / Crédit`. Il rejette les en-têtes/positions ambigus, doubles montants de débit et crédit, dates impossibles, caractères mal positionnés, pages pivotées, pages sans en-tête, plus de 40 pages ou plus de 250 lignes. Les positions page/ligne et le texte original sont conservés. Tout reste **proposition non validée**, lecture seule, monnaie native du compte, aucun FX inventé ni mouvement financier créé. L'adaptateur admet l'injection d'un moteur PDF.js `engine.getDocument` local ; il **n'est pas** un parseur PDF autonome.

- La preview fictive charge l'adaptateur en script local. Le bouton de détection mensuelle **privilégiera cet adaptateur seulement si** `window.TracePDFJSLocalEngine.getDocument` est réellement fourni, sinon il utilise **l'ancien scanner local restrictif** et permet la saisie manuelle. Le moteur PDF.js complet **n'est PAS encore copié, présent ni activé** ; ne pas faire croire au support universel des vrais relevés. La CSP bloque toujours les workers (`worker-src 'none'`) : ce point devra être audité, puis autorisé uniquement pour un worker local avant activation. Les PDF sensibles ne doivent jamais être envoyés à un CDN.
- Préparation de l'intégration locale : `scripts/vendor-trace-pdfjs.mjs` **inactif, non exécuté** vérifie strictement un dossier `node_modules/pdfjs-dist` à la version `6.4.299`, copie les fichiers **legacy** PDF.js + worker + LICENSE dans `vendor/pdfjs`, et génère le manifeste SHA-256 des fichiers copiés. `trace-pdfjs-local-loader-1.0.0.mjs` reste **non référencé dans le HTML**, en attente de véritables assets audités et d'essais CSP/Safari. Licence officielle PDF.js `Apache-2.0` (à vérifier lors du vendoring effectif), aucune dépendance navigateur/CDN ni CI ajouté dans ce lot.
- Tests réellement exécutés sur le code GitHub : **198/198 scénarios ciblés V8 en 15 suites**. **12 nouveaux** pour le moteur de colonnes PDF.js (pages fictives, libellés FR, montants EUR/CAD, colonnes, double débit/crédit, dates, documents à plusieurs pages, refus du moteur absent, rotation et page illisible), plus les **186 existants** sur PDF limité, interface, partage, comptes, moteur financier, lab et contrats comptables. Ce ne sont ni de vrais tests PDF.js vendored, ni Safari iPhone, ni exécution CLI native/CI, ni test avec PDF bancaire réel.
- Commits **[skip ci]** : adaptateur `bf47c6ba4c06dca05a890e6d427f30da7852f685`, tests `b9b693f4d983834bcc45f0d01e043aad22fe5dc7`, sélection optionnelle `8284f9e11d7271f6c666a9f9b9a00c6b25db6c3d`, chargement preview `198e0b00519a587e7feec5ab887f636eababbde1`, procédure vendor `a235abaea6e2c4eb50a3fe92d7788aef54bdd607`, loader inactif `a6ab95ac9387f6e418b0c5006efb1eb69db52c93`.

**Point d'avancement général TRACE 5.37** : socle de l'app candidate, navigation Home/Budget/Activité/Patrimoine, Mes comptes + principal avec confirmation, solde multi-comptes, partage Couple/Proches, import quotidien, journal/filtres et labo PDF ont progressé ; des modules financiers internationaux sont développés sur branche MAIS la couverture fonctionnelle **n'est pas encore démontrée sur un navigateur et des données réalistes**. Restent la dépendance PDF.js complète, l'analyse multi-banques / scans, devises et modèles bancaires réels (notamment débit différé), règlements et rapprochements multi-comptes, régressions Safari iPhone, simulations de données fictives E2E, et plan rollback. **NO-GO production**.

**Interdits inchangés** : aucun commit `main` (stable `02c70f50e7e51da79b77a91dde96a03c6c719909`), aucun déploiement Vercel/production, aucune écriture Supabase réelle, aucune modification workflows/CI/PickPoint. La preview Vercel antérieure ne reflète pas les développements récents. Le moteur PDF.js complet NE PEUT PAS être activé avant (1) assets locaux exacts + licence + manifeste, (2) CSP worker local et tests Safari, (3) revue de sécurité, (4) échantillons PDF fictifs multi-banques passés, (5) validation de tous les garde-fous et des parcours.


## 24 octobre 2026 — porte de préparation locale PDF.js renforcée

- **Confirmé en amont** : le registre npm publie `pdfjs-dist@6.4.299` sous licence Apache-2.0. Le plan demeure une distribution locale versionnée, sans CDN et sans activation anticipée.
- **Préparation plus sûre** : `scripts/vendor-trace-pdfjs.mjs` effectue un précontrôle de tous les fichiers (version, taille, licence), écrit dans `vendor/.trace-pdfjs-staging-*`, contrôle les empreintes après écriture puis renomme le dossier préparé. Aucun remplacement silencieux d'un dossier existant, aucun asset partiel conservé après échec normal. Commit `f4e396424d6f80fa05aee3aaf39c2f747c8f0adf`.
- **Contrôle indépendant** : `scripts/verify-trace-pdfjs.mjs` vérifie la liste exacte des fichiers, tailles, hash SHA-256, licence, absence du chargeur module dans `trace-international-preview.html` et maintien de `worker-src 'none'`. Ce contrôle est volontairement **pré-activation** : il devra être repensé lors d'un lot autorisé d'activation Safari/CSP. Commit `5023d3c941cfe4919fa41b43a46b8f332c9031e7`.
- **QA native nouvellement réalisée** : `tests/trace-pdfjs-vendor.test.cjs`, 9/9 tests avec Node v22.16.0 et fixtures synthétiques dans le conteneur (pas de données financières) ; commit `8a195459b2793ff258032a7e4ed9851dfc22b3b5`. Les tests ont été exécutés sur les sources locales préparées avant commit, **pas** via un checkout GitHub natif ; les sources commitées ont été relues via le connecteur et leurs gardes vérifiés statiquement. DNS GitHub indisponible depuis le conteneur, aucune CI lancée.
- **Statut effectif : toujours NO-GO**. Ni les fichiers binaires/modules complets de la distribution PDF.js, ni un manifeste avec hachages de vrais assets, ni les tests Safari/worker/CSP, ni les PDF fictifs représentatifs ne sont présents ou validés. `trace-pdfjs-local-loader-1.0.0.mjs` non ajouté au HTML. `main` 5.36.5 inchangée au point de contrôle initial, aucune action Supabase, Vercel ou GitHub Actions. Le score antérieur **198/198** représente uniquement les suites ciblées V8 simulées du précédent lot, non réexécutées ici.

**Suite prioritaire :** vraie installation et vérification du package versionné dans un environnement isolé, puis PDF fictifs multipages et tests de non-régression. Ne pas autoriser `worker-src 'self'` ni inclure le loader tant que l'audit de sécurité, le hors-ligne, les erreurs et les parcours Safari iPhone ne sont pas prouvés.


## 24 octobre 2026 — UX premium solde consultable + fiabilité visuelle de la revue PDF

**Lot candidat uniquement : aucune entrée production, main, service worker, Supabase réel, workflow ni Vercel touché.**

### Accueil / comptes

- Le composant existant `trace-international-ui-1.0.0.js` propose maintenant de petits boutons de consultation rapide pour plusieurs comptes courants personnels. **Sélection éphémère, sans écriture** : ne modifie ni le compte principal enregistré, ni les budgets/taux historiques ; choisir officiellement un autre principal passe toujours par la liste et la confirmation déjà en place. Solde courant, dette des cartes liées et devise native reflètent le compte consulté ; solde inconnu ≠ zéro ; indication de vérification si un avoir carte lié est suspect. Aucune création de compte ou de transaction.
- Mise en forme premium de `trace-international-1.0.0.css` : boutons arrondis vert profond, défilement horizontal sur iPhone, cible tactile 44 px, focus visible et animations réduites selon préférences.
- Dans `v5-app-5.37.0.js`, la vue **Couple 100 % CAD** présente désormais les comptes du foyer et non le sélecteur personnel ; les avertissements de carte et le badge de consultation sont raccordés au composant personnel. Les devises mixtes du foyer conservent le calcul du moteur international existant.
- Commits `[skip ci]` : code sélecteur `04fffeacded887b7dfe014cfaf07fa480bb4732c`, CSS `fd70ff7bdc9f146d082151a79c292e688c09903e`, branchement et Couple `d4f7e2d894a1c77f21e5d51f79cb7591e2e6144c`, tests boutons `b0a7b451c5af1b5c000d4c1ccbbcd7c459ce50c3`, tests Couple `0511a871474b041fdd2d38000be45251ec0d6407`.
- QA : **9/9 tests Node natifs** sur la copie locale du composant avant commit ; **11 contrôles V8 sur le contenu enregistré GitHub** des composants App/UI/CSS ; **5 contrôles V8 sur le vrai moteur International enregistré sur GitHub**, avec deux comptes CAD/EUR et Mastercard fictive ; **3 contrôles V8 de la branche Couple-CAD exacte**. Les tests Node persistés sur GitHub n'ont pas été rejoués sur un checkout GitHub téléchargé (DNS indisponible) ; ne pas les compter comme exécution intégrale de la branche. Aucun test de rendu/interaction Safari réel.

### Contrôle PDF mensuel

- L'interface `trace-statement-monthly-ui-1.0.0.js` n'escamote plus les lignes au-delà des **25 propositions** et **40 lignes non interprétées** précédemment visibles : tous les éléments renvoyés par l'extracteur, jusqu'au plafond existant de 250 lignes, sont consultables avant reprise volontaire. CSS mobile à défilement dans `trace-statement-monthly-ui-1.0.0.css`. La validation ligne par ligne, l'attestation de complétude et l'absence d'écriture financière restent obligatoires ; ceci ne rend pas l'extraction PDF exhaustive.
- Commits `[skip ci]` : UI `6a6985e51741cba9d06b6fca9a3abe6a2342e796`, CSS `ce51f643700c36f587ebb9b495ce8c0ca858a985`, nouveaux tests de régression `c021b71f92830fb8c774986f0acedbd4e578f9c8`.
- QA : **6/6 assertions de rendu de la fonction exacte enregistrée sur GitHub** en faux DOM V8, couvrant 80 propositions et 60 lignes non interprétées, attestation non automatique, bouton volontaire. Le fichier de 5 tests natifs est commité mais non exécuté depuis un checkout intégral. Aucun PDF.js réel, Safari réel ni PDF bancaire de production testé.

**Bloqueurs persistants :** bibliothèque PDF.js réelle toujours non embarquée ; CSP worker `none`, loader non activé ; E2E financiers multi-utilisateurs, débit différé réel, tests natifs de toutes les suites, navigateur iPhone Safari/PWA offline, base fictive isolée et plan de rollback. Préversion distante antérieure non redéployée ; **NO-GO production**.


## 26 octobre 2026 — actualisation de conformité UX (code `e4220adf`)

**Écart Activité résolu côté source candidat :** l'ancien rendu à trois sous-onglets n'est plus d'actualité. Les quatre sections validées `Historique | À valider | Partage | Imports` existent réellement dans la preview ; « À valider » a une vue indépendante, porte sur les opérations en attente de toutes périodes des comptes du membre actif et affiche le montant bancaire natif uniquement s'il est prouvé. Les réglages de filtres du journal, Couple/Proches, CSV/PDF et la navigation à cinq onglets restent en place.

**Contrats contrôlés :** 7 nouveaux tests de structure/navigation/file ; 14 partage ; 18 journal/filtres ; 12 smoke UI ; 13 layout premium ; tests financiers de verrouillage et carte. Prévisualisation fictive enrichie d'une opération antérieure ; bootstrap 7/7 en DOM synthétique. Les **291/291 contrôles ciblés V8** ne constituent pas une validation tactile/navigateur.

**Reste impérativement à qualifier :** vraie navigation à 320/375/390/430 px et sur iPhone Safari (notamment quatre sous-onglets sans débordement), contrôle accessible de la file et des états de focus, service worker laboratoire régénéré, sessions Auth/RLS/CAS isolées et persistance sans doublons. **Production NO-GO**. Les diagnostics historiques d'absence d'onglet « À valider » décrivent leurs HEAD d'origine, pas l'état actuel.

## 26 octobre — navigation Activité et grandes listes (après `bb326c9c`)

### Écarts UX corrigés dans la candidate

- « À valider » rend au plus **40 opérations** au premier affichage, triées par date descendante, puis permet de dévoiler **40 opérations supplémentaires** par activation. Cela réduit le nombre de boutons construits initialement sur iPhone sans exclure les mois anciens et sans changement du grand livre.
- La commande progressive possède une cible tactile d'au moins 44 px et un contour de focus. Après activation, le focus tente d'atteindre la première nouvelle opération rendue.
- Les quatre onglets Historique / À valider / Partage / Imports disposent d'associations de panneaux explicites, d'une sélection et d'un `tabindex` cohérents ; flèches, Début et Fin déplacent la sélection/focalisation au clavier. Le clic tactile reste inchangé.
- Les soldes, devises natives, avertissements de preuves bancaires et raccourcis vers les transactions sont conservés.

**Vérification :** 14/14 assertions ciblées en JS V8 avec environnement Node/DOM simulé, sources GitHub candidat, zéro échec ; parseur syntaxique V8 de l'application. **Non qualifiés :** vraie navigation VoiceOver, Safari iPhone, endurance/performance avec plusieurs milliers d'opérations, données persistées, PostgreSQL/Auth/RLS/CAS et système hors ligne.

### Écarts restant prioritaires

1. Refaire la QA visuelle et tactile dans **un vrai navigateur**, puis Safari physique (focus après pagination, lecteurs d'écran, tabulations, panneaux, petits formats).
2. Régénérer le SW **du laboratoire** avec le générateur officiel : l'inventaire actuel ne contient pas six nouveaux modules différés ; ne pas le modifier manuellement ni déployer une démo périmée.
3. Revoir les états de chargement et grandes listes des autres sections, dont Budget, Imports, Partage et Patrimoine, sans masquer de mouvements.
4. Poursuivre la qualification intégrée des flux de paiement, devises et justificatifs avec des données fictives persistantes avant de déverrouiller toute écriture différée.

Commits : `c9a6b835`, `5ad71fa1`, `d64a2b0e`, `3f62b2db`, `7cbc58a0`, `eb878a36` (tous `[skip ci]`). Voir `docs/TRACE-5.37.0-PREVIEW-READINESS.md`. Aucune modification de `main`, de Supabase réel, de Vercel ou des workflows ; **production NO-GO**.

## 26 octobre — Filtre de compte dans « À valider » et correction du démarrage fictif

**Implémentation :** `v5-app-5.37.0.js`, `trace-international-preview.html`, `trace-international-1.0.0.css`. Le sélecteur de compte affiche le total en attente pour chaque compte actif du membre courant, avec devise native (EUR, CAD, etc.). Il reste distinct de « Historique » et conserve l'accès aux mois précédents. Un compte archivé, étranger au membre ou inexistant ne reste jamais sélectionnable après relecture. Le changement de compte revient à 40 lignes, sans écriture.

**États UX :** liste complète « Tous mes comptes », filtre d'un compte actif, compte sans aucune opération (état vide ciblé), devise étrangère, montant natif inconnu, anciennes périodes, longs historiques, sélection qui devient périmée après changement de membre. Cible tactile 44 px et focus visibles.

**Régression critique corrigée :** le binder des onglets utilisait accidentellement un sélecteur unique avec `.forEach`. Correction à `$$('#activityTabs .tab')` et test spécifique ajouté pour empêcher le retour de ce blocage. Le bootstrap fictif revient à 7/7 scénarios simulés.

**QA de cette reprise :** 23/23 contrôles V8 ciblés (9 navigation/listes, 6 clavier/binder, 8 propriétaires/comptes/devises), et 7/7 bootstrap en DOM synthétique V8. **Ni tests Node natifs complets, ni navigateur réel, ni Safari, ni PostgreSQL.** Un contrôle de cache statique confirme toujours six modules différés absents du SW généré ; reconstruction avec l'outil officiel obligatoire sur checkout complet.

**Restant UX à qualifier :** filtre sur iPhone physique et VoiceOver, grands volumes en navigateur, comportement au retour d'un écran et au changement de propriétaire dans une session authentifiée fictive, parité des autres sections premium, mode hors-ligne après régénération du cache. Aucun changement `main`, aucune publication, quarantaine bancaire inchangée. **Production NO-GO**.


## 26 octobre — Comptes émetteur/destinataire des mouvements à vérifier

Écart UX corrigé : les transferts en attente ne figuraient précédemment que sur la banque `accountId`. Dorénavant, la revue filtrée du compte `toAccountId` retrouve également le virement sans créer une deuxième écriture. Comptage global unique ; comptage par compte de chaque jambe. Texte « Virement reçu » ou « Virement émis ». L'affichage utilise uniquement le montant bancaire **natif de la jambe sélectionnée** et le membre courant ne voit pas la preuve source bancaire du partenaire lors d'une réception. Les preuves destinataires invalides déclenchent « Montant bancaire à vérifier ». Historique et budget inchangés ; tous les mois toujours accessibles, pagination toujours limitée à 40 initialement.

Validation ciblée en V8 simulé sur les véritables sources candidates : **35/35 cas** (9 historiques/sections, 7 clavier, 19 revue dont vrai moteur international) et **7/7 bootstrap**. Tests sur un navigateur et moteur Node natif, Safari iPhone, PGlite/PostgreSQL et tests d'accès serveur toujours nécessaires. Aucun déploiement ni libération des écritures différées, **production NO-GO**.

## 26 octobre — Historique progressif et seconde jambe bancaire réservée aux transferts

Le journal **Historique** de TRACE 5.37.0 dispose maintenant d'un affichage progressif de 60 opérations, avec commandes de chargement 60 par 60, bouton premium à cible tactile 48 px et focus visible, et focus restitué au premier nouveau mouvement. Le nombre total et les calculs de dépenses/revenus/flux restent fondés sur **tous les éléments du mois**, indépendamment de la pagination de l'interface. Les autres mois restent accessibles. Le nombre de lignes revient à 60 en cas de changement de période, filtre, compte ou membre.

Le filtre devise/compte ne considère maintenant `toAccountId` que pour les vrais mouvements `transfer` ; il ne doit pas y avoir de fausse réception EUR pour une dépense CAD avec un champ destinataire non pertinent. Les transferts CAD/EUR, les preuves natives et les pages de validation antérieures sont préservés.

Tests réellement effectués (V8 simulé, sources GitHub) : **7/7** historique progressif, **21/21** journal et filtres, **35/35** navigation/compte, **37/37** intégrité des montants, **27/27** moteur international, **11/11** contrôle PWA et **7/7** bootstrap fictif. Ne pas confondre avec la campagne Node native complète ou une qualification iPhone physique. La stabilité des très grandes listes dans un navigateur réel et VoiceOver restent à vérifier ; aucun déploiement. **NO-GO production**.
