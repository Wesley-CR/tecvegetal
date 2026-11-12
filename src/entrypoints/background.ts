// Única tarea del background: bajar wallpapers de Wallhaven para guardarlos en
// caché. Desde el content script no se puede (el sitio no manda CORS); acá sí,
// con el permiso de host para w.wallhaven.cc y nada más.

const ALLOWED = /^https:\/\/w\.wallhaven\.cc\/full\//;
const MAX_SIDE = 2560;

async function fetchImage(url: string): Promise<{ data?: string; error?: string }> {
  if (!ALLOWED.test(url)) return { error: 'host no permitido' };
  const r = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const blob = await r.blob();
  if (!blob.type.startsWith('image/')) return { error: 'no es una imagen' };
  // Se achica y se pasa a JPEG: un 4K de Wallhaven pesa 3–8 MB, así queda en ~0.5 MB.
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = new OffscreenCanvas(Math.round(bmp.width * scale), Math.round(bmp.height * scale));
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const out = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.88 });
  const buf = new Uint8Array(await out.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { data: `data:image/jpeg;base64,${btoa(bin)}` };
}

export default defineBackground(() => {
  // sendResponse + `return true` funciona en Chrome viejo y en Firefox (devolver
  // una promesa desde el listener no lo soportan todas las versiones de Chrome).
  browser.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse: (r: unknown) => void) => {
    const m = msg as { type?: string; url?: string };
    if (m?.type !== 'tv:fetch-image' || typeof m.url !== 'string') return false;
    fetchImage(m.url).then(sendResponse, (e) => sendResponse({ error: String(e) }));
    return true;
  });
});
