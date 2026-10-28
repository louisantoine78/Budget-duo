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
