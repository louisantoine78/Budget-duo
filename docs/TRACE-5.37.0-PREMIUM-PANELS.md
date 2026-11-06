# TRACE 5.37.0 — Système visuel premium des panneaux

**Statut : réalisé sur la branche candidate, laboratoire fictif uniquement. Production 5.36.5 inchangée.**

## Objectif produit
Appliquer le même langage visuel que l'Accueil et le Budget aux interfaces ouvertes depuis les onglets. Garder l'application rapide et cohérente sur iPhone, sans changer le calcul des montants ni les règles de validation.

## Composants communs
- En-tête avec repère de contexte, titre lisible, sous-titre utile lorsque le panneau comporte un formulaire, fermeture accessible 44 × 44 px.
- Panneau ivoire/vert minéral, hiérarchie typographique stable, champs min. 49 px, montant budgétaire mis en valeur, focus visible.
- CTA primaire de sauvegarde et CTA secondaire homogènes ; suppression distinguée ; erreurs rédigées en texte lisible, non exprimées par la couleur seule.
- Marges adaptées aux iPhone 320/390 px et centrage sur tablette/desktop ; prise en compte des préférences de réduction des animations.
- Les choix natifs masqués au profit de chips dans le formulaire bancaire restent masqués ; pas de double contrôle visuel.
- Tout panneau TRACE utilise le socle commun ; les panneaux métier prioritaires reçoivent un traitement contextuel (opération, budget, compte, patrimoine, contrôle bancaire).

## Préservation des règles métier
L'amélioration est une couche de présentation isolée : fichiers CSS/JS trace-premium-panels-5.37.0, branchés dans la prévisualisation candidate. Un unique appel facultatif dans openSheet définit le traitement. Aucun ID de champ, événement de sauvegarde, RPC Supabase ou calcul financier n'est modifié.

## Contrôles de sortie
- Tests navigateur avec ouverture et fermeture de panneaux à 320, 390 et 768 px ; opérations via Ajouter, ajout des trois natures de budget, copie du budget, patrimoine et nouveau compte.
- Vérification de la taille des cibles, absence de débordement et nettoyage du contexte d'un panneau à l'autre.
- Tests Node d'inventaire et d'isolation de la couche visuelle ; tests financiers et SQL habituels obligatoires.
- Aucun changement à la version stable main. Une prévisualisation n'est pas un GO production.

## Suite
Faire valider le ressenti sur Safari iPhone réel et les écrans d'édition avancée/validation/import, puis lever indépendamment les blocages Auth/RLS, sauvegarde et bascule de service worker.

