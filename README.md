# TEC Vegetal 🌱

TEC Digital si fuera bueno: básicamente usa caché para hacer la página más rápida y también muestra pendientes y notas.

- **Pendientes de todos tus cursos** en un solo lugar, agrupados por materia y con cuánto falta para cada entrega.
- **Planificador de 14 días** para ver qué se viene.
- **Notas por curso** con barra de progreso.
- **Documentos** más fáciles de navegar, con lo nuevo marcado.
- **Rápido:** lo que ya viste carga al instante desde caché mientras se actualiza por detrás.
- **Ctrl K** para buscar cursos, tareas o archivos.

Lo que TEC Vegetal no hace (entregar tareas, foros, calendario…) abre la página normal de TEC Digital con un botón, y desde ahí volvés con "Volver a TEC Vegetal".

No tiene servidor ni manda datos a ningún lado: todo queda en tu navegador y usa tu sesión normal de TEC Digital.

## Instalar

**Firefox:** desde addons.mozilla.org (en revisión).

**Chrome, Edge, Brave, Opera:**

1. Bajá `tecvegetal-*-chrome.zip` de [Releases](../../releases/latest) y descomprimilo en una carpeta que no vayas a borrar.
2. Abrí `chrome://extensions` y activá **Modo de desarrollador** (arriba a la derecha).
3. Clic en **Cargar descomprimida** y elegí la carpeta.
4. Entrá a TEC Digital.

Para actualizar: descomprimí la versión nueva encima de la misma carpeta y dale a recargar en `chrome://extensions`. (Como no está en la Chrome Web Store, no se actualiza sola.)

## Para desarrolladores

Hecho con [WXT](https://wxt.dev) + Svelte 5 + TypeScript. Cómo funciona por dentro: [`docs/DESARROLLO.md`](docs/DESARROLLO.md).

```bash
npm install
npm run dev            # Chrome con recarga en caliente (npm run dev:firefox para Firefox)
npm test               # tests de parsers y rutas
npm run test:smoke     # la app completa con datos de ejemplo, en un DOM simulado
npm run zip            # zips de Chrome, Firefox y fuentes en .output/
```

**Publicar una versión:** subí `version` en `package.json`, commiteá, y en GitHub creá un Release nuevo con el tag `vX.Y.Z`. GitHub Actions compila y le adjunta los zips.

### Build para revisores de Mozilla

El código pasa por el compilador de Svelte y por Vite (vía [WXT](https://wxt.dev)), que generan `content-scripts/takeover.js` minificado. Para reproducir exactamente el paquete de Firefox:

- **Sistema:** cualquier Linux, macOS o Windows.
- **Node.js 22** (probado con 22.22.0) y **npm 10** (probado con 10.9.4).

```bash
npm ci                 # instala las versiones exactas de package-lock.json
npm run build:firefox  # genera .output/firefox-mv2/
```

El resultado en `.output/firefox-mv2/` es el contenido del add-on enviado. `npm test` corre los tests de los parsers.

No hay código remoto ni ofuscado: todo el código fuente está en `src/`. La única dependencia empaquetada en tiempo de ejecución es el runtime de Svelte. La fuente en `public/fonts/` es Atkinson Hyperlegible Next (SIL OFL 1.1, ver `public/fonts/OFL.txt`).

## Licencia

GPL v3 (ver `LICENSE` y `NOTICE`). Podés usar, modificar y compartir TEC Vegetal; si distribuís una versión modificada, tiene que seguir siendo GPL v3 con su código disponible. La fuente empaquetada (Atkinson Hyperlegible Next) usa SIL OFL 1.1.
