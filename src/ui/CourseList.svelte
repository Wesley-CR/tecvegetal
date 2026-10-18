<script lang="ts">
  import { evalsRes } from '../lib/data/api';
  import { statusOf } from '../lib/parse/evals';
  import { courseVars } from '../lib/colors';
  import { clock } from '../lib/clock.svelte';
  import { href } from '../lib/router.svelte';
  import { courses } from './state.svelte';

  const data = $derived(courses.data);
  const pendingOf = (assignments: { dueAt: number | null }[] | undefined) => assignments?.length ?? 0;
</script>

{#if !data}
  <div class="panel skel-list" aria-label="Cargando cursos">
    {#each [0, 1, 2, 3] as i (i)}
      <div><span class="skel" style="width:30%"></span><span class="skel" style="width:75%"></span><span class="skel" style="width:100%;height:4px"></span></div>
    {/each}
  </div>
{:else}
  <ul class="panel list">
    {#each data.current as c, i (c.id)}
      {@const e = evalsRes(c).data}
      {@const pending = e ? e.categories.flatMap((k) => k.assignments).filter((a) => statusOf(a, clock.now) === 'pending') : undefined}
      {@const pct = e?.total != null ? Math.min(100, (e.total / (e.totalOf || 100)) * 100) : 0}
      <li class="c" style={courseVars(i)}>
        <a class="main" href={href.course(c)}>
          <span class="code">{c.code}</span>
          <span class="name">{c.name}</span>
        </a>
        <div class="grade">
          {#if e?.total != null}
            <b>{e.total}</b><span class="of">/ {e.totalOf ?? 100}</span>
          {:else if e}
            <span class="of">Sin notas todavía</span>
          {:else}
            <span class="skel" style="width:60px"></span>
          {/if}
        </div>
        <span class="bar" aria-hidden="true"><span style="width:{pct}%"></span></span>
        <div class="links">
          <a href={href.evals(c)}>Evaluaciones{#if pendingOf(pending)}<span class="pend">{pendingOf(pending)} pendientes</span>{/if}</a>
          <a href={href.docs(c)}>Documentos</a>
        </div>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .list { list-style: none; margin: 0; padding: 0; }
  li { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 12px; row-gap: 10px; padding: 18px 20px; }
  li + li { border-top: 1px solid var(--line); }
  .main { display: grid; gap: 2px; min-width: 0; }
  .main:hover { text-decoration: none; }
  .main:hover .name { text-decoration: underline; text-underline-offset: 3px; }
  .code { color: var(--c); font-weight: 700; font-size: var(--fs-s); }
  .name { font-weight: 600; line-height: 1.3; }
  .grade { text-align: right; white-space: nowrap; align-self: start; }
  .grade b { font-size: var(--fs-xl); font-weight: 700; letter-spacing: -0.01em; }
  .of { color: var(--muted); font-size: var(--fs-s); margin-left: 3px; }
  .bar { grid-column: 1 / -1; height: 5px; border-radius: 3px; background: var(--line); overflow: hidden; }
  .bar span { display: block; height: 100%; border-radius: 3px; background: var(--c); }
  .links { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 4px 18px; font-size: var(--fs-s); color: var(--muted); }
  .links a:hover { color: var(--text); }
  .pend { margin-left: 8px; color: var(--text); font-weight: 600; }
  .skel-list > div { display: grid; gap: 10px; padding: 18px 20px; }
  .skel-list > div + div { border-top: 1px solid var(--line); }
</style>
