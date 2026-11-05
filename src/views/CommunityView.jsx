import { useState } from 'react';
import { getMe, joinPublicServer } from '../lib/store';
import { useStore, useUI, Modal, ServerIcon, EmptyState } from '../components/ui';
import { formatStamp } from '../lib/util';
import { run } from './ServerView';
import { fullName } from '../lib/util';

// Communauté : liste des espaces publics, visibles par tous. Les espaces privés n'apparaissent jamais ici.
export default function CommunityView() {
  const s = useStore();
  const { go, toast } = useUI();
  const me = getMe(s);
  const [selected, setSelected] = useState(null);
  const list = s.communities ?? [];

  return (
    <div className="thin-scroll flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto pb-4">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-extrabold">Communauté</h1>
          <p className="text-sm text-slate-500">Les espaces publics. Cliquez sur un espace pour voir ses informations et le rejoindre.</p>
        </div>

        {list.length === 0 && (
          <EmptyState icon="users" title="Aucun espace public">Les espaces créés en mode public apparaîtront ici.</EmptyState>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {list.map((c) => (
            <button key={c.id} onClick={() => setSelected(c.id)} className="panel flex items-center gap-4 p-5 text-left transition hover:-translate-y-0.5">
              <ServerIcon server={c} className="h-14 w-14" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{c.name}</span>
                <span className="block text-xs text-slate-500">{c.members} membre(s) · créé par {c.owner_pseudo}</span>
              </span>
              {c.is_member && <span className="pill !bg-brand-100 !text-brand-700">Membre</span>}
            </button>
          ))}
        </div>
      </div>

      {selected && (() => {
        const c = list.find((x) => x.id === selected);
        if (!c) return null;
        return (
          <Modal open title="" onClose={() => setSelected(null)} width="max-w-md">
            <div className="flex flex-col items-center gap-4 text-center">
              <ServerIcon server={c} className="h-24 w-24" />
              <div>
                <p className="text-xl font-extrabold">{c.name}</p>
                <p className="text-sm text-slate-500">Créé par {c.owner_pseudo} · {formatStamp(c.created_at).slice(0, 10)}</p>
              </div>
              <div className="grid w-full grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xl font-extrabold">{c.members}</p>
                  <p className="text-xs font-semibold text-slate-500">Membres</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xl font-extrabold">Public</p>
                  <p className="text-xs font-semibold text-slate-500">Visibilité</p>
                </div>
              </div>
              {c.is_member ? (
                <button className="btn-primary w-full" onClick={() => { setSelected(null); go({ name: 'server', serverId: c.id }); }}>Ouvrir l’espace</button>
              ) : (
                <button
                  className="btn-primary w-full"
                  onClick={async () => {
                    const ok = await run(toast, () => joinPublicServer(c.id));
                    if (ok) {
                      setSelected(null);
                      go({ name: 'server', serverId: c.id });
                    }
                  }}
                >
                  Rejoindre
                </button>
              )}
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
