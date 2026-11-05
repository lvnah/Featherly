import { useState } from 'react';
import { getMe, serversOf, logout, messagesBadge, serverUnread, unreadCount } from '../lib/store';
import { useStore, useUI, Avatar, CountBadge, Icon, ServerIcon } from './ui';
import Logo from './Logo';

const NAV = [
  { key: 'home', label: 'Accueil', icon: 'home', view: { name: 'home' } },
  { key: 'messages', label: 'Message', icon: 'message', view: { name: 'messages' } },
  { key: 'community', label: 'Communauté', icon: 'search', view: { name: 'community' } },
  { key: 'friends', label: 'Ami(s)', icon: 'users', view: { name: 'friends' } },
  { key: 'settings', label: 'Paramètres', icon: 'settings', view: { name: 'profile', userId: null } },
];

// Sidebar flottante (desktop) ou tiroir coulissant (mobile) + zone de contenu.
export default function Layout({ view, children }) {
  const s = useStore();
  const { go, openModal, toast } = useUI();
  const me = getMe(s);
  const [drawer, setDrawer] = useState(false);
  const servers = serversOf(s, me.id);
  const nav = me.is_admin ? [...NAV, { key: 'admin', label: 'Admin', icon: 'bolt', view: { name: 'admin' } }] : NAV;

  const navigate = (v) => {
    go(v);
    setDrawer(false);
  };
  const isActive = (item) =>
    item.key === 'settings' ? view.name === 'profile' && view.userId === me.id && view.edit : view.name === item.key;

  return (
    <div className="flex h-dvh gap-4 p-4">
      <aside
        className={`panel sidebar-drawer fixed inset-y-4 left-4 z-40 flex w-72 flex-col gap-6 overflow-hidden p-5 lg:static lg:z-auto lg:flex lg:w-64 lg:shrink-0 ${
          drawer ? 'translate-x-0' : '-translate-x-[120%] lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-2 pt-1">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-soft">
            <LeafLogo />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-slate-900">Feathery</span>
          <span className="h-2 w-2 rounded-full bg-brand-500" />
        </div>

        <nav className="flex flex-col gap-1">
          {nav.map((item) => (
            <button
              key={item.key}
              onClick={() => (item.key === 'settings' ? navigate({ name: 'profile', userId: me.id, edit: true }) : navigate(item.view))}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-semibold transition ${
                isActive(item) ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              <CountBadge n={item.key === 'messages' ? messagesBadge(s) : item.key === 'friends' ? unreadCount(s).friendRequests : 0} />
            </button>
          ))}
        </nav>

        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <p className="px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Mes espaces</p>
          <div className="flex flex-col gap-2">
            <button onClick={() => { setDrawer(false); openModal('join'); }} className="btn-ghost !py-2.5">
              Rejoindre un espace
            </button>
            <button onClick={() => { setDrawer(false); openModal('createServer'); }} className="btn !bg-brand-50 !py-2.5 text-brand-700 hover:!bg-brand-100">
              Créer un espace
            </button>
          </div>
          <div className="thin-scroll flex min-h-0 flex-col gap-1 overflow-y-auto">
            {servers.map((srv) => (
              <button
                key={srv.id}
                onClick={() => navigate({ name: 'server', serverId: srv.id })}
                className={`flex items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-slate-50 ${
                  view.name === 'server' && view.serverId === srv.id ? 'bg-slate-100' : ''
                }`}
              >
                <ServerIcon server={srv} className="h-10 w-10" />
                <span className="truncate text-sm font-semibold text-slate-800">{srv.name}</span>
                <span className="ml-auto"><CountBadge n={serverUnread(s, srv.id)} /></span>
              </button>
            ))}
            {servers.length === 0 && <p className="px-2 text-xs text-slate-400">Aucun espace pour le moment.</p>}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
          <button onClick={() => navigate({ name: 'profile', userId: me.id })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <Avatar user={me} size="md" showStatus />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-slate-900">{me.pseudo}</span>
              <span className="block text-xs font-semibold text-brand-600">En ligne</span>
            </span>
          </button>
          <button
            title="Se déconnecter"
            aria-label="Se déconnecter"
            onClick={async () => {
              await logout();
            }}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <Icon name="logout" className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {drawer && <div className="mobile-overlay fixed inset-0 z-30 bg-slate-900/20 lg:hidden" onClick={() => setDrawer(false)} />}

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-center gap-3 lg:hidden">
          <button onClick={() => setDrawer(true)} aria-label="Ouvrir le menu" className="panel rounded-2xl px-4 py-3">
            <Icon name="home" className="h-5 w-5" />
          </button>
          <span className="font-bold text-slate-900">Feathery</span>
        </div>
        <main className="flex min-h-0 flex-1 gap-4 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

export function LeafLogo({ className = 'h-7 w-7' }) {
  return <Logo className={className} />;
}
