import { useState } from 'react';
import {
  findUserByTag,
  friendsOf,
  getMe,
  getUser,
  pendingReceived,
  pendingSent,
  removeFriend,
  respondFriendRequest,
  sendFriendRequest,
} from '../lib/store';
import { useStore, useUI, Avatar, ErrorLine } from '../components/ui';
import { fullName, isOnline } from '../lib/util';
import { run } from './ServerView';

export default function FriendsView() {
  const s = useStore();
  const { go, toast } = useUI();
  const me = getMe(s);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const received = pendingReceived(s, me.id).map((f) => ({ f, user: getUser(s, f.from) })).filter((x) => x.user);
  const sent = pendingSent(s, me.id).map((f) => ({ f, user: getUser(s, f.to) })).filter((x) => x.user);
  const friends = friendsOf(s, me.id).sort((a, b) => Number(isOnline(b)) - Number(isOnline(a)) || a.pseudo.localeCompare(b.pseudo));

  const add = (e) => {
    e.preventDefault();
    setError('');
    const target = findUserByTag(s, query);
    if (!target) {
      setError('Utilisateur introuvable. Format attendu : Pseudo#1234');
      return;
    }
    if (run(toast, () => sendFriendRequest(target.id), 'Demande envoyée')) setQuery('');
  };

  const confirmRemove = (user) => {
    if (window.confirm(`Supprimer ${user.pseudo} de vos amis ?`)) {
      run(toast, () => removeFriend(user.id), 'Ami supprimé');
    }
  };

  return (
    <div className="thin-scroll flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <h1 className="text-2xl font-extrabold text-white">Amis</h1>

        {/* Ajout d'ami */}
        <section className="card p-5">
          <h2 className="mb-1 font-semibold text-white">Ajouter un ami</h2>
          <p className="mb-4 text-sm text-slate-400">Entrez le pseudo et le tag exact, par exemple Maxime#1234.</p>
          <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
            <input
              className="field"
              placeholder="Pseudo#1234"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="btn-primary whitespace-nowrap" disabled={!query.trim()}>
              Envoyer la demande
            </button>
          </form>
          <ErrorLine>{error}</ErrorLine>
        </section>

        {/* Demandes reçues */}
        {received.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Demandes reçues · {received.length}</h2>
            {received.map(({ f, user }) => (
              <div key={f.id} className="card flex items-center gap-4 p-4">
                <Avatar user={user} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{fullName(user)}</p>
                  <p className="text-xs text-slate-500">souhaite être votre ami</p>
                </div>
                <button className="btn-primary !px-3 !py-2" onClick={() => run(toast, () => respondFriendRequest(f.id, true), 'Ami ajouté')}>
                  Accepter
                </button>
                <button className="btn-ghost !px-3 !py-2" onClick={() => run(toast, () => respondFriendRequest(f.id, false))}>
                  Refuser
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Demandes envoyées */}
        {sent.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Demandes envoyées · {sent.length}</h2>
            {sent.map(({ f, user }) => (
              <div key={f.id} className="card flex items-center gap-4 p-4">
                <Avatar user={user} size="md" />
                <p className="min-w-0 flex-1 truncate font-semibold text-white">{fullName(user)}</p>
                <span className="text-xs text-slate-500">en attente</span>
                <button className="btn-ghost !px-3 !py-2" onClick={() => run(toast, () => respondFriendRequest(f.id, false), 'Demande annulée')}>
                  Annuler
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Liste des amis */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Tous les amis · {friends.length}
          </h2>
          {friends.length === 0 && <p className="text-sm text-slate-500">Pas encore d’amis. Envoyez une première demande !</p>}
          {friends.map((u) => (
            <div key={u.id} className="card flex items-center gap-4 p-4">
              <button onClick={() => go({ name: 'profile', userId: u.id })} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                <Avatar user={u} size="md" showStatus />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-white">{fullName(u)}</span>
                  <span className="block text-xs text-slate-500">{isOnline(u) ? 'En ligne' : 'Hors ligne'}</span>
                </span>
              </button>
              <button
                title="Envoyer un message"
                onClick={() => go({ name: 'messages', withId: u.id })}
                className="rounded-xl px-3 py-2 text-lg hover:bg-white/10"
              >
                💬
              </button>
              <button title="Supprimer l’ami" onClick={() => confirmRemove(u)} className="rounded-xl px-3 py-2 text-lg hover:bg-white/10">
                🗑️
              </button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
