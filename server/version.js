// Version globale des données : incrémentée à chaque action réussie et, plus lentement,
// pour refléter les changements de présence. Le client ne re-télécharge l'état que si elle a changé.
let version = 1;
export const getVersion = () => version;
export const bumpVersion = () => {
  version += 1;
};
setInterval(bumpVersion, 15_000).unref();
