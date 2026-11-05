import { useState } from 'react';
import { getMe, serversOf, friendsOf, membersOf } from '../lib/store';
import { useStore, useUI, Avatar, Icon, ServerIcon } from '../components/ui';
import { fullName, isOnline } from '../lib/util';

export default function Home() {
  const s = useStore();
  const { go, openModal } = useUI();
  const me = getMe(s);
  const [q, setQ] = useState('');

  const servers = serversOf(s, me.id);
  // Totaux globaux renvoyés par le serveur (pas seulement les membres visibles).
  const total = s.stats?.total ?? s.users.length;
  const online = s.stats?.online ?? s.users.filter(isOnline).length;
  const percent = total ? Math.round((online / total) * 100) : 0;
  const friends = friendsOf(s, me.id).sort((a, b) => Number(isOnline(b)) - Number(isOnline(a)));
  const onlineFriends = friends.filter(isOnline);

  const query = q.trim().toLowerCase();
  const results = query
    ? {
        servers: servers.filter((x) => x.name.toLowerCase().includes(query)),
        users: s.users.filter((u) => u.id !== me.id && fullName(u).toLowerCase().includes(query)),
      }
    : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      {/* Barre supérieure */}
      <div className="flex items-center gap-4">
        <div className="relative mx-auto w-full max-w-md">
          <input
            className="w-full rounded-full border border-white bg-white/80 py-3 pl-12 pr-4 text-sm shadow-soft backdrop-blur focus:outline-none focus:ring-4 focus:ring-brand-500/15"
            placeholder="Rechercher une communauté, un membre..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon name="search" className="h-5 w-5" />
          </span>
          {results && (
            <div className="panel absolute left-0 right-0 top-14 z-20 max-h-80 overflow-y-auto thin-scroll p-2">
              {results.servers.length === 0 && results.users.length === 0 && <p className="p-3 text-sm text-slate-500">Aucun résultat.</p>}
              {results.servers.map((srv) => (
                <button key={srv.id} onClick={() => { setQ(''); go({ name: 'server', serverId: srv.id }); }} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-slate-50">
                  <Icon name="home" className="h-5 w-5 text-brand-600" />
                  <span className="text-sm font-semibold">{srv.name}</span>
                </button>
              ))}
              {results.users.map((u) => (
                <button key={u.id} onClick={() => { setQ(''); go({ name: 'profile', userId: u.id }); }} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-slate-50">
                  <Avatar user={u} size="sm" showStatus />
                  <span className="text-sm font-semibold">{fullName(u)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => go({ name: 'messages' })} className="btn-ghost hidden shrink-0 !rounded-full !bg-white !py-2.5 shadow-soft sm:flex">
          <Icon name="users" className="h-4 w-4 text-brand-600" />
          Message
        </button>
        <button onClick={() => go({ name: 'profile', userId: me.id })} className="hidden shrink-0 sm:block" aria-label="Mon profil">
          <Avatar user={me} size="md" showStatus />
        </button>
      </div>

      <div className="thin-scroll flex min-h-0 flex-1 gap-4 overflow-y-auto pb-2">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Bannière de bienvenue */}
          <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-900 via-brand-800 to-[#052e16] p-8 text-white shadow-panel md:p-10">
            <div className="absolute -right-10 -top-10 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl" />
            <Icon name="bolt" className="absolute right-10 top-1/2 hidden h-48 w-48 -translate-y-1/2 text-white/5 md:block" />
            <div className="relative">
              <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                Bienvenue sur <span className="text-brand-400">Feathery !</span>
              </h1>
              <p className="mt-3 max-w-md text-sm text-white/75">
                Une communauté unique, un univers infini. Rejoignez un espace ou créez le vôtre pour commencer à échanger.
              </p>
              <button onClick={() => openModal('join')} className="btn-soft mt-6 !rounded-full !px-6">
                Rejoindre un espace
              </button>
            </div>
          </section>

          {/* Statistiques en direct */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat icon="users" label="Membres inscrits" value={total} />
            <Stat icon="chat" label="Membres en ligne" value={online} />
            <Stat icon="bolt" label="Activité globale" value={`${percent}%`} />
          </section>

          {/* Espaces ou tableau de bord vide */}
          <section className="panel flex min-h-64 flex-1 flex-col p-6">
            {servers.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 text-amber-400">
                  <Icon name="bolt" className="h-9 w-9" />
                </div>
                <h2 className="text-xl font-bold">Bienvenue sur votre tableau de bord</h2>
                <p className="max-w-sm text-sm text-slate-500">
                  Sélectionnez un espace dans la colonne de gauche ou rejoignez-en un via un code d’invitation pour accéder aux salons textuels et vocaux de vos communautés.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {servers.map((srv) => (
                  <button key={srv.id} onClick={() => go({ name: 'server', serverId: srv.id })} className="flex items-center gap-4 rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5">
                    <ServerIcon server={srv} className="h-12 w-12" />
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{srv.name}</span>
                      <span className="text-xs text-slate-500">
                        {membersOf(s, srv.id).length} membre(s) · {srv.is_public ? 'Public' : 'Privé'}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Panneau de droite */}
        <aside className="hidden w-80 shrink-0 flex-col gap-4 xl:flex">
          <section className="panel p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-bold">Votre profil</h2>
              <button onClick={() => go({ name: 'profile', userId: me.id, edit: true })} aria-label="Modifier mon profil" className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="settings" className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <Avatar user={me} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">{me.pseudo}</p>
                <p className="text-sm font-semibold text-brand-600">{me.is_plus ? 'Membre PLUS' : 'Membre Feathery'}</p>
              </div>
            </div>
          </section>

          <section className="panel flex flex-col gap-3 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Amis en ligne</h2>
              <button onClick={() => go({ name: 'friends' })} className="text-sm font-semibold text-slate-500 hover:text-slate-900">
                Voir tout →
              </button>
            </div>
            {onlineFriends.length === 0 && <p className="text-sm text-slate-500">Aucun ami en ligne pour le moment.</p>}
            {onlineFriends.slice(0, 6).map((f) => (
              <div key={f.id} className="flex items-center gap-3">
                <button onClick={() => go({ name: 'profile', userId: f.id })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <Avatar user={f} size="md" showStatus />
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{f.pseudo}</span>
                    <span className="block text-xs text-slate-500">{isOnline(f) ? 'En ligne' : 'Hors ligne'}</span>
                  </span>
                </button>
                <button title="Envoyer un message" onClick={() => go({ name: 'messages', withId: f.id })} className="rounded-2xl bg-slate-100 p-2.5 text-slate-600 hover:bg-slate-200">
                  <Icon name="chat" className="h-4 w-4" />
                </button>
              </div>
            ))}
            {onlineFriends.length > 0 && <p className="text-xs text-slate-400">{onlineFriends.length} ami(s) connecté(s)</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="panel flex items-center gap-4 p-5">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xl font-extrabold">{value}</p>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
      </div>
    </div>
  );
}

