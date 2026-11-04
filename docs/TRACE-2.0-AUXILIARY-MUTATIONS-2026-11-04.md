# TRACE 2.0 — Observabilité des mutations auxiliaires

Date : 4 novembre 2026. Branche de travail uniquement.
**Décision : GO pour laboratoire fictif, NO-GO pour production.**

## Problème couvert

Le moteur CAS 5.37.0 suit déjà la sauvegarde des documents et leurs
conflits. Mais plusieurs mutations de foyer, de profil et d'authentification
ne passent pas par traceSerialWrite.

Le candidat ajoute trace20TrackAux (et l'interface
Trace20MutationTracker.run pour les modules de séparation) autour de :
- changement du nom de profil dans household_members ;
- rotation du code d'invitation ;
- création/rattachement de foyer et création initiale des catégories CAS ;
- suppression d'un foyer personnel ;
- consentements de séparation et de changement de foyer ;
- changement de session : connexion, inscription, vérification, déconnexion.

Le wrapper restitue les résultats d'origine sans altérer le contenu
des RPC ni leurs règles RLS/CAS. Il conserve le nombre d'appels encore
en attente, y compris deux mutations concurrentes portant le même libellé.
Un rejet de Promise ou une réponse Supabase comportant error marque
durablement le libellé en échec, même après une requête ultérieure réussie.
Les compteurs descendent dans finally. Aucun nom, compte, montant,
jeton de session ou contenu de document n'est exporté par le lecteur.

Le lecteur réel Trace20FinancialSafety.read() combine les opérations
CAS classiques et les mutations auxiliaires. Il expose aussi
knownImportWrites pour les écritures import_days, imports et
reconciliations qui passent par la file CAS.

**Important :** pendingImports reste null. Les traitements de captures,
PDF, OCR et CSV en amont de leur enregistrement ne sont pas tous couverts.
verified=false, durable=false et coverageIncomplete=true restent
systématiquement vrais : les compteurs ne peuvent donc pas autoriser
une activation PWA.

## Revue statique et preuves

La commande node scripts/trace-20-write-inventory.cjs --strict
retourne NO-GO (code 2), comme prévu.

Dans l'HTML candidat, 38 scripts locaux sont inventoriés.
Le scan relève 24 points RPC, écriture directe ou session, dont
3 protégés par la file CAS, 5 lectures seules et 16 autres points
désormais *observed-only*. Les 16 restent tous soumis à une revue
et à une preuve de durabilité hébergée : observé ne signifie
ni validé ni autorisé. Le scanner ne remplace pas une analyse
statique approfondie ni un test de requêtes dynamiques.

Les tests mettent en jeu uniquement des Promises et réponses Supabase
fictives : concurrence, erreurs retournées et levées, rejet
durable, compteurs d'import, refus de migration et vérification
dans les moteurs Chromium/WebKit. Aucun accès Supabase réel.

## Barrières restantes

1. Couvrir le parsing des imports et les brouillons non enregistrés,
   en particulier captures et PDF, avant d'afficher pendingImports=0.
2. Garantir la durabilité de toutes les mutations de foyer, le
   comportement multi-appareil et les états de session Auth.
3. Qualifier RLS, CAS, Realtime, sauvegarde et restauration sur
   environnement hébergé de test réellement isolé.
4. Vérifier physiquement Safari iPhone, application installée, cache
   5.36.5, réseau interrompu, et vrais gestes de saisie.
5. Ne remplacer ni sw.js, ni main, ni la base Supabase de production
   sans qualification et approbation humaine explicite.

Les ressources de laboratoire restent fictives. Le projet
Supabase réel et les autres applications ne sont pas touchés.
