# TRACE 5.37.0 — recette finale sur véritable iPhone

**Statut : À exécuter. Aucune validation matérielle n'est revendiquée.**

Ce protocole reste **NO-GO** tant qu'un responsable n'a pas exécuté chaque
contrôle sur un iPhone physique et documenté les résultats.

## Préparer sans risquer les données réelles

Utiliser une **prévisualisation isolée** de TRACE 5.37 candidate, avec
uniquement les données fictives du laboratoire et sans compte Supabase
réel. Vérifier l'empreinte/commit de la prévisualisation avant d'ouvrir
le lien. **Ne pas** déployer sur \`main\`, ni utiliser de comptes ou
relevés personnels pour cette recette.

Noter : modèle iPhone, version iOS, version Safari, date, commit candidat,
mode Safari/PWA installée, orientation, connexion et résultat.

## Critères à exécuter sur l'appareil

1. **Safari portrait** : Accueil, Budget, Activité, Patrimoine ;
   pas de débordement, tap cible, aucun texte tronqué ni graphique
   illisible, contrastes et montants cohérents avec les fixtures.
2. **Clavier logiciel** : ouvrir Ajout d'opération, saisir montant,
   date, catégorie et devises ; le champ actif, les erreurs et les
   boutons Enregistrer/Annuler restent atteignables sans zoom forcé.
   Tester un montant invalide, puis vérifier qu'aucune écriture
   fictive n'a été créée.
3. **Rotation physique** : formulaire avec brouillon fictif non
   enregistré, portrait → paysage → portrait ; brouillon préservé,
   scroll fonctionnel et Annuler sans écriture.
4. **VoiceOver + taille de texte augmentée** : naviguer parmi les
   quatre onglets, identifier les libellés de formulaire, le résumé
   bancaire, les six mois du graphique et les messages d'erreur.
   Aucun bouton muet ou contexte de devise ambigu.
5. **PWA installée sur l'écran d'accueil** : lancement autonome,
   icônes/manifest, navigation, touch targets et absence de mise
   en page cassée lors du retour depuis Safari.
6. **Mode avion** : démarrer d'abord en ligne avec cache vérifié,
   passer hors ligne, fermer puis rouvrir la PWA. Le laboratoire
   statique doit se charger et afficher explicitement sa
   disponibilité hors ligne ; aucune donnée réelle, appel cloud
   ou faux solde synchronisé ne doit apparaître.
7. **Reprise après interruption** : quitter temporairement l'app
   pour une autre application, revenir avec/sans réseau ; contrôler
   l'état du formulaire, l'absence de duplication de transaction,
   les messages de resynchronisation et la stabilité de l'interface.
8. **Parcours financiers fictifs** : carte CA (achat puis
   remboursement), transfert CAD/EUR, carte FR à débit différé
   refusée tant que non publiée, CSV en double, CSV avec lignes
   illisibles (consentement explicite). Comparer les comptes et
   budgets avec les montants attendus des fixtures.
9. **Échec réseau/serveur simulé** : pas de fausse réussite ni
   d'écrasement silencieux. Vérifier le comportement de restauration
   du brouillon et les messages au retour en ligne.

## Consigner l'évidence

Pour chaque étape : **PASS / FAIL / BLOQUÉ**, description,
capture si nécessaire (sans données personnelles), commit/version,
résultat attendu et observé, identifiant de correctif et résultat
du nouveau test après correction.

**Règle de sortie :** tous les défauts bloquants corrigés et retestés,
stratégie de migration/retour arrière vérifiée, qualification financière
de fin de cycle explicite et **accord du propriétaire**. Le fait que
Chromium ou WebKit Linux passe n'est **pas** une validation Safari iOS.

10. **Mise à jour avec brouillon en cours** : lorsqu'une nouvelle version
    de la prévisualisation est disponible, le formulaire reste utilisable,
    son brouillon n'est pas rechargé de force et l'avertissement est lisible.
    Après annulation volontaire puis confirmation de la mise à jour, vérifier
    qu'un seul cache actuel subsiste et que la PWA fonctionne hors connexion.
    L'essai doit utiliser uniquement des données fictives.

## Candidate statique installable, sans budget réel

L'export ci-dessous reprend seulement les 69 fichiers autorisés par le
service worker du laboratoire, et crée une page d'entrée exclusivement
fictive. Il ne contient ni configuration Supabase, ni données personnelles,
ni migrations, ni le point d'entrée de la version stable.

    node scripts/export-trace-537-preview.mjs --out /tmp/trace-537-lab

L'installation PWA exige une origine HTTPS fiable : ouvrir dans Safari
l'URL complète se terminant par /trace-international-preview.html,
puis Partager et Ajouter à l'écran d'accueil. Une archive ZIP ouverte
directement depuis Fichiers ne permet pas de tester le service worker.

Si le site de prévisualisation demande une connexion Vercel, se connecter
à son compte autorisé ; le laboratoire est protégé pour éviter d'exposer
la prévisualisation publiquement. Les montants et comptes sont fictifs.
Toute saisie est perdue au rechargement. Cela ne valide pas encore la
résilience des données cloud de l'application finale.

## Essai supplémentaire : session de prévisualisation expirée

Sur l'URL HTTPS **privée et authentifiée**, vérifier que l'ajout à l'écran d'accueil et une mise à jour de worker sous session valide chargent réellement les ressources fictives. Simuler ensuite de manière autorisée l'expiration de l'accès avant une nouvelle installation ou mise à jour ; la PWA ne doit ni afficher une page de connexion en tant que ressource en cache ni déclarer un état hors connexion prêt sur un cache incomplet. Retrouver l'accès via la connexion normale, sans désactiver Vercel Authentication, et vérifier que l'ancienne version active reste utilisable si son cache est sain. Documenter les résultats réels sur iPhone et ne pas confondre ce test avec le simulateur HTTPS local.
