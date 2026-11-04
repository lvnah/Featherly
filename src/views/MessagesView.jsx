import { useEffect, useRef, useState } from 'react';
import { friendsOf, getMe, getUser, sendDM } from '../lib/store';
import { useStore, useUI, Avatar, EmptyState, ErrorLine, Icon } from '../components/ui';
import { formatTime, fullName, isOnline } from '../lib/util';

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
  const lastDmWith = (id) => s.dms.filter((d) => (d.from === me.id && d.to === id) || (d.from === id && d.to === me.id)).at(-1);
  const conversations = [...partnerIds]
    .map((id) => getUser(s, id))
    .filter(Boolean)
    .map((u) => ({ user: u, last: lastDmWith(u.id) }))
    .sort((a, b) => (b.last?.created_at || 0) - (a.last?.created_at || 0) || a.user.pseudo.localeCompare(b.user.pseudo));

  const partner = withId ? getUser(s, withId) : null;
  const thread = partner
    ? s.dms.filter((d) => (d.from === me.id && d.to === partner.id) || (d.from === partner.id && d.to === me.id)).sort((a, b) => a.created_at - b.created_at)
    : [];

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [thread.length, withId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!partner || !text.trim()) return;
    setError('');
    try {
      await sendDM(partner.id, text);
      setText('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 gap-4">
      <aside className={`panel thin-scroll w-full flex-col overflow-y-auto p-5 md:flex md:w-80 md:shrink-0 ${withId ? 'hidden' : 'flex'}`}>
        <h2 className="px-2 pb-4 text-xl font-extrabold">Messages</h2>
        {conversations.length === 0 && <p className="px-2 text-sm text-slate-500">Aucune conversation. Ajoutez un ami pour discuter en privé.</p>}
        <div className="flex flex-col gap-2">
          {conversations.map(({ user, last }) => (
            <button key={user.id} onClick={() => go({ name: 'messages', withId: user.id })} className={`flex items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-50 ${withId === user.id ? 'bg-brand-50' : ''}`}>
              <Avatar user={user} size="md" showStatus />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{fullName(user)}</span>
                <span className="block truncate text-xs text-slate-500">{last ? last.content : isOnline(user) ? 'En ligne' : 'Hors ligne'}</span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className={`panel min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${withId ? 'flex' : 'hidden md:flex'}`}>
        {partner ? (
          <>
            <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
              <button onClick={() => go({ name: 'messages' })} className="rounded-xl p-2 hover:bg-slate-100 md:hidden" aria-label="Retour">
                <Icon name="back" className="h-5 w-5" />
              </button>
              <button onClick={() => go({ name: 'profile', userId: partner.id })} className="flex min-w-0 items-center gap-3 text-left">
                <Avatar user={partner} size="sm" showStatus />
                <span className="min-w-0">
                  <span className="block truncate font-bold">{fullName(partner)}</span>
                  <span className="block text-xs text-slate-500">{isOnline(partner) ? 'En ligne' : 'Hors ligne'}</span>
                </span>
              </button>
            </header>
            <div ref={listRef} className="thin-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-5">
              {thread.length === 0 && <p className="m-auto text-sm text-slate-500">Dites bonjour à {partner.pseudo} 👋</p>}
              {thread.map((d) => {
                const mine = d.from === me.id;
                return (
                  <div key={d.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-3xl px-4 py-2.5 text-sm md:max-w-md ${mine ? 'rounded-br-md bg-brand-500 text-white' : 'rounded-bl-md bg-slate-100 text-slate-800'}`}>
                      <p className="whitespace-pre-wrap break-words">{d.content}</p>
                      <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-slate-400'}`}>{formatTime(d.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={submit} className="border-t border-slate-100 p-4">
              <div className="flex items-center gap-3">
                <input className="field !rounded-2xl !bg-slate-100 !py-3.5" placeholder={`Message à ${partner.pseudo}`} value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} />
                <button type="submit" disabled={!text.trim()} aria-label="Envoyer" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white transition hover:bg-brand-600 disabled:opacity-40">
                  <Icon name="send" className="h-5 w-5" />
                </button>
              </div>
              <ErrorLine>{error}</ErrorLine>
            </form>
          </>
        ) : (
          <EmptyState icon="message" title="Sélectionnez une conversation">Vos messages privés apparaîtront ici.</EmptyState>
        )}
      </section>
    </div>
  );
}
