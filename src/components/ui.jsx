import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { subscribe, getState } from '../lib/store';
import { avatarGradient, bannerStyle, isOnline, ROLE_COLORS } from '../lib/util';

// Contexte global : navigation, menus, modales, notifications.
export const UIContext = createContext(null);
export const useUI = () => useContext(UIContext);

// Abonnement au store : le composant se rafraîchit à chaque changement (local ou autre onglet).
export function useStore() {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function Avatar({ user, size = 'md', showStatus = false, className = '' }) {
  const [broken, setBroken] = useState(false);
  const dims = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-20 w-20 text-2xl',
    xl: 'h-28 w-28 text-4xl',
  }[size];
  const online = isOnline(user);
  const letter = (user?.pseudo || '?').charAt(0).toUpperCase();
  return (
    <div className={`relative shrink-0 ${dims} ${className}`}>
      {user?.avatar && !broken ? (
        <img
          src={user.avatar}
          alt=""
          onError={() => setBroken(true)}
          className="h-full w-full rounded-2xl object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-2xl font-bold text-white"
          style={{ background: avatarGradient(user?.id || user?.pseudo) }}
        >
          {letter}
        </div>
      )}
      {showStatus && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink-900 ${
            online ? 'bg-brand-500' : 'bg-slate-500'
          }`}
          title={online ? 'En ligne' : 'Hors ligne'}
        />
      )}
    </div>
  );
}

export function Banner({ user, className = '' }) {
  return <div className={`h-24 w-full ${className}`} style={bannerStyle(user)} />;
}

export function Modal({ open, title, onClose, children, width = 'max-w-md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="mobile-overlay absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`card relative max-h-[90dvh] w-full ${width} overflow-y-auto thin-scroll bg-ink-800/95 p-6`}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Fermer">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ContextMenu({ x, y, items, onClose }) {
  useEffect(() => {
    const close = () => onClose();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Garde le menu dans la fenêtre.
  const left = Math.min(x, window.innerWidth - 220);
  const top = Math.min(y, window.innerHeight - items.length * 40 - 16);
  return (
    <div
      role="menu"
      style={{ left, top }}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-[60] w-56 rounded-2xl border border-white/10 bg-ink-800/95 p-1.5 shadow-soft backdrop-blur-xl"
    >
      {items.map((it, i) =>
        it.separator ? (
          <div key={i} className="my-1 border-t border-white/5" />
        ) : (
          <button
            key={i}
            role="menuitem"
            disabled={it.disabled}
            onClick={() => {
              onClose();
              it.onClick?.();
            }}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition disabled:opacity-40 ${
              it.danger ? 'text-red-300 hover:bg-red-500/15' : 'text-slate-200 hover:bg-white/10'
            }`}
          >
            {it.icon && <span className="w-4 text-center">{it.icon}</span>}
            <span className="truncate">{it.label}</span>
          </button>
        ),
      )}
    </div>
  );
}

// Sélecteur de couleur en losange.
export function ColorDiamonds({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-3 px-1">
      {ROLE_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Couleur ${c}`}
          className={`h-7 w-7 rotate-45 rounded-md transition ${
            value === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-ink-800' : 'opacity-70 hover:opacity-100'
          }`}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

export function EmptyState({ icon = '🌿', title, children }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="text-5xl">{icon}</div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {children && <div className="max-w-sm text-sm text-slate-400">{children}</div>}
    </div>
  );
}

export function ErrorLine({ children }) {
  if (!children) return null;
  return <p className="mt-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{children}</p>;
}
