# TRACE 5.37.0 — Référence des principes visuels

**Source de vérité UX/UI — 28 octobre 2026**. Ces schémas montrent l'intention validée : ils ne prétendent pas être des captures d'un iPhone réel. Ne pas recommencer la conception lors d'une reprise.

## Accueil : sélection directe des comptes

Conserver exactement l'ordre : Solde estimé, Disponible sur mon budget, Ce mois-ci, À faire, Budget en direct, Évolution, Partage.

    ╭────────────────────────────────────╮
    │ TRACE          Guide         Profil│
    │ Bonjour           [Moi] [Couple]   │
    │                                    │
    │ SOLDE ESTIMÉ                       │
    │  3 670,00 $                        │
    │  Compte courant   Dette carte      │
    │                                    │
    │ Consulter un solde                 │
    │ [★ Desjardins CAD] [France EUR]    │
    │                                    │
    │ ★ Compte principal       Modifier  │
    │ [Comptes et trésorerie          ›] │
    ╰────────────────────────────────────╯

Les comptes se choisissent avec de **petits boutons arrondis** : aucune liste déroulante visible. La sélection change uniquement le solde consulté, dans sa **devise native**, sans modifier le compte principal, le budget ni les données bancaires. L'étoile désigne le compte principal courant. Les boutons défilent horizontalement si nécessaire, avec cibles tactiles de 44 px et focus accessible.

Le panneau secondaire « ★ Compte principal — Modifier » est fermé au repos. Lorsqu'il s'ouvre, il présente **également des pastilles** :

    Choisir avec confirmation
    [★ Desjardins CAD] [France EUR]

    Choix de France :
    « Changer le compte principal ? »
    [Annuler]                 [Confirmer]

Le changement officiel exige toujours une **confirmation explicite**. La sélection simple du solde ne l'entraîne jamais. La gestion complète des comptes est accessible depuis Comptes et trésorerie / Profil, avec deux opérations récentes et accès à l'historique filtré. Les états de taux inconnu restent « à vérifier », sans valeur inventée.

## Historique d'Activité

    [Historique] [À valider] [Partage] [Imports]

    Compte     [Tous] [Desjardins] [France] …
    Catégorie  [Toutes] [Courses] [Loisirs] …
    Nature     [Toutes] [Dépenses] [Virement] …
    Devise     [Toutes] [CAD] [EUR] [USD] …
    Statut     [Confirmées] [À valider] [Toutes]

Pastilles à sélection immédiate, vert profond quand actives, 44 px minimum, scroll horizontal par rangée, état accessible. Les filtres restent cumulatifs et ne modifient ni les écritures ni les calculs financiers.

## Identité graphique et contraintes validées

- Vert profond, fonds clairs chaleureux, coins arrondis, cartes espacées, bordures fines, ombres discrètes et animations légères : **évolution de l'identité TRACE 5.36.5, sans refonte destructrice**.
- Typographie hiérarchisée, montants lisibles et séparés des libellés ; nombres alignés, devises explicites, aucun montant tronqué.
- Cinq onglets exactement : **Accueil | Budget | + | Activité | Patrimoine**. Patrimoine tient sur une seule ligne sur petit iPhone.
- Graphiques compacts, six mois lisibles et accessibles, chiffres non réduits à des ellipses, détails par la page Analyses.
- Accessibilité iPhone : cibles tactiles 44 px, clavier sans zoom, rotation, VoiceOver, contraste, réduction des animations, brouillons préservés.
- Écran personnel : possibilité de consulter les comptes individuels ; écran Couple : synthèse consolidée uniquement avec taux fiables. Épargne et placements dans Patrimoine.

## Validation et statut

Code candidat : bouton de consultation des soldes, choix principal par pastilles et filtres premium d'Activité. Les contrôles Chromium et WebKit Linux sont des **simulations**, pas une validation Safari/iPhone physique. La prévisualisation Vercel privée hébergée, le plan de migration et restauration PostgreSQL, la validation financière finale et l'autorisation explicite restent obligatoires.

**Production : NO-GO** jusqu'à validation. Préserver main, la version stable 5.36.5 et toutes les données réelles.

## Formulaire « Ajouter une opération » — commandes premium (28 octobre 2026)

