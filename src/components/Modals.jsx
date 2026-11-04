import { useState } from 'react';
import {
  createChannel, createRole, createServer, getMe, getUser, joinServer, membersOf, membership, regenerateInvite,
  reportUser, rolesOf, toggleRole, roleColorOf, roleNameOf,
} from '../lib/store';
import { Modal, Avatar, Banner, ColorDiamonds, ErrorLine, Icon, useStore, useUI } from './ui';
import { fullName, isOnline, ROLE_COLORS } from '../lib/util';
import { run } from '../views/ServerView';

// Hôte unique : ouvre la modale demandée par openModal(name, props).
export function ModalHost({ modal, onClose }) {
  if (!modal) return null;
  const Comp = MODALS[modal.name];
  return Comp ? <Comp {...modal} onClose={onClose} /> : null;
}

// Formulaire de modale : gère l'état d'erreur et d'envoi.
function useSubmit(fn) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return { error, busy, submit };
}

const Label = ({ children }) => <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{children}</span>;

function CreateServerModal({ onClose }) {
  const s = useStore();
  const { go } = useUI();
  const me = getMe(s);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [code, setCode] = useState('');
  const { error, busy, submit } = useSubmit(async () => {
    const res = await createServer({ name, icon, isPublic, customCode: code });
    onClose();
    go({ name: 'server', serverId: res.id });
  });

  return (
    <Modal open title="Créer un espace" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2"><Label>Nom de l’espace ({name.length}/16)</Label>
          <input className="field" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label className="flex flex-col gap-2"><Label>Icône (URL, facultatif)</Label>
          <input className="field" placeholder="https://…" value={icon} onChange={(e) => setIcon(e.target.value)} />
        </label>
        <label className="flex flex-col gap-2"><Label>Visibilité</Label>
          <select className="field" value={isPublic ? 'public' : 'private'} onChange={(e) => setIsPublic(e.target.value === 'public')}>
            <option value="public">Public : visible dans la recherche</option>
            <option value="private">Privé : sur invitation uniquement</option>
          </select>
        </label>
        <label className="flex flex-col gap-2"><Label>Code d’invitation personnalisé</Label>
          <input className="field font-mono uppercase disabled:opacity-50" value={code} maxLength={20} disabled={!me.is_plus}
            placeholder={me.is_plus ? 'Vide = code automatique' : 'Réservé aux membres PLUS'} onChange={(e) => setCode(e.target.value)} />
        </label>
        <ErrorLine>{error}</ErrorLine>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={busy || !name.trim()}>Créer</button>
        </div>
      </form>
    </Modal>
  );
}

function JoinServerModal({ onClose }) {
  const { go } = useUI();
  const [code, setCode] = useState('');
  const { error, busy, submit } = useSubmit(async () => {
    const res = await joinServer(code);
    onClose();
    go({ name: 'server', serverId: res.id });
  });
  return (
    <Modal open title="Rejoindre un espace" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2"><Label>Code d’invitation</Label>
          <input className="field font-mono uppercase" placeholder="Code reçu d’un membre" value={code} autoFocus onChange={(e) => setCode(e.target.value)} />
        </label>
        <ErrorLine>{error}</ErrorLine>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={busy || !code.trim()}>Rejoindre</button>
        </div>
      </form>
    </Modal>
  );
}

function InviteModal({ serverId, onClose }) {
  const s = useStore();
  const { toast } = useUI();
  const me = getMe(s);
  const server = s.servers.find((x) => x.id === serverId);
  if (!server) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(server.invite_code);
      toast('Code copié');
    } catch {
      toast('Copie impossible : sélectionnez le code manuellement.');
    }
  };
  return (
    <Modal open title={`Inviter sur ${server.name}`} onClose={onClose}>
      <p className="mb-4 text-sm text-slate-500">Partagez ce code pour que vos amis rejoignent l’espace.</p>
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 pl-5">
        <code className="flex-1 select-all font-mono text-lg tracking-widest text-brand-700">{server.invite_code}</code>
        <button className="btn-primary !py-2.5" onClick={copy}>Copier</button>
      </div>
      {server.owner_id === me.id && (
        <button className="btn-danger mt-4 w-full" onClick={() => run(toast, () => regenerateInvite(serverId), 'Nouveau code généré')}>
          Générer un nouveau code
        </button>
      )}
    </Modal>
  );
}

