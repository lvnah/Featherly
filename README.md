# Hevenly

Application communautaire (type Discord) : espaces, salons texte et vocaux, messages privés, amis, rôles.
Interface React + Tailwind CSS, backend Node.js avec base **SQLite**.

## Prérequis

- **Node.js 22.13 ou plus** (le module `node:sqlite` est intégré à Node, aucune dépendance native à compiler).

## Installation

```bash
npm install
```

## Développement

Deux terminaux :

```bash
npm run dev:api   # API sur http://localhost:3001 (rechargement automatique)
npm run dev       # interface sur http://localhost:5173 (proxy /api vers l'API)
```

## Production

```bash
npm run build     # génère dist/
npm start         # API + interface sur http://localhost:3001
```

Variables d'environnement facultatives :

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `PORT` | `3001` | Port HTTP de l'API et de l'interface en production |
| `DB_PATH` | `data/hevenly.sqlite` | Emplacement du fichier SQLite |
| `ALLOW_PLUS_SIMULATION` | activé | Mettre `0` pour désactiver le bouton « Activer PLUS (simulation) » |

## Architecture

```
server/
├── index.js     Serveur HTTP : routes /api et fichiers statiques de dist/
├── db.js        Connexion SQLite et schéma (tables créées automatiquement)
├── auth.js      Mots de passe (scrypt) et sessions par jeton Bearer (30 jours)
├── actions.js   Toutes les règles métier (permissions, limites, unicité)
└── sync.js      Instantané des données visibles par l'utilisateur
src/
├── lib/api.js        Appels HTTP
├── lib/store.js      État client (synchronisé toutes les 2 s) et actions
├── components/       Layout (sidebar), modales, primitives UI
└── views/            Login, Home, ServerView, MessagesView, FriendsView, ProfileView
```

### API

- `POST /api/auth/register` — `{ pseudo, password }` → `{ token, user }` (le tag `#1234` est attribué automatiquement)
- `POST /api/auth/login` — `{ fullName: "Pseudo#1234", password }` → `{ token, user }`
- `POST /api/auth/logout`
- `GET /api/sync` — données visibles pour l'utilisateur connecté (met aussi à jour sa présence)
- `POST /api/actions/:name` — actions métier, par exemple `sendMessage`, `createServer`, `joinServer`, `sendFriendRequest`, `toggleRole`, `kickMember`…

Toutes les routes sauf l'authentification exigent `Authorization: Bearer <token>`.

### Données

Le fichier `data/hevenly.sqlite` contient les utilisateurs (mots de passe hachés, jamais en clair), les sessions,
les espaces, rôles, salons, messages, amis, messages privés, connexions vocales et signalements.
Sauvegardez ce fichier pour conserver les données (ou utilisez `DB_PATH` pour le placer ailleurs).

## Compte administrateur

Le compte **`lvnah#0000`** (statut administrateur) est créé au démarrage s'il n'existe pas, à condition que
`ADMIN_PASSWORD` soit défini (8 caractères minimum). Le mot de passe n'est jamais stocké dans le code.

```bash
ADMIN_PASSWORD='votre-mot-de-passe' npm start
```

Connexion : pseudo `lvnah` (le tag est facultatif car le pseudo est unique) et ce mot de passe.
La page **Admin**, visible uniquement pour ce compte, permet de gérer les utilisateurs (PLUS, suppression),
les espaces (suppression) et les signalements (classer sans suite).

## Règles importantes

- Les règles sont vérifiées **côté serveur** : le client ne fait qu'afficher les permissions.
- Un message privé nécessite une amitié acceptée (ou un historique de messages).
- Seul le propriétaire gère les rôles (un rôle par membre), les codes d'invitation, l'icône, les expulsions et la suppression de l'espace.
- Un message peut être supprimé par son auteur ou par le propriétaire de l'espace.
- Les noms de salons suivent la règle de `server.php` : lettres, chiffres et tirets, 16 caractères maximum.
- Les codes d'invitation personnalisés, les tags libres et les bannières URL sont réservés aux membres PLUS.
- Le statut PLUS est une simulation : aucun paiement n'est géré.

## Limites connues

- Synchronisation par interrogation toutes les 2 secondes (pas de WebSocket) : les messages apparaissent avec un léger délai.
- Le vocal est uniquement un état affiché : il n'y a pas de flux audio.
- Pas de limitation de débit sur l'API ni de téléversement d'images : les avatars et bannières sont des URL.
- Pas de tests automatisés dans le dépôt.
