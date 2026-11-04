# Hevenly — version React

Recréation de l'application Hevenly (type Discord) en React + Vite + Tailwind CSS, avec le même design system
(couleurs `brand` / `ink`, polices Plus Jakarta Sans, coins `rounded-[2.5rem]`, `backdrop-blur`, `thin-scroll`,
tiroir mobile `sidebar-drawer` et `mobile-overlay`).

## Lancer le projet

```bash
npm install
npm run dev      # serveur de développement
npm run build    # build de production dans dist/
```

## Fonctionnalités couvertes

| Spec | Implémentation |
| --- | --- |
| Connexion / session (`login.php`) | `src/views/Login.jsx` — choisir un compte ou créer un pseudo |
| Présence (`last_activity`, < 45 s) | `isOnline()` dans `src/lib/util.js`, heartbeat toutes les ~14 s |
| Profil, tag `#1234`, avatar, bio, bannière | `src/views/ProfileView.jsx` (édition + profil public) |
| Statut PLUS (tag libre, bannière URL, code perso) | `togglePlus()` — simulation locale, pas de paiement |
| Sidebar, serveurs, profil en bas | `src/components/Layout.jsx` |
| Accueil : recherche, bannière, stats en direct | `src/views/Home.jsx` |
| Serveurs : création, adhésion par code, invitation | `CreateServerModal`, `JoinServerModal`, `InviteModal` |
| Salons texte / vocaux, un seul vocal actif | `src/views/ServerView.jsx`, `joinVoice()` / `leaveVoice()` |
| Interdiction de supprimer le dernier salon | `deleteChannel()` |
| Chat de salon, polling 2 s, pseudo coloré par rôle | `ServerView.jsx` + `sync()` dans `App.jsx` |
| Rôles (nom, couleur losange, `can_manage_channels`) | `RolesModal`, `createRole()`, `toggleRole()` |
| Membres en ligne / hors ligne, kick | Liste des membres, `kickMember()` |
| Mini-profil, menus contextuels (clic droit) | `MiniProfileModal`, `memberMenuItems()`, `ContextMenu` |
| Messages privés (amis ou historique) | `src/views/MessagesView.jsx`, `sendDM()` |
| Amis : demandes, acceptation, suppression | `src/views/FriendsView.jsx` |
| Signalements | `ReportModal`, `reportUser()` |

## Architecture

```
src/
├── App.jsx              Routage par état, polling 2 s, menus, modales, toasts
├── main.jsx
├── index.css            Classes utilitaires du design system (.btn-primary, .card, .field, .thin-scroll…)
├── lib/
│   ├── store.js         Store (localStorage + synchro entre onglets) et actions métier
│   └── util.js          Constantes (couleurs, dégradés), helpers purs
├── components/
│   ├── ui.jsx           Avatar, Banner, Modal, ContextMenu, ColorDiamonds, contextes
│   ├── Layout.jsx       Sidebar / tiroir mobile
│   └── Modals.jsx       Hôte des modales (création, invitation, paramètres, rôles…)
└── views/               Login, Home, ServerView, MessagesView, FriendsView, ProfileView
```

## Important : persistance de démo

Cette version n'a pas de backend. Les données (utilisateurs, serveurs, messages, amis…) sont stockées dans
`localStorage` sous la clé `hevenly:v1`, avec des comptes de démonstration (Lina, Maxime, Sofia, Hugo) et un
serveur de démo dont le code est `HEVENLY1`.

- Les données ne sont **partagées qu'entre onglets d'un même navigateur**.
- Les règles métier (permissions, limites de longueur, statut PLUS, etc.) sont appliquées dans `store.js`,
  mais elles ne sont pas sécurisées : un vrai backend devra les reproduire côté serveur.

Pour passer au temps réel multi-utilisateurs, remplacer `commit` / `sync` dans `src/lib/store.js` par une API
(Supabase, Firebase, WebSocket ou le backend PHP existant), en gardant les mêmes actions exportées.

## Limites connues

- Les images (avatars, bannières, icônes) sont des URL fournies par l'utilisateur, sans upload.
- Le statut PLUS est simulé (aucun paiement).
- Le vocal est uniquement un état d'affichage : il n'y a pas de flux audio.
- Pas de tests automatisés pour l'instant.
