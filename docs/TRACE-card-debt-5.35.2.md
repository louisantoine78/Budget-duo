# TRACE 5.35.2 — Dette de carte et solde disponible

## Problème confirmé
L'édition d'un solde de carte via Profil > Mes comptes sauvegardait les montants saisis positifs directement, alors que les nouveaux comptes carte utilisaient un solde négatif. Un solde positif de 595,90 $ pouvait alors s'ajouter aux versements vers la carte et apparaître comme un actif au lieu d'une dette.

## Comportement corrigé
- Mes comptes affiche la dette positive (exemple : 595,90 $) mais la sauvegarde sous signe comptable négatif. Les anciens soldes positifs sont **interprétés** comme des dettes, sans migration ni écriture automatique.
- Le solde net affiche le compte courant moins les dettes de carte, et ne comptabilise pas un avoir bancaire estimé comme de l'argent courant disponible.
- Si les paiements de carte enregistrés dépassent les achats confirmés, TRACE montre « À vérifier » et une explication. Il ne transforme pas un écart de rapprochement en argent disponible.
- Rapprochement : dette ou avoir de carte explicitement sélectionnable, avec montant positif au formulaire et signe correct en comptabilité.
- Patrimoine : estimation à rapprocher tant qu'une carte montre un avoir non confirmé par les transactions.
- Les virements CELI restent déjà comptés dans le courant ; leur total mensuel est seulement affiché à titre informatif.

## Exemple de référence
Dette au 30 septembre : 595,90 $. Achats/débits du 1er au 8 octobre : 751,94 $. Paiement : 750 $. Remboursement : 22,87 $. Frais : 0,01 $. Dette théorique le 8 octobre = 574,98 $. Sans achats enregistrés et avec trois paiements totalisant 1 825 $, l'ancienne estimation produit environ 2 421 $ de faux disponible ; le modèle corrigé demande de contrôler les achats manquants.

## Précautions
Aucune donnée Supabase ni transaction réelle modifiée. Tests sur données fictives et vérification visuelle iPhone encore nécessaire.
