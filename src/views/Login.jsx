import { useState } from 'react';
import { login, register } from '../lib/store';
import { useStore, Avatar, ErrorLine } from '../components/ui';
import { fullName } from '../lib/util';

// Remplace login.php : choisir un compte existant ou en créer un.
export default function Login({ toast }) {
  const s = useStore();
  const [pseudo, setPseudo] = useState('');
  const [error, setError] = useState('');

  const handleRegister = (e) => {
    e.preventDefault();
    setError('');
    try {
      register(pseudo);
      toast('Bienvenue sur Hevenly !');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogin = (id) => {
    setError('');
    try {
      login(id);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-2xl font-extrabold text-ink-950">
            H
          </div>
          <h1 className="text-2xl font-extrabold text-white">Bienvenue sur Hevenly</h1>
          <p className="mt-1 text-sm text-slate-400">Connectez-vous ou créez un compte pour rejoindre vos serveurs.</p>
        </div>

        {s.users.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Comptes sur cet appareil</p>
            <div className="thin-scroll flex max-h-60 flex-col gap-2 overflow-y-auto">
              {s.users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleLogin(u.id)}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 text-left transition hover:bg-white/10"
                >
                  <Avatar user={u} size="sm" />
                  <span className="truncate text-sm font-semibold text-white">{fullName(u)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-500" htmlFor="pseudo">
            Nouveau compte
          </label>
          <input
            id="pseudo"
            className="field"
            placeholder="Votre pseudo (2 à 24 caractères)"
            value={pseudo}
            maxLength={24}
            onChange={(e) => setPseudo(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            Créer mon compte
          </button>
        </form>
        <ErrorLine>{error}</ErrorLine>

        <p className="mt-6 text-center text-xs text-slate-500">
          Données de démonstration stockées dans ce navigateur. Code serveur de démo : <code className="text-slate-300">HEVENLY1</code>
        </p>
      </div>
    </div>
  );
}
