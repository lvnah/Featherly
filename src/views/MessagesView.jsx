import { useEffect, useRef, useState } from 'react';
import { friendsOf, getMe, getUser, sendDM } from '../lib/store';
import { useStore, useUI, Avatar, EmptyState, ErrorLine } from '../components/ui';
import { formatTime, fullName, isOnline } from '../lib/util';

// Messages privés. Sur mobile : liste ou conversation, jamais les deux.
export default function MessagesView({ withId }) {
  const s = useStore();
  const { go } = useUI();
  const me = getMe(s);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const listRef = useRef(null);

  const partnerIds = new Set([
    ...friendsOf(s, me.id).map((u) => u.id),
    ...s.dms.flatMap((d) => [d.from, d.to]).filter((id) => id !== me.id),
  ]);

  const lastDmWith = (id) =>
    s.dms.filter((d) => (d.from === me.id && d.to === id) || (d.from === id && d.to === me.id)).at(-1);

  const conversations = [...partnerIds]
    .map((id) => getUser(s, id))
    .filter(Boolean)
    .map((u) => ({ user: u, last: lastDmWith(u.id) }))
    .sort(
      (a, b) =>
        (b.last?.created_at || 0) - (a.last?.created_at || 0) || a.user.pseudo.localeCompare(b.user.pseudo),
    );

  const partner = withId ? getUser(s, withId) : null;
  const thread = partner
    ? s.dms
        .filter((d) => (d.from === me.id && d.to === partner.id) || (d.from === partner.id && d.to === me.id))
        .sort((a, b) => a.created_at - b.created_at)
    : [];

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [thread.length, withId]);

  const submit = (e) => {
    e.preventDefault();
    if (!partner) return;
    setError('');
    try {
      sendDM(partner.id, text);
      setText('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      {/* Liste des conversations */}
      <aside
        className={`thin-scroll w-full flex-col overflow-y-auto border-r border-white/5 bg-ink-900/40 p-3 md:flex md:w-72 md:shrink-0 ${
          withId ? 'hidden' : 'flex'
        }`}
      >
        <h2 className="px-2 pb-3 pt-1 text-lg font-bold text-white">Messages</h2>
        {conversations.length === 0 && (
          <p className="px-2 text-sm text-slate-500">
            Aucune conversation. Ajoutez un ami pour commencer à discuter en privé.
          </p>
        )}
        <div className="flex flex-col gap-1">
          {conversations.map(({ user, last }) => (
            <button
              key={user.id}
              onClick={() => go({ name: 'messages', withId: user.id })}
              className={`flex items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-white/5 ${
                withId === user.id ? 'bg-white/10' : ''
              }`}
            >
              <Avatar user={user} size="sm" showStatus />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{fullName(user)}</span>
                <span className="block truncate text-xs text-slate-500">
                  {last ? last.content : isOnline(user) ? 'En ligne' : 'Hors ligne'}
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* Conversation */}
      <section className={`min-h-0 min-w-0 flex-1 flex-col ${withId ? 'flex' : 'hidden md:flex'}`}>
        {partner ? (
          <>
            <header className="flex items-center gap-3 border-b border-white/5 bg-ink-900/30 px-4 py-4 backdrop-blur">
              <button
                onClick={() => go({ name: 'messages' })}
                className="rounded-xl px-2 py-1 text-lg hover:bg-white/10 md:hidden"
                aria-label="Retour aux conversations"
              >
                ←
              </button>
              <button onClick={() => go({ name: 'profile', userId: partner.id })} className="flex min-w-0 items-center gap-3 text-left">
                <Avatar user={partner} size="sm" showStatus />
                <span className="min-w-0">
                  <span className="block truncate font-bold text-white">{fullName(partner)}</span>
                  <span className="block text-xs text-slate-500">{isOnline(partner) ? 'En ligne' : 'Hors ligne'}</span>
                </span>
              </button>
            </header>

            <div ref={listRef} className="thin-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4">
              {thread.length === 0 && (
                <p className="m-auto text-sm text-slate-500">Dites bonjour à {partner.pseudo} 👋</p>
              )}
              {thread.map((d) => {
                const mine = d.from === me.id;
                return (
                  <div key={d.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-3xl px-4 py-2.5 text-sm md:max-w-md ${
                        mine ? 'rounded-br-md bg-brand-500 text-ink-950' : 'rounded-bl-md bg-white/10 text-slate-100'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{d.content}</p>
                      <p className={`mt-1 text-[10px] ${mine ? 'text-ink-950/60' : 'text-slate-500'}`}>
                        {formatTime(d.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={submit} className="border-t border-white/5 p-4">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-900/70 pl-4 pr-2 focus-within:border-brand-500/60">
                <input
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                  placeholder={`Message à ${partner.pseudo}`}
                  value={text}
                  maxLength={1000}
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
          <EmptyState icon="💬" title="Sélectionnez une conversation">
            Vos messages privés apparaîtront ici.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
