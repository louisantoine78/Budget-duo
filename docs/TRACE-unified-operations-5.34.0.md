# TRACE 5.34.0 — Modèle de présentation unifié

## Pourquoi
Avant cette version, l'édition des dépenses disait « Type d'opération », la modification bancaire disait « Famille » puis « Nature précise », l'ajout manuel présentait quatre boutons familles et la validation OCR demandait deux sélecteurs. Ces quatre parcours employaient des composants et vocabulaires différents.

## Source commune
Le module `trace-operation-ui-1.0.0.js` centralise les noms des champs et sections, les options de natures regroupées par famille, la compatibilité avec le compte et les optimisations de présentation des éditeurs. Il consomme `TraceMovement` et `TraceImportGuide` : **aucune duplication du référentiel comptable**.

## Modèle visible partout
1. Compte bancaire
2. Nature du mouvement (un seul sélecteur avec familles à l'intérieur du menu)
3. Détails de l'opération (description, montant, date)
4. Catégorie budgétaire et répartition, ou informations complémentaires selon la nature
5. Aperçu de l'impact, puis confirmation

## Adaptations
- **Modifier une dépense / revenu / retour commerçant** : compte remonté en première section, champ « Type d'opération » renommé « Nature du mouvement » avec intitulés du registre TRACE, description déplacée avec date/montant, catégorie déplacée avec répartition. Le sous-type historique `friend_payment_expense` est conservé ; les changements vers d'autres natures hors périmètre passent par le lien de requalification existant.
- **Modifier un virement / paiement de carte / CELI / remboursement** : compte remonté en première section ; une seule liste de natures regroupées par famille ; la famille reste présente en interne pour les traitements existants mais n'est plus une question supplémentaire.
- **Ajouter manuellement** : les champs préexistants sont organisés au chargement en cartes premium identiques, le compte reste premier, une liste complète de natures compatibles est visible, puis les champs conditionnels apparaissent uniquement si nécessaires.
- **Valider une capture** : le compte reste fixé dès l'import ; un seul champ visible « Nature du mouvement » regroupe les familles selon le sens du mouvement, sans perdre le contrôle OCR du sens et de l'image d'origine.
- Mise à jour du titre et des libellés des natures ; **aucune suppression des catégories personnalisées**.

## Garanties
- Les fonctions de sauvegarde de la saisie manuelle, de l'édition d'une transaction et de l'éditeur des virements sont inchangées par rapport à 5.33.1.
- L'extraction et la lecture des brouillons OCR, leur approbation, la détection des doublons, les liens des remboursements, les splits personnels/couple/amis et les soldes sont inchangés.
- Pas de migration Supabase ni de mise à jour des transactions existantes.
- Règles de nature : dépenses réellement payées par le propriétaire, dépenses avancées par un proche, salaires, remboursements reçus, transferts, paiements de carte et épargne restent distinctes.

## Contrôles réalisés
- Scripts JavaScript compilables et tests du module commun.
- 24 tests unitaires/statistiques réussis : filtrage compte courant vs carte, groupes, type legacy, utilisation du composant partagé, intégrité des sauvegardes, cas comptables 180/90/90, remboursement 42 et paiement de carte 500.
- Les tests de rendu DOM complets dans Safari/iOS ne sont pas disponibles ici : vérification visuelle nécessaire après publication.

## Limites à revoir dans une passe dédiée
- Les éditeurs conservent des possibilités de conversion différentes par sécurité : certaines requalifications complexes doivent encore faire l'objet de tests approfondis avant ouverture partout.
- Dans l'import OCR, les champs extraits peuvent précéder la nature pour permettre le contrôle visuel du relevé, mais la terminologie et le sélecteur de nature sont désormais les mêmes.
- Les écrans du Budget (création de postes prévus), Patrimoine et paramètres ne sont pas des éditeurs de transactions bancaires et gardent leurs champs propres.
- Les objectifs d'épargne prévus/réalisés et le rapprochement multi-avances restent des chantiers séparés, non simulés comme déjà livrés.
