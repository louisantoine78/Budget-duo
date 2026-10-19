# TRACE 5.35.1 — Transferts complets avant validation globale

Après l'unification OCR/PDF 5.35.0, la validation globale d'un brouillon dont la nature avait été explicitement sélectionnée pouvait considérer certains transferts comme prêts malgré l'absence de compte destinataire.

- Un paiement de carte exige courant → carte du même titulaire.
- Un virement interne exige un deuxième compte courant du même titulaire. Les transferts vers une carte utilisent obligatoirement la nature « Paiement de ma carte de crédit ».
- Un versement/retrait CELI exige un CELI lié, configuré et dont la date d'ouverture précède le mouvement.
- Le même verrou `legacyImportNatureReady` est utilisé par les validations rapides, en lot et globales.
- La validation en lot ne présente que les lignes budgétaires ; les transferts restent dans « À vérifier » pour ajouter leur contrepartie.
- Des scénarios réels simulés d'import/validation et de solde sont testés sur GitHub Actions.

Aucune modification des opérations de production ni du schéma Supabase ; anciens fichiers de version conservés.
