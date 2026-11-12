<script lang="ts">
  import { onMount } from 'svelte';
  import { changes, dismissAll, loadChanges } from '../lib/data/changes.svelte';
  import { courseVars } from '../lib/colors';
  import { fmtRelative } from '../lib/dates';
  import { href } from '../lib/router.svelte';
  import { clock } from '../lib/clock.svelte';
  import { courses } from './state.svelte';
  import type { ChangeKind } from '../lib/changes';

  onMount(() => { loadChanges(); });

  let expanded = $state(false);
  const current = $derived(courses.data?.current ?? []);
  const list = $derived(changes.list.filter((c) => current.some((x) => x.id === c.courseId)));
  const shown = $derived(expanded ? list : list.slice(0, 5));
  const LABEL: Record<ChangeKind, string> = { grade: 'Nota', regrade: 'Nota', assignment: 'Nueva', due: 'Fecha', file: 'Archivo' };
</script>

{#if list.length}
  <section class="news" aria-labelledby="news-title">
    <div class="head">
      <h2 id="news-title">Novedades <span class="muted">{list.length}</span></h2>
      <button class="link" onclick={dismissAll}>Marcar todo como visto</button>
    </div>
    <ul class="panel">
      {#each shown as ch (ch.id)}
        {@const i = current.findIndex((c) => c.id === ch.courseId)}
        {@const course = current[i]}
        <li class="c" style={courseVars(i)}>
          <a href={ch.kind === 'file' ? href.docs(course) : href.evals(course)}>
            <span class="kind" data-kind={ch.kind}>{LABEL[ch.kind]}</span>
            <span class="txt"><b class="code">{course.code}</b> <span class="t">{ch.title}</span><span class="d">{ch.detail}</span></span>
            <span class="when">{clock.now - ch.at < 60_000 ? 'recién' : fmtRelative(ch.at, clock.now)}</span>
          </a>
        </li>
      {/each}
    </ul>
    {#if list.length > 5}
      <button class="link more" onclick={() => (expanded = !expanded)}>{expanded ? 'Ver menos' : `Ver las ${list.length}`}</button>
    {/if}
  </section>
{/if}

<style>
  .news { margin-top: 28px; }
  .head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
  h2 { font-size: var(--fs-xl); }
  h2 .muted { font-size: var(--fs-s); font-weight: 600; margin-left: 4px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li + li { border-top: 1px solid var(--line); }
  a { display: flex; align-items: baseline; gap: 14px; padding: 11px 20px; }
  a:hover { background: var(--raise); text-decoration: none; }
  .kind { flex: none; width: 4.5rem; font-size: var(--fs-xs); font-weight: 700; color: var(--muted); }
  .kind[data-kind='grade'], .kind[data-kind='regrade'] { color: var(--ok); }
  .kind[data-kind='assignment'], .kind[data-kind='due'] { color: var(--u-soon); }
  .txt { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; align-items: baseline; column-gap: 8px; }
  .code { color: var(--c); font-size: var(--fs-s); }
  .t { font-weight: 600; }
  .d { flex-basis: 100%; font-size: var(--fs-s); color: var(--muted); }
  .when { flex: none; font-size: var(--fs-xs); color: var(--faint); }
  .link { background: none; border: 0; padding: 0; color: var(--muted); font-size: var(--fs-s); cursor: pointer; }
  .link:hover { color: var(--text); text-decoration: underline; text-underline-offset: 3px; }
  .more { margin-top: 10px; }
</style>
