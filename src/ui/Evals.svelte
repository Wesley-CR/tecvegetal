<script lang="ts">
  import { evalsRes } from '../lib/data/api';
  import { statusOf } from '../lib/parse/evals';
  import { clock } from '../lib/clock.svelte';
  import { fmtRelative } from '../lib/dates';
  import type { Course } from '../lib/types';
  import AssignmentRow from './AssignmentRow.svelte';
  import { PASS, project, finalIf, evaluatedWeight } from '../lib/grades';

  let { course, index, past = false }: { course: Course; index: number; past?: boolean } = $props();
  const res = $derived(evalsRes(course));
  const data = $derived(res.data);
  const now = $derived(clock.now);
  const proj = $derived(data ? project(data) : null);
  let sim = $state<number | null>(null);
  const simPct = $derived(sim ?? Math.min(100, proj?.neededPct ?? 80));
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
</script>

{#if !data}
  <p class="muted">{res.error ? `No se pudo cargar: ${res.error}` : 'Cargando evaluaciones…'}</p>
{:else}
  <section class="calc" aria-labelledby="calc-title">
    <div class="calc-head">
      <h2 id="calc-title">Nota</h2>
      <p class="updated muted">
        {#if res.loading}Actualizando…{:else if res.updatedAt}Actualizado {fmtRelative(res.updatedAt, now)}{/if}
      </p>
    </div>
    {#if past && proj}
      <p class="verdict">Curso de un semestre anterior. Nota según TEC Digital: <b>{fmt(proj.earned)}</b>.</p>
    {:else if proj && proj.outlook !== 'unknown'}
      <div class="nums">
        <div><span class="lbl">Llevás</span><b>{fmt(proj.earned)}</b><span class="of">de {fmt(proj.evaluated)} evaluados</span></div>
        <div><span class="lbl">En juego</span><b>{fmt(proj.remaining)}</b><span class="of">puntos sin evaluar</span></div>
        <div><span class="lbl">Máximo posible</span><b>{fmt(proj.max)}</b><span class="of">si sacás 100 en todo</span></div>
      </div>
      <p class="verdict" data-outlook={proj.outlook}>
        {#if proj.outlook === 'passed'}Ya pasaste: tenés más de {PASS}.
        {:else if proj.outlook === 'possible'}Para llegar a {PASS} necesitás promediar <b>{proj.neededPct}%</b> en lo que falta ({fmt(proj.needed)} de {fmt(proj.remaining)} puntos).
        {:else if proj.outlook === 'impossible'}Con lo que queda en juego ya no alcanza para {PASS}: el máximo posible es {fmt(proj.max)}. Revisá con el profe si hay reposición.
        {:else}Ya se evaluó todo y la nota quedó en {fmt(proj.earned)}.{/if}
      </p>
      {#if proj.remaining > 0}
        <label class="sim">
          <span>Si sacás <b>{simPct}%</b> en lo que falta, terminás con <b class="final" class:ok={finalIf(proj, simPct) >= PASS}>{fmt(finalIf(proj, simPct))}</b></span>
          <input type="range" min="0" max="100" step="1" value={simPct} oninput={(e) => (sim = +(e.currentTarget as HTMLInputElement).value)} />
        </label>
      {/if}
      <p class="note muted">Estimado a partir de tus notas: TEC Digital no dice cuánto vale cada asignación, así que se deduce de los subtotales.</p>
    {:else}
      <p class="muted">Todavía no hay rubros con peso para calcular.</p>
    {/if}
  </section>

  {#each data.categories as cat (cat.id)}
    <section class="cat">
      <header>
        <h2>{cat.name}</h2>
        <span class="w">
          {#if cat.earned != null}<b>{cat.earned}</b>{:else}<b>–</b>{/if}
          {#if cat.weight != null} de {cat.weight}{/if}
          {#if cat.weight}<span class="ev">· evaluado {fmt(Math.round(evaluatedWeight(cat) * 10) / 10)}</span>{/if}
        </span>
        {#if cat.weight}
          <span class="bar" aria-hidden="true"><span style="width:{Math.min(100, ((cat.earned ?? 0) / cat.weight) * 100)}%"></span></span>
        {/if}
      </header>
      {#if cat.assignments.length}
        <ul class="panel list">
          {#each cat.assignments as a (a.id)}
            <AssignmentRow {a} {course} {index} status={statusOf(a, now, { pastCourse: past })} />
          {/each}
        </ul>
      {:else}
        <p class="muted empty">Sin asignaciones publicadas en este rubro.</p>
      {/if}
    </section>
  {/each}
{/if}

<style>
  .calc { margin-bottom: 44px; padding: 20px 22px; border: 1px solid var(--line); border-radius: var(--r); background: var(--surface); display: grid; gap: 16px; }
  .calc-head { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; }
  .calc-head p { margin: 0; font-size: var(--fs-s); }
  .nums { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
  .nums div { display: grid; gap: 2px; }
  .lbl { font-size: var(--fs-xs); color: var(--muted); }
  .nums b { font-size: var(--fs-xl); font-weight: 700; letter-spacing: -0.01em; }
  .of { font-size: var(--fs-xs); color: var(--faint); }
  .verdict { margin: 0; font-size: var(--fs-m); }
  .verdict b { font-size: var(--fs-l); }
  .verdict[data-outlook='passed'] { color: var(--ok); }
  .verdict[data-outlook='impossible'] { color: var(--u-soon); }
  .sim { display: grid; gap: 8px; font-size: var(--fs-s); color: var(--muted); }
  .sim b { color: var(--text); }
  .sim .final { color: var(--u-soon); }
  .sim .final.ok { color: var(--ok); }
  .sim input { width: 100%; max-width: 420px; accent-color: var(--c); }
  .note { margin: 0; font-size: var(--fs-xs); }
  .ev { color: var(--faint); margin-left: 4px; }
  @media (max-width: 640px) { .nums { grid-template-columns: 1fr; } }
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
