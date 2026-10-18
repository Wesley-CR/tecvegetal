# TEC Vegetal: notas de desarrollo

## Cómo es rápido

Medido en el sitio real: parsear una página de Evaluaciones toma ~4 ms. Lo lento es el servidor de TEC Digital (~1.1 s para el inicio, ~1.6 s para Evaluaciones antes del primer byte). Todo el diseño apunta a no esperar ese servidor:

1. **URLs propias rápidas.** TEC Vegetal vive en `/tecvegetal/...`. Esas rutas no existen en el servidor, que responde un 404 en ~40 ms; el content script corre en `document_start`, corta la carga (`window.stop()`) y monta la app. Recargar o abrir en pestaña nueva es casi instantáneo.
2. **Redirección del inicio.** Una regla de `declarativeNetRequest` manda `/dotlrn/index` a `/tecvegetal/` antes de que salga el pedido lento (incluso al volver del login). `/dotlrn/index?classic` es el inicio original sin redirigir.
3. **URLs reales también funcionan.** Un link a una página real (desde la vista clásica, un marcador viejo) se toma igual y la barra de direcciones se reescribe a su forma `/tecvegetal/`.
4. **Stale-while-revalidate.** Todo se pinta primero desde IndexedDB y se revalida en background cuando vence el TTL: cursos 12 h, evaluaciones 10 min, portada de curso 30 min, carpetas 15 min. El caché tiene versión: si cambia la forma de los datos, lo viejo se descarta.
5. **Datos sin proxies.** Lo cacheado se guarda con `$state.raw` (se reemplaza entero, nunca se muta), así las listas y la búsqueda no pagan los proxies reactivos profundos de Svelte.
6. **Búsqueda indexada.** El texto de cada resultado se normaliza una sola vez al abrir `Ctrl K`, no en cada tecla.
7. **Precarga y cola.** Evaluaciones y carpeta raíz de cada curso se piden apenas se conocen los cursos; las carpetas se precargan al pasar el mouse; máximo 3 requests simultáneos al servidor.

## Diseño

Modo "operar": la herramienta desaparece en la tarea. Una sola familia tipográfica empaquetada (Atkinson Hyperlegible Next), listas densas con separadores en vez de tarjetas, y el color de cada curso como única señal de identidad. Revisado con el detector de [Impeccable](https://github.com/pbakaus/impeccable) (`npx impeccable detect src/ui`).

## Estructura

```
src/
  entrypoints/takeover.content.ts   content script (document_start)
  lib/boot.ts                       decide tomar o no la página; botón de volver
  lib/router.svelte.ts              rutas = URLs reales de TEC Digital
  lib/data/net.ts                   fetch con cola, detección de sesión vencida
  lib/data/store.ts                 IndexedDB + espejo en memoria
  lib/data/resource.svelte.ts       stale-while-revalidate con runes de Svelte 5
  lib/data/api.ts                   recursos: cursos, evaluaciones, carpetas, noticias
  lib/parse/*.ts                    parsers del HTML/JSON de TEC Digital
  lib/dates.ts                      todas las fechas en hora de Costa Rica
  ui/*.svelte                       la interfaz
docs/TECDIGITAL_MAP.md              mapa técnico del sitio (selectores, endpoints, gotchas)
demo/                               build de vista previa con datos inventados
test/                               tests de parsers (npm test)
```

## Gotchas del sitio que el código ya maneja

- El atributo `due_date` dice "GMT" pero es hora de Costa Rica.
- El widget de entrega sigue visible en asignaciones vencidas: "pendiente" se calcula con fecha, entrega y si acepta tardías.
- "Nota Total" la pinta el JS del sitio; TEC Vegetal la calcula sumando los subtotales de los rubros.
- Algunas descripciones vienen con HTML escapado dos veces.
- Los breadcrumbs de Documentos no traen IDs; TEC Vegetal guarda la relación padre-hijo al navegar.
- Los `?page_num=N` de las pestañas cambian según el curso.

## Pendiente

- Verificar en Firefox que `content.fetch` mande la cookie de sesión (en Chrome es same-origin y funciona seguro).
- Notificaciones antes de cada entrega (necesita un service worker con `alarms`).
- Entregar archivos desde TEC Vegetal.
- Ideas sueltas: ver `docs/TECDIGITAL_MAP.md` y la conversación original. No tocar hasta que esta versión se use una semana.

Todo queda en tu navegador: TEC Vegetal no tiene servidor y no manda datos a ningún lado.

Ver también `docs/TECDIGITAL_MAP.md`: selectores, endpoints y rarezas de TEC Digital.
