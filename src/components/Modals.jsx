import { useState } from 'react';
import {
  createChannel,
  createRole,
  createServer,
  getMe,
  getUser,
  joinServer,
  logout,
  membersOf,
  membership,
  regenerateInvite,
  reportUser,
  rolesOf,
  togglePlus,
  toggleRole,
} from '../lib/store';
import { Modal, Avatar, Banner, ColorDiamonds, ErrorLine, useStore, useUI } from './ui';
import { fullName, isOnline, ROLE_COLORS } from '../lib/util';
import { run } from '../views/ServerView';

// Hôte unique : ouvre la modale demandée par `openModal(name, props)`.
export function ModalHost({ modal, onClose }) {
  if (!modal) return null;
  const Comp = MODALS[modal.name];
  return Comp ? <Comp {...modal} onClose={onClose} /> : null;
}

function CreateServerModal({ onClose }) {
  const s = useStore();
  const { go } = useUI();
  const me = getMe(s);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    setError('');
    try {
      const id = createServer({ name, icon, isPublic, customCode: code });
      go({ name: 'server', serverId: id });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal open title="Créer un serveur" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Nom du serveur <span className="text-xs text-slate-500">({name.length}/16)</span>
          <input className="field" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Icône (URL, facultatif)
          <input className="field" placeholder="https://…" value={icon} onChange={(e) => setIcon(e.target.value)} />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Visibilité
          <select className="field" value={isPublic ? 'public' : 'private'} onChange={(e) => setIsPublic(e.target.value === 'public')}>
            <option value="public">Public : visible dans la recherche</option>
            <option value="private">Privé : uniquement sur invitation</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Code d’invitation personnalisé
          <input
            className="field font-mono uppercase disabled:opacity-50"
            placeholder={me.is_plus ? 'Laisser vide pour un code automatique' : 'Réservé aux membres PLUS'}
            value={code}
            disabled={!me.is_plus}
            maxLength={20}
            onChange={(e) => setCode(e.target.value)}
          />
          <span className="text-xs text-slate-500">Un code automatique est généré si ce champ est vide.</span>
        </label>
        <ErrorLine>{error}</ErrorLine>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={!name.trim()}>
            Créer
          </button>
        </div>
      </form>
    </Modal>
  );
}

function JoinServerModal({ onClose }) {
  const { go } = useUI();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    setError('');
    try {
      const id = joinServer(code);
      go({ name: 'server', serverId: id });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal open title="Rejoindre un serveur" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Code d’invitation
          <input
            className="field font-mono uppercase"
            placeholder="Ex. HEVENLY1"
            value={code}
            autoFocus
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <ErrorLine>{error}</ErrorLine>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={!code.trim()}>
            Rejoindre
          </button>
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
  const isOwner = server.owner_id === me.id;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(server.invite_code);
      toast('Code copié');
    } catch {
      toast('Copie impossible, sélectionnez le code manuellement.');
    }
  };

  return (
    <Modal open title={`Inviter sur ${server.name}`} onClose={onClose}>
      <p className="mb-4 text-sm text-slate-400">Partagez ce code avec vos amis pour qu’ils rejoignent le serveur.</p>
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-900/70 p-2 pl-4">
        <code className="flex-1 select-all font-mono text-lg tracking-widest text-brand-300">{server.invite_code}</code>
        <button className="btn-ghost !py-2" onClick={copy}>
          Copier
        </button>
      </div>
      {isOwner && (
        <button
          className="btn-danger mt-4 w-full"
          onClick={() => run(toast, () => regenerateInvite(serverId), 'Nouveau code généré')}
        >
          Générer un nouveau code
        </button>
      )}
    </Modal>
  );
}

function SettingsModal({ onClose }) {
  const s = useStore();
  const { go, toast } = useUI();
  const me = getMe(s);
  return (
    <Modal open title="Paramètres" onClose={onClose}>
      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
        <Avatar user={me} size="md" showStatus />
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{fullName(me)}</p>
          <p className="text-xs text-slate-500">{me.is_plus ? 'Membre PLUS' : 'Compte standard'}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <button className="btn-ghost justify-start" onClick={() => go({ name: 'profile', userId: me.id })}>
          👤 Modifier mon profil
        </button>
        <button className="btn-ghost justify-start" onClick={() => run(toast, () => togglePlus(), 'Statut PLUS mis à jour')}>
          ⭐ {me.is_plus ? 'Désactiver PLUS' : 'Activer PLUS (simulation)'}
        </button>
        <button
          className="btn-danger justify-start"
          onClick={() => {
            logout();
            onClose();
          }}
        >
          ⏻ Se déconnecter
        </button>
      </div>
    </Modal>
  );
}

