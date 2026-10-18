import { mount } from 'svelte';
import App from '../src/ui/App.svelte';
import { globalCss } from '../src/ui/global.css';
import latin from '../public/fonts/ahn-latin.woff2?inline';
import latinExt from '../public/fonts/ahn-latin-ext.woff2?inline';
import { installLinkInterceptor, navigate } from '../src/lib/router.svelte';
import { startClock } from '../src/lib/clock.svelte';
import { clearAll } from '../src/lib/data/store';

// Demo: arranca siempre sin caché para ver los estados de carga reales.
clearAll().then(() => {
  const style = document.createElement('style');
  style.textContent = globalCss({ latin, latinExt });
  document.head.appendChild(style);
  startClock();
  installLinkInterceptor(document);
  try { history.replaceState(null, '', '/tecvegetal/'); } catch { /* iframe con sandbox */ }
  mount(App, { target: document.body });
  (window as any).tdGo = navigate;
});

