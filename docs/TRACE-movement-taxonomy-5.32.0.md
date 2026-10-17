# TRACE 5.32.0 — qualification progressive et intégrité budgétaire

## Catégories ≠ natures ≠ partage
4 familles : Dépenses, Entrées d'argent, Paiements et virements, Épargne et patrimoine. La nature du mouvement détermine le sens du flux bancaire et son effet budgétaire. La catégorie ne s'applique que lorsque le flux a un effet sur un budget. La répartition reste séparée (moi, partenaire, couple, amis).

## Invariants financiers
- Achat couple 40,00 $ à 50/50 : compte payeur -40,00 $, dépenses personnelles 20,00 $ chacune, couple 40,00 $.
- Achat 100,00 $ avec 42,00 $ avancés à des amis et 20,00 $ pour l'autre membre : dépenses personnelles 38,00 $/20,00 $, couple 58,00 $ ; compte bancaire -100,00 $.
- Remboursement d'un proche 42,00 $ : compte courant +42,00 $, revenus budgétaires 0, dépenses budgétaires 0 (la dépense initiale doit déjà avoir été répartie).
- Retour de commerçant : +montant au compte et réduction des dépenses de la catégorie et des bénéficiaires concernés.
- Paiement de carte : mouvement du courant vers la dette de carte, hors dépenses du budget.
- Versement vers CELI/épargne : compte courant -montant, CELI +montant, hors budget ; retrait inverse.
- Règlement à un proche déjà comptabilisé : sortie du compte courant, hors budget ; remboursement d'une dépense faite par un proche non encore comptabilisée : catégorie de dépense obligatoire.
- Parts monétaires exactes au centime, y compris quand le membre connecté est le second membre (partner). Les budgets partagés reprennent le bon ordre « ma part / celle de mon partenaire ».

## Interfaces
- Saisie manuelle : quatre grandes familles en deux colonnes, choix de la nature précise, catégorie et partage visibles seulement lorsque nécessaires, comptes destinataires et CELI conditionnels, aperçu avant confirmation.
- Import intelligent sur capture : sélection progressive de famille et nature, options et catégories adaptées, aperçu avant confirmation, aucune publication automatique depuis l'OCR.
- Modification : aperçu budgétaire des dépenses/retours/revenus ; autres opérations modifiables dans un formulaire de mouvement, avec famille/nature et compte source.
- Liaison facultative remboursement ↔ achat initial avec part amis : propose uniquement les achats déjà confirmés, payés par l'utilisateur et disposant d'une part amis explicite. Vérifie le montant restant non remboursé ; ne déduit jamais le remboursement une seconde fois du budget. Bloque la suppression ou la réduction de la part amis d'un achat encore lié à des remboursements confirmés.
- Aucun lien n'est deviné automatiquement ; les opérations anciennes ne sont pas requalifiées.

## Compatibilité et limites
Les types de documents historiques (expense, income, refund, transfer, external_transfer, external_refund...) restent inchangés ; le détail de nature est enregistré dans transferPurpose. Aucun changement de table Supabase n'est requis ; aucun mouvement réel n'est modifié lors du déploiement.
Le flux ancien CSV/PDF et les opérations spéciales historiques conservent leur éditeur existant ; une migration de toutes les interfaces secondaires n'est pas effectuée dans cette passe.
Le lien de remboursement est validé à partir de l'état du foyer chargé dans le client. Les validations concurrentes entre deux sessions et les parcours complets iPhone sont à qualifier par tests de bout en bout avant la sortie bêta.
Les scénarios de calcul ont été testés en JavaScript pur (dépense couple, rôles inversés, 40,01 $, achats amis, remboursements, carte, retours de commerçants) ; la syntaxe du JS est vérifiée avant publication.
