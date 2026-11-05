import { useEffect, useRef, useState } from 'react';
import {
  roleOf, canManageChannels, deleteChannel, friendshipBetween, getMe, getUser, isFriend, isMember, joinVoice, kickMember,
  leaveVoice, membersOf, membership, roleColorOf, roleNameOf, roleRank, rolesOf, sendFriendRequest, sendMessage,
  assignRole, deleteMessage,
} from '../lib/store';
import { useStore, useUI, Avatar, CountBadge, EmptyState, ErrorLine, Icon, ServerIcon } from '../components/ui';
import PlusBadge from '../components/PlusBadge';
import { isVoiceMuted, setVoiceMuted } from '../lib/voice';
import { markChannelRead, unreadCount, leaveServer } from '../lib/store';
import { formatStamp, isOnline } from '../lib/util';

// Exécute une action async et affiche le résultat dans un toast.
export async function run(toast, fn, okMessage) {
  try {
    await fn();
    // Les succès ne déclenchent plus de notification : seules les erreurs sont affichées.
    return true;
  } catch (err) {
    toast(err.message);
    return false;
  }
}

// Menu contextuel d'un membre (chat et liste des membres).
export function memberMenuItems({ s, me, serverId, userId, go, openModal, toast }) {
  const target = getUser(s, userId);
  if (!target) return [];
  const srv = s.servers.find((x) => x.id === serverId);
  const items = [{ label: 'Voir le profil', onClick: () => go({ name: 'profile', userId }) }];
  if (userId !== me.id) {
    items.push({ label: 'Envoyer un message', onClick: () => go({ name: 'messages', withId: userId }) });
    if (!isFriend(s, me.id, userId)) {
      const pending = friendshipBetween(s, me.id, userId);
      items.push({
        label: pending ? 'Demande en attente' : 'Ajouter en ami',
        disabled: !!pending,
        onClick: () => run(toast, () => sendFriendRequest(userId), 'Demande d’ami envoyée'),
      });
    }
    items.push({ label: 'Signaler', danger: true, onClick: () => openModal('report', { userId, serverId }) });
  }
  if (srv?.owner_id === me.id) {
    const current = membership(s, serverId, userId)?.role_ids[0] ?? null;
    items.push({ separator: true }, { header: 'Rôles' });
    items.push({ label: 'Aucun rôle', checked: current === null, onClick: () => run(toast, () => assignRole(serverId, userId, null), 'Rôle retiré') });
    rolesOf(s, serverId).forEach((r) =>
      items.push({ label: r.name, checked: current === r.id, onClick: () => run(toast, () => assignRole(serverId, userId, r.id), 'Rôle modifié') }),
    );
    if (userId !== me.id) {
      items.push({ separator: true }, { label: 'Expulser de l’espace', danger: true, onClick: () => run(toast, () => kickMember(serverId, userId), 'Membre expulsé') });
    }
  }
  return items;
}

