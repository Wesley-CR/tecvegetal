<script lang="ts">
  import { courseHomeRes, evalsRes } from '../lib/data/api';
  import { statusOf } from '../lib/parse/evals';
  import { clock } from '../lib/clock.svelte';
  import type { Course } from '../lib/types';
  import AssignmentRow from './AssignmentRow.svelte';

  let { course, index }: { course: Course; index: number } = $props();

  // El HTML de los portlets ya viene saneado (parse/sanitize.ts). Se vuelve a
  // parsear con DOMParser (documento inerte) y se insertan los nodos: sin
  // innerHTML ni {@html}, que la revisión de Mozilla marca como inseguro.
  function sanitized(node: HTMLElement, html: string) {
    const render = (h: string) => node.replaceChildren(...new DOMParser().parseFromString(h, 'text/html').body.childNodes);
    render(html);
    return { update: render };
  }
  const evals = $derived(evalsRes(course));
  const home = $derived(courseHomeRes(course));
  const now = $derived(clock.now);

  const upcoming = $derived(
    (evals.data?.categories ?? [])
      .flatMap((c) => c.assignments.map((a) => ({ a, category: c.name, status: statusOf(a, now) })))
      .filter((x) => x.status === 'pending' || x.status === 'late')
      .sort((x, y) => (x.a.dueAt ?? Infinity) - (y.a.dueAt ?? Infinity)),
  );
  const recent = $derived(
    (evals.data?.categories ?? [])
      .flatMap((c) => c.assignments.map((a) => ({ a, category: c.name })))
      .filter((x) => x.a.grade != null)
      .slice(-5)
      .reverse(),
  );
  // Portlets que el curso tiene en su portada, en el orden del sitio.
  const portlets = $derived(home.data?.portlets ?? []);
  const filled = $derived(portlets.filter((p) => !p.empty));
  const empty = $derived(portlets.filter((p) => p.empty));
</script>

<div class="cols">
  <div class="main">
    <section aria-labelledby="up-title">
      <h2 id="up-title">Por entregar</h2>
      {#if !evals.data}
        <div class="panel skel-rows">{#each [0, 1, 2] as i (i)}<div><span class="skel" style="width:{40 + i * 12}%"></span></div>{/each}</div>
      {:else if upcoming.length}
        <ul class="panel">
          {#each upcoming as x (x.a.id)}
            <AssignmentRow a={x.a} {course} {index} status={x.status} category={x.category} />
          {/each}
        </ul>
      {:else}
        <p class="muted none">Nada pendiente en este curso.</p>
      {/if}
    </section>

    {#if recent.length}
      <section aria-labelledby="grades-title">
        <h2 id="grades-title">Notas recientes</h2>
        <ul class="panel">
          {#each recent as x (x.a.id)}
            <AssignmentRow a={x.a} {course} {index} status="graded" category={x.category} />
          {/each}
        </ul>
      </section>
    {/if}
  </div>

  <aside class="portlets" aria-label="Información del curso">
    {#if !home.data}
      {#if home.error}<p class="muted">No se pudo cargar la portada del curso.</p>
      {:else}{#each [0, 1, 2] as i (i)}<div class="skel-block"><span class="skel" style="width:40%"></span><span class="skel"></span><span class="skel" style="width:80%"></span></div>{/each}{/if}
    {:else}
      {#each filled as p (p.title)}
        <section>
          <h2>{p.title}</h2>
          <div class="prose" use:sanitized={p.html}></div>
        </section>
      {/each}
      {#if empty.length}
        <p class="muted vacios">Sin contenido: {empty.map((p) => p.title).join(', ')}.</p>
      {/if}
    {/if}
  </aside>
</div>

<style>
  .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 340px); gap: 56px; align-items: start; }
  .main { display: grid; gap: 40px; }
  h2 { font-size: var(--fs-l); margin-bottom: 12px; }
  ul { list-style: none; margin: 0; padding: 0; }
  .none { margin: 0; }
  .skel-rows > div { padding: 14px; }
  .skel-rows > div + div { border-top: 1px solid var(--line); }
  .portlets { display: grid; gap: 28px; }
  .portlets section + section { border-top: 1px solid var(--line); padding-top: 24px; }
  .portlets h2 { font-size: var(--fs-m); }
  .vacios { font-size: var(--fs-xs); margin: 0; }
  .skel-block { display: grid; gap: 8px; }
  @media (max-width: 1100px) { .cols { grid-template-columns: 1fr; } }
</style>