// Mini-profil : bannière, avatar, rôle sur l'espace, actions.
function MiniProfileModal({ userId, serverId, onClose }) {
  const s = useStore();
  const { go, openModal } = useUI();
  const me = getMe(s);
  const user = getUser(s, userId);
  if (!user) return null;
  const color = roleColorOf(s, serverId, user.id) || '#0f172a';
  const roleName = roleNameOf(s, serverId, user.id);

  return (
    <Modal open title="" onClose={onClose} width="max-w-sm">
      <div className="-mx-6 -mt-6 overflow-hidden rounded-t-[2.5rem]">
        <Banner user={user} className="h-28" />
      </div>
      <div className="-mt-12 flex items-end justify-between gap-3">
        <Avatar user={user} size="lg" showStatus className="rounded-3xl ring-4 ring-white" />
        <button className="btn-primary !rounded-full !py-2 !text-sm" onClick={() => go({ name: 'profile', userId: user.id })}>
          Voir profil complet
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-4">
        <div>
          <p className="text-lg font-extrabold" style={{ color }}>{user.pseudo}</p>
          <p className="text-sm text-slate-400">#{user.tag} · {isOnline(user) ? 'En ligne' : 'Hors ligne'}</p>
        </div>
        <p className="text-sm text-slate-600">{user.bio || 'Aucune biographie.'}</p>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Rôle sur l’espace</p>
          <p className="mt-2 flex items-center gap-2 font-bold" style={{ color }}>
            <span className="h-3 w-3 rounded-full" style={{ background: color }} />
            {roleName}
          </p>
        </div>
        {user.id !== me.id && (
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => go({ name: 'messages', withId: user.id })}>
              <Icon name="chat" className="h-4 w-4" /> Message
            </button>
            <button className="btn-danger flex-1" onClick={() => openModal('report', { userId: user.id })}>
              <Icon name="flag" className="h-4 w-4" /> Signaler
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ReportModal({ userId, onClose }) {
  const s = useStore();
  const { toast } = useUI();
  const target = getUser(s, userId);
  const [reason, setReason] = useState('');
  const { error, busy, submit } = useSubmit(async () => {
    await reportUser(userId, reason);
    toast('Signalement envoyé. Merci.');
    onClose();
  });
  if (!target) return null;
  return (
    <Modal open title={`Signaler ${target.pseudo}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2"><Label>Motif</Label>
          <textarea className="field min-h-28 resize-none" maxLength={300} placeholder="Harcèlement, spam, contenu inapproprié…" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <ErrorLine>{error}</ErrorLine>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-danger" disabled={busy || reason.trim().length < 3}>Envoyer le signalement</button>
        </div>
      </form>
    </Modal>
  );
}

function ChannelModal({ serverId, onClose }) {
  const { toast } = useUI();
  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const { error, busy, submit } = useSubmit(async () => {
    await createChannel(serverId, name, type);
    toast('Salon créé');
    onClose();
  });
  return (
    <Modal open title="Créer un salon" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          {[['text', '# Texte'], ['voice', '🔊 Vocal']].map(([v, label]) => (
            <button key={v} type="button" onClick={() => setType(v)} className={`rounded-2xl border-2 px-4 py-3 text-sm font-bold transition ${type === v ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-100 text-slate-500'}`}>
              {label}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-2"><Label>Nom du salon</Label>
          <input className="field" maxLength={24} value={name} autoFocus placeholder="ex. annonces" onChange={(e) => setName(e.target.value)} />
        </label>
        <ErrorLine>{error}</ErrorLine>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={busy || !name.trim()}>Créer</button>
        </div>
      </form>
    </Modal>
  );
}

// Paramètres de l'espace (propriétaire) : rôles et attribution.
function RolesModal({ serverId, onClose }) {
  const s = useStore();
  const { toast } = useUI();
  const me = getMe(s);
  const server = s.servers.find((x) => x.id === serverId);
  const [name, setName] = useState('');
  const [color, setColor] = useState(ROLE_COLORS[0]);
  const [canManage, setCanManage] = useState(false);
  const { error, busy, submit } = useSubmit(async () => {
    await createRole(serverId, { name, color, can_manage_channels: canManage });
    setName('');
    setCanManage(false);
    toast('Rôle créé');
  });
  if (!server) return null;
  const roles = rolesOf(s, serverId);
  const members = membersOf(s, serverId).filter((u) => u.id !== server.owner_id);

  return (
    <Modal open title="Rôles & permissions" onClose={onClose} width="max-w-lg">
      {server.owner_id !== me.id ? (
        <p className="text-sm text-slate-500">Seul le propriétaire de l’espace peut gérer les rôles.</p>
      ) : (
        <div className="flex flex-col gap-6">
          <form onSubmit={submit} className="flex flex-col gap-4 rounded-3xl bg-slate-50 p-5">
            <Label>Nouveau rôle</Label>
            <input className="field" maxLength={20} placeholder="Nom du rôle" value={name} onChange={(e) => setName(e.target.value)} />
            <div><p className="mb-2 text-sm text-slate-500">Couleur</p><ColorDiamonds value={color} onChange={setColor} /></div>
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={canManage} onChange={(e) => setCanManage(e.target.checked)} />
              Peut gérer les salons (créer / supprimer)
            </label>
            <ErrorLine>{error}</ErrorLine>
            <button type="submit" className="btn-primary self-end" disabled={busy || !name.trim()}>Créer le rôle</button>
          </form>

          <div className="flex flex-col gap-3">
            <Label>Attribution</Label>
            {members.length === 0 && <p className="text-sm text-slate-500">Aucun autre membre.</p>}
            {members.map((u) => {
              const m = membership(s, serverId, u.id);
              return (
                <div key={u.id} className="flex flex-col gap-2 rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-center gap-2"><Avatar user={u} size="xs" /><span className="text-sm font-bold">{fullName(u)}</span></div>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((r) => {
                      const on = m?.role_ids.includes(r.id);
                      return (
                        <button key={r.id} onClick={() => run(toast, () => toggleRole(serverId, u.id, r.id))} className={`rounded-full border px-3 py-1 text-xs font-bold transition ${on ? 'border-transparent text-white' : 'border-slate-200 text-slate-500'}`} style={on ? { background: r.color } : undefined}>
                          {r.name}
                        </button>
                      );
                    })}
                    {roles.length === 0 && <span className="text-xs text-slate-400">Créez d’abord un rôle.</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}

const MODALS = {
  createServer: CreateServerModal,
  join: JoinServerModal,
  invite: InviteModal,
  mini: MiniProfileModal,
  report: ReportModal,
  channel: ChannelModal,
  roles: RolesModal,
};
