import { useState } from 'react';
import { login, register } from '../lib/store';
import { ErrorLine, Icon } from '../components/ui';
import { LeafLogo } from '../components/Layout';

// Connexion (Pseudo#tag + mot de passe) ou création de compte.
export default function Login({ toast }) {
  const [mode, setMode] = useState('login');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'register') {
        await register(pseudo, password);
        toast('Compte créé. Bienvenue sur Hevenly !');
      } else {
        await login(pseudo, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="panel w-full max-w-md p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-soft">
            <LeafLogo />
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900">Bienvenue sur Hevenly</h1>
          <p className="text-sm text-slate-500">Une communauté unique, un univers infini.</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          {[
            ['login', 'Connexion'],
            ['register', 'Créer un compte'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${mode === key ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            {mode === 'register' ? 'Pseudo' : 'Pseudo#tag'}
            <input
              className="field normal-case tracking-normal"
              placeholder={mode === 'register' ? 'Votre pseudo (2 à 24 caractères)' : 'Ex. Lina#4821'}
              value={pseudo}
              maxLength={40}
              autoComplete="username"
              onChange={(e) => setPseudo(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            Mot de passe
            <input
              type="password"
              className="field normal-case tracking-normal"
              placeholder="8 caractères minimum"
              value={password}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary mt-2" disabled={busy || !pseudo.trim() || password.length < 8}>
            <Icon name="arrow" className="h-4 w-4" />
            {mode === 'register' ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </form>
        <ErrorLine>{error}</ErrorLine>
      </div>
    </div>
  );
}
