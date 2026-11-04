import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMe, sync, touch } from './lib/store';
import { ContextMenu, UIContext, useStore } from './components/ui';
import Layout from './components/Layout';
import { ModalHost } from './components/Modals';
import Login from './views/Login';
import Home from './views/Home';
import ServerView from './views/ServerView';
import MessagesView from './views/MessagesView';
import FriendsView from './views/FriendsView';
import ProfileView from './views/ProfileView';

// Routage léger par état (équivalent des pages PHP : index, server, messages, friends, profile, view_profile).
export default function App() {
  const s = useStore();
  const me = getMe(s);

  const [view, setView] = useState({ name: 'home' });
  const [modal, setModal] = useState(null);
  const [menu, setMenu] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [, setTick] = useState(0);

  // Polling toutes les 2 s : relit le stockage (autres onglets), rafraîchit la présence,
  // et renvoie un heartbeat toutes les ~14 s pour rester « en ligne ».
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      sync();
      n += 1;
      if (n % 7 === 0) touch();
      setTick((t) => t + 1);
    }, 2000);
    const onStorage = () => sync();
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(id);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);
  const closeModal = useCallback(() => setModal(null), []);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((cur) => (cur === msg ? null : cur)), 2800);
  }, []);

  const ui = useMemo(
    () => ({
      view,
      go: (v) => {
        setView(v);
        setModal(null);
      },
      openModal: (name, props = {}) => setModal({ name, ...props }),
      closeModal,
      openMenu: (e, items) => {
        e.preventDefault();
        e.stopPropagation();
        setMenu({ x: e.clientX, y: e.clientY, items });
      },
      toast,
    }),
    [view, closeModal, toast],
  );

  useEffect(() => {
    // Quitter une session ferme les vues qui ne concernent que la session.
    if (!me) setView({ name: 'home' });
  }, [me]);

  return (
    <UIContext.Provider value={ui}>
      {!me ? (
        <Login toast={toast} />
      ) : (
        <Layout view={view}>
          {view.name === 'home' && <Home />}
          {view.name === 'server' && <ServerView key={view.serverId} serverId={view.serverId} channelId={view.channelId} />}
          {view.name === 'messages' && <MessagesView withId={view.withId} />}
          {view.name === 'friends' && <FriendsView />}
          {view.name === 'profile' && <ProfileView key={view.userId} userId={view.userId} />}
        </Layout>
      )}

      <ModalHost modal={modal} onClose={closeModal} />

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeMenu} />}

      {toastMsg && (
        <div
          role="status"
          className="fixed right-4 top-4 z-[70] rounded-2xl border border-white/10 bg-ink-800/95 px-5 py-3 text-sm text-white shadow-soft backdrop-blur-xl"
        >
          {toastMsg}
        </div>
      )}
    </UIContext.Provider>
  );
}
