<script lang="ts">
  import { onMount } from 'svelte';
  import * as store from '../lib/data/store';
  import { navigate, href } from '../lib/router.svelte';
  import { clock } from '../lib/clock.svelte';
  import { fmtWhen } from '../lib/dates';
  import { courseVars } from '../lib/colors';
  import type { Folder } from '../lib/types';
  import { courses, currentItems } from './state.svelte';
  import Icon from './Icon.svelte';

  let { onclose }: { onclose: () => void } = $props();

  type Group = 'nav' | 'assignment' | 'file' | 'folder';
  interface Hit {
    id: string;
    group: Group;
    title: string;
    /** Curso (código) y, para documentos, dónde está. */
    sub: string;
    href: string;
    external?: boolean;
    index: number;
    /** Extensión para archivos ("PDF", "DOCX"…). */
    ext?: string;
  }
  interface Entry extends Hit { hay: string; ftitle: string }

  const GROUP_LABEL: Record<Group, string> = { nav: 'Ir a', assignment: 'Asignaciones', file: 'Archivos', folder: 'Carpetas' };
  const ORDER: Group[] = ['nav', 'assignment', 'file', 'folder'];

  const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const entry = (h: Hit): Entry => ({ ...h, hay: fold(`${h.title} ${h.sub}`), ftitle: fold(h.title) });
  const extOf = (name: string) => /\.([a-z0-9]{1,5})$/i.exec(name)?.[1]?.toUpperCase();

  let q = $state('');
  let sel = $state(0);
  let input: HTMLInputElement;
  let docEntries = $state.raw<Entry[]>([]);
  let folderCount = $state(0);

  onMount(async () => {
    input?.focus();
    const cur = courses.data?.current ?? [];
    const past = (courses.data?.past ?? []).flatMap((g) => g.courses);
    const rows = await store.entries<Folder>('fs:');
    folderCount = rows.length;
    const seen = new Set<string>();
    const out: Entry[] = [];
    for (const [key, e] of rows) {
      const courseId = key.split(':')[1];
      const index = cur.findIndex((c) => c.id === courseId);
      const course = cur[index] ?? past.find((c) => c.id === courseId);
      if (!course) continue;
      const where = ['Documentos', ...e.v.path].join(' › ');
      for (const it of e.v.items) {
        if (seen.has(it.id)) continue;
        seen.add(it.id);
        out.push(entry(
          it.kind === 'folder'
            ? { id: `f${it.id}`, group: 'folder', title: it.name, sub: `${course.code} · ${where}`, href: href.docs(course, it.id), index }
            : { id: `f${it.id}`, group: 'file', title: it.name, sub: `${course.code} · ${where}`, href: it.href ?? '', external: true, index, ext: it.kind === 'url' ? 'LINK' : extOf(it.name) ?? 'ARCH' },
        ));
      }
    }
    docEntries = out;
  });

  const baseEntries = $derived.by((): Entry[] => {
    const cur = courses.data?.current ?? [];
    const now = clock.now;
    const out: Hit[] = [{ id: 'home', group: 'nav', title: 'Inicio', sub: 'Pendientes y cursos', href: href.home(), index: -1 }];
    cur.forEach((c, i) => {
      out.push({ id: `c${c.id}`, group: 'nav', title: c.name, sub: `${c.code} · Resumen`, href: href.course(c), index: i });
      out.push({ id: `e${c.id}`, group: 'nav', title: `${c.code} Evaluaciones`, sub: c.name, href: href.evals(c), index: i });
      out.push({ id: `d${c.id}`, group: 'nav', title: `${c.code} Documentos`, sub: c.name, href: href.docs(c), index: i });
    });
    for (const g of courses.data?.past ?? [])
      for (const c of g.courses) out.push({ id: `c${c.id}`, group: 'nav', title: c.name, sub: `${c.code} · ${g.label}`, href: href.course(c), index: -1 });
    for (const it of currentItems(now))
      out.push({
        id: `a${it.course.id}:${it.a.id}`,
        group: 'assignment',
        title: it.a.name,
        sub: `${it.course.code} · ${it.a.dueAt ? `entrega ${fmtWhen(it.a.dueAt, now)}` : 'sin fecha'}`,
        href: href.evals(it.course),
        index: it.index,
      });
    return out.map(entry);
  });

  // Resultados agrupados por tipo; los grupos se ordenan por su mejor resultado.
  const sections = $derived.by((): { group: Group; hits: Hit[] }[] => {
    const terms = fold(q).split(/\s+/).filter(Boolean);
    if (!terms.length) return [{ group: 'nav' as Group, hits: baseEntries.filter((e) => e.group === 'nav').slice(0, 9) }];
    const byGroup = new Map<Group, { h: Entry; score: number }[]>();
    for (const pool of [baseEntries, docEntries]) {
      for (const h of pool) {
        let ok = true;
        for (const t of terms) if (!h.hay.includes(t)) { ok = false; break; }
        if (!ok) continue;
        let score = 0;
        for (const t of terms) score += h.ftitle.startsWith(t) ? 3 : h.ftitle.includes(t) ? 2 : 1;
        if (!byGroup.has(h.group)) byGroup.set(h.group, []);
        byGroup.get(h.group)!.push({ h, score });
      }
    }
    return [...byGroup.entries()]
      .map(([group, list]) => {
        list.sort((a, b) => b.score - a.score);
        return { group, best: list[0].score, hits: list.slice(0, group === 'nav' ? 6 : 10).map((x) => x.h) };
      })
      .sort((a, b) => b.best - a.best || ORDER.indexOf(a.group) - ORDER.indexOf(b.group));
  });
  const flat = $derived(sections.flatMap((s) => s.hits));

  $effect(() => { q; sel = 0; });
  $effect(() => { document.getElementById(`hit-${sel}`)?.scrollIntoView({ block: 'nearest' }); });

  function go(h: Hit | undefined) {
    if (!h || !h.href) return;
    onclose();
    if (h.external) window.open(h.href, '_blank', 'noopener');
    else navigate(h.href);
  }

  function onkey(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); onclose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(flat.length - 1, sel + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); go(flat[sel]); }
  }

  const action = (h: Hit) => (h.group === 'file' ? 'Abrir archivo' : h.group === 'folder' ? 'Abrir carpeta' : h.group === 'assignment' ? 'Ver en Evaluaciones' : 'Ir');
