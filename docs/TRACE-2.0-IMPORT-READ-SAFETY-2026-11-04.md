# TRACE 2.0 — lecture des imports, checkpoint de sécurité

Date : 4 novembre 2026. **Environnement : candidat fictif uniquement.
Statut production : NO-GO.**

## Changements réalisés dans le moteur candidat 5.37.0

- Instrumentation de FileReader pour l'import CSV : début de lecture,
  réussite, erreur, interruption (abort), et erreur synchrone lors de
  readAsText. La fermeture du compteur est idempotente.
- Observation de la méthode publique asynchrone
  TraceBankDocuments.extract après chargement de tous les scripts, sans
  modification du fichier historique protégé trace-bank-doc-1.11.1.js.
  Ce chemin couvre l'extraction de PDF/images déclenchée depuis les
  interfaces de lecture bancaire et de captures intelligentes.
- Le lecteur Trace20FinancialSafety.read expose le nombre
  knownImportReads en cours, en complément des écritures CAS
  knownImportWrites déjà suivies.
- Les échecs de lecture CSV ou PDF/OCR sont enregistrés dans un ensemble
  de signaux d'erreur sans contenu de fichier, montant, identité, ou
  chemin de fichier. Une lecture suivante réussie ne supprime pas le
  signal d'un échec précédent.

## Limites explicitement conservées

- Le lecteur retourne toujours pendingImports = null, verified = false,
  durable = false, coverageIncomplete = true. Ces compteurs ne prouvent
  pas que tous les flux de fichiers, leurs brouillons ou les écritures
  du serveur soient durables.
- Une lecture CSV réussie prépare des données pour la revue humaine,
  mais n'est PAS une preuve que toutes les transactions ont été
  enregistrées ou rapprochées dans Supabase.
- Les états d'import peuvent s'étendre au-delà de la lecture de fichier
  (revue, sélection des lignes, transactions en attente). Ils doivent
  rester bloquants jusqu'à un inventaire des parcours complet.
- Les traitements PDF, images et OCR reposent sur la disponibilité du
  lecteur embarqué ou de dépendances de reconnaissance ; aucun test
  fictif ne doit être présenté comme validation bancaire réelle.
- Les modules historiques et le service worker de production ne doivent
  pas être modifiés. La migration de 5.36.5 reste un prototype isolé.
- La validation hébergée Auth/RLS/CAS, les imports FR/CA de bout en bout,
  Safari sur iPhone réel, la sauvegarde/restauration et le GO humain
  sont toujours nécessaires avant une publication.

## Preuves locales

1. Tests Node sur le vrai code d'instrumentation, avec deux extractions
   simultanées, échec OCR, interruption CSV et erreur de lecture ;
   aucune transaction n'est enregistrée.
2. Test Chromium et WebKit Linux sur le laboratoire fictif. Les
   événements réels FileReader.onerror/onabort et la méthode publique
   TraceBankDocuments.extract mettent à jour les indicateurs. Les
   documents sont des objets fictifs : aucun serveur bancaire ou
   Supabase n'est sollicité.
3. Le contrôle strict de couverture doit rester NO-GO jusqu'à
   qualification complète. Un compteur d'activité n'est pas une
   autorisation de bascule ou une preuve de durabilité.

Le laboratoire est une aide à la qualification, pas une release publique.
