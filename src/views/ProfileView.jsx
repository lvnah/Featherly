import { useState } from 'react';
import {
  friendshipBetween,
  getMe,
  getUser,
  isFriend,
  sendFriendRequest,
  togglePlus,
  updateProfile,
} from '../lib/store';
import { useStore, useUI, Avatar, Banner, EmptyState, ErrorLine } from '../components/ui';
import { BANNER_GRADIENTS, fullName, isOnline } from '../lib/util';
import { run } from './ServerView';

// Mon profil (édition) si userId = moi, sinon profil public (remplace view_profile.php).
export default function ProfileView({ userId }) {
  const s = useStore();
  const me = getMe(s);
  const user = getUser(s, userId);
  if (!user) return <EmptyState icon="🔎" title="Profil introuvable">Cet utilisateur n’existe pas.</EmptyState>;
  return user.id === me.id ? <OwnProfile key={me.id} /> : <PublicProfile user={user} />;
}

function OwnProfile() {
  const s = useStore();
  const { toast } = useUI();
  const me = getMe(s);
  const [pseudo, setPseudo] = useState(me.pseudo);
  const [tag, setTag] = useState(me.tag);
  const [avatar, setAvatar] = useState(me.avatar || '');
  const [bio, setBio] = useState(me.bio || '');
  const [bannerType, setBannerType] = useState(me.banner?.type === 'url' ? 'url' : 'gradient');
  const [bannerIndex, setBannerIndex] = useState(me.banner?.type === 'gradient' ? me.banner.index ?? 0 : 0);
  const [bannerUrl, setBannerUrl] = useState(me.banner?.type === 'url' ? me.banner.value : '');
  const [error, setError] = useState('');

  const banner =
    me.is_plus && bannerType === 'url' && bannerUrl
      ? { type: 'url', value: bannerUrl }
      : { type: 'gradient', index: bannerIndex };
  const preview = { ...me, pseudo: pseudo || me.pseudo, avatar, banner };

  const save = (e) => {
    e.preventDefault();
    setError('');
    try {
      updateProfile({
        pseudo,
        tag: me.is_plus ? tag : undefined,
        avatar,
        bio,
        banner,
      });
      toast('Profil enregistré');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="thin-scroll flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <h1 className="text-2xl font-extrabold text-white">Mon profil</h1>

        {/* Aperçu */}
        <div className="card overflow-hidden">
          <Banner user={preview} className="h-36 rounded-t-[2.5rem]" />
          <div className="-mt-10 flex items-end gap-4 px-6 pb-6">
            <Avatar user={preview} size="lg" showStatus className="ring-4 ring-ink-850 rounded-2xl" />
            <div className="min-w-0 pb-1">
              <p className="truncate text-lg font-bold text-white">
                {preview.pseudo}
                <span className="ml-1 text-sm font-normal text-slate-400">#{me.tag}</span>
              </p>
              <p className="text-xs text-slate-500">{isOnline(me) ? 'En ligne' : 'Hors ligne'}</p>
            </div>
          </div>
        </div>

        <form onSubmit={save} className="card flex flex-col gap-5 p-6">
          <Field label="Pseudo">
            <input className="field" value={pseudo} maxLength={24} onChange={(e) => setPseudo(e.target.value)} />
          </Field>

          <Field label={me.is_plus ? 'Tag (4 chiffres, libre avec PLUS)' : 'Tag (réservé aux membres PLUS)'}>
            <input
              className="field font-mono"
              value={tag}
              disabled={!me.is_plus}
              inputMode="numeric"
              maxLength={4}
              onChange={(e) => setTag(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </Field>

          <Field label="Avatar (URL d’image, facultatif)">
            <input className="field" placeholder="https://…" value={avatar} onChange={(e) => setAvatar(e.target.value)} />
          </Field>

          <Field label={`Biographie (${bio.length}/190)`}>
            <textarea className="field min-h-24 resize-none" value={bio} maxLength={190} onChange={(e) => setBio(e.target.value)} />
          </Field>

          <Field label="Bannière">
            <div className="flex flex-wrap gap-3">
              {BANNER_GRADIENTS.map((g, i) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setBannerType('gradient');
                    setBannerIndex(i);
                  }}
                  aria-label={`Bannière ${i + 1}`}
                  className={`h-12 w-20 rounded-2xl transition ${
                    bannerType === 'gradient' && bannerIndex === i ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-ink-850' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ background: g }}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <input
                className="field disabled:opacity-50"
                placeholder={me.is_plus ? 'URL d’une image de bannière' : 'Bannière personnalisée : réservée aux membres PLUS'}
                value={bannerUrl}
                disabled={!me.is_plus}
                onChange={(e) => {
                  setBannerUrl(e.target.value);
                  setBannerType('url');
                }}
              />
            </div>
          </Field>

          <ErrorLine>{error}</ErrorLine>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary">
              Enregistrer
            </button>
          </div>
        </form>

        {/* Statut PLUS */}
        <section className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-white">
              Statut PLUS{' '}
              {me.is_plus ? <span className="ml-1 rounded-md bg-brand-500/20 px-1.5 text-xs font-bold text-brand-300">ACTIF</span> : null}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Tag libre, bannière personnalisée, code d’invitation personnalisé pour vos serveurs.
            </p>
            <p className="mt-1 text-xs text-slate-500">Simulation locale : aucun paiement n’est effectué.</p>
          </div>
          <button className="btn-ghost whitespace-nowrap" onClick={() => run(toast, () => togglePlus(), 'Statut PLUS mis à jour')}>
            {me.is_plus ? 'Désactiver PLUS' : 'Activer PLUS (simulation)'}
          </button>
        </section>
      </div>
    </div>
  );
}

function PublicProfile({ user }) {
  const s = useStore();
  const { go, openModal, toast } = useUI();
  const me = getMe(s);
  const friend = isFriend(s, me.id, user.id);
  const pending = friendshipBetween(s, me.id, user.id);
  const online = isOnline(user);

  const roleCount = s.memberships.filter((m) => m.user_id === user.id).length;

  return (
    <div className="thin-scroll flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <button onClick={() => go({ name: 'home' })} className="self-start text-sm text-slate-400 hover:text-white">
          ← Retour
        </button>

        <div className="card overflow-hidden">
          <Banner user={user} className="h-44 rounded-t-[2.5rem]" />
          <div className="-mt-12 flex flex-col gap-4 px-6 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <Avatar user={user} size="xl" showStatus className="ring-4 ring-ink-850 rounded-[1.75rem]" />
              <div className="min-w-0 pb-1">
                <h1 className="truncate text-2xl font-extrabold text-white">
                  {user.pseudo}
                  <span className="ml-1 text-base font-normal text-slate-400">#{user.tag}</span>
                </h1>
                <p className={`text-sm ${online ? 'text-brand-400' : 'text-slate-500'}`}>
                  {online ? 'En ligne' : 'Hors ligne'}
                  {user.is_plus ? <span className="ml-2 rounded-md bg-brand-500/20 px-1.5 text-[10px] font-bold text-brand-300">PLUS</span> : null}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 px-6 pb-8">
            <p className="text-sm text-slate-300">{user.bio || 'Aucune biographie.'}</p>
            <p className="text-xs text-slate-500">Présent sur {roleCount} serveur(s) de Hevenly</p>
            <div className="flex flex-wrap gap-3 pt-2">
              {user.id !== me.id && (
                <>
                  <button className="btn-primary" onClick={() => go({ name: 'messages', withId: user.id })}>
                    💬 Envoyer un message
                  </button>
                  {!friend && (
                    <button
                      className="btn-ghost"
                      disabled={!!pending}
                      onClick={() => run(toast, () => sendFriendRequest(user.id), 'Demande d’ami envoyée')}
                    >
                      {pending ? 'Demande en attente' : '➕ Ajouter en ami'}
                    </button>
                  )}
                  <button className="btn-danger" onClick={() => openModal('report', { userId: user.id })}>
                    🚩 Signaler
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</span>
      {children}
    </label>
  );
}