</script>

<div class="scrim" onclick={onclose} role="presentation"></div>
<div class="box solid" role="dialog" aria-modal="true" aria-label="Buscar en TEC Vegetal">
  <div class="field">
    <Icon name="search" size={18} />
    <input
      bind:this={input}
      bind:value={q}
      onkeydown={onkey}
      placeholder="Buscar cursos, asignaciones o archivos"
      aria-controls="palette-results"
      aria-activedescendant={flat[sel] ? `hit-${sel}` : undefined}
    />
  </div>
  <div id="palette-results" role="listbox" class="results">
    {#each sections as s (s.group)}
      <p class="group" role="presentation">{GROUP_LABEL[s.group]}</p>
      {#each s.hits as h (h.id)}
        {@const i = flat.indexOf(h)}
        <!-- svelte-ignore a11y_click_events_have_key_events (el teclado se maneja desde el input, patrón combobox) -->
        <div
          id={`hit-${i}`}
          role="option"
          tabindex="-1"
          aria-selected={i === sel}
          class="hit c"
          style={courseVars(h.index)}
          onpointermove={() => { if (sel !== i) sel = i; }}
          onclick={() => go(h)}
        >
          <span class="ico" class:none={h.index < 0}>
            {#if h.group === 'file'}<span class="ext">{h.ext}</span>
            {:else if h.group === 'folder'}<Icon name="folder" size={18} />
            {:else if h.group === 'assignment'}<Icon name="calendar" size={18} />
            {:else}<span class="dot"></span>{/if}
          </span>
          <span class="t">{h.title}</span>
          <span class="s">{h.sub}</span>
          <span class="k">{action(h)}{#if h.external}<Icon name="external" size={12} />{/if}</span>
        </div>
      {/each}
    {:else}
      <p class="empty">Sin resultados para "{q}".</p>
    {/each}
  </div>
  <p class="foot">{folderCount ? `Busca en ${folderCount} carpetas de Documentos.` : 'Los archivos se indexan solos en segundo plano.'} <kbd>↑</kbd> <kbd>↓</kbd> para moverte, <kbd>Enter</kbd> para abrir.</p>
</div>

<style>
  .scrim { position: fixed; inset: 0; background: rgb(0 0 0 / 0.45); z-index: 40; }
  .box { position: fixed; z-index: 41; top: 12vh; left: 50%; transform: translateX(-50%); width: min(680px, calc(100vw - 32px)); background: var(--surface); border: 1px solid var(--line-strong); border-radius: 8px; box-shadow: 0 24px 60px rgb(0 0 0 / 0.4); overflow: hidden; }
  .field { display: flex; align-items: center; gap: 12px; padding: 0 18px; border-bottom: 1px solid var(--line); color: var(--faint); }
  input { flex: 1; padding: 16px 0; border: 0; background: transparent; color: var(--text); font: inherit; font-size: var(--fs-l); outline: none; }
  .results { max-height: 56vh; overflow-y: auto; padding: 4px 8px 8px; }
  .group { margin: 12px 10px 4px; font-size: var(--fs-xs); font-weight: 700; color: var(--faint); }
  .hit { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; grid-template-areas: 'i t k' 'i s k'; column-gap: 12px; padding: 8px 10px; border-radius: 4px; cursor: pointer; outline: none; }
  .hit[aria-selected='true'] { background: var(--raise); }
  .ico { grid-area: i; align-self: center; justify-self: center; color: var(--c); display: grid; place-items: center; }
  .ico.none { color: var(--faint); }
  .ext { font-size: 9.5px; font-weight: 800; letter-spacing: 0.02em; color: var(--c); border: 1.5px solid currentColor; border-radius: 3px; padding: 2px 3px; min-width: 30px; text-align: center; }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: currentColor; }
  .t { grid-area: t; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .s { grid-area: s; font-size: var(--fs-s); color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .k { grid-area: k; align-self: center; display: inline-flex; align-items: center; gap: 4px; font-size: var(--fs-xs); color: var(--faint); visibility: hidden; }
  .hit[aria-selected='true'] .k { visibility: visible; }
  .empty { margin: 16px 10px; color: var(--muted); font-size: var(--fs-s); }
  .foot { margin: 0; padding: 9px 18px; border-top: 1px solid var(--line); font-size: var(--fs-xs); color: var(--faint); }
  kbd { font: inherit; font-size: 11px; padding: 0 5px; border: 1px solid var(--line); border-radius: 3px; }
</style>
