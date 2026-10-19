# TRACE 5.32.6 — Centrage de la date sur iPhone

La version 5.32.5 a corrigé le débordement iOS du sélecteur Date, mais la date affichée reste alignée à gauche. La présente passe est volontairement limitée au composant date de l'éditeur standard.

- Champ `#txDate` natif de type date maintenu, couvrant entièrement le contrôle et restant tactile et accessible.
- Libellé visuel indépendant `#txDateDisplay` centré, non interactif et masqué à l'accessibilité pour éviter toute redondance.
- Indicateur de calendrier fin à droite.
- Mise à jour du texte lors des événements `input` et `change`; valeur ISO originale conservée pour l'enregistrement.
- Date formatée en français `16 oct. 2026` sans conversion de fuseau horaire ; aucun changement de budget, montant, catégorie, nature, partage, compte ni SQL.
- Test contrôleur JS avec date initiale 2026-10-16, changement fictif vers 2026-11-03 ; rendu attendu `16 oct. 2026` puis `3 nov. 2026`, valeur réelle `2026-11-03`.
- Fonction `save(confirm)` de l'éditeur : comparée avec 5.32.5 et strictement identique.
- Vérification visuelle de l'alignement sur iOS réel encore nécessaire.