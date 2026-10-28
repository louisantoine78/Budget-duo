# TRACE 5.37.0 International — audit UX / finition premium

**Point de référence :** 28 octobre 2026. À relire avec le HEAD GitHub courant. Ce document différencie une décision de conception, son intégration réelle et sa recette finale.

## Identité demandée et déjà représentée dans la candidate

- **Vert profond + fonds clairs chaleureux**, cartes arrondies, bordures fines, ombres discrètes, hiérarchie de montants lisible : direction conservée dans `trace-international-1.0.0.css` et le shell candidat.
- **Navigation exacte à cinq onglets** : Accueil | Budget | + | Activité | Patrimoine, avec zones tactiles vérifiées dans le laboratoire.
- **Accueil dans l'ordre décidé** : Solde estimé, Disponible budget, Ce mois-ci, À faire, Budget en direct, Évolution, Partage.
- **Lecture des comptes par boutons compacts** (sans changer le compte principal) et segmentation `Moi / Couple` : déjà intégrées.
- **Graphiques et montants mobiles** : six mois lisibles, chiffres non tronqués, animation réduite lorsqu'elle est demandée ; vérifications automatisées Chromium/WebKit Linux.

## Travail graphique et interaction supplémentaire

**Activité — Historique** : les cinq filtres Compte, Catégorie, Nature, Devise et Statut sont présentés sous forme de **boutons pastilles sélectionnables**, défilables horizontalement dans chaque groupe au lieu de cinq listes natives visibles. Les couleurs actives utilisent le vert profond, avec focus clavier, `aria-pressed` et des zones tactiles de 44 px. Les valeurs continuent de passer par le moteur de filtrage existant : pas de nouveau calcul, ni d'écriture. Le `select` interne est masqué/inaccessible à l'utilisateur pour garder les contrats de tests et les transitions existants. Les autres formulaires et sélecteurs de l'application ne sont **pas** prétendus entièrement remplacés par des pastilles.

**Bouton Aide** : la cible de 36 px a été portée à 44 px sur les petits écrans dans la feuille de style propre à 5.37.

## Restant à harmoniser / valider avant le label « visuel premium terminé »

- Examiner les autres menus encore natifs, notamment les réglages, les sous-parcours d'import, les formulaires et les sélecteurs qui ont beaucoup d'options ; préférer des choix directs quand cela améliore l'ergonomie, sans sacrifier la lisibilité des listes longues ni l'accessibilité.
- Revue qualitative des cartes, icônes/pictogrammes, rythme d'espacement, transitions discrètes, états vides, messages d'erreur, graphiques et contraste sur chaque vue et modal.
- Vérification vraie iPhone/Safari : clavier logiciel et zoom, touch/scroll de la rangée de pastilles, VoiceOver (états et intitulés), paysage, PWA installée, hors ligne et vraie authentification HTTPS du laboratoire.
- Prévisualisation dédiée protégée mise à jour **depuis l'export fictif uniquement**. L'ancienne URL Vercel n'est pas la preuve de ces changements.
- Sauvegarde / rollback, validation financière et autorisation explicite restent des conditions de mise en ligne réelle.

**État d'avancement :** projet estimé environ 90 % au pilotage, sans convertir ce chiffre en certification d'achèvement visuel. **Production : NO-GO.**

## Accueil — validation des sélecteurs (28 octobre 2026)

Les boutons de consultation des comptes existaient déjà. Le panneau de modification du compte principal affichait encore une liste déroulante native : la candidate la remplace par des pastilles arrondies en conservant la confirmation obligatoire. L'étoile marque le compte officiel et la devise native accompagne les boutons. Ce changement est une amélioration de présentation, **sans changement de logique financière**.

Référence des schémas visuels et comportements : docs/TRACE-5.37.0-UX-PRINCIPES-VISUELS.md. Ne jamais présenter les schémas comme des captures d'un iPhone physique.

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

## Pastilles de catégories — finition du 28 octobre 2026

Le champ de catégorie du formulaire d'ajout affiche les catégories éligibles sous forme de pastilles, recherchables à partir de sept choix, avec état actif vert profond et accessibilité. La recherche tolère les accents et présente un état vide. Les suggestions automatiques sont respectées **avant**, mais jamais **après**, le choix manuel de catégorie. Les catégories archivées ne sont pas proposées. L'original `manualTxCategory` reste l'état source du moteur, invisible à l'utilisateur. Voir la maquette `docs/TRACE-5.37.0-UX-PRINCIPES-VISUELS.md`.
