import { useState } from 'react';
import { getMe, serversOf, friendsOf } from '../lib/store';
import { useStore, useUI, Avatar, Banner } from '../components/ui';
import { fullName, isOnline } from '../lib/util';

export default function Home() {
  const s = useStore();
  const { go, openModal, openMenu } = useUI();
  const me = getMe(s);
  const [q, setQ] = useState('');

  const servers = serversOf(s, me.id);
  const total = s.users.length;
  const online = s.users.filter(isOnline).length;
  const percent = total ? Math.round((online / total) * 100) : 0;
  const friends = friendsOf(s, me.id);
  const onlineFriends = friends.filter(isOnline);

  const query = q.trim().toLowerCase();
  const results = query
    ? {
        servers: s.servers.filter((x) => x.name.toLowerCase().includes(query)),
        users: s.users.filter((u) => u.id !== me.id && fullName(u).toLowerCase().includes(query)),
      }
    : null;

  const quickMessage = (id) => {
    go({ name: 'messages', withId: id });
  };

  return (
    <div className="thin-scroll flex min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
        {/* Recherche globale */}
        <div className="relative">
          <input
            className="field h-12 rounded-2xl pl-11 backdrop-blur"
            placeholder="Rechercher un serveur ou un utilisateur (pseudo#1234)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
          {results && (
            <div className="card absolute left-0 right-0 top-14 z-20 max-h-80 overflow-y-auto thin-scroll p-2">
              {results.servers.length === 0 && results.users.length === 0 && (
                <p className="p-3 text-sm text-slate-400">Aucun résultat.</p>
              )}
              {results.servers.map((srv) => (
                <button
                  key={srv.id}
                  onClick={() => {
                    setQ('');
                    go({ name: 'server', serverId: srv.id });
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-white/5"
                >
                  <span className="text-lg">🏠</span>
                  <span className="text-sm text-white">{srv.name}</span>
                </button>
              ))}
              {results.users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setQ('');
                    go({ name: 'profile', userId: u.id });
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-white/5"
                >
                  <Avatar user={u} size="sm" showStatus />
                  <span className="text-sm text-white">{fullName(u)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bannière de bienvenue */}
        <section className="card relative overflow-hidden p-8 md:p-10">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="absolute -bottom-20 right-20 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-300">Bon retour, {me.pseudo} 👋</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                Retrouvez vos communautés.
              </h1>
              <p className="mt-3 max-w-md text-sm text-slate-400">
                Discutez dans vos salons, lancez un vocal ou écrivez à vos amis en privé.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button className="btn-primary" onClick={() => openModal('createServer')}>
                  + Créer un serveur
                </button>
                <button className="btn-ghost" onClick={() => openModal('join')}>
                  Rejoindre avec un code
                </button>
                <button className="btn-ghost" onClick={() => go({ name: 'friends' })}>
                  Mes amis
                </button>
              </div>
            </div>
            <div className="hidden h-36 w-36 shrink-0 items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-brand-400 to-teal-700 text-6xl shadow-soft md:flex">
              🌿
            </div>
          </div>
        </section>

        {/* Statistiques en direct */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Membres inscrits" value={total} />
          <Stat label="En ligne" value={online} accent />
          <Stat label="Activité globale" value={`${percent}%`} />
        </section>

        {/* Mes serveurs */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Mes serveurs</h2>
          {servers.length === 0 ? (
            <div className="card p-6 text-sm text-slate-400">Vous n’êtes membre d’aucun serveur. Créez-en un ou rejoignez-en un avec un code.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {servers.map((srv) => (
                <button
                  key={srv.id}
                  onClick={() => go({ name: 'server', serverId: srv.id })}
                  onContextMenu={(e) => openMenu(e, [
                    { label: 'Ouvrir', icon: '↗', onClick: () => go({ name: 'server', serverId: srv.id }) },
                    ...(srv.owner_id === me.id ? [{ label: 'Code d’invitation', icon: '🔗', onClick: () => openModal('invite', { serverId: srv.id }) }] : []),
                  ])}
                  className="card flex items-center gap-4 p-4 text-left transition hover:bg-white/5"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-teal-700 text-lg font-bold text-white">
                    {srv.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-white">{srv.name}</span>
                    <span className="text-xs text-slate-400">
                      {s.memberships.filter((m) => m.server_id === srv.id).length} membres ·{' '}
                      {srv.is_public ? 'Public' : 'Privé'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Panneau de droite (desktop) */}
      <aside className="thin-scroll hidden w-80 shrink-0 flex-col gap-5 overflow-y-auto border-l border-white/5 bg-ink-900/60 p-5 xl:flex">
        <div className="card overflow-hidden">
          <Banner user={me} className="h-20 rounded-t-[2.5rem]" />
          <div className="-mt-8 px-5 pb-5">
            <Avatar user={me} size="lg" showStatus className="ring-4 ring-ink-850 rounded-2xl" />
            <p className="mt-3 font-bold text-white">{fullName(me)}</p>
            <p className="mt-1 text-sm text-slate-400">{me.bio || 'Aucune biographie.'}</p>
            <button className="btn-ghost mt-4 w-full" onClick={() => go({ name: 'profile', userId: me.id })}>
              Modifier mon profil
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="px-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            Amis en ligne · {onlineFriends.length}
          </h3>
          {onlineFriends.length === 0 && <p className="px-2 text-sm text-slate-500">Personne pour le moment.</p>}
          {onlineFriends.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-white/5">
              <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => go({ name: 'profile', userId: f.id })}>
                <Avatar user={f} size="sm" showStatus />
                <span className="truncate text-sm font-semibold text-white">{fullName(f)}</span>
              </button>
              <button
                title="Envoyer un message"
                onClick={() => quickMessage(f.id)}
                className="rounded-xl px-2 py-1 hover:bg-white/10"
              >
                💬
              </button>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value, accent = false }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold ${accent ? 'text-brand-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}
