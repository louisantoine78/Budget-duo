# TRACE 5.31.22 — File d'attente sur Accueil

Cause : l'ancien compteur ne comptait que les transactions non confirmées, mais les opérations de captures sont des brouillons stockés séparément dans `smartImports`.

Correctif : compteurs par compte bancaire personnel suivi (carte et courant), somme des brouillons OCR encore à confirmer et des transactions enregistrées non confirmées. Déduplication défensive si la transaction d'un brouillon a déjà été enregistrée. Les lignes OCR ambiguës restent affichées comme lignes à revérifier, sans inflation du compteur. Clic sur compte avec imports : ouvrir la file de contrôle du compte dans Importer. Clic avec transactions non confirmées uniquement : liste ciblée permettant d'ouvrir chaque transaction. Clic sur compte sans attente : ouvrir son calendrier. Actualisation lors du rendu de calendrier et de l'application. Aucun document bancaire réel modifié.

Proposition produit distincte : rationaliser les natures de mouvements avant une refonte du moteur de catégorisation.
