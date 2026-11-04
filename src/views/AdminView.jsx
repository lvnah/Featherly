import { useEffect, useState } from 'react';
import { adminDeleteServer, adminDeleteUser, adminDismissReport, adminListReports, adminListServers, adminListUsers, adminSetPlus, getMe } from '../lib/store';
import { useStore, useUI, Avatar, EmptyState, Icon } from '../components/ui';
import { formatStamp, isOnline } from '../lib/util';
import { run } from './ServerView';

const TABS = [
  ['users', 'Utilisateurs'],
  ['servers', 'Espaces'],
  ['reports', 'Signalements'],
];

// Panneau d'administration : accessible uniquement aux comptes is_admin.
export default function AdminView() {
  const s = useStore();
  const { toast } = useUI();
  const me = getMe(s);
  const [tab, setTab] = useState('users');
  const [query, setQuery] = useState('');
  const [data, setData] = useState({ users: [], servers: [], reports: [] });
  const [error, setError] = useState('');

  const load = async () => {
    try {
      if (tab === 'users') setData((d) => ({ ...d, users: [] }));
      const rows = tab === 'users' ? await adminListUsers() : tab === 'servers' ? await adminListServers() : await adminListReports();
      setData((d) => ({ ...d, [tab]: rows }));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  if (!me.is_admin) return <EmptyState icon="bolt" title="Accès refusé">Cette page est réservée aux administrateurs.</EmptyState>;

  const q = query.trim().toLowerCase();
  const users = data.users.filter((u) => `${u.pseudo}#${u.tag}`.toLowerCase().includes(q));
  const servers = data.servers.filter((x) => x.name.toLowerCase().includes(q));
  const reports = data.reports.filter((r) => `${r.reason} ${r.target_pseudo} ${r.reporter_pseudo}`.toLowerCase().includes(q));

  const after = (p, msg) => run(toast, () => p, msg).then((ok) => ok && load());

  return (
    <div className="panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <h1 className="text-xl font-extrabold">Administration</h1>
          <p className="text-xs text-slate-500">Gestion des comptes, des espaces et des signalements.</p>
        </div>
        <nav className="flex gap-1 rounded-full bg-slate-100 p-1">
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${tab === key ? 'bg-slate-900 text-brand-400' : 'text-slate-600 hover:bg-white'}`}>
              {label}
              {key === 'reports' && data.reports.length > 0 && <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">{data.reports.length}</span>}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-4 p-6">
        <input className="field" placeholder="Rechercher…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {error && <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
      </div>

      <div className="thin-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 pb-6">
        {tab === 'users' &&
          users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4">
              <Avatar user={{ ...u, avatar: '' }} size="sm" showStatus />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">
                  {u.pseudo} <span className="text-xs font-normal text-slate-400">#{u.tag}</span>
                  {u.is_admin ? <span className="ml-2 rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-brand-400">ADMIN</span> : null}
                </p>
                <p className="text-xs text-slate-500">Inscrit le {formatStamp(u.created_at)} · {isOnline(u) ? 'En ligne' : 'Hors ligne'}</p>
              </div>
              <button className="btn-ghost !py-2" onClick={() => after(adminSetPlus(u.id, !u.is_plus), u.is_plus ? 'PLUS retiré' : 'PLUS accordé')}>
                {u.is_plus ? 'Retirer PLUS' : 'Accorder PLUS'}
              </button>
              {u.id !== me.id && (
                <button className="btn-danger !py-2" onClick={() => window.confirm(`Supprimer le compte ${u.pseudo} ?`) && after(adminDeleteUser(u.id), 'Compte supprimé')}>
                  Supprimer
                </button>
              )}
            </div>
          ))}

        {tab === 'servers' &&
          servers.map((srv) => (
            <div key={srv.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 font-bold text-white">{srv.name.charAt(0).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{srv.name}</p>
                <p className="text-xs text-slate-500">
                  Propriétaire {srv.owner_pseudo}#{srv.owner_tag} · {srv.members} membre(s) · code <span className="font-mono">{srv.invite_code}</span> · {srv.is_public ? 'Public' : 'Privé'}
                </p>
              </div>
              <button className="btn-danger !py-2" onClick={() => window.confirm(`Supprimer l’espace « ${srv.name} » ?`) && after(adminDeleteServer(srv.id), 'Espace supprimé')}>
                Supprimer
              </button>
            </div>
          ))}

        {tab === 'reports' &&
          reports.map((r) => (
            <div key={r.id} className="flex flex-col gap-3 rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
              <p className="text-sm">
                <span className="font-bold">{r.reporter_pseudo}</span> a signalé <span className="font-bold">{r.target_pseudo}#{r.target_tag}</span>
                {r.server_name ? <> dans <span className="font-bold">{r.server_name}</span></> : null}
              </p>
              <p className="rounded-xl bg-white p-3 text-sm text-slate-700">{r.reason}</p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">{formatStamp(r.created_at)}</span>
                <button className="btn-ghost !py-2" onClick={() => after(adminDismissReport(r.id), 'Signalement classé')}>Classer sans suite</button>
              </div>
            </div>
          ))}

        {tab === 'users' && !users.length && <p className="py-10 text-center text-sm text-slate-500">Aucun résultat.</p>}
        {tab === 'servers' && !servers.length && <p className="py-10 text-center text-sm text-slate-500">Aucun espace.</p>}
        {tab === 'reports' && !reports.length && (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><Icon name="check" className="h-4 w-4" /> Aucun signalement en attente.</p>
        )}
      </div>
    </div>
  );
}