export default function ServerView({ serverId, channelId, goHome }) {
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
  const [, setVoiceTick] = useState(0);
  // Salon ouvert : on le marque comme lu dès qu'il a des messages non lus.
  const unreadHere = current ? (unreadCount(s).channels[current.id] || 0) : 0;
  useEffect(() => {
    if (current && unreadHere > 0) markChannelRead(current.id).catch(() => {});
  }, [current?.id, unreadHere]); // eslint-disable-line react-hooks/exhaustive-deps
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length, current?.id]);

  if (!allowed) {
    return (
      <div className="panel flex flex-1">
        <EmptyState icon="bolt" title="Espace introuvable">
          Cet espace n’existe pas ou vous n’en êtes pas membre. Utilisez un code d’invitation pour le rejoindre.
        </EmptyState>
      </div>
    );
  }

  const isOwner = server.owner_id === me.id;
  const canManage = canManageChannels(s, serverId, me.id);
  const myVoice = s.voice.find((v) => v.user_id === me.id);
  const myVoiceChannel = channels.find((c) => c.id === myVoice?.channel_id);
  const members = membersOf(s, serverId).sort(
    (a, b) => roleRank(s, serverId, a.id) - roleRank(s, serverId, b.id) || a.pseudo.localeCompare(b.pseudo),
  );
  const onlineMembers = members.filter(isOnline);
  // Salon vocal où se trouve chaque membre (affiché sous son tag).
  const voiceChannelOf = (userId) => {
    const v = s.voice.find((x) => x.user_id === userId && channels.some((c) => c.id === x.channel_id));
    return v ? channels.find((c) => c.id === v.channel_id) : null;
  };
  const offlineMembers = members.filter((u) => !isOnline(u));
  const voiceUsers = (c) => s.voice.filter((v) => v.channel_id === c.id).map((v) => getUser(s, v.user_id)).filter(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    if (!current || !text.trim()) return;
    setError('');
    try {
      await sendMessage(current.id, text);
      setText('');
    } catch (err) {
      setError(err.message);
    }
  };

  const channelMenu = (e, channel) => {
    if (!canManage) {
      e.preventDefault();
      return;
    }
    openMenu(e, [
      { label: 'Renommer le salon', onClick: () => openModal('rename-channel', { channelId: channel.id, current: channel.name }) },
      // Le dernier salon d'un espace ne peut pas être supprimé.
      ...(channels.length > 1 ? [{ separator: true }, { label: 'Supprimer le salon', danger: true, onClick: () => run(toast, () => deleteChannel(channel.id)) }] : []),
    ]);
  };

  const memberMenu = (e, userId) =>
    openMenu(e, memberMenuItems({ s, me, serverId, userId, go, openModal, toast }));

  // Une ligne de membre (liste de droite).
  const memberRow = (u) => {
    const color = roleColorOf(s, serverId, u.id) || '#0f172a';
    const online = isOnline(u);
    return (
      <button
        key={u.id}
        onClick={() => openModal('mini', { userId: u.id, serverId })}
        onContextMenu={(e) => memberMenu(e, u.id)}
        className={`flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-2.5 text-left transition hover:shadow-soft ${online ? '' : 'opacity-50'}`}
      >
        <Avatar user={u} size="sm" showStatus />
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-1.5"><span className="truncate text-sm font-bold" style={{ color }}>{u.pseudo}</span>{u.is_plus ? <PlusBadge /> : null}</span>
          <span className="block truncate text-xs font-semibold text-slate-500">#{u.tag}</span>
          {voiceChannelOf(u.id) && (
            <span className="block truncate text-xs font-bold text-brand-600">Vocal · {voiceChannelOf(u.id).name}</span>
          )}
        </span>
      </button>
    );
  };

  // Groupes en ligne par rôle (ex. « OWNER — 1 »), puis hors ligne.
  // Un groupe par rôle (dans l'ordre des rôles), les membres sans rôle en dernier.
  const onlineGroups = [];
  onlineMembers.forEach((u) => {
    const role = roleOf(s, serverId, u.id);
    const key = role?.id ?? 'none';
    let group = onlineGroups.find((g) => g.key === key);
    if (!group) {
      group = { key, label: role ? role.name.toUpperCase() : null, color: role?.color ?? '#64748b', users: [] };
      onlineGroups.push(group);
    }
    group.users.push(u);
  });
  onlineGroups.sort((a, b) => (a.key === 'none') - (b.key === 'none'));

  const membersPanel = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-600">En ligne — {onlineMembers.length}</p>
        {onlineGroups.map((g) => (
          <div key={g.label} className="flex flex-col gap-2">
            {g.label && (
              <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: g.color }}>
                {g.label} — {g.users.length}
              </p>
            )}
            {g.users.map((u) => memberRow(u))}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Hors ligne — {offlineMembers.length}</p>
        {offlineMembers.map((u) => memberRow(u))}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      {/* Barre d'en-tête de l'espace */}
      <header className="panel flex flex-wrap items-center gap-4 rounded-[2rem] px-5 py-3">
        <button onClick={goHome} aria-label="Retour à l’accueil" className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200">
          <Icon name="back" className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 items-center gap-3" onContextMenu={(e) => {
          if (isOwner) { e.preventDefault(); return; }
          openMenu(e, [{ label: 'Quitter l’espace', danger: true, onClick: () => { if (window.confirm(`Quitter « ${server.name} » ?`)) run(toast, () => leaveServer(serverId)).then((ok) => ok && goHome()); } }]);
        }}>
          <ServerIcon server={server} className="h-12 w-12" />
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold">{server.name}</p>
            <span className="pill !bg-brand-50 !text-brand-700">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              Hub Communautaire Actif
            </span>
          </div>
        </div>


        <div className="flex items-center gap-2">
          <button onClick={() => (isOwner ? openModal('espace-settings', { serverId }) : toast('Réservé au propriétaire de l’espace.'))} className="btn-ghost !rounded-full !py-2.5">
            <Icon name="settings" className="h-4 w-4" />
            Paramètres
          </button>
          <button onClick={() => openModal('invite', { serverId })} className="btn-primary !rounded-full !py-2.5">
            Inviter
          </button>
        </div>
      </header>

      {/* Salons : tuiles toujours visibles. Un vocal montre qui est dedans (photos) et sa capacité. */}
      <nav className="panel thin-scroll flex items-stretch gap-3 overflow-x-auto p-3">
        {textChannels.map((c) => {
          const active = current?.id === c.id;
          const n = unreadCount(s).channels[c.id] || 0;
          return (
            <button
              key={c.id}
              onClick={() => go({ name: 'server', serverId, channelId: c.id })}
              onContextMenu={(e) => channelMenu(e, c)}
              className={`flex min-w-[9rem] shrink-0 flex-col justify-between gap-3 rounded-3xl px-4 py-3 text-left transition ${
                active ? 'bg-slate-900 text-white shadow-soft' : 'bg-white text-slate-700 shadow-soft hover:-translate-y-0.5'
              }`}
            >
              <span className="flex items-center justify-between">
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${active ? 'bg-white/10 text-brand-400' : 'bg-brand-50 text-brand-600'}`}>
                  <Icon name="hash" className="h-4 w-4" />
                </span>
                <CountBadge n={active ? 0 : n} />
              </span>
              <span className="truncate text-sm font-bold">{c.name}</span>
              <span className={`text-[11px] font-semibold ${active ? 'text-white/60' : 'text-slate-400'}`}>Texte</span>
            </button>
          );
        })}
        {voiceChannels.map((c) => {
          const users = voiceUsers(c);
          const inside = myVoice?.channel_id === c.id;
          return (
            <button
              key={c.id}
              onClick={() => run(toast, () => joinVoice(c.id), `Connecté à ${c.name}`)}
              onContextMenu={(e) => channelMenu(e, c)}
              className={`flex min-w-[12rem] shrink-0 flex-col justify-between gap-3 rounded-3xl px-4 py-3 text-left transition ${
                inside ? 'bg-brand-500 text-white shadow-[0_12px_30px_-12px_rgba(0,116,84,0.8)]' : 'bg-white text-slate-700 shadow-soft hover:-translate-y-0.5'
              }`}
            >
              <span className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${inside ? 'bg-white/15' : 'bg-brand-50 text-brand-600'}`}>
                    <Icon name="speaker" className="h-4 w-4" />
                  </span>
                  {c.name}
                  {inside && <Icon name={isVoiceMuted() ? 'micOff' : 'mic'} className="h-4 w-4 opacity-90" />}
                </span>
                <span className={`text-[11px] font-bold ${inside ? 'text-white/80' : 'text-slate-400'}`}>{users.length}/5</span>
              </span>
              <span className="flex min-h-7 items-center">
                {users.length === 0 ? (
                  <span className={`text-xs ${inside ? 'text-white/70' : 'text-slate-400'}`}>Vide</span>
                ) : (
                  <span className="flex -space-x-2">
                    {users.slice(0, 5).map((u) => (
                      <Avatar key={u.id} user={u} size="xs" className="ring-2 ring-white" />
                    ))}
                  </span>
                )}
              </span>
            </button>
          );
        })}
        {canManage && (
          <button onClick={() => openModal('channel', { serverId })} className="flex min-w-[8rem] shrink-0 flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed border-brand-200 text-sm font-bold text-brand-700 hover:bg-brand-50">
            <Icon name="plus" className="h-5 w-5" />
            Nouveau salon
          </button>
        )}
      </nav>

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Chat */}
        <section className="panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
            <span className="pill !bg-brand-100 !px-3 !py-1 !text-sm !font-bold !text-brand-700">Salon #{current?.name ?? '—'}</span>
          </div>

          {current ? (
            <>
              <div ref={listRef} className="thin-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
                {messages.length === 0 && <p className="m-auto text-sm text-slate-500">Aucun message dans #{current.name}. Lancez la discussion !</p>}
                {messages.map((m) => {
                  const author = getUser(s, m.user_id);
                  if (!author) return null;
                  const color = roleColorOf(s, serverId, author.id) || '#0f172a';
                  return (
                    <div key={m.id} className="group flex items-center gap-4 rounded-3xl border border-slate-100 bg-white px-5 py-4 shadow-soft">
                      <button onClick={() => openModal('mini', { userId: author.id, serverId })} onContextMenu={(e) => memberMenu(e, author.id)} aria-label={`Profil de ${author.pseudo}`}>
                        <Avatar user={author} size="md" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button onClick={() => openModal('mini', { userId: author.id, serverId })} onContextMenu={(e) => memberMenu(e, author.id)} className="font-bold hover:underline" style={{ color }}>
                            {author.pseudo}
                          </button>
                          {author.is_plus ? <PlusBadge /> : null}
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">#{author.tag}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm font-bold text-slate-900">{m.content}</p>
                      </div>
                      <span className="hidden shrink-0 text-xs text-slate-400 sm:block">{formatStamp(m.created_at)}</span>
                      {(isOwner || author.id === me.id) && (
                        <button
                          title="Supprimer le message"
                          aria-label="Supprimer le message"
                          onClick={() => run(toast, () => deleteMessage(m.id), 'Message supprimé')}
                          className="shrink-0 rounded-xl p-2 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <form onSubmit={submit} className="border-t border-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <input
                    className="field !rounded-2xl !bg-slate-100 !py-3.5"
                    placeholder={`Partager quelque chose dans #${current.name}...`}
                    value={text}
                    maxLength={2000}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <button type="submit" disabled={!text.trim()} aria-label="Envoyer" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-[0_10px_24px_-10px_rgba(34,197,94,0.8)] transition hover:bg-brand-600 disabled:opacity-40">
                    <Icon name="send" className="h-5 w-5" />
                  </button>
                </div>
                <ErrorLine>{error}</ErrorLine>
              </form>
            </>
          ) : (
            <EmptyState icon="hash" title="Aucun salon texte">Demandez à un membre disposant de la permission « gérer les salons » d’en créer un.</EmptyState>
          )}
          {myVoiceChannel && (
            <div className="flex flex-wrap items-center gap-3 border-t border-brand-100 bg-brand-50 px-5 py-3">
              <span className="flex items-center gap-2 text-sm font-bold text-brand-800">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-500" />
                En vocal · {myVoiceChannel.name}
                <span className="font-semibold text-brand-600">{voiceUsers(myVoiceChannel).length}/5</span>
              </span>
              <div className="ml-auto flex gap-2">
                <button onClick={() => { setVoiceMuted(!isVoiceMuted()); setVoiceTick((t) => t + 1); }} className={`btn-ghost !py-2 ${isVoiceMuted() ? 'text-red-600' : 'text-brand-700'}`} aria-label={isVoiceMuted() ? 'Activer le micro' : 'Couper le micro'}>
                  <Icon name={isVoiceMuted() ? 'micOff' : 'mic'} className="h-4 w-4" />
                  {isVoiceMuted() ? 'Micro coupé' : 'Micro ouvert'}
                </button>
                <button onClick={() => run(toast, () => leaveVoice())} className="btn-danger !py-2">Quitter</button>
              </div>
            </div>
          )}
        </section>

        {/* Membres (desktop) */}
        <aside className="panel thin-scroll hidden w-72 shrink-0 overflow-y-auto p-5 lg:block">{membersPanel}</aside>
      </div>
    </div>
  );
}
