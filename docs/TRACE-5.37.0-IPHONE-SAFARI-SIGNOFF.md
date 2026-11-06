# TRACE 5.37.0 — recette finale sur véritable iPhone

**Statut : cinq parcours exploratoires déclarés PASS par le propriétaire sur iPhone Safari le 28 octobre 2026 ; recette détaillée et GO production toujours incomplets.**

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

Vérifier aussi lors de la recette sous accès réel Vercel qu'une réponse de connexion HTTP **200 HTML** ne puisse être mise en cache sous l'URL d'un actif JavaScript/CSS ou PDF.js, même si la redirection 302 a déjà été testée. Ne jamais considérer un badge « prêt hors ligne » comme valide sans contrôler les ressources effectivement chargées.

Complément à la recette ergonomique : vérifier sur le vrai iPhone en portrait (dont largeur logique 320 px si disponible) que le bouton Aide/Guide en haut dispose d'une cible tactile d'au moins 44 × 44 px, sans écraser le solde, le titre ni les actions du bandeau ; confirmer qu'il fonctionne au toucher et avec VoiceOver. La validation sur WebKit Linux n'est pas équivalente à ce test matériel.

## Retour de recette physique communiqué par le propriétaire — 28 octobre 2026

**Nature de la preuve :** auto-déclaration reçue dans la conversation de suivi, pas une exécution instrumentée ni un enregistrement de captures / journaux Safari. Le modèle d'iPhone, la version iOS/Safari, les mesures de performance et les étapes détaillées n'ont pas été communiqués. **Niveau : PASS déclaré, sans certification indépendante.**

**Cible déclarée :** aperçu privé fictif Vercel `trace-537-iphone-qnsagjsyl-lambotla-1719.vercel.app/trace-international-preview.html`, associé au commit applicatif `c368e5dcfcf3b8153554cb5358d1353fbba14e5f` (projet distinct `trace-537-iphone-lab`, déploiement `dpl_2WEHrj81M9gRzwwZWdC7DLtEYFnP`). Aucun environnement de production.

### Cinq parcours utilisateur déclarés validés (5/5)

1. **PASS déclaré** — ouverture du lien dans Safari et authentification Vercel.
2. **PASS déclaré** — exploration Accueil, Budget, Activité, Patrimoine ; lisibilité, fluidité et esthétique premium.
3. **PASS déclaré** — sélection comptes, devises, bénéficiaires, catégories et recherche.
4. **PASS déclaré** — formulaires et états vides Budget, sans données personnelles.
5. **PASS déclaré** — installation sur l'écran d'accueil, mode avion, réouverture, rotation et VoiceOver.

Le propriétaire n'a signalé aucun défaut dans ce retour. Les cinq groupes ne fournissent pas, à eux seuls, la preuve de toutes les sous-étapes du protocole détaillé ci-dessus. En particulier, **restent non documentés** : iPhone/iOS/Safari exacts ; clavier logiciel avec valeurs invalides et taille de texte augmentée ; reprise avec brouillon après interruption ; erreurs réseau/serveur ; renouvellement/expiration de session protégée et réponses d'authentification inattendues ; mise à jour du service worker pendant un brouillon ; scénarios financiers complexes comparés aux fixtures sur appareil réel. Ne pas marquer ces sous-étapes comme exécutées.

### Qualification technique distincte déjà obtenue

Sur le checkout applicatif `c368e5d`, des contrôles précédents ont établi : Git HEAD/tree vérifiés, export statique fictif de 69 fichiers autorisés et service worker à 68 actifs, prévisualisation HTTPS Vercel READY protégée par SSO, réponse anonyme HTTP 302, page/manifest/worker et modules principaux identiques au contenu GitHub, fichiers de production ciblés retournant 404 ; Chromium et WebKit Linux (320/390/768/1440) PASS, mode hors ligne PASS, **51/51 tests ciblés de l'export**, **34/34 scénarios financiers fictifs Chromium**, et simulation HTTPS avec session fictive PASS. Les simulations ne prouvent pas les conditions réelles d'expiration de session iOS ni les écritures de production.

**Décision :** la prévisualisation fictive est apte à la poursuite de la recette utilisateur ; aucune mise en production, migration, bascule du débit différé, manipulation de Supabase réel ou fusion dans `main` n'est autorisée. Il reste à documenter les cas détaillés ci-dessus, à qualifier la persistance/Auth/RLS/CAS et les migrations sous base isolée, à valider backup/rollback et les finances, puis à obtenir un accord explicite et distinct pour la production.
