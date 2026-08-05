# Budget Duo v3 — GitHub Pages + Supabase

Budget Duo v3 est une application web de budget individuel et partagé, installable sur iPhone et ordinateur. L’interface reste hébergée gratuitement sur GitHub Pages, tandis que Supabase gère les comptes, l’isolation des espaces et la synchronisation entre les appareils.

## Ce que cette version ajoute

- Un compte distinct pour chaque utilisateur
- Un espace partagé limité à deux membres
- Création d’un espace ou connexion par code/lien d’invitation
- Espaces totalement séparés pour les autres couples ou amis
- Synchronisation des transactions, budgets, catégories, comptes, objectifs et règles de répartition
- Mise à jour en temps réel sur les deux appareils
- Cache local conservé pour la rapidité et les coupures temporaires
- Import automatique des données locales de la V2 lorsque la V2 et la V3 utilisent exactement la même adresse
- Statut visible : synchronisé, enregistrement, hors connexion ou erreur
- Règles Row Level Security afin qu’un utilisateur ne puisse lire que son propre espace

## Architecture

```text
GitHub Pages
  ├── index.html
  ├── styles.css
  ├── app.js
  ├── cloud.js
  ├── config.js
  └── PWA / service worker
          │
          ▼
Supabase
  ├── Auth : courriel + mot de passe
  ├── PostgreSQL : foyers, membres et documents
  ├── RLS : isolation de chaque espace
  └── Realtime : synchronisation instantanée
```

## Installation en 6 étapes

### 1. Créer le projet Supabase

Crée un projet dans le tableau de bord Supabase et attends que la base soit prête.

### 2. Installer la base de données

Dans **SQL Editor**, crée une nouvelle requête, copie tout le contenu de `supabase-schema.sql`, puis clique sur **Run**.

Le script crée :

- `households` : un espace par couple;
- `household_members` : les deux comptes autorisés;
- `documents` : transactions, budgets, catégories, comptes et objectifs;
- les fonctions de création, invitation et connexion;
- les politiques RLS;
- la publication Realtime.

### 3. Récupérer les deux informations publiques

Dans les paramètres du projet Supabase, récupère :

- **Project URL**;
- la clé **Publishable** `sb_publishable_…` ou, sur un ancien projet, la clé publique **anon**.

Ouvre `config.js` et remplace les valeurs :

```js
window.BUDGET_DUO_CONFIG = {
  supabaseUrl: 'https://TON-PROJET.supabase.co',
  supabasePublishableKey: 'TA_CLE_PUBLIQUE'
};
```

La clé publique peut être placée sur GitHub Pages grâce aux règles RLS. Ne mets jamais une clé `service_role` dans ce fichier.

### 4. Configurer les URL d’authentification

Dans **Authentication → URL Configuration** :

- mets l’adresse GitHub Pages finale dans **Site URL**;
- ajoute cette même adresse dans **Redirect URLs**;
- pour les tests locaux, ajoute aussi `http://localhost:8000/**`.

Exemple :

```text
https://ton-utilisateur.github.io/budget-duo/
```

Tu peux conserver la confirmation des adresses courriel. Pour un test très rapide à deux, tu peux aussi la désactiver temporairement dans les réglages d’authentification; chaque compte est alors connecté immédiatement après son inscription.

### 5. Publier sur GitHub Pages

Dépose le contenu de ce dossier à la racine du dépôt, puis active :

**Settings → Pages → Deploy from a branch → main → /root**

Les fichiers indispensables sont :

```text
index.html
styles.css
app.js
cloud.js
config.js
supabase-schema.sql
manifest.webmanifest
sw.js
assets/
```

### 6. Créer votre espace partagé

1. Louis-Antoine ouvre l’application et crée son compte.
2. Il choisit **Créer un espace**.
3. S’il ouvre la V3 sur la même adresse que la V2, il peut cocher l’import des données locales existantes.
4. Dans **Paramètres → Compte et espace partagé**, il copie le lien d’invitation.
5. Élise ouvre le lien dans son navigateur, crée son propre compte et choisit **Rejoindre**.
6. Ses modifications et celles de Louis-Antoine sont ensuite synchronisées.

Pour simuler deux utilisateurs sur un même ordinateur, utilise deux navigateurs différents ou une fenêtre privée, car une session Supabase est conservée par profil de navigateur.

## Migration depuis la V2

L’import automatique fonctionne seulement si :

- la V2 et la V3 sont ouvertes sur le même domaine et le même chemin GitHub Pages;
- les données de la V2 sont toujours présentes dans ce navigateur.

Si l’adresse change :

1. ouvre la V2;
2. télécharge une sauvegarde JSON;
3. crée l’espace Supabase dans la V3;
4. utilise **Paramètres → Importer une sauvegarde**.

L’import JSON est ensuite synchronisé vers l’espace commun.

## Partage avec des amis

Tes amis peuvent utiliser la même adresse publique de l’application, mais ils doivent :

- créer leur propre compte;
- sélectionner **Créer un espace**;
- inviter uniquement leur propre partenaire.

Ils ne voient pas tes données. Ils ne rejoignent ton espace que s’ils possèdent volontairement ton code d’invitation.

## Synchronisation et conflits

Les données sont enregistrées séparément par transaction, catégorie, budget ou objectif. Deux ajouts simultanés différents ne s’écrasent donc pas. Si les deux membres modifient exactement la même transaction au même moment, la dernière modification reçue est retenue.

Lors d’une perte de connexion :

- l’application garde les modifications dans le navigateur;
- le statut passe à **Hors connexion**;
- une nouvelle tentative est lancée au retour du réseau.

Pour la bêta, la première ouverture après un redémarrage complet nécessite encore une connexion afin de vérifier la session et l’appartenance à l’espace.

## Limites actuelles de la bêta

- Deux membres maximum par espace
- Un seul espace par compte
- Invitation par code/lien, sans envoi automatique de courriel
- Pas encore de connexion bancaire Desjardins
- Pas encore de stockage des reçus
- Le code PIN reste local à chaque appareil
- Le thème et le dernier écran consulté restent propres à chaque appareil

## Test local

```bash
python3 -m http.server 8000
```

Puis ouvre :

```text
http://localhost:8000
```

Pense à ajouter cette URL dans les Redirect URLs de Supabase.

## Sécurité

- Les données ne sont pas enregistrées dans le dépôt GitHub.
- La session est gérée par Supabase Auth.
- Les politiques RLS utilisent l’utilisateur connecté pour autoriser uniquement les lignes de son espace.
- Les invitations sont limitées à deux membres.
- Seul le propriétaire de l’espace peut renouveler le code d’invitation.
- La clé `service_role` doit rester strictement privée.
