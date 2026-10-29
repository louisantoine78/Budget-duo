# TRACE 5.37.0 — Audit de simplification UX/UI et derniers arbitrages

**Date : 28 octobre 2026. Statut : nettoyage conservateur candidat, propositions visuelles à discuter.**

Branche exclusive : `trace-5.37.0-international-accounts-fx`. Préserver `main`, TRACE 5.36.5, Supabase réel et les règles financières déjà validées. Ce document complète, sans remplacer, `TRACE-5.37.0-UX-PRINCIPES-VISUELS.md`.

## Doublons constatés

- **Accueil** : la carte « Disponible sur mon budget » indique déjà le montant restant, la consommation et une barre de progression. « Budget en direct » reproduisait la même consommation dans un second anneau.
- **Accueil / À faire** : des comptes sans opération à vérifier occupaient autant de place que les comptes demandant réellement une action.
- **Activité / Historique** : le bouton supplémentaire « À valider » répétait l'onglet indépendant « À valider ». Le filtre Statut, lui, sert une autre fonction et doit rester.
- **Imports** : les outils d'import CSV/PDF et le simulateur de débit différé sont fonctionnellement distincts, mais cohabitent dans la même vue.
- **Patrimoine** : les CELI relèvent des actifs ; le montant mensuel versé apparaît également sur la carte de solde de l'Accueil, dont la densité est à revoir.

## Corrections candidates effectuées

1. Sur Accueil, conserver « Disponible sur mon budget » comme résumé de consommation et retirer seulement l'anneau récapitulatif redondant de « Budget en direct ». Conserver les catégories et leurs liens de détail.
2. Sous « À faire », afficher les lignes par compte uniquement en cas d'opération en attente, de source à vérifier ou de ligne OCR non résolue. Préserver le résumé global, les actions Importer / Rapprocher / Rappels et les alertes réelles.
3. Dans l'Historique, retirer le bouton secondaire « À valider » : garder l'onglet dédié, le filtre Statut et les autres raccourcis de navigation.
4. Adapter les tests et régénérer uniquement le service worker fictif. Ni montant, ni compte, ni transaction, ni calcul, ni champ financier n'est modifié.

## Responsabilité principale proposée par onglet (à discuter)

| Onglet | Rôle premier | À éviter |
|---|---|---|
| **Accueil** | Décider quoi faire aujourd'hui : solde consulté, disponible, trois KPI, alertes réelles | Deux graphiques de consommation identiques, comptes sans action, détails bancaires longs |
| **Budget** | Préparer et suivre revenus/fixes/variables mois par mois | Répéter le résumé d'Accueil sans permettre de modifier ou comprendre les postes |
| **Activité** | Historique, À valider, Partage Couple/Proches, Imports | Triple chemin « À valider », tous les filtres complexes exposés en permanence, simulateurs techniques au premier plan |
| **Patrimoine** | Épargne, placements, actifs nets et valorisations traçables | Confondre virements d'épargne et dépenses, inventer un gain sans historique valorisé |

Navigation à conserver : **Accueil | Budget | + | Activité | Patrimoine**.

## Arbitrages UX qui exigent une préférence du propriétaire (non validés)

1. **Densité de l'Accueil :** affichage synthétique sur un écran (solde, budget, mois, actions) avec aperçus secondaires repliés, ou présentation complète en défilement ?
2. **Budget :** conserver le graphique annuel directement sous les postes mensuels, ou l'ouvrir dans une vue « Année / Analyses » ?
3. **Activité :** exposer les cinq rangées de filtres ou afficher les filtres rapides et un bouton « Plus de filtres » ? La vue « À valider » reste indépendante.
4. **Imports :** fusionner la porte d'entrée documentaire CSV/PDF sans fusionner les traitements sous-jacents ; cacher le simulateur différé dans un espace de laboratoire ?
5. **Patrimoine :** montrer le montant mensuel transféré aux CELI sur Accueil et Patrimoine, ou uniquement dans le détail d'épargne ?

**Recommandation proposée :** informations vitales immédiatement lisibles, catégories et analyses en exploration progressive, une entrée principale par action ; détails disponibles, jamais supprimés des données.

## Contenu et critères de sortie distincts des choix graphiques

- Débit différé français : calendrier, effet prospectif, remboursement, frais et preuve bancaire ; écriture réelle toujours verrouillée.
- Import CSV/PDF et OCR : traitement des lignes illisibles, consentement, idempotence, rapprochement et limites de lecture PDF à ne pas masquer.
- Devises et partage : conversions justifiées, bénéficiaires et remboursements, absence de double comptage des dépenses.
- Patrimoine : valorisations datées requises avant toute courbe de performance réelle.
- Sécurité de production : Auth/RLS/CAS multi-session isolé, sauvegarde/restauration, rollback, validation financière, recette iPhone détaillée et autorisation distincte.

**Production : NO-GO. Aucun choix UX proposé dans ce document n'est automatiquement approuvé.**
