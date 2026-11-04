// Conversion d'une image choisie sur l'ordinateur en miniature (data URL WebP), redimensionnée côté navigateur.
export function fileToDataUrl(file, { maxWidth = 128, maxHeight = 128, square = false } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      reject(new Error('Format non pris en charge : PNG, JPEG, WebP ou GIF.'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('Image trop lourde (10 Mo maximum).'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let sx = 0;
      let sy = 0;
      let sw = img.width;
      let sh = img.height;
      if (square) {
        const side = Math.min(sw, sh);
        sx = (sw - side) / 2;
        sy = (sh - side) / 2;
        sw = side;
        sh = side;
      }
      const scale = Math.min(1, maxWidth / sw, maxHeight / sh);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sw * scale));
      canvas.height = Math.max(1, Math.round(sh * scale));
      canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/webp', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossible de lire cette image.'));
    };
    img.src = url;
  });
}

// Bouton de choix de fichier réutilisable.
export const AVATAR_OPTS = { maxWidth: 128, maxHeight: 128, square: true };
export const ICON_OPTS = { maxWidth: 128, maxHeight: 128, square: true };
export const BANNER_OPTS = { maxWidth: 800, maxHeight: 280, square: false };
