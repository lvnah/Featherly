import { useEffect, useRef, useState } from 'react';
import {
  canManageChannels,
  deleteChannel,
  friendshipBetween,
  getMe,
  getUser,
  isFriend,
  isMember,
  joinVoice,
  kickMember,
  leaveVoice,
  membersOf,
  membership,
  roleColorOf,
  roleRank,
  rolesOf,
  sendFriendRequest,
  sendMessage,
  toggleRole,
} from '../lib/store';
import { useStore, useUI, Avatar, EmptyState, ErrorLine } from '../components/ui';
import { formatTime, isOnline } from '../lib/util';

// Action avec retour utilisateur (toast en cas de succès, erreur sinon).
export function run(toast, fn, okMessage) {
  try {
    fn();
    if (okMessage) toast(okMessage);
    return true;
  } catch (err) {
    toast(err.message);
    return false;
  }
}

// Menu contextuel d'un membre (utilisé dans le chat et la liste des membres).
export function memberMenuItems({ s, me, serverId, userId, go, openModal, toast }) {
  const target = getUser(s, userId);
  if (!target) return [];
  const srv = s.servers.find((x) => x.id === serverId);
  const items = [{ label: 'Voir le profil', icon: '👤', onClick: () => go({ name: 'profile', userId }) }];

  if (userId !== me.id) {
    items.push({ label: 'Envoyer un message', icon: '💬', onClick: () => go({ name: 'messages', withId: userId }) });
    if (!isFriend(s, me.id, userId)) {
      const pending = friendshipBetween(s, me.id, userId);
      items.push({
        label: pending ? 'Demande en attente' : 'Ajouter en ami',
        icon: '➕',
        disabled: !!pending,
        onClick: () => run(toast, () => sendFriendRequest(userId), 'Demande d’ami envoyée'),
      });
    }
    items.push({ label: 'Signaler', icon: '🚩', danger: true, onClick: () => openModal('report', { userId }) });
  }

  if (srv?.owner_id === me.id && userId !== me.id) {
    items.push({ separator: true });
    rolesOf(s, serverId).forEach((r) => {
      const has = membership(s, serverId, userId)?.role_ids.includes(r.id);
      items.push({
        label: `${has ? 'Retirer' : 'Attribuer'} « ${r.name} »`,
        icon: '🏷️',
        onClick: () => run(toast, () => toggleRole(serverId, userId, r.id), 'Rôles mis à jour'),
      });
    });
    items.push({
      label: 'Expulser du serveur',
      icon: '🚪',
      danger: true,
      onClick: () => run(toast, () => kickMember(serverId, userId), 'Membre expulsé'),
    });
  }
  return items;
}

