# TRACE 5.32.1 — Virement à une amie, dépense de week-end

Cas confirmé : un virement sortant de 180 $ le 16 octobre à une amie ayant avancé des coûts de voyage doit être catégorisable comme une dépense Vacances / Voyages, même si le séjour a lieu plus tard. Le type « Règlement à un proche · déjà compté » est réservé à une dépense déjà enregistrée dans TRACE, et ne crée aucune nouvelle dépense.

### Correctif
Dans le formulaire « Mouvement bancaire », la famille « Paiements et virements » propose désormais « Payer ma part à un proche · dépense » pour les mouvements sortants. Ce type montre une catégorie de dépense, le choix Moi/Partenaire/Nous deux/Avec amis, ainsi que l'aperçu budgétaire. Il requalifie **le même document** ; aucun doublon bancaire n'est créé. Le compte d'origine est vérifié comme compte courant. Seule une catégorie de dépenses valide peut être enregistrée.
Le numéro du document, la date et le montant d'origine sont conservés par défaut et restent modifiables comme auparavant.

### Calculs vérifiés
- 180 $ de débit, catégorie Vacances / Voyages, pour les deux à 50/50 : 90 $ pour chacun, 180 $ pour le couple, et un seul mouvement bancaire de -180 $.
- 180 $ personnel uniquement : 180 $ dans le budget du payeur.
- 180 $ déjà comptés : conserver la nature hors budget, aucune double dépense.
- Rôles inversés LA/partenaire : répartition identique.

Aucune transaction réelle n'est modifiée par le déploiement. Tests de calcul fictifs et vérifications statiques réussis, essai de bout en bout sur iPhone à effectuer.
