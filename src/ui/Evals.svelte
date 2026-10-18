<script lang="ts">
  import { evalsRes } from '../lib/data/api';
  import { statusOf } from '../lib/parse/evals';
  import { clock } from '../lib/clock.svelte';
  import { fmtRelative } from '../lib/dates';
  import type { Course } from '../lib/types';
  import AssignmentRow from './AssignmentRow.svelte';

  let { course, index }: { course: Course; index: number } = $props();
  const res = $derived(evalsRes(course));
  const data = $derived(res.data);
  const now = $derived(clock.now);
  const PASS = 70;
</script>

{#if !data}
  <p class="muted">{res.error ? `No se pudo cargar: ${res.error}` : 'Cargando evaluaciones…'}</p>
{:else}
  <div class="summary">
    {#if data.total != null}
      <p>
        Llevás <b>{data.total}</b> de {data.totalOf ?? 100}.
        {#if data.total < PASS}Te faltan <b>{Math.round((PASS - data.total) * 100) / 100}</b> puntos para llegar a {PASS}.{:else}Ya pasaste la línea de {PASS}.{/if}
      </p>
    {/if}
    <p class="updated muted">
      {#if res.loading}Actualizando…{:else if res.updatedAt}Actualizado {fmtRelative(res.updatedAt, now)}{/if}
    </p>
  </div>

  {#each data.categories as cat (cat.id)}
    <section class="cat">
      <header>
        <h2>{cat.name}</h2>
        <span class="w">
          {#if cat.earned != null}<b>{cat.earned}</b>{:else}<b>–</b>{/if}
          {#if cat.weight != null} de {cat.weight}{/if}
        </span>
        {#if cat.weight}
          <span class="bar" aria-hidden="true"><span style="width:{Math.min(100, ((cat.earned ?? 0) / cat.weight) * 100)}%"></span></span>
        {/if}
      </header>
      {#if cat.assignments.length}
        <ul class="panel list">
          {#each cat.assignments as a (a.id)}
            <AssignmentRow {a} {course} {index} status={statusOf(a, now)} />
          {/each}
        </ul>
      {:else}
        <p class="muted empty">Sin asignaciones publicadas en este rubro.</p>
      {/if}
    </section>
  {/each}
{/if}

<style>
  .summary { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; margin-bottom: 32px; }
  .summary p { margin: 0; font-size: var(--fs-m); }
  .summary .updated { font-size: var(--fs-s); }
  .cat { margin-bottom: 40px; }
  .cat header { display: grid; grid-template-columns: 1fr auto; align-items: baseline; gap: 6px 12px; margin-bottom: 12px; }
  h2 { font-size: var(--fs-l); }
  .w { color: var(--muted); font-size: var(--fs-s); }
  .w b { color: var(--text); font-size: var(--fs-m); }
  .bar { grid-column: 1 / -1; height: 3px; background: var(--line); border-radius: 2px; overflow: hidden; }
  .bar span { display: block; height: 100%; background: var(--c); }
  .list { list-style: none; margin: 0; padding: 0; }
  .empty { font-size: var(--fs-s); margin: 0; }
</style>
