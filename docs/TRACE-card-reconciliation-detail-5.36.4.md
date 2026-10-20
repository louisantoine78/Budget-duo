# TRACE 5.36.4 — Détails pédagogiques du paiement de carte rapproché

## Demande
Depuis Activité, cliquer sur un paiement Mastercard rapproché doit expliquer le mouvement, et non afficher directement une alerte de retrait du rapprochement.

## Affichage (consultation seule)
- Statut « Rapproché », montant du règlement (au centime), nom et date du virement.
- Parcours compte courant −750 $ → dette de carte −750 $ pour le paiement de 750 $, avec les noms des comptes.
- Impact budgétaire 0 $, revenu 0 $, variation nette du patrimoine 0 $ : transfert déjà comptabilisé.
- Preuve(s) du relevé de carte avec libellé, date et montant de chaque ligne rapprochée.
- Si somme des preuves différente du montant du paiement, avertissement de vérification plutôt que fausse certitude.
- Bouton principal **Fermer** ; section secondaire « Corriger ce rapprochement » repliée, avec étape de confirmation avant dissociation.
- Le même détail s'ouvre depuis le transfert côté compte courant et une preuve validée présente côté carte. Si un lien est orphelin, afficher une explication sans suppression directe.

## Comptabilité, données, sécurité
Ce nouvel écran est **en lecture seule** jusqu'à une action explicite de retrait. Le retrait garde les mêmes écritures qu'avant : les preuves redeviennent en attente, le paiement et ses impacts bancaires sont conservés. Aucun changement de calcul, de nature, de transaction Supabase ni de structure de données. Tous les champs bancaires sont échappés pour le HTML.

## Tests
Ajouter des tests exécutables du générateur, des dates et montants, de l'ouverture sans mutation, de la confirmation du retrait, du côté carte et du cas de preuve orpheline, en plus des tests existants. Rendu Safari iPhone à vérifier après déploiement.
