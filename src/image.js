// ---------------------------------------------------------------------------
// Image helper — downscale & compress an uploaded photo before we store it.
// Goal photos live in localStorage as base64, which has a ~5MB budget, so a
// full-res phone photo (several MB) must be shrunk first.
// ---------------------------------------------------------------------------

const DEFAULT_MAX_DIM = 1024; // longest edge, in px
const DEFAULT_QUALITY = 0.82; // JPEG quality

// Returns a Promise resolving to a downscaled JPEG data URL.
export function fileToDownscaledDataURL(
  file,
  { maxDim = DEFAULT_MAX_DIM, quality = DEFAULT_QUALITY } = {}
) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Not an image file'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        // If decoding fails (e.g. exotic format), fall back to the raw data URL.
        resolve(reader.result);
      };
      img.onload = () => {
        const { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        const w = Math.max(1, Math.round(width * scale));
        const h = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        // White backdrop so transparent PNGs don't turn black as JPEG.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        try {
          const out = canvas.toDataURL('image/jpeg', quality);
          // If somehow the JPEG is larger than the source (rare for tiny images),
          // keep whichever is smaller.
          resolve(out.length < reader.result.length ? out : reader.result);
        } catch (e) {
          resolve(reader.result);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
