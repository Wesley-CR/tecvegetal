<script lang="ts">
  import type { Route } from '../lib/router.svelte';
  import { courseHomeRes, evalsRes, rootFolderRes } from '../lib/data/api';
  import { href } from '../lib/router.svelte';
  import { courseVars } from '../lib/colors';
  import { periodLabel } from '../lib/parse/courses';
  import { findCourse } from './state.svelte';
  import Summary from './Summary.svelte';
  import Evals from './Evals.svelte';
  import Docs from './Docs.svelte';
  import Icon from './Icon.svelte';

  let { route }: { route: Extract<Route, { name: 'course' }> } = $props();

  const ref = $derived(findCourse(route.courseId, route.base));
  const course = $derived(ref?.course);
  const evals = $derived(course ? evalsRes(course) : null);
  const home = $derived(course ? courseHomeRes(course) : null);

  $effect(() => {
    if (!course) return;
    courseHomeRes(course).load({ priority: route.tab === 'resumen' });
    evalsRes(course).load({ priority: route.tab !== 'docs' });
    rootFolderRes(course).load({ priority: route.tab === 'docs' });
  });

  // Pestañas tal como las da el sitio para este curso; las que TEC Vegetal no pinta
  // (Calendario, Evaluación Docente, GAAP…) abren la página original.
  const nativeHref = (n: 'resumen' | 'evals' | 'docs') =>
    n === 'resumen' ? href.course(course!) : n === 'evals' ? href.evals(course!) : href.docs(course!);
  const tabs = $derived(
    course
      ? home?.data?.tabs.length
        ? home.data.tabs.map((t) => ({ label: t.label, native: t.native, href: t.native ? nativeHref(t.native) : t.href }))
        : (['resumen', 'evals', 'docs'] as const).map((n) => ({ label: { resumen: 'Resumen', evals: 'Evaluaciones', docs: 'Documentos' }[n], native: n, href: nativeHref(n) }))
      : [],
  );
</script>

{#if course && ref}
  <div class="c" style={courseVars(ref.index)}>
    <div class="wrap">
      <header class="head">
        <div class="title">
          <h1><span class="code">{course.code}</span> {course.name}</h1>
          <p class="muted">Grupo {course.group}, {periodLabel(course.period)}</p>
        </div>
        {#if evals?.data?.total != null}
          <p class="total"><span class="muted">Nota acumulada</span> <b>{evals.data.total}</b><span class="muted"> / {evals.data.totalOf ?? 100}</span></p>
        {/if}
      </header>

      <nav class="tabs" aria-label="Secciones del curso">
        {#each tabs as t (t.href)}
          <a href={t.href} aria-current={t.native === route.tab ? 'page' : undefined} title={t.native ? undefined : 'Se abre en TEC Digital'}>
            {t.label}{#if !t.native}<Icon name="external" size={13} />{/if}
          </a>
        {/each}
      </nav>

      {#if route.tab === 'resumen'}
        <Summary {course} index={ref.index} />
      {:else if route.tab === 'evals'}
        <Evals {course} index={ref.index} />
      {:else}
        <Docs {course} folderId={route.folderId} />
      {/if}
    </div>
  </div>
{:else}
  <div class="wrap"><p class="muted">No se reconoce este curso.</p></div>
{/if}

<style>
  .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; padding: 44px 0 22px; flex-wrap: wrap; }
  h1 { font-size: var(--fs-xxl); font-weight: 700; }
  .code { color: var(--c); }
  .title p { margin: 6px 0 0; font-size: var(--fs-s); }
  .total { margin: 0; font-size: var(--fs-s); white-space: nowrap; }
  .total b { font-size: var(--fs-l); font-weight: 700; margin-left: 6px; }
  .tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--line); margin-bottom: 32px; overflow-x: auto; scrollbar-width: none; }
  .tabs a { display: inline-flex; align-items: center; gap: 5px; padding: 11px 14px; color: var(--muted); font-weight: 600; font-size: var(--fs-s); border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap; }
  .tabs a:hover { color: var(--text); text-decoration: none; }
  .tabs a[aria-current='page'] { color: var(--text); border-bottom-color: var(--c); }
  .tabs a :global(svg) { color: var(--faint); }
</style>
