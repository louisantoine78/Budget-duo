# TRACE 5.37.0 — Copie du budget, interruptions et conflits

Statut : candidat 5.37.0 ; production NO-GO.

## Défaut corrigé
La copie d'un budget du mois précédent modifiait le tableau local avant la confirmation de chaque RPC de sauvegarde. Si le deuxième poste échouait, le poste refusé pouvait apparaître à tort dans la session comme déjà enregistré. La copie n'est pas une transaction atomique multi-documents : il faut donc distinguer les postes sauvegardés et les postes non encore enregistrés.

## Nouveau comportement
- L'écriture CAS de chaque ligne est attendue avant tout changement du budget local.
- Si le deuxième poste échoue, seul le premier poste confirmé peut rester dans la vue, sans masquer le refus.
- Le message indique « N sur M postes enregistrés » et recommande une vérification avant nouvelle tentative.
- Une reprise réutilise les identifiants des postes déjà sauvegardés et n'ajoute pas de doublons.
- En cas de conflit de révision déclaré, le bouton ne propose pas une nouvelle écriture ; l'utilisateur doit recharger les données.
- Les scopes budget personnel, commun et partenaire restent distincts. Aucun transfert ni transaction réelle n'est recalculé ou altéré.

## Tests
Quatre scénarios d'exécution du vrai gestionnaire copyPreviousBudget (extrait du candidat) : écriture en attente, premier enregistrement refusé, deuxième refusé suivi d'une reprise, budget Couple avec conflit. Aucun serveur externe et aucune donnée réelle.

### Limite
Il ne s'agit ni d'un commit multi-lignes ACID, ni d'un test Supabase hébergé à deux navigateurs. Des sauvegardes successives restent partiellement conservées si une panne intervient entre elles, ce qui est indiqué explicitement à l'utilisateur.
