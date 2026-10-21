import { defineConfig } from 'wxt';

// Chrome rechaza content scripts que contengan "no-caracteres" Unicode
// (U+FFFE, U+FFFF, U+FDD0 a U+FDEF) con el error "It isn't UTF-8 encoded",
// aunque el archivo sea UTF-8 válido. Los minificadores los escriben literales,
// así que se escapan a \uXXXX en el bundle final (válido en strings, templates y regex).
const NONCHAR = /[\uFDD0-\uFDEF\uFFFE\uFFFF]/g;
const escapeNonchars = {
  name: 'escape-unicode-nonchars',
  generateBundle(_: unknown, bundle: Record<string, { type: string; code?: string }>) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.type === 'chunk' && chunk.code) {
        chunk.code = chunk.code.replace(NONCHAR, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
      }
    }
  },
};

export default defineConfig({
  srcDir: 'src',
  // Zip de fuentes para la revisión de Mozilla: sin builds del demo.
  zip: { excludeSources: ['demo/dist/**', '.impeccable/**'] },
  modules: ['@wxt-dev/module-svelte'],
  vite: () => ({ plugins: [escapeNonchars] }),
  svelte: {
    vite: {
      // CSS de los componentes va dentro del JS: no queremos un .css global
      // inyectado por el manifest en páginas que no tomamos.
      // Plantillas en modo normal ('html'). Se probó fragments: 'tree' para
      // quitar un warning de Mozilla y la app quedaba en blanco en Chrome.
      compilerOptions: { css: 'injected' },
    },
  },
  manifest: {
    name: 'TEC Vegetal',
    description: 'TEC Digital, pero rápido y legible.',
    host_permissions: ['https://tecdigital.tec.ac.cr/*'],
    // Manda el inicio de TEC Digital (lento: ~1 s de servidor) directo a /tecvegetal/
    // (404 instantáneo que TEC Vegetal reemplaza). `/dotlrn/index?classic` no se redirige.
    permissions: ['declarativeNetRequestWithHostAccess'],
    declarative_net_request: { rule_resources: [{ id: 'fast-home', enabled: true, path: 'rules.json' }] },
    // La fuente va dentro de la extensión: nada se pide a Google ni a otro host.
    web_accessible_resources: [{ resources: ['fonts/*'], matches: ['https://tecdigital.tec.ac.cr/*'] }],
    browser_specific_settings: {
      gecko: {
        id: 'tecvegetal@wes.dev',
        // 140 es la primera versión que entiende data_collection_permissions.
        strict_min_version: '140.0',
        // TEC Vegetal no manda datos a ningún lado: todo queda en tu navegador.
        data_collection_permissions: { required: ['none'] },
      },
      gecko_android: { strict_min_version: '142.0' },
    },
  },
});
