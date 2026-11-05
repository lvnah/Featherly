import { useEffect, useState } from 'react';
import { Icon, useUI } from './ui';
import { canPromptInstall, isInstalled, platform, promptInstall, subscribeInstall } from '../lib/install';

// Télécharger l'application : installation directe si le navigateur le permet, sinon instructions.
export default function InstallButton({ className = '' }) {
  const { openModal, toast } = useUI();
  const [, tick] = useState(0);
  useEffect(() => subscribeInstall(() => tick((t) => t + 1)), []);
  if (isInstalled()) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        if (canPromptInstall()) {
          const ok = await promptInstall();
          if (!ok) toast('Installation annulée.');
        } else {
          openModal('install', { platform: platform() });
        }
      }}
      className={`btn-ghost w-full !py-2.5 ${className}`}
    >
      <Icon name="arrow" className="h-4 w-4 rotate-90" />
      Télécharger l’application
    </button>
  );
}