Les choix de **devise d’achat (CAD / EUR / USD / GBP / CHF)** et de **bénéficiaire de la dépense (Moi / Élise / Nous deux / Avec des amis)** sont maintenant présentés par pastilles tactiles de 44 px, plutôt que par deux listes déroulantes visibles.

    Devise d’achat
    [CAD] [EUR] [USD] [GBP] [CHF]

    Cette dépense concerne
    [Moi] [Élise] [Nous deux] [Avec des amis]

Le bouton actif est vert profond, lisible et annoncé via aria-pressed. La rangée défile horizontalement sans déborder à 320 px. Les sélecteurs natifs restent en source de vérité technique, masqués à l’écran et retirés de VoiceOver / du parcours clavier, pour préserver le calcul et les tests existants. Le passage vers un compte EUR réinitialise la devise du paiement à la devise native du compte ; choisir Amis affiche les champs de partage, revenir vers Moi les masque. Aucune écriture n’est créée en touchant une pastille. La sauvegarde reste explicite.

Ce traitement est **ciblé aux choix courts et fréquents**. Les comptes bancaires, catégories ou rapprochements pouvant comporter beaucoup d’entrées seront examinés séparément avec une solution recherchable et accessible, plutôt que de multiplier des centaines de boutons. Les données réelles ne sont jamais utilisées pour la QA.

Les scénarios de régression doivent tester ces sélections dans Chromium et WebKit Linux ; seule la recette sur véritable iPhone/Safari valide le ressenti et les gestes finaux.

## Choisir le compte d'une nouvelle opération — finition premium du 28 octobre 2026

Le formulaire **Ajouter une opération** propose des boutons arrondis immédiatement disponibles pour chaque compte bancaire autorisé, avec le nom et la devise native. Le compte actif utilise le vert profond, l'état `aria-pressed` et une cible tactile de 44 px ; l'utilisateur ne doit jamais devoir ouvrir une liste déroulante pour ce geste courant.

    Compte bancaire concerné
    [Canada · courant CAD] [Mastercard CAD] [France EUR]

Pour une collection **de plus de six comptes**, une recherche courte apparaît automatiquement au-dessus des boutons : taper une partie du nom filtre les choix, un résultat absent affiche « Aucun compte correspondant ». Aucun service externe, aucune valeur calculée et aucune transaction ne sont nécessaires pour la recherche.

    Rechercher un compte : France
    [France EUR]

Les pastilles utilisent les mêmes valeurs d'un sélecteur natif de référence **masqué** (pour préserver les tests d'interopérabilité) et appellent le même gestionnaire d'événements : changer de compte réévalue la nature autorisée, la devise d'achat et l'aperçu financier, mais ne sauvegarde jamais implicitement une opération. Le choix d'une carte française à débit différé reste soumis aux blocages de sécurité actuels.

**Vérification :** Chromium 320/390/768/1440 ; scénario additionnel en navigateur avec **sept comptes fictifs supplémentaires**, recherche du cinquième compte, sélection et recherche sans résultats. WebKit Linux et recette iPhone physique restent distincts. Ne jamais injecter ces comptes de test dans une base réelle.

Ce schéma représente un **principe UX documenté**, et non une capture d'écran de la future application iPhone.

## Catégories budgétaires — boutons et recherche (28 octobre 2026)

Le formulaire « Ajouter une opération » propose des pastilles arrondies de 44 px pour les catégories **actives et éligibles** à la nature du mouvement. Pas de liste déroulante visible et pas de recherche inutile avec six catégories ou moins.

    Catégorie budgétaire
    [Épicerie] [Logement] [Voyages]

Au-delà de six catégories, le champ de recherche apparaît. La recherche est insensible aux accents, par exemple « epicerie » trouve « Épicerie », et annonce « Aucune catégorie correspondante » lorsque rien ne correspond.

    Rechercher une catégorie : epicerie
    [Épicerie]

Le champ natif `manualTxCategory` reste une source de valeur masquée et inaccessible au clavier, sans changement de logique financière. Une suggestion automatique est reflétée dans les pastilles. Dès qu'un choix manuel est effectué, une nouvelle suggestion ne doit jamais remplacer la catégorie sélectionnée. Un changement de nature recharge uniquement les catégories du type pertinent ; les catégories archivées sont exclues.

**Schémas de principe, pas captures de Safari iPhone.** Production toujours NO-GO.
