<script lang="ts">
  import { onMount } from 'svelte';
  import * as store from '../lib/data/store';
  import { navigate, href } from '../lib/router.svelte';
  import { clock } from '../lib/clock.svelte';
  import { fmtWhen } from '../lib/dates';
  import { courseVars } from '../lib/colors';
  import type { Folder } from '../lib/types';
  import { courses, currentItems } from './state.svelte';

  let { onclose }: { onclose: () => void } = $props();

  interface Hit { id: string; kind: string; title: string; sub: string; href: string; external?: boolean; index: number }
  interface Entry extends Hit { hay: string; ftitle: string }

  const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // El texto de búsqueda se normaliza una sola vez al armar el índice, no en cada tecla.
  const entry = (h: Hit): Entry => ({ ...h, hay: fold(`${h.title} ${h.sub} ${h.kind}`), ftitle: fold(h.title) });

  let q = $state('');
  let sel = $state(0);
  let input: HTMLInputElement;
  let docEntries = $state.raw<Entry[]>([]);

  onMount(async () => {
    input?.focus();
    // Documentos: todo lo que haya en caché, de cualquier curso visitado.
    const cur = courses.data?.current ?? [];
    const past = (courses.data?.past ?? []).flatMap((g) => g.courses);
    const rows = await store.entries<Folder>('fs:');
    const seen = new Set<string>();
    const out: Entry[] = [];
    for (const [key, e] of rows) {
      const courseId = key.split(':')[1];
      const index = cur.findIndex((c) => c.id === courseId);
      const course = cur[index] ?? past.find((c) => c.id === courseId);
      if (!course) continue;
      for (const it of e.v.items) {
        if (seen.has(it.id)) continue;
        seen.add(it.id);
        out.push(entry(
          it.kind === 'folder'
            ? { id: `f${it.id}`, kind: 'Carpeta', title: it.name, sub: `${course.code}, en ${e.v.name}`, href: href.docs(course, it.id), index }
            : { id: `f${it.id}`, kind: 'Archivo', title: it.name, sub: `${course.code}, en ${e.v.name}`, href: it.href ?? '', external: true, index },
        ));
      }
    }
    docEntries = out;
  });

  // Se calcula una vez por apertura (no depende de lo que se escribe).
  const baseEntries = $derived.by((): Entry[] => {
    const cur = courses.data?.current ?? [];
    const now = clock.now;
    const out: Hit[] = [{ id: 'home', kind: 'Página', title: 'Inicio', sub: 'Pendientes y cursos', href: href.home(), index: -1 }];
    cur.forEach((c, i) => {
      out.push({ id: `c${c.id}`, kind: 'Curso', title: c.name, sub: c.code, href: href.course(c), index: i });
      out.push({ id: `e${c.id}`, kind: 'Evaluaciones', title: `${c.code} Evaluaciones`, sub: c.name, href: href.evals(c), index: i });
      out.push({ id: `d${c.id}`, kind: 'Documentos', title: `${c.code} Documentos`, sub: c.name, href: href.docs(c), index: i });
    });
    for (const g of courses.data?.past ?? [])
      for (const c of g.courses) out.push({ id: `c${c.id}`, kind: 'Curso', title: c.name, sub: `${c.code}, ${g.label}`, href: href.course(c), index: -1 });
    for (const it of currentItems(now))
      out.push({
        id: `a${it.course.id}:${it.a.id}`,
        kind: 'Asignación',
        title: it.a.name,
        sub: `${it.course.code}, ${it.a.dueAt ? fmtWhen(it.a.dueAt, now) : 'sin fecha'}`,
        href: href.evals(it.course),
        index: it.index,
      });
    return out.map(entry);
  });

  const hits = $derived.by((): Hit[] => {
    const terms = fold(q).split(/\s+/).filter(Boolean);
    if (!terms.length) return baseEntries.slice(0, 12);
    const scored: { h: Entry; score: number }[] = [];
    for (const pool of [baseEntries, docEntries]) {
      for (const h of pool) {
        let ok = true;
        for (const t of terms) if (!h.hay.includes(t)) { ok = false; break; }
        if (!ok) continue;
        let score = 0;
        for (const t of terms) score += h.ftitle.startsWith(t) ? 3 : h.ftitle.includes(t) ? 2 : 1;
        scored.push({ h, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 30).map((x) => x.h);
  });

  $effect(() => { q; sel = 0; });
  // Con flechas, la opción elegida siempre queda visible.
  $effect(() => { document.getElementById(`hit-${sel}`)?.scrollIntoView({ block: 'nearest' }); });

  function go(h: Hit | undefined) {
    if (!h || !h.href) return;
    onclose();
    if (h.external) window.open(h.href, '_blank', 'noopener');
    else navigate(h.href);
  }

  function onkey(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); onclose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(hits.length - 1, sel + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); go(hits[sel]); }
  }
</script>

<div class="scrim" onclick={onclose} role="presentation"></div>
<div class="box" role="dialog" aria-modal="true" aria-label="Buscar en TEC Vegetal">
  <input
    bind:this={input}
    bind:value={q}
    onkeydown={onkey}
    placeholder="Buscar cursos, asignaciones o archivos"
    aria-controls="palette-results"
    aria-activedescendant={hits[sel] ? `hit-${sel}` : undefined}
  />
  <ul id="palette-results" role="listbox">
    {#each hits as h, i (h.id)}
      <!-- svelte-ignore a11y_click_events_have_key_events (el teclado se maneja desde el input, patrón combobox) -->
      <li
        id={`hit-${i}`}
        role="option"
        aria-selected={i === sel}
        class="c"
        style={courseVars(h.index)}
        onpointermove={() => { if (sel !== i) sel = i; }}
        onclick={() => go(h)}
      >
        <span class="dot" class:none={h.index < 0}></span>
        <span class="t">{h.title}</span>
        <span class="s">{h.sub}</span>
        <span class="k">{h.kind}</span>
      </li>
    {:else}
      <li class="empty">Sin resultados. Los archivos aparecen acá después de abrir su carpeta una vez.</li>
    {/each}
  </ul>
</div>

<style>
  .scrim { position: fixed; inset: 0; background: rgb(0 0 0 / 0.45); z-index: 40; }
  .box { position: fixed; z-index: 41; top: 12vh; left: 50%; transform: translateX(-50%); width: min(640px, calc(100vw - 32px)); background: var(--surface); border: 1px solid var(--line); border-radius: 6px; box-shadow: 0 24px 60px rgb(0 0 0 / 0.4); overflow: hidden; }
  input { width: 100%; padding: 16px 18px; border: 0; border-bottom: 1px solid var(--line); background: transparent; color: var(--text); font: inherit; font-size: var(--fs-l); outline: none; }
  ul { list-style: none; margin: 0; padding: 6px; max-height: 55vh; overflow-y: auto; }
  li { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto; grid-template-areas: 'd t k' 'd s k'; column-gap: 12px; padding: 8px 10px; border-radius: 3px; cursor: pointer; }
  li[aria-selected='true'] { background: var(--raise); }
  .dot { grid-area: d; align-self: center; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
  .dot.none { background: var(--faint); }
  .t { grid-area: t; font-weight: 550; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .s { grid-area: s; font-size: var(--fs-s); color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .k { grid-area: k; align-self: center; font-size: var(--fs-xs); color: var(--faint); }
  .empty { display: block; color: var(--muted); font-size: var(--fs-s); cursor: default; }
</style>
