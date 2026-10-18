<script lang="ts">
  import { untrack } from 'svelte';
  import { href } from '../lib/router.svelte';
  import { folderRes, rootFolderRes, lastSeen, markSeen, folderAncestors } from '../lib/data/api';
  import { clock } from '../lib/clock.svelte';
  import { fmtShort, fmtRelative } from '../lib/dates';
  import type { Course, DocItem } from '../lib/types';

  let { course, folderId }: { course: Course; folderId?: string } = $props();

  const root = $derived(rootFolderRes(course));
  const id = $derived(folderId ?? root.data);
  const res = $derived(id ? folderRes(course, id) : null);
  const folder = $derived(res?.data);
  const now = $derived(clock.now);

  $effect(() => {
    const fid = id;
    if (fid) untrack(() => folderRes(course, fid).load({ priority: true }));
  });

  // "Nuevo desde tu última visita": se compara contra la visita anterior a esta carpeta.
  let prevSeen = $state<number | null | undefined>(undefined);
  $effect(() => {
    const key = id ? `${course.id}:${id}` : null;
    if (!key) return;
    prevSeen = undefined;
    lastSeen(key).then((t) => (prevSeen = t));
    const timer = setTimeout(() => markSeen(key), 1500);
    return () => clearTimeout(timer);
  });
  const isNew = (it: DocItem) =>
    it.isNew || (prevSeen != null && it.modified != null && it.modified > prevSeen);

  let q = $state('');
  const items = $derived(
    (folder?.items ?? []).filter((it) => !q || it.name.toLowerCase().includes(q.trim().toLowerCase())),
  );

  const folderHref = (fid: string) => href.docs(course, fid);
  const ext = (it: DocItem) => (/\.([a-z0-9]{1,5})$/i.exec(it.name)?.[1] ?? (it.kind === 'url' ? 'link' : 'file')).toUpperCase();
  const prefetch = (it: DocItem) => { if (it.kind === 'folder') folderRes(course, it.id).load(); };

  let ancestors = $state<{ id: string; name: string }[]>([]);
  $effect(() => {
    const fid = folder?.id;
    const rootId = root.data;
    if (!fid) return;
    folderAncestors(fid, rootId).then((a) => (ancestors = a));
  });
  // Camino: Documentos / ancestros / actual. Si los ancestros se conocen (navegaste
  // hasta acá), son links. Si llegaste por link directo, se muestran los nombres
  // que da la API, sin link.
  const crumbs = $derived.by(() => {
    if (!folder) return [];
    const rootId = root.data;
    if (!rootId || folder.id === rootId) return [];
    if (ancestors.some((c) => c.id === rootId)) {
      return ancestors.map((c) => (c.id === rootId ? { ...c, name: 'Documentos' } : c));
    }
    return [{ id: rootId, name: 'Documentos' }, ...folder.path.slice(0, -1).map((name) => ({ id: '', name }))];
  });
  const isRoot = $derived(!!folder && folder.id === root.data);
</script>

<div class="bar">
  <nav class="crumbs" aria-label="Ubicación">
    {#each crumbs as c, i (c.id || `n${i}`)}
      {#if c.id}<a href={folderHref(c.id)}>{c.name}</a>{:else}<span class="muted">{c.name}</span>{/if}<span aria-hidden="true">/</span>
    {/each}
    <span class="here">{isRoot ? 'Documentos' : folder?.name ?? ''}</span>
  </nav>
  <label class="filter">
    <span class="sr-only">Filtrar archivos</span>
    <input type="search" placeholder="Filtrar en esta carpeta" bind:value={q} />
  </label>
</div>

{#if !folder}
  <p class="muted">{res?.error || root.error ? `No se pudo cargar: ${res?.error ?? root.error}` : 'Cargando documentos…'}</p>
{:else if !items.length}
  <p class="muted">{q ? 'Nada coincide con el filtro.' : 'Esta carpeta está vacía.'}</p>
{:else}
  <ul class="files">
    {#each items as it (it.id)}
      {@const fresh = isNew(it)}
      <li class:fresh>
        {#if it.kind === 'folder'}
          <a class="item" href={folderHref(it.id)} onpointerenter={() => prefetch(it)} onfocus={() => prefetch(it)}>
            <svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 5.5a1.5 1.5 0 0 1 1.5-1.5h3.6l1.6 1.8H16a1.5 1.5 0 0 1 1.5 1.5v7.2A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5z" fill="currentColor" /></svg>
            <span class="name">{it.name}</span>
            <span class="meta">{it.count === 0 ? 'vacía' : it.count === 1 ? '1 archivo' : `${it.count} archivos`}</span>
            <span class="date">{it.modified ? fmtShort(it.modified) : ''}</span>
          </a>
        {:else}
          <a class="item" href={it.href ?? '#'} target="_blank" rel="noopener" title={it.author ? `Subido por ${it.author}` : undefined}>
            <span class="ext">{ext(it)}</span>
            <span class="name">{it.name}{#if fresh}<span class="new">nuevo</span>{/if}</span>
            <span class="meta">{it.author}</span>
            <span class="date" title={it.modified ? fmtRelative(it.modified, now) : ''}>{it.modified ? fmtShort(it.modified) : ''}</span>
          </a>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  .bar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 14px; flex-wrap: wrap; }
  .crumbs { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; font-size: var(--fs-m); }
  .crumbs a { color: var(--muted); }
  .crumbs span[aria-hidden] { color: var(--faint); }
  .here { font-weight: 650; }
  .filter input { width: 260px; max-width: 100%; padding: 7px 10px; border-radius: var(--r); border: 1px solid var(--line); background: var(--surface); color: var(--text); font: inherit; font-size: var(--fs-s); }
  .files { list-style: none; margin: 0; padding: 0; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); }
  .files li + li { border-top: 1px solid var(--line); }
  .item { display: grid; grid-template-columns: 40px minmax(0, 1fr) minmax(0, 220px) 70px; align-items: center; gap: 14px; padding: 12px 20px; }
  .item:hover { background: var(--raise); text-decoration: none; }
  .ico { width: 20px; height: 20px; color: var(--c); justify-self: center; }
  .ext { font-size: 10px; font-weight: 700; color: var(--muted); border: 1px solid var(--line); border-radius: 4px; padding: 2px 0; text-align: center; letter-spacing: 0.02em; }
  .name { font-weight: 550; overflow-wrap: anywhere; }
  .meta, .date { font-size: var(--fs-s); color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .date { text-align: right; }
  .new { margin-left: 8px; font-size: 11px; font-weight: 700; color: var(--mark); vertical-align: 1px; }
  @media (max-width: 720px) { .item { grid-template-columns: 34px minmax(0, 1fr) 60px; } .meta { display: none; } }
</style>
