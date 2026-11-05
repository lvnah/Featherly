// Installation de Feathery comme application (raccourci Windows / Mac).
// Chrome et Edge proposent l'installation directement ; Safari passe par le Dock.
let deferred = null;
const listeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

export const subscribeInstall = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const canPromptInstall = () => !!deferred;
export const isInstalled = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
export const platform = () => {
  const ua = navigator.userAgent || '';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'mac';
  return 'other';
};
export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const choice = await deferred.userChoice;
  deferred = null;
  return choice.outcome === 'accepted';
}
