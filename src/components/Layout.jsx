import { useState } from 'react';
import { getMe, serversOf } from '../lib/store';
import { useStore, useUI, Avatar } from './ui';

const NAV = [
  { key: 'home', label: 'Accueil', icon: '🏠', view: { name: 'home' } },
  { key: 'messages', label: 'Messages', icon: '💬', view: { name: 'messages' } },
  { key: 'friends', label: 'Amis', icon: '👥', view: { name: 'friends' } },
];

// Layout global : sidebar (desktop) ou tiroir coulissant (mobile) + conteneur dynamique.
export default function Layout({ view, children }) {
  const s = useStore();
  const { go, openModal } = useUI();
  const me = getMe(s);
  const [drawer, setDrawer] = useState(false);
  const servers = serversOf(s, me.id);

  const navigate = (v) => {
    go(v);
    setDrawer(false);
  };

  const isActive = (item) => view.name === item.key;
  const currentTitle =
    NAV.find((n) => n.key === view.name)?.label ??
    (view.name === 'server' ? s.servers.find((x) => x.id === view.serverId)?.name : 'Profil') ??
    'Hevenly';

  return (
    <div className="flex h-dvh overflow-hidden bg-ink-950">
      {/* Tiroir / sidebar */}
      <aside
        className={`sidebar-drawer fixed inset-y-0 left-0 z-40 flex w-72 flex-col gap-5 border-r border-white/5 bg-ink-900/95 p-4 backdrop-blur-xl lg:static lg:translate-x-0 ${
          drawer ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-2 pt-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 text-lg font-extrabold text-ink-950">
            H
          </div>
          <span className="text-xl font-extrabold tracking-tight text-white">Hevenly</span>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => navigate(item.view)}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                isActive(item) ? 'bg-brand-500/15 text-brand-300' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </button>
          ))}
          <button
            onClick={() => {
              setDrawer(false);
              openModal('settings');
            }}
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <span className="w-5 text-center">⚙️</span>
            Paramètres
          </button>
        </nav>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Serveurs</span>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setDrawer(false);
                  openModal('join');
                }}
                title="Rejoindre avec un code"
                className="rounded-lg px-2 py-0.5 text-xs text-slate-400 hover:bg-white/10 hover:text-white"
              >
                ↪
              </button>
              <button
                onClick={() => {
                  setDrawer(false);
                  openModal('createServer');
                }}
                title="Créer un serveur"
                className="rounded-lg px-2 py-0.5 text-lg leading-none text-slate-400 hover:bg-white/10 hover:text-white"
              >
                +
              </button>
            </div>
          </div>
          <div className="thin-scroll flex min-h-0 flex-col gap-1 overflow-y-auto pr-1">
            {servers.length === 0 && <p className="px-2 text-xs text-slate-500">Aucun serveur pour l’instant.</p>}
            {servers.map((srv) => {
              const active = view.name === 'server' && view.serverId === srv.id;
              return (
                <button
                  key={srv.id}
                  onClick={() => navigate({ name: 'server', serverId: srv.id })}
                  className={`flex items-center gap-3 rounded-2xl px-2 py-2 text-left transition ${
                    active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-teal-700 text-sm font-bold text-white">
                    {srv.icon ? <img src={srv.icon} alt="" className="h-full w-full object-cover" /> : srv.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate text-sm font-semibold">{srv.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => navigate({ name: 'profile', userId: me.id })}
          className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-2.5 text-left transition hover:bg-white/10"
        >
          <Avatar user={me} size="sm" showStatus />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{me.pseudo}</p>
            <p className="truncate text-xs text-slate-400">
              #{me.tag}
              {me.is_plus ? <span className="ml-2 rounded-md bg-brand-500/20 px-1.5 text-[10px] font-bold text-brand-300">PLUS</span> : null}
            </p>
          </div>
        </button>
      </aside>

      {drawer && (
        <div className="mobile-overlay fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setDrawer(false)} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-white/5 bg-ink-900/80 p-3 backdrop-blur-xl lg:hidden">
          <button
            onClick={() => setDrawer(true)}
            aria-label="Ouvrir le menu"
            className="rounded-xl bg-white/5 px-3 py-2 text-lg hover:bg-white/10"
          >
            ☰
          </button>
          <span className="truncate font-bold text-white">{currentTitle}</span>
        </header>
        <main className="flex min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
