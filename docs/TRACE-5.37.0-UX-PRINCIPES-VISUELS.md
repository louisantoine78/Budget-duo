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
