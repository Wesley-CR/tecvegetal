# TEC Digital — mapa técnico para la extensión

Recorrido hecho el 16/10/2026 con sesión de estudiante. Todo lo de abajo es lo que el sitio devuelve hoy; si algo truena, revisá primero este archivo contra el HTML real.

## Stack del sitio (para saber con qué peleamos)

- **dotLRN / OpenACS** server-rendered. Cookie de sesión: `ad_session_id` (+ `AlteonP` del balanceador).
- Login propio: `POST /api/login/new-form/` con JSON `{email, password, returnUrl}` + reCAPTCHA en el form. Hay un "Ingresar con idTEC" en beta (SSO en camino).
- jQuery **1.11.1** cargado tres veces + dos jQuery Migrate, Bootstrap, DataTables, Handlebars, moment.
- Documentos es una **SPA de AngularJS 1.x** aparte, con API JSON propia.
- IDs duplicados en el DOM (`#hora` ×3, `#timeout-modal` ×2, `#apps-content` ×2, `#snackbar` ×2) → nunca seleccionar solo por id sin scope.
- Ningún recurso manda `Cache-Control`, `ETag` ni `Last-Modified`. El caché tiene que ser 100% nuestro.

## Tiempos medidos (fetch desde la página, sin JS)

| Recurso | Tamaño | Tiempo |
|---|---|---|
| `/dotlrn/index` | ~49 KB | ~870 ms |
| Evaluaciones de un curso | ~180 KB | ~1.25 s |
| Portada de curso | ~36 KB | ~240 ms |
| `file-storage/` (shell Angular) | ~34 KB | ~200 ms |
| `file-storage/api/folder/{id}` | ~20 KB | ~0.8–1 s |

Lo lento es el backend (Evaluaciones y la API de carpetas), no la red. Por eso conviene el caché.

---

## 1. Inicio — `/dotlrn/index`

Layout: `div#inner-wrapper.home > div#main > (div#sidebar-1, div#main-content)`

| Bloque | Selector | Notas |
|---|---|---|
| Header | `header#header-td` | `#main-menu-td nav li` (Inicio / Mi calendario / Mis documentos), `#header-navigation ul > li#platform_user_apps / #platform_user_notifications / #help_tools / #platform_user_profile` |
| Reloj | `section#server-time` | alimentado por `GET /theme-td/ajax/get_date_server` |
| Grupos (árbol) | `#sidebar-1 .portlet-wrapper:nth-child(1) ul.mktree` | árbol mktree; incluye todos los semestres viejos |
| SMS | `#sidebar-1 .portlet-wrapper:nth-child(2)` | `#div_table_sms`; candidato a ocultar |
| Aplicaciones | `#main-content #apps-content section.app-box` | 7 apps |
| Menú lateral | `#menu-left.vpanel` | incluye `/register/logout` ⚠️ nunca hacerle fetch |

**Lista de cursos:** `a[href*="/dotlrn/classes/"]` dentro del árbol. El semestre va en el path:

```
/dotlrn/classes/{DEPTO}/{CODIGO}/{PERIODO}.{SEDE}.{CODIGO}.{GRUPO}/
ej: /dotlrn/classes/CA/IC6831/S-2-2026.SJ.IC6831.40/
PERIODO: S-1 / S-2 (semestre), V-1 (verano), H-4 (humanística) + año
SEDE: SJ, AL, SC, ...
```

Para sacar "semestre actual": parsear `PERIODO` de todos los links y quedarse con el más reciente. No hardcodear (el n8n viejo murió así).

AJAX útil: `GET /tda-notifications/ajax/has_unread_notifications`.

---

## 2. Curso — navegación

Tabs en `ul#selectable_subnavbar a`, por `?page_num=N`:

```
0 = portada, 1 = Calendario, 2 = Documentos, 3 = Evaluaciones, 4 = Evaluación Docente
```

⚠️ **Varían por curso**: Probabilidades mete `GAAP` en 4 y corre Evaluación Docente a 5. Siempre leer los tabs del DOM y matchear por texto, nunca asumir `page_num`.

`?page_num=N` redirige a la URL real:
- 0 → `one-community?page_num=0`
- 2 → `file-storage/#/{FOLDER_ID}`
- 3 → `evaluation/tda-ce-estudiante/tda-index?page_num=3`

Portada: portlets `.portlet-wrapper` con `.portlet-title` (Información de Curso, Noticias, Equipo docente, Subgrupos). Noticias tiene RSS: `{curso}news/rss/rss.xml` (potencialmente la forma más barata de detectar avisos nuevos).

Breadcrumb: `#breadcrumbs` (el n8n usaba `#breadcrumbs ul.compact li:nth-of-type(2) a` para el nombre del curso).

---

## 3. Evaluaciones — `{curso}evaluation/tda-ce-estudiante/tda-index?page_num=3`

Server-rendered, ~180 KB, todo en un solo HTML (sin AJAX de datos; solo `ajax/log_registration` de tracking cuando corre el JS de la página).