function MiniProfileModal({ userId, serverId, onClose }) {
  const s = useStore();
  const { go, openModal } = useUI();
  const me = getMe(s);
  const user = getUser(s, userId);
  if (!user) return null;
  const roleName =
    s.servers.find((x) => x.id === serverId)?.owner_id === user.id
      ? 'Propriétaire'
      : rolesOf(s, serverId).find((r) => membership(s, serverId, user.id)?.role_ids.includes(r.id))?.name;

  return (
    <Modal open title="" onClose={onClose} width="max-w-sm">
      <div className="-mx-6 -mt-14">
        <Banner user={user} className="h-24 rounded-t-[2.5rem]" />
      </div>
      <div className="-mt-10 flex flex-col gap-3">
        <Avatar user={user} size="lg" showStatus className="ring-4 ring-ink-800 rounded-2xl" />
        <div>
          <p className="text-lg font-bold text-white">
            {user.pseudo} <span className="text-sm font-normal text-slate-400">#{user.tag}</span>
          </p>
          <p className="text-xs text-slate-500">
            {isOnline(user) ? 'En ligne' : 'Hors ligne'}
            {roleName ? ` · ${roleName}` : ''}
          </p>
        </div>
        <p className="text-sm text-slate-300">{user.bio || 'Aucune biographie.'}</p>
        <div className="mt-2 flex flex-col gap-2">
          <button className="btn-primary" onClick={() => go({ name: 'profile', userId: user.id })}>
            Voir le profil complet
          </button>
          {user.id !== me.id && (
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => go({ name: 'messages', withId: user.id })}>
                💬 Message
              </button>
              <button className="btn-danger flex-1" onClick={() => openModal('report', { userId: user.id })}>
                🚩 Signaler
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ReportModal({ userId, onClose }) {
  const s = useStore();
  const { toast } = useUI();
  const target = getUser(s, userId);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  if (!target) return null;

  const submit = (e) => {
    e.preventDefault();
    setError('');
    try {
      reportUser(userId, reason);
      toast('Signalement envoyé. Merci.');
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal open title={`Signaler ${target.pseudo}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Motif
          <textarea
            className="field min-h-28 resize-none"
            maxLength={300}
            placeholder="Décrivez le problème (harcèlement, spam, contenu inapproprié…)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <ErrorLine>{error}</ErrorLine>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-danger" disabled={reason.trim().length < 3}>
            Envoyer le signalement
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ChannelModal({ serverId, onClose }) {
  const { toast } = useUI();
  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    setError('');
    try {
      createChannel(serverId, name, type);
      toast('Salon créé');
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal open title="Créer un salon" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: 'text', label: '# Texte' },
            { v: 'voice', label: '🔊 Vocal' },
          ].map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setType(opt.v)}
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                type === opt.v ? 'border-brand-500/60 bg-brand-500/15 text-brand-300' : 'border-white/10 bg-white/5 text-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Nom du salon
          <input className="field" maxLength={24} value={name} autoFocus onChange={(e) => setName(e.target.value)} placeholder="ex. annonces" />
        </label>
        <ErrorLine>{error}</ErrorLine>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={!name.trim()}>
            Créer
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RolesModal({ serverId, onClose }) {
  const s = useStore();
  const { toast } = useUI();
  const me = getMe(s);
  const server = s.servers.find((x) => x.id === serverId);
  const [name, setName] = useState('');
  const [color, setColor] = useState(ROLE_COLORS[0]);
  const [canManage, setCanManage] = useState(false);
  const [error, setError] = useState('');
  if (!server) return null;
  const isOwner = server.owner_id === me.id;
  const roles = rolesOf(s, serverId);
  const members = membersOf(s, serverId).filter((u) => u.id !== server.owner_id);

  const submit = (e) => {
    e.preventDefault();
    setError('');
    try {
      createRole(serverId, { name, color, can_manage_channels: canManage });
      setName('');
      setCanManage(false);
      toast('Rôle créé');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal open title="Rôles & permissions" onClose={onClose} width="max-w-lg">
      {!isOwner ? (
        <p className="text-sm text-slate-400">Seul le propriétaire du serveur peut gérer les rôles.</p>
      ) : (
        <div className="flex flex-col gap-6">
          <form onSubmit={submit} className="flex flex-col gap-4 rounded-3xl bg-white/5 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Nouveau rôle</p>
            <input className="field" maxLength={20} placeholder="Nom du rôle" value={name} onChange={(e) => setName(e.target.value)} />
            <div>
              <p className="mb-2 text-sm text-slate-300">Couleur</p>
              <ColorDiamonds value={color} onChange={setColor} />
            </div>
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={canManage} onChange={(e) => setCanManage(e.target.checked)} />
              Peut gérer les salons (créer / supprimer)
            </label>
            <ErrorLine>{error}</ErrorLine>
            <button type="submit" className="btn-primary self-end" disabled={!name.trim()}>
              Créer le rôle
            </button>
          </form>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Attribution</p>
            {roles.length === 0 && <p className="text-sm text-slate-500">Aucun rôle pour l’instant.</p>}
            <div className="flex flex-col gap-3">
              {members.map((u) => {
                const m = membership(s, serverId, u.id);
                return (
                  <div key={u.id} className="flex flex-col gap-2 rounded-2xl bg-white/5 p-3">
                    <div className="flex items-center gap-2">
                      <Avatar user={u} size="xs" />
                      <span className="text-sm font-semibold text-white">{fullName(u)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {roles.map((r) => {
                        const on = m?.role_ids.includes(r.id);
                        return (
                          <button
                            key={r.id}
                            onClick={() => run(toast, () => toggleRole(serverId, u.id, r.id))}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                              on ? 'border-transparent text-ink-950' : 'border-white/10 text-slate-400 hover:text-white'
                            }`}
                            style={on ? { background: r.color } : undefined}
                          >
                            {r.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {members.length === 0 && <p className="text-sm text-slate-500">Aucun autre membre.</p>}
            </div>
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
  settings: SettingsModal,
  mini: MiniProfileModal,
  report: ReportModal,
  channel: ChannelModal,
  roles: RolesModal,
};

