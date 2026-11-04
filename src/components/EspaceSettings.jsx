import { useState } from 'react';
import { deleteRole, deleteServer, getMe, kickMember, membersOf, membership, rolesOf, assignRole, updateInvite, updateRole, updateServerIcon, createRole } from '../lib/store';
import { Modal, Avatar, ColorDiamonds, ErrorLine, useStore, useUI } from './ui';
import { fullName } from '../lib/util';
import { ROLE_COLORS } from '../lib/util';
import { run } from '../views/ServerView';

const TABS = [
  ['roles', 'Rôles'],
  ['members', 'Gestion membres'],
  ['invite', 'Invitation'],
  ['manage', 'Gestion & danger'],
];

// Paramètres de l'espace (propriétaire uniquement), reprend settings de server.php.
export default function EspaceSettingsModal({ serverId, onClose }) {
  const s = useStore();
  const { toast } = useUI();
  const me = getMe(s);
  const server = s.servers.find((x) => x.id === serverId);
  const [tab, setTab] = useState('roles');
  if (!server) return null;
  const isOwner = server.owner_id === me.id;

  return (
    <Modal open title="" onClose={onClose} width="max-w-3xl">
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-extrabold">Paramètres de l’espace</h2>
          <p className="text-sm text-slate-500">{server.name}</p>
        </div>
        {!isOwner ? (
          <p className="text-sm text-slate-500">Seul le propriétaire de l’espace peut modifier ces paramètres.</p>
        ) : (
          <>
            <nav className="thin-scroll flex gap-2 overflow-x-auto rounded-full bg-slate-100 p-1">
              {TABS.map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${tab === key ? 'bg-slate-900 text-brand-400' : 'text-slate-600 hover:bg-white'}`}>
                  {label}
                </button>
              ))}
            </nav>
            {tab === 'roles' && <RolesTab serverId={serverId} toast={toast} />}
            {tab === 'members' && <MembersTab serverId={serverId} toast={toast} />}
            {tab === 'invite' && <InviteTab serverId={serverId} toast={toast} />}
            {tab === 'manage' && <ManageTab serverId={serverId} toast={toast} onDeleted={onClose} />}
          </>
        )}
      </div>
    </Modal>
  );
}

function RolesTab({ serverId, toast }) {
  const s = useStore();
  const roles = rolesOf(s, serverId);
  const [name, setName] = useState('');
  const [color, setColor] = useState(ROLE_COLORS[0]);
  const [manage, setManage] = useState(false);
  const [error, setError] = useState('');
  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createRole(serverId, { name, color, can_manage_channels: manage });
      setName('');
      setManage(false);
      toast('Rôle créé avec succès.');
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={create} className="flex flex-col gap-4 rounded-3xl bg-slate-50 p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Nouveau rôle</p>
        <input className="field" placeholder="ex. Modérateur" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} />
        <ColorDiamonds value={color} onChange={setColor} />
        <label className="flex items-center gap-3 text-sm text-slate-600">
          <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={manage} onChange={(e) => setManage(e.target.checked)} />
          Autoriser à gérer les salons
        </label>
        <ErrorLine>{error}</ErrorLine>
        <button type="submit" className="btn-primary self-end" disabled={!name.trim()}>Ajouter le rôle</button>
      </form>
      <div className="flex flex-col gap-3">
        {roles.length === 0 && <p className="text-sm text-slate-500">Aucun rôle pour le moment.</p>}
        {roles.map((r) => (
          <RoleRow key={`${r.id}-${r.color}-${r.name}-${r.can_manage_channels}`} role={r} serverId={serverId} toast={toast} />
        ))}
      </div>
    </div>
  );
}

function RoleRow({ role, serverId, toast }) {
  const [name, setName] = useState(role.name);
  const [color, setColor] = useState(role.color);
  const [manage, setManage] = useState(!!role.can_manage_channels);
  const dirty = name !== role.name || color !== role.color || manage !== !!role.can_manage_channels;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4">
      <div className="flex items-center gap-3">
        <input className="field !py-2" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn-danger !py-2" onClick={() => window.confirm(`Supprimer le rôle « ${role.name} » ?`) && run(toast, () => deleteRole(serverId, role.id), 'Rôle supprimé')}>
          Suppr.
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ColorDiamonds value={color} onChange={setColor} />
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <input type="checkbox" className="h-3.5 w-3.5 accent-brand-500" checked={manage} onChange={(e) => setManage(e.target.checked)} />
          Gérer salons
        </label>
      </div>
      {dirty && (
        <button className="btn-primary self-end !py-2" onClick={() => run(toast, () => updateRole(serverId, role.id, { name, color, can_manage_channels: manage }), 'Rôle mis à jour')}>
          Enregistrer
        </button>
      )}
    </div>
  );
}

function MembersTab({ serverId, toast }) {
  const s = useStore();
  const server = s.servers.find((x) => x.id === serverId);
  const roles = rolesOf(s, serverId);
  const members = membersOf(s, serverId).filter((u) => u.id !== server.owner_id);
  if (members.length === 0) return <p className="text-sm text-slate-500">Aucun autre membre dans cet espace.</p>;
  return (
    <div className="flex flex-col gap-2 rounded-3xl bg-slate-50 p-4">
      {members.map((u) => {
        const current = membership(s, serverId, u.id)?.role_ids[0] ?? '';
        return (
          <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3">
            <Avatar user={u} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm font-bold">{fullName(u)}</span>
            <select
              className="field !w-auto !py-2"
              value={current}
              onChange={(e) => run(toast, () => assignRole(serverId, u.id, e.target.value || null), 'Rôle mis à jour')}
            >
              <option value="">Aucun rôle</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <button className="btn-danger !py-2" onClick={() => window.confirm(`Exclure ${u.pseudo} de l’espace ?`) && run(toast, () => kickMember(serverId, u.id), 'Membre exclu')}>
              Exclure
            </button>
          </div>
        );
      })}
    </div>
  );
}

function InviteTab({ serverId, toast }) {
  const s = useStore();
  const me = getMe(s);
  const server = s.servers.find((x) => x.id === serverId);
  const [code, setCode] = useState(server.invite_code);
  const [error, setError] = useState('');
  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await updateInvite(serverId, code);
      toast('Code d’invitation mis à jour.');
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <code className="select-all font-mono text-lg font-bold tracking-widest text-brand-700">{server.invite_code}</code>
        <button className="btn-primary !py-2.5" onClick={() => navigator.clipboard?.writeText(server.invite_code).then(() => toast('Code copié'))}>Copier</button>
      </div>
      {me.is_plus ? (
        <form onSubmit={save} className="flex flex-col gap-3 border-t border-slate-100 pt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Code personnalisé (réservé PLUS)</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input className="field font-mono uppercase" maxLength={20} value={code} onChange={(e) => setCode(e.target.value)} />
            <button type="submit" className="btn-primary">Mettre à jour</button>
          </div>
          <ErrorLine>{error}</ErrorLine>
        </form>
      ) : (
        <p className="text-sm text-slate-500">Le code personnalisé est réservé aux membres PLUS.</p>
      )}
    </div>
  );
}

function ManageTab({ serverId, toast, onDeleted }) {
  const s = useStore();
  const server = s.servers.find((x) => x.id === serverId);
  const [icon, setIcon] = useState(server.icon || '');
  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(toast, () => updateServerIcon(serverId, icon), 'Icône mise à jour');
        }}
        className="flex flex-col gap-3 rounded-3xl bg-slate-50 p-5"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Icône de l’espace</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input className="field" placeholder="https://…" value={icon} onChange={(e) => setIcon(e.target.value)} />
          <button type="submit" className="btn-primary" disabled={!icon.trim()}>Enregistrer</button>
        </div>
      </form>
      <div className="flex flex-col gap-3 rounded-3xl border border-red-100 bg-red-50/60 p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-red-600">Suppression définitive</p>
        <p className="text-sm text-slate-600">Salons, messages et rôles de cet espace disparaîtront définitivement.</p>
        <button
          className="btn-danger self-start"
          onClick={() =>
            window.confirm(`Supprimer définitivement « ${server.name} » ?`) &&
            run(toast, () => deleteServer(serverId), 'Espace supprimé').then((ok) => ok && onDeleted())
          }
        >
          Supprimer cet espace
        </button>
      </div>
    </div>
  );
}
