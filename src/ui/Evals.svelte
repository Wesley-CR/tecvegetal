<script lang="ts">
  import { evalsRes } from '../lib/data/api';
  import { statusOf } from '../lib/parse/evals';
  import { clock } from '../lib/clock.svelte';
  import { fmtRelative } from '../lib/dates';
  import type { Course } from '../lib/types';
  import AssignmentRow from './AssignmentRow.svelte';
  import { PASS, project, evaluatedWeight, pendingItems, simulate } from '../lib/grades';

  let { course, index, past = false }: { course: Course; index: number; past?: boolean } = $props();
  const res = $derived(evalsRes(course));
  const data = $derived(res.data);
  const now = $derived(clock.now);
  const proj = $derived(data ? project(data) : null);

  // Simulador: ponés cuánto creés que te sacás en cada cosa que falta.
  // Se guarda por curso en este navegador.
  const items = $derived(data ? pendingItems(data) : []);
  const simKey = $derived(`tecvegetal:sim:${course.id}`);
  let scores = $state<Record<string, number | undefined>>({});
  $effect(() => {
    const k = simKey;
    try { scores = JSON.parse(localStorage.getItem(k) ?? '{}') ?? {}; } catch { scores = {}; }
  });
  function setScore(key: string, raw: string) {
    const v = raw.trim() === '' ? undefined : Math.max(0, Math.min(100, Number(raw.replace(',', '.'))));
    scores = { ...scores, [key]: Number.isNaN(v) ? undefined : v };
    try { localStorage.setItem(simKey, JSON.stringify(scores)); } catch { /* nada */ }
  }
  function clearScores() {
    scores = {};
    try { localStorage.removeItem(simKey); } catch { /* nada */ }
  }
  const filled = $derived(items.filter((it) => scores[it.key] != null).length);
  const sim = $derived(proj ? simulate(proj.earned, items, scores) : null);
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
</script>

{#if !data}
  <p class="muted">{res.error ? `No se pudo cargar: ${res.error}` : 'Cargando evaluaciones…'}</p>
{:else}
  <section class="calc glass" aria-labelledby="calc-title">
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
      {#if items.length && proj.outlook !== 'passed'}
        <details class="sim">
          <summary>Simular nota final<span class="muted">{filled ? ` · ${filled} de ${items.length} con nota` : ` · ${items.length} por evaluar`}</span></summary>
          <p class="hint muted">Poné cuánto creés que te sacás en cada una. Las que dejes vacías se calculan solas.</p>
          <ul class="sim-list">
            {#each items as it (it.key)}
              <li>
                <span class="sim-name">{it.name}<span class="muted">{it.rest ? 'aún sin publicar' : it.category}</span></span>
                <span class="worth muted">vale ~{fmt(Math.round(it.worth * 10) / 10)}</span>
                <label class="score">
                  <span class="sr-only">Nota en {it.name}</span>
                  <input type="number" inputmode="decimal" min="0" max="100" step="any" placeholder={sim?.kind === 'need' ? String(sim.pct) : '–'} value={scores[it.key] ?? ''} oninput={(e) => setScore(it.key, (e.currentTarget as HTMLInputElement).value)} />
                  <span aria-hidden="true">%</span>
                </label>
              </li>
            {/each}
          </ul>
          <div class="sim-result" aria-live="polite">
            <p>
              {#if sim?.kind === 'final'}Terminás con <b class="final" class:ok={sim.final >= PASS}>{fmt(sim.final)}</b>{sim.final >= PASS ? ': pasás.' : `: te faltan ${fmt(Math.round((PASS - sim.final) * 10) / 10)} para ${PASS}.`}
              {:else if sim?.kind === 'need'}{filled ? 'En las que dejaste vacías' : 'En todas'} necesitás promediar <b>{sim.pct}%</b> para llegar a {PASS}.
              {:else if sim?.kind === 'safe'}Con eso ya pasás aunque saqués 0 en las vacías (llevarías {fmt(sim.final)}).
              {:else if sim?.kind === 'short'}Con eso no alcanza: aunque saqués 100 en las vacías llegás a {fmt(sim.max)}.{/if}
            </p>
            {#if filled}<button class="link" onclick={clearScores}>Borrar</button>{/if}
          </div>
        </details>
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
  .sim { border-top: 1px solid var(--line); padding-top: 14px; }
  .sim summary { cursor: pointer; font-weight: 600; font-size: var(--fs-s); width: fit-content; }
  .sim summary .muted { font-weight: 400; }
  .sim[open] summary { margin-bottom: 10px; }
  .hint { margin: 0 0 8px; font-size: var(--fs-xs); }
  .sim-list { list-style: none; margin: 0; padding: 0; }
  .sim-list li { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 14px; padding: 7px 0; }
  .sim-list li + li { border-top: 1px solid var(--line); }
  .sim-name { display: grid; font-size: var(--fs-s); font-weight: 550; min-width: 0; }
  .sim-name .muted { font-size: var(--fs-xs); font-weight: 400; }
  .worth { font-size: var(--fs-xs); white-space: nowrap; }
  .score { display: inline-flex; align-items: center; gap: 5px; color: var(--muted); font-size: var(--fs-s); }
  .score input { width: 64px; padding: 5px 8px; border: 1px solid var(--line); border-radius: var(--r); background: var(--bg, transparent); color: var(--text); font: inherit; text-align: right; -moz-appearance: textfield; appearance: textfield; }
  .score input::-webkit-inner-spin-button, .score input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .score input::placeholder { color: var(--faint); }
  .score input:focus { outline: 2px solid var(--c); outline-offset: -1px; border-color: transparent; }
  .sim-result { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-top: 10px; padding-top: 12px; border-top: 1px solid var(--line); }
  .sim-result p { margin: 0; font-size: var(--fs-s); }
  .sim-result b { font-size: var(--fs-m); }
  .final { color: var(--u-soon); }
  .final.ok { color: var(--ok); }
  .link { background: none; border: 0; padding: 0; color: var(--muted); font-size: var(--fs-xs); cursor: pointer; }
  .link:hover { color: var(--text); text-decoration: underline; }
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
