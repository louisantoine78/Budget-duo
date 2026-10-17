# TRACE 5.31.20 — Départ personnel et suppression du foyer partagé

## Point 2
- Foyer solo : la suppression protégée existante est conservée.
- Foyer partagé : demander son propre départ de TRACE. Confirmation authentifiée des deux membres. Une unique transaction SQL sépare les données personnelles avec les règles conservatrices existantes, efface ensuite l'espace personnel du demandeur et conserve l'espace individuel du partenaire.
- Archive : le foyer partagé historique reste stocké sans accès direct des deux membres. L'action n'efface **pas** toute information du demandeur incluse dans cette archive (ex. opérations communes). L'interface avertit explicitement.
- Comptes d'authentification Supabase, y compris ceux pouvant servir à PickPoint, non supprimés.

## Point 3
- Foyer partagé : demande d'effacement avec deux comptes authentifiés et confirmation du mot de passe depuis l'interface, délai d'expiration 7 jours.
- Le serveur valide les appartenances à chaque approbation, verrouille le foyer et bloque toute autre demande concurrente.
- Au second accord, suppression atomique du foyer et documents liés avec cascades; suppression de snapshots v4 explicitement.
- Aucun membre ne peut supprimer seul les informations de l'autre ; les deux peuvent annuler avant le second accord.

## Sécurité
- Table `trace_household_change_requests` RLS sans politique ; seuls les RPC authentifiés peuvent opérer.
- RPC `trace_household_change_status()` et `trace_household_change_respond(p_action,p_confirm)`.
- L'opération « exit » s'appuie sur `trace_separation_respond(true)` déjà renforcée ; la suppression du nouvel espace du demandeur est dans la même transaction.
- Aucune opération de suppression réelle n'est déclenchée par l'installation de la migration.
- Tests d'authentification absente et vérifications SQL statiques passés. Il reste à réaliser des tests de bout en bout à deux identités isolées avant validation complète.

Migration : `trace_shared_exit_and_household_deletion_two_party`.
