# TRACE — Séparation des foyers, audit de sécurité v5.31.19

## Décision métier
Après l'accord authentifié des deux personnes, deux espaces individuels sont créés par une transaction atomique. Seules les données personnelles explicitement attribuables sont reprises. L'espace commun antérieur et son historique sont archivés, sans membre, et ne sont pas accessibles depuis les espaces individuels. L'archive n'est pas automatiquement détruite.

## Critères de conservation des opérations
- Compte émetteur détenu personnellement par l'utilisateur (owner correspondant à son ancien slot).
- Payeur et bénéficiaire renseignés explicitement et identiques à ce slot.
- Part personnelle de 100 %, parts des autres membres égales à 0 %.
- Aucun champ de ventilation monétaire mixte (splitAmounts objet) ni valeur manquante.
- Type admissible : dépense, revenu, remboursement, transfert vers un autre compte identifié et personnel, transfert vers ou depuis un compte de placement personnel.
- Vérification des comptes de destination et de placement par appartenance stricte.
- Le slot et la répartition des documents copiés sont normalisés vers l'identité individuelle la / 100 %.
- Comptes et investissements personnels conservés ; soldes bancaires de référence, imports et rapprochements non repris.
- Budgets strictement personnels sans ventilation commune conservés ; budgets communs exclus.
- Catégories de base conservées ; catégories personnalisées reprises seulement si utilisées par des documents personnels admissibles.

Les opérations ambiguës sont toujours laissées dans l'archive et jamais attribuées au hasard.

## Mesures serveur
- Règles garanties dans public.trace_separation_respond(bool), SECURITY DEFINER, identity-check et verrou du foyer.
- Contrôle d'éligibilité dans trace_internal.is_personal_transaction(jsonb,text), schéma non exposé et accès refusé aux rôles anon et authenticated.
- Confirmation séparée depuis les deux identités authentifiées, annulation possible avant finalisation.
- Aucun utilisateur auth.users supprimé ; aucune ressource PickPoint modifiée.
- L'ancien foyer devient archivé et son code d'invitation ne permet pas de le rejoindre.

Migrations Supabase : trace_separation_strict_personal_only_audit puis trace_classifier_fail_closed_boolean (17 octobre 2026 UTC).

## Vérification
13 scénarios unitaires fictifs évalués en SQL, 13 conformes : dépenses A/B personnelles, dépenses mixtes, bénéficiaire couple, champs manquants, ancienne opération sans répartition, transferts incomplets, transferts personnels, CELI et opérations de groupe.
Aucun RPC de séparation ni aucune suppression sur un utilisateur réel n'a été exécuté durant cette passe.

**Limite :** le parcours complet de double consentement, le rollback lors d'un échec au milieu de la copie et l'absence d'accès entre foyers doivent encore être testés de bout en bout dans un environnement isolé doté de deux identités fictives avant qualification finale.