export default function ServerView({ serverId, channelId }) {
  const s = useStore();
  const { go, openModal, openMenu, toast } = useUI();
  const me = getMe(s);
  const server = s.servers.find((x) => x.id === serverId);
  const allowed = !!server && isMember(s, serverId, me.id);

  const channels = s.channels.filter((c) => c.server_id === serverId);
  const textChannels = channels.filter((c) => c.type === 'text');
  const voiceChannels = channels.filter((c) => c.type === 'voice');
  const current = textChannels.find((c) => c.id === channelId) || textChannels[0];
  const messages = current ? s.messages.filter((m) => m.channel_id === current.id) : [];

  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const listRef = useRef(null);

  // Scroll automatique en bas à chaque nouveau message (polling inclus).
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length, current?.id]);

  if (!allowed) {
    return (
      <EmptyState icon="🔒" title="Serveur introuvable">
        Ce serveur n’existe pas ou vous n’en êtes pas membre. Utilisez un code d’invitation pour le rejoindre.
      </EmptyState>
    );
  }

  const isOwner = server.owner_id === me.id;
  const canManage = canManageChannels(s, serverId, me.id);
  const myVoice = s.voice.find((v) => v.user_id === me.id);
  const members = membersOf(s, serverId).sort(
    (a, b) => roleRank(s, serverId, a.id) - roleRank(s, serverId, b.id) || a.pseudo.localeCompare(b.pseudo),
  );
  const onlineMembers = members.filter(isOnline);
  const offlineMembers = members.filter((u) => !isOnline(u));

  const voiceUsers = (channel) =>
    s.voice.filter((v) => v.channel_id === channel.id).map((v) => getUser(s, v.user_id)).filter(Boolean);

  const submit = (e) => {
    e.preventDefault();
    if (!current) return;
    setError('');
    try {
      sendMessage(current.id, text);
      setText('');
    } catch (err) {
      setError(err.message);
    }
  };

  const channelMenu = (e, channel) => {
    if (!canManage || channels.length <= 1) {
      e.preventDefault();
      return;
    }
    openMenu(e, [
      {
        label: 'Supprimer le salon',
        icon: '🗑️',
        danger: true,
        onClick: () => run(toast, () => deleteChannel(channel.id), 'Salon supprimé'),
      },
    ]);
  };

  const openMember = (userId) => openModal('mini', { userId, serverId });

  const memberRow = (u) => {
    const color = roleColorOf(s, serverId, u.id);
    const roleName = u.id === server.owner_id
      ? 'Propriétaire'
      : rolesOf(s, serverId).find((r) => membership(s, serverId, u.id)?.role_ids.includes(r.id))?.name;
    return (
      <button
        key={u.id}
        onClick={() => openMember(u.id)}
        onContextMenu={(e) =>
          openMenu(e, memberMenuItems({ s, me, serverId, userId: u.id, go, openModal, toast }))
        }
        className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-white/5"
      >
        <Avatar user={u} size="sm" showStatus />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold" style={{ color: color || '#e2e8f0' }}>
            {u.pseudo}
          </span>
          {roleName && <span className="block truncate text-[11px] text-slate-500">{roleName}</span>}
        </span>
      </button>
    );
  };

  const membersPanel = (
    <>
      <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
        En ligne · {onlineMembers.length}
      </p>
      {onlineMembers.map(memberRow)}
      <p className="px-2 pb-1 pt-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
        Hors ligne · {offlineMembers.length}
      </p>
      {offlineMembers.map(memberRow)}
    </>
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
      {/* Colonne des salons */}
      <aside className="flex max-h-56 shrink-0 flex-col border-b border-white/5 bg-ink-900/40 md:max-h-none md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-2 border-b border-white/5 p-4">
          <h2 className="truncate font-bold text-white" title={server.name}>
            {server.name}
          </h2>
          <div className="flex shrink-0 gap-1">
            <button
              title="Inviter"
              onClick={() => openModal('invite', { serverId })}
              className="rounded-lg px-2 py-1 text-sm hover:bg-white/10"
            >
              🔗
            </button>
            {isOwner && (
              <button
                title="Rôles"
                onClick={() => openModal('roles', { serverId })}
                className="rounded-lg px-2 py-1 text-sm hover:bg-white/10"
              >
                🏷️
              </button>
            )}
            {canManage && (
              <button
                title="Créer un salon"
                onClick={() => openModal('channel', { serverId })}
                className="rounded-lg px-2 py-1 text-lg leading-none hover:bg-white/10"
              >
                +
              </button>
            )}
          </div>
        </div>

        <div className="thin-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
          <ChannelGroup title="Salons texte">
            {textChannels.map((c) => (
              <button
                key={c.id}
                onClick={() => go({ name: 'server', serverId, channelId: c.id })}
                onContextMenu={(e) => channelMenu(e, c)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                  current?.id === c.id ? 'bg-white/10 font-semibold text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <span className="text-slate-500">#</span>
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </ChannelGroup>

          <ChannelGroup title="Salons vocaux">
            {voiceChannels.map((c) => {
              const users = voiceUsers(c);
              const inside = myVoice?.channel_id === c.id;
              return (
                <div key={c.id}>
                  <button
                    onClick={() => run(toast, () => joinVoice(c.id), `Connecté à ${c.name}`)}
                    onContextMenu={(e) => channelMenu(e, c)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                      inside ? 'bg-brand-500/15 text-brand-300' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <span>🔊</span>
                    <span className="truncate">{c.name}</span>
                  </button>
                  {users.length > 0 && (
                    <div className="ml-6 flex flex-col gap-1 py-1">
                      {users.map((u) => (
                        <div key={u.id} className="flex items-center gap-2 text-xs text-slate-400">
                          <Avatar user={u} size="xs" />
                          <span className="truncate">{u.pseudo}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {voiceChannels.length === 0 && <p className="px-3 text-xs text-slate-600">Aucun salon vocal.</p>}
          </ChannelGroup>
        </div>

        {myVoice && (
          <VoicePanel
            channel={channels.find((c) => c.id === myVoice.channel_id)}
            users={voiceUsers(channels.find((c) => c.id === myVoice.channel_id) || { id: '' })}
            onLeave={() => run(toast, () => leaveVoice(), 'Vous avez quitté le vocal')}
          />
        )}
      </aside>

      {/* Chat */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-white/5 bg-ink-900/30 px-5 py-4 backdrop-blur">
          <span className="text-xl text-slate-500">#</span>
          <h3 className="truncate font-bold text-white">{current?.name ?? 'aucun salon'}</h3>
          <span className="hidden truncate text-sm text-slate-500 sm:block">
            {server.is_public ? 'Serveur public' : 'Serveur privé'}
          </span>
        </header>

        {current ? (
          <>
            <div ref={listRef} className="thin-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-4">
              {messages.length === 0 && (
                <p className="m-auto text-sm text-slate-500">Aucun message dans #{current.name}. Lancez la discussion !</p>
              )}
              {messages.map((m) => {
                const author = getUser(s, m.user_id);
                if (!author) return null;
                const color = roleColorOf(s, serverId, author.id) || '#e2e8f0';
                return (
                  <div key={m.id} className="flex gap-3 rounded-2xl px-3 py-2 hover:bg-white/[0.03]">
                    <button
                      onClick={() => openMember(author.id)}
                      onContextMenu={(e) =>
                        openMenu(e, memberMenuItems({ s, me, serverId, userId: author.id, go, openModal, toast }))
                      }
                      className="mt-0.5"
                      aria-label={`Profil de ${author.pseudo}`}
                    >
                      <Avatar user={author} size="sm" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <button
                          onClick={() => openMember(author.id)}
                          onContextMenu={(e) =>
                            openMenu(e, memberMenuItems({ s, me, serverId, userId: author.id, go, openModal, toast }))
                          }
                          className="font-semibold hover:underline"
                          style={{ color }}
                        >
                          {author.pseudo}
                        </button>
                        <span className="text-xs text-slate-500">#{author.tag}</span>
                        <span className="text-xs text-slate-600">{formatTime(m.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm text-slate-200">{m.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={submit} className="border-t border-white/5 p-4">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-900/70 pl-4 pr-2 focus-within:border-brand-500/60">
                <input
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                  placeholder={`Écrire dans #${current.name}`}
                  value={text}
                  maxLength={2000}
                  onChange={(e) => setText(e.target.value)}
                />
                <button type="submit" className="btn-primary !px-4 !py-2" disabled={!text.trim()}>
                  Envoyer
                </button>
              </div>
              <ErrorLine>{error}</ErrorLine>
            </form>
          </>
        ) : (
          <EmptyState icon="#" title="Aucun salon texte">
            Demandez à un membre disposant de la permission « gérer les salons » d’en créer un.
          </EmptyState>
        )}
      </section>

      {/* Membres : sidebar desktop, repli mobile */}
      <aside className="thin-scroll hidden w-60 shrink-0 flex-col overflow-y-auto border-l border-white/5 bg-ink-900/40 p-3 lg:flex">
        {membersPanel}
      </aside>
      <details className="border-t border-white/5 bg-ink-900/40 p-3 lg:hidden">
        <summary className="cursor-pointer text-sm font-semibold text-slate-300">
          Membres · {members.length}
        </summary>
        <div className="mt-2 max-h-60 overflow-y-auto">{membersPanel}</div>
      </details>
    </div>
  );
}

function ChannelGroup({ title, children }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">{title}</p>
      {children}
    </div>
  );
}

// Panneau flottant de l'état vocal actif.
function VoicePanel({ channel, users, onLeave }) {
  return (
    <div className="card m-3 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-500" />
        <p className="truncate text-sm font-semibold text-brand-300">Vocal · {channel?.name ?? '—'}</p>
      </div>
      <div className="mb-3 flex -space-x-2">
        {users.slice(0, 6).map((u) => (
          <Avatar key={u.id} user={u} size="xs" className="ring-2 ring-ink-850" />
        ))}
      </div>
      <button onClick={onLeave} className="btn-danger w-full !py-2">
        Quitter le vocal
      </button>
    </div>
  );
}
