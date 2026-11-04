import { useState } from 'react';
import { getMe, getUser, friendshipBetween, isFriend, sendFriendRequest, togglePlus, updateProfile } from '../lib/store';
import { useStore, useUI, Avatar, Banner, EmptyState, ErrorLine, Icon } from '../components/ui';
import { BANNER_GRADIENTS, fullName, isOnline } from '../lib/util';
import { run } from './ServerView';

// Mon profil : page Paramètres du profil. Autre utilisateur : profil public.
export default function ProfileView({ userId, goBack }) {
  const s = useStore();
  const me = getMe(s);
  const user = getUser(s, userId);
  if (!user) return <EmptyState icon="user" title="Profil introuvable">Cet utilisateur n’existe pas.</EmptyState>;
  return user.id === me.id ? <OwnProfile key={me.id} goBack={goBack} /> : <PublicProfile user={user} goBack={goBack} />;
}

function OwnProfile({ goBack }) {
  const s = useStore();
  const { toast, go } = useUI();
  const me = getMe(s);
  const [pseudo, setPseudo] = useState(me.pseudo);
  const [tag, setTag] = useState(me.tag);
  const [avatar, setAvatar] = useState(me.avatar || '');
  const [bio, setBio] = useState(me.bio || '');
  const [bannerType, setBannerType] = useState(me.banner?.type === 'url' ? 'url' : 'gradient');
  const [bannerIndex, setBannerIndex] = useState(me.banner?.type === 'gradient' ? me.banner.index ?? 0 : 0);
  const [bannerUrl, setBannerUrl] = useState(me.banner?.type === 'url' ? me.banner.value : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const banner = me.is_plus && bannerType === 'url' && bannerUrl ? { type: 'url', value: bannerUrl } : { type: 'gradient', index: bannerIndex };
  const preview = { ...me, pseudo: pseudo || me.pseudo, avatar, banner };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await updateProfile({ pseudo, tag: me.is_plus ? tag : undefined, avatar, bio, banner });
      toast('Profil enregistré');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel thin-scroll flex min-w-0 flex-1 flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
        <h1 className="text-xl font-extrabold">Paramètres du profil</h1>
        <button onClick={goBack ?? (() => go({ name: 'home' }))} className="text-sm font-bold text-red-500 hover:text-red-600">Quitter</button>
      </div>

      <form onSubmit={save} className="mx-auto flex w-full max-w-xl flex-col gap-6 p-8">
        <div className="overflow-hidden rounded-[2rem] border border-slate-100 shadow-soft">
          <Banner user={preview} className="h-36" />
          <div className="relative flex items-end justify-between px-6 pb-5">
            <Avatar user={preview} size="lg" showStatus className="-mt-10 rounded-3xl ring-4 ring-white" />
            {me.is_plus ? (
              <span className="pill !bg-brand-100 !px-3 !py-1.5 !text-brand-700">Pass PLUS Actif</span>
            ) : (
              <button type="button" onClick={() => run(toast, () => togglePlus(), 'Statut PLUS mis à jour')} className="pill !px-3 !py-1.5 hover:!bg-slate-200">
                Activer PLUS (simulation)
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field label="Nom d’utilisateur" className="sm:col-span-2">
            <input className="field" value={pseudo} maxLength={24} onChange={(e) => setPseudo(e.target.value)} />
          </Field>
          <Field label="Tag # (4 chiffres)">
            <input className="field font-mono" value={tag} disabled={!me.is_plus} inputMode="numeric" maxLength={4} onChange={(e) => setTag(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          </Field>
        </div>

        <Field label="URL de la photo de profil (avatar)">
          <input className="field" placeholder="https://…" value={avatar} onChange={(e) => setAvatar(e.target.value)} />
        </Field>

        <Field label="URL de la bannière personnalisée (réservé PLUS)" accent>
          <input
            className="field disabled:opacity-60"
            placeholder={me.is_plus ? 'https://exemple.com/ma-banniere.jpg' : 'Réservé aux membres PLUS'}
            value={bannerUrl}
            disabled={!me.is_plus}
            onChange={(e) => {
              setBannerUrl(e.target.value);
              setBannerType('url');
            }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {BANNER_GRADIENTS.map((g, i) => (
              <button
                key={g}
                type="button"
                aria-label={`Bannière ${i + 1}`}
                onClick={() => {
                  setBannerType('gradient');
                  setBannerIndex(i);
                }}
                className={`h-9 w-14 rounded-xl transition ${bannerType === 'gradient' && bannerIndex === i ? 'ring-2 ring-brand-500 ring-offset-2' : 'opacity-80 hover:opacity-100'}`}
                style={{ background: g }}
              />
            ))}
          </div>
        </Field>

        <Field label={`Bio (${bio.length}/190)`}>
          <textarea className="field min-h-24 resize-none" value={bio} maxLength={190} onChange={(e) => setBio(e.target.value)} />
        </Field>

        <ErrorLine>{error}</ErrorLine>
        <button type="submit" className="btn-primary w-full !rounded-2xl !py-4" disabled={busy}>
          Enregistrer les modifications
        </button>
      </form>
    </div>
  );
}

function PublicProfile({ user, goBack }) {
  const s = useStore();
  const { go, openModal, toast } = useUI();
  const me = getMe(s);
  const friend = isFriend(s, me.id, user.id);
  const pending = friendshipBetween(s, me.id, user.id);
  const roles = s.memberships.filter((m) => m.user_id === user.id).length;

  return (
    <div className="panel thin-scroll flex min-w-0 flex-1 flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
        <h1 className="text-xl font-extrabold">Profil</h1>
        <button onClick={goBack ?? (() => go({ name: 'home' }))} className="text-sm font-bold text-slate-500 hover:text-slate-900">Retour</button>
      </div>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 p-8">
        <div className="overflow-hidden rounded-[2rem] border border-slate-100 shadow-soft">
          <Banner user={user} className="h-44" />
          <div className="flex flex-col gap-4 px-6 pb-6">
            <div className="-mt-10 flex items-end gap-4">
              <Avatar user={user} size="xl" showStatus className="rounded-[1.75rem] ring-4 ring-white" />
              <div className="min-w-0 pb-1">
                <h2 className="truncate text-2xl font-extrabold">
                  {user.pseudo} <span className="text-base font-semibold text-slate-400">#{user.tag}</span>
                </h2>
                <p className={`text-sm font-semibold ${isOnline(user) ? 'text-brand-600' : 'text-slate-400'}`}>{isOnline(user) ? 'En ligne' : 'Hors ligne'}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">{user.bio || 'Aucune biographie.'}</p>
            <p className="text-xs text-slate-400">Présent sur {roles} espace(s)</p>
            {user.id !== me.id && (
              <div className="flex flex-wrap gap-2 pt-2">
                <button className="btn-primary" onClick={() => go({ name: 'messages', withId: user.id })}>Envoyer un message</button>
                {!friend && (
                  <button className="btn-ghost" disabled={!!pending} onClick={() => run(toast, () => sendFriendRequest(user.id), 'Demande d’ami envoyée')}>
                    {pending ? 'Demande en attente' : 'Ajouter en ami'}
                  </button>
                )}
                <button className="btn-danger" onClick={() => openModal('report', { userId: user.id })}>
                  <Icon name="flag" className="h-4 w-4" />
                  Signaler
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, accent = false, className = '' }) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className={`text-[11px] font-bold uppercase tracking-widest ${accent ? 'text-brand-600' : 'text-slate-400'}`}>{label}</span>
      {children}
    </label>
  );
}
