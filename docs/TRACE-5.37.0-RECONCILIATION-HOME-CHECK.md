# TRACE 5.37.0 — Rapprochement affiché avec précision

**Branche candidate seulement. Production 5.36.5 inchangée.**

Le badge de l'Accueil ne doit pas afficher « Rapproché » simplement parce qu'un relevé a été contrôlé dans l'historique. Il requiert désormais un rapprochement confirmé, appartenant au compte chèque personnel principal encore actif, daté du mois courant et non postérieur à aujourd'hui. La date effective est affichée. Une carte à vérifier conserve sa priorité ; la vue Couple n'extrapole jamais un rapprochement individuel au foyer entier.

La recherche du dernier contrôle s'effectue en une itération, sans trier la collection. Les tests fictifs simulent plusieurs comptes, membres et périodes, sans serveur externe. Aucun montant ni enregistrement bancaire n'est modifié.

La recette hébergée Auth/RLS à deux utilisateurs, la sauvegarde/restauration et le Safari physique restent bloquants avant GO production.