```
div#content_assigns
├─ div.asign_student.title_acor_grade#h_{catId}     ← categoría
│    span.clase[title="Exámenes (25%)"]              ← nombre + peso
│    div.sub_total[item_weight="25"]                 ← "11.9 / 25"
└─ div.container_accor_detail                        ← asignaciones de esa categoría
     ├─ div.container_accor[assign_id]               ← una asignación
     │    .head_subaccord .assignNameText            ← nombre
     │    .vt_grade_student                          ← nota "-- / 0.00" o ponderado
     │    .content_delivery
     │       col izq: pares p.title_subsection + div.body_style
     │                ("Descripción", "Valor de la Asignación", "Rúbrica",
     │                 "Fecha de Entrega", "Posibilidad de entregar después...",
     │                 "Cantidad de personas por grupo")
     │       col der ("Mis entregas"):
     │         [due_date="2026-10-16 23:45:00 GMT"]  ← en .btn_send_answer y .container_dropzone
     │         .container_dropzone[late_submit="f"]  ← widget de subida
     │         #data_file_{id}                       ← "No hay entregas de archivo o enlace" o la entrega
     │         "Nota obtenida:" → "-- / 100"
     └─ div.title_acor[task_item_id]                 ← duplicado colapsado (display:none), ignorar
```

Total: texto `Nota Total (sin redondear)` → `15.0 / 100` en el contenedor padre.

### Gotchas importantes

1. **"Tiene dropzone" ≠ "pendiente".** El widget de subida sigue apareciendo en asignaciones vencidas (ej. una con fecha 06/10 seguía con dropzone el 16/10). El n8n viejo marcaba `open` así y estaba mal. Pendiente real =
   `dropzone presente && due > now && #data_file_* dice "No hay entregas"`.
   (Para vencidas con `late_submit="t"`, mostrarlas aparte como "tarde pero se puede").
2. **El atributo `due_date` dice "GMT" pero es hora local de CR.** "16/10/2026 23:45" en la UI = `due_date="2026-10-16 23:45:00 GMT"`. Parsearlo como `America/Costa_Rica` (UTC-6), no como UTC, o todo queda corrido 6 h.
3. Las fechas en texto son `DD/MM/YYYY HH:mm` o `"Fecha no definida"`.
4. Algunos cursos no usan Evaluaciones (Gráficos tiene categorías pero 0 asignaciones). Estado vacío ≠ error.
5. Contenido de asignación (descripción) es HTML del profe → sanitizar antes de reinsertar.

---

## 4. Documentos — API JSON 🎉

Shell: `{curso}file-storage/` (AngularJS). El ID de la carpeta raíz está en el HTML:

```js
$rootScope.GL_FOLDER_ID = 245829280;   // regex: /GL_FOLDER_ID = (\d+)/
```

Endpoints (relativos a `{curso}file-storage/`):

| Endpoint | Qué hace |
|---|---|
| `GET api/folder/{id}` | carpeta + `elements[]` + `breadcrumbs` |
| `GET view/{encodeURIComponent(file_url)}` | el archivo (ej. `view/Tareas%2F01-Tarea.pdf` → `application/pdf`) |
| `GET download-archive?object_id={id}` | zip de carpeta/objeto |
| `GET /dotlrn/file-storage/ajax/get_folder_parent?folder_id=` | padre |
| `api/move/`, `api/copy/`, `api/notification/` | escritura — no tocar |

Forma de cada elemento (lo relevante):

```json
{
  "object_id": 245829302,
  "name": "01-Tarea.pdf",
  "type": "folder" | "<mime>",
  "mime_type": "application/pdf",
  "file_url": "Tareas/01-Tarea.pdf",
  "content_size": 0,            // en carpetas = # de archivos
  "last_modified_ansi": "2026-08-04 12:04:42",
  "new_p": 0,                   // ¿marcado como nuevo?
  "author": { "id": "...", "name": "..." },
  "privileges": { "write_p": 0, ... }
}
```

`last_modified_ansi` por elemento = invalidación de caché gratis: comparás contra lo guardado y solo re-bajás lo que cambió.

Ojo: el JSON trae tabs/espacios raros pero parsea bien con `JSON.parse`.

---

## 5. Estrategia de caché propuesta

Como el server no da headers de caché, el patrón es **stale-while-revalidate** propio:

1. **Render instantáneo** desde `chrome.storage.local` / IndexedDB con lo último conocido + timestamp ("actualizado hace 4 min").
2. **Revalidar en background** (service worker + `chrome.alarms`, cada 15–30 min, en serie, no en paralelo, para no martillar el server) y repintar si cambió.
3. **Qué cachear:**
   - Lista de cursos del semestre: TTL largo (1 día).
   - Evaluaciones parseadas por curso (JSON chiquito, no el HTML de 180 KB): TTL 15 min.
   - Árbol de carpetas (`api/folder`): TTL 30 min + diff por `last_modified_ansi`.
   - PDFs: opcional, en Cache API/IndexedDB con tope de tamaño (ej. 200 MB, LRU). Prefetch solo de lo marcado `new_p` o lo que se abrió alguna vez.
4. **Invalidación por acción:** después de entregar algo, invalidar ese curso y refetchear Evaluaciones de inmediato.
5. **Sesión vencida:** si un fetch termina en una URL con `/register`, no sobrescribir el caché con la página de login; marcar "sesión expirada" en la UI.

Escritura (subir entregas) se queda en los endpoints/forms originales. Leer es fácil; escribir es donde se rompe todo.

⚠️ Por verificar: que los fetch desde el service worker de la extensión (con `host_permissions` a `tecdigital.tec.ac.cr`) manden la cookie `ad_session_id`. Debería, pero depende del `SameSite` de la cookie; si falla, hacer el fetch desde el content script (same-origin, seguro manda cookies).

---

## Fuera de alcance / no tocar

- `/register/logout`, `api/move|copy`, cualquier POST que no sea una acción explícita del usuario.
- Credenciales: la extensión nunca las ve ni las guarda; vive de la sesión del navegador.
