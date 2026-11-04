import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMe, refresh } from './lib/store';
import { getToken } from './lib/api';
import { ContextMenu, UIContext, useStore } from './components/ui';
import Layout from './components/Layout';
import { ModalHost } from './components/Modals';
import Login from './views/Login';
import Home from './views/Home';
import ServerView from './views/ServerView';
import MessagesView from './views/MessagesView';
import FriendsView from './views/FriendsView';
import ProfileView from './views/ProfileView';

// Routage par état. La vue « espace » s'affiche plein écran (sans sidebar), comme la capture.
export default function App() {
  const s = useStore();
  const me = s ? getMe(s) : null;
  const [view, setView] = useState({ name: 'home' });
  const [modal, setModal] = useState(null);
  const [menu, setMenu] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [booting, setBooting] = useState(() => !!getToken());

  // Synchronisation toutes les 2 s (messages, présence, relations).
  useEffect(() => {
    let alive = true;
    const tick = () => refresh().finally(() => alive && setBooting(false));
    tick();
    const id = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);
  const closeModal = useCallback(() => setModal(null), []);
  const toast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((cur) => (cur === msg ? null : cur)), 2800);
  }, []);

  const goHome = useCallback(() => setView({ name: 'home' }), []);

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
    if (!me) setView({ name: 'home' });
  }, [me]);

  let content;
  if (booting && !me) {
    content = <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">Chargement…</div>;
  } else if (!me) {
    content = <Login toast={toast} />;
  } else if (view.name === 'server') {
    content = (
      <div className="flex h-dvh min-w-0 flex-col p-4">
        <ServerView key={view.serverId} serverId={view.serverId} channelId={view.channelId} goHome={goHome} />
      </div>
    );
  } else {
    content = (
      <Layout view={view}>
        {view.name === 'home' && <Home />}
        {view.name === 'messages' && <MessagesView withId={view.withId} />}
        {view.name === 'friends' && <FriendsView />}
        {view.name === 'profile' && <ProfileView key={view.userId} userId={view.userId} goBack={goHome} />}
      </Layout>
    );
  }

  return (
    <UIContext.Provider value={ui}>
      {content}
      <ModalHost modal={modal} onClose={closeModal} />
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeMenu} />}
      {toastMsg && (
        <div role="status" className="panel fixed right-6 top-6 z-[70] rounded-2xl px-5 py-3 text-sm font-semibold text-slate-800">
          {toastMsg}
        </div>
      )}
    </UIContext.Provider>
  );
}
