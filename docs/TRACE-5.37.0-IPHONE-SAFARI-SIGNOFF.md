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
