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

## Décisions explicitement validées par le propriétaire — reprise UX du 28 octobre

**Accueil :** conserver le solde estimé avec consultation du solde d'un compte, le disponible budgétaire, les indicateurs du mois, la file d'actions, un seul graphique d'évolution et le raccourci Partage. Éviter les doublons de progression et la liste de catégories détaillées ; celle-ci appartient au Budget. Retirer d'Accueil les raccourcis Importer / Rapprocher / Rappels. Le détail « compte courant / dette de carte » peut rester accessible à la demande. La modification du compte principal ainsi que les comptes complets et leur trésorerie relèvent de Profil → Mes comptes. L'épargne CELI reste dans Patrimoine.

**Budget :** garder entièrement les trois familles, le bilan par catégorie et « Mon année en clair » (prévu, utilisé et restant). Aucune simplification destructive de cet onglet.

**Ajouter (+) :** point d'entrée unique des ajouts, menu en deux étapes :
1. Ajouter manuellement une opération avec le formulaire déjà validé ;
2. Importer un document, avec choix entre opérations quotidiennes/captures et relevé mensuel CSV/PDF. Les flux existants ne doivent pas perdre les avertissements CSV/PDF, la preuve d'origine, la revue humaine ni l'idempotence. Le PDF n'est pas présenté comme une extraction universelle automatique.

**Activité :** trois rubriques visibles « Transactions / À valider / Partage ». Le panneau d'import reste techniquement conservé comme espace interne ouvert depuis « + », mais ne figure plus comme quatrième rubrique de navigation. Les cinq filtres de l'Historique demeurent disponibles derrière « Filtres », replié au repos. Les opérations validées restent consultables en détail et modifiables dans les conditions habituelles.

**Patrimoine :** prévoir plus tard un tableau de bord synthétique des actifs. Les changements structurels importants n'ont pas été décidés lors de cet échange.

**Design :** moins de textes pédagogiques permanents, hiérarchie claire entre synthèse et détail, utilisation d'accordéons et de choix tactiles accessibles, conservation de l'identité vert profond/ivoire. Les réglages des écrans secondaires et les finitions de chaque carte restent à examiner avec le propriétaire.

## Implémentation candidate correspondante

- Accueil : disparition de la liste graphique « Budget en direct », des raccourcis Importer/Rapprocher/Rappels et des versements CELI dans la carte de solde ; détail bancaire masqué au repos. Le sélecteur de compte visible reste **consultatif**, alors que le compte principal reste configurable depuis Profil → Mes comptes.
- « + » : menu explicite manuel/import puis quotidien/mensuel ; réutilisation des flux existants. Aucune nouvelle autorisation de données ni traitement de fichier silencieux.
- Activité : trois sous-onglets visibles, filtres avancés repliables, import comme vue interne sans quatrième onglet ; outils fictifs de débit différé rangés dans un tiroir réservé au laboratoire.
- Budget et Patrimoine : valeurs, données, écritures et sections conservées.
- Les tests de contrat UX et de navigateur doivent être mis à jour selon ces décisions ; la validation physique iPhone de **l'ancien** rendu ne certifie pas automatiquement cette nouvelle disposition.

**Ne pas confondre validation fonctionnelle des cinq parcours iPhone antérieurs et nouvelle validation esthétique.** La mise en production réelle demeure interdite jusqu'à ses propres portes de qualification et l'autorisation explicite du propriétaire.

## Ajustements Home / Année / Activité validés le 29 octobre 2026

- Les différents comptes se consultent toujours sur l'Accueil, mais avec des pastilles plus petites **sans sacrifier la surface tactile de 44 px**. Leur sélection reste en lecture seule ; changer le compte principal demeure une action distincte et confirmée dans les paramètres.
- Le Budget d'Accueil affiche **uniquement « Reste à dépenser » et son montant** avec le lien « Voir le budget ». Les montants prévus, dépensés et le taux de progression restent calculés par le moteur existant mais ne surchargent plus le tableau de bord. Sans budget renseigné, afficher « À définir » et non un zéro mensonger.
- L'Accueil propose, sous « À faire », un **calendrier des imports** qui affiche les journées vérifiées / journées éligibles du mois (agrégé par compte, dates postérieures aux ouvertures, jours écoulés uniquement). Le nombre est calculé d'après les journées explicitement checked ou empty sans brouillon/enjeu non résolu ; un compte non vérifié n'est **jamais** qualifié de synchronisé. Un clic ouvre le calendrier existant via le parcours d'import quotidien.
- « Mon année en clair » devient un aperçu compact de douze mois, comparant par barres le prévu et l'enregistré, avec une fiche du mois sélectionné (prévu, enregistré, restant). L'absence de transactions ou d'import complet ne vaut pas zéro dépensé.
- Dans Activité, les cinq filtres existants restent dans leur tiroir ; seuls les filtres non défaut apparaissent aussi en pastilles effaçables sans déployer tous les contrôles. Le statut « Confirmées » est le défaut et n'est pas présenté comme filtre additionnel.
- Aucune écriture financière, migration SQL, configuration d'API bancaire ou modification de la production n'est nécessaire à ces améliorations.
