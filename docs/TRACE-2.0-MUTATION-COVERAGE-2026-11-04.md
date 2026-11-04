# TRACE 2.0 — couverture des écritures avant mise à jour publique
Date : 4 novembre 2026. Statut : **NO-GO**, observations de code exclusivement.

## Portée contrôlée

Le nouvel outil scripts/trace-20-write-inventory.cjs lit les scripts
locaux référencés par le HTML candidat trace-international-preview.html.
Il ne charge ni Supabase hébergé ni aucune donnée client. Les scripts locaux
sont vérifiés avec une empreinte SHA-256 globale reproductible.

Exécution de contrôle :

    node scripts/trace-20-write-inventory.cjs --strict

L'exécution retourne un rapport JSON et code de sortie 2 tant que
l'inventaire n'autorise pas une qualification. Même un inventaire statique
parfait ne suffirait pas à valider la durabilité, les données hors ligne
ou l'authentification hébergée.

## Résultat du premier examen

- 38 fichiers JavaScript locaux parcourus.
- 23 points d'accès RPC, de modification distante ou de session identifiés.
- 3 points marqués guarded : sauvegarde de documents, suppression de
  documents et sauvegarde de réglages par les fonctions du moteur CAS.
- 5 appels identifiés en lecture seule.
- 15 points non couverts par ce même compteur, dont plusieurs mutations
  importantes et plusieurs transitions de session.

Les 15 points ne sont pas 15 bugs financiers prouvés. Ce sont des
chemins à auditer avant d'utiliser un indicateur global
« aucune écriture en cours ».

### Priorité d'intégration

1. Initialisation et rattachement de foyer : create_household,
   join_household, catégories initiales enregistrées par CAS mais
   hors de la file traceSerialWrite.
2. Paramètres et invitations : modification de household_members,
   rotation d'un code d'invitation.
3. Opérations lourdes de foyer : trace_separation_respond,
   trace_household_change_respond, suppression du foyer personnel.
4. Transitions d'authentification et déconnexion : empêcher l'activation
   pendant qu'une session change, même sans transaction en cours.
5. Brouillons ouverts, validation d'import et synchro : obtenir une preuve
   d'absence de modifications non conservées depuis l'application réelle.

L'outil refuse de qualifier automatiquement un nouvel appel RPC inconnu.
Ses tests contrôlent cette détection ainsi que les chemins CAS déjà protégés.

## Critères pour raccorder le consentement

- Tous les chemins qui modifient des données doivent renseigner un état
  commun d'activité et d'échec, sans masquer les mises à jour non confirmées.
- Une preuve de succès serveur et l'absence de conflit doivent être prises
  en compte, sans confondre requête terminée et état durable.
- Un audit des écritures de tous les scripts de la candidate, suivi d'une
  qualification hébergée Auth/RLS/CAS et de deux clients, est obligatoire.
- L'adaptateur trace-20-upgrade-consent.cjs doit recevoir ces preuves
  réelles et interdire la transition si un seul état est inconnu.
- Le test sur iPhone Safari physique et la sauvegarde/restauration
  indépendantes restent des contrôles de publication séparés.

Ne pas modifier main, sw.js, la base Supabase réelle ou les
écritures différées pour effectuer cet examen.

## Étape suivante : lecture directe du moteur candidat 5.37.0

Un lecteur sans effet secondaire a été intégré à la candidate dans
v5-app-5.37.0.js et exposé sur
window.Trace20FinancialSafety.read().

Il observe directement :
- tracePendingWrites et traceWriteQueues pour les documents en cours ;
- traceUnsavedWriteKeys et les conflits/échecs de sauvegarde CAS ;
- la pastille de synchronisation et les formulaires ouverts.

Le retour est figé et ne contient que des indicateurs : il n'exporte
ni opérations, ni comptes, ni données d'authentification.

Pour éviter une autorisation accidentelle :
- verified = false et durable = false dans toutes les circonstances ;
- pendingImports = null (état inconnu) et non 0 ;
- coverageIncomplete = true tant que les autres chemins d'écriture
  recensés ne sont pas instrumentés ;
- l'adaptateur d'activation refuse cet état sans afficher un consentement.

Les essais utilisent le code exact du lecteur candidat, des états d'écriture
simulés, et les deux vrais moteurs Chromium et WebKit sur une prévisualisation
fictive. Ils couvrent notamment les sauvegardes non confirmées, le formulaire
ouvert et les états de synchronisation anormaux.

**Limite :** le lecteur n'est pas une preuve de durabilité hébergée.
Il faudra instrumenter le reste des opérations du foyer, vérifier les
imports, puis mettre en place un contrôle de bout en bout sur une base
de test indépendante, avant la moindre activation publique.
