<script lang="ts">
  import { evalsRes } from '../lib/data/api';
  import { clock } from '../lib/clock.svelte';
  import { DAY, TZ, fmtWhen } from '../lib/dates';
  import { courseVars } from '../lib/colors';
  import { courses, currentItems, byDue } from './state.svelte';
  import { href } from '../lib/router.svelte';
  import AssignmentRow from './AssignmentRow.svelte';
  import DueRail from './DueRail.svelte';
  import CourseList from './CourseList.svelte';

  const now = $derived(clock.now);
  const current = $derived(courses.data?.current ?? []);
  const today = $derived(
    new Intl.DateTimeFormat('es-CR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(now),
  );

  const items = $derived(currentItems(now));
  const pending = $derived(items.filter((x) => x.status === 'pending').sort(byDue));
  const late = $derived(items.filter((x) => x.status === 'late').sort(byDue));
  const thisWeek = $derived(pending.filter((x) => x.a.dueAt! - now < 7 * DAY).length);
  const noDate = $derived(items.filter((x) => x.status === 'nodate').length);

  const groups = $derived(
    current
      .map((course, index) => ({ course, index, items: pending.filter((x) => x.course.id === course.id) }))
      .filter((g) => g.items.length)
      .sort((x, y) => byDue(x.items[0], y.items[0])),
  );

  const loading = $derived(!courses.data || current.some((c) => evalsRes(c).data === undefined));
  const errors = $derived(current.map((c) => [c, evalsRes(c).error] as const).filter(([, e]) => e));

  const summary = $derived.by(() => {
    if (!pending.length) return loading ? 'Revisando entregas…' : 'No tenés entregas pendientes con fecha.';
    const next = pending[0];
    const week = thisWeek === 0 ? 'Nada vence esta semana' : thisWeek === 1 ? '1 entrega vence esta semana' : `${thisWeek} entregas vencen esta semana`;
    return `${week}. La próxima es ${next.a.name} (${next.course.code}), ${fmtWhen(next.a.dueAt!, now)}.`;
  });
</script>

<div class="wrap">
  <header class="head">
    <h1>Hoy, {today}</h1>
    <p class="muted">{summary}</p>
  </header>

  <DueRail items={pending} {now} />

  <div class="cols">
  <section class="block" aria-labelledby="courses-title">
    <div class="block-head"><h2 id="courses-title">{courses.data?.currentLabel || 'Cursos'}</h2></div>
    <CourseList />
  </section>

  <section class="block" aria-labelledby="pend-title">
    <div class="block-head">
      <h2 id="pend-title">Pendientes</h2>
      {#if pending.length}<span class="muted count">{pending.length}</span>{/if}
    </div>

    {#each errors as [c, e] (c.id)}
      <p class="err">No se pudo actualizar {c.code}: {e}</p>
    {/each}

    {#if groups.length}
      <div class="panel">
        {#each groups as g (g.course.id)}
          <section class="group c" style={courseVars(g.index)}>
            <h3>
              <a href={href.evals(g.course)}>
                <span class="sq" aria-hidden="true"></span><b>{g.course.code}</b>{g.course.name}
              </a>
            </h3>
            <ul>
              {#each g.items as it (it.a.id)}
                <AssignmentRow a={it.a} course={it.course} index={it.index} status={it.status} category={it.category} />
              {/each}
            </ul>
          </section>
        {/each}
      </div>
    {:else if loading}
      <div class="panel skel-rows" aria-label="Cargando pendientes">
        {#each [0, 1, 2, 3, 4] as i (i)}
          <div><span class="skel" style="width:{30 + ((i * 17) % 35)}%"></span><span class="skel" style="width:90px"></span></div>
        {/each}
      </div>
    {:else}
      <p class="empty">Cuando un profe publique una asignación con fecha, aparece acá ordenada por entrega.</p>
    {/if}

    {#if late.length}
      <details class="late">
        <summary>{late.length === 1 ? '1 vencida acepta' : `${late.length} vencidas aceptan`} entrega tardía</summary>
        <div class="panel">
          <ul>
            {#each late as it (it.a.id)}
              <AssignmentRow a={it.a} course={it.course} index={it.index} status={it.status} category={it.category} showCourse />
            {/each}
          </ul>
        </div>
      </details>
    {/if}

    {#if noDate && !loading}
      <p class="foot muted">{noDate === 1 ? '1 asignación' : `${noDate} asignaciones`} con entrega digital todavía sin fecha. Están en Evaluaciones de cada curso.</p>
    {/if}
  </section>
  </div>
</div>

<style>
  .head { padding: 44px 0 26px; display: grid; gap: 8px; }
  h1 { font-size: var(--fs-xxl); font-weight: 700; }
  h1::first-letter { text-transform: uppercase; }
  .head p { margin: 0; font-size: var(--fs-l); max-width: 62ch; }
  .cols { display: grid; grid-template-columns: minmax(0, 360px) minmax(0, 1fr); gap: 40px; align-items: start; margin-top: 40px; }
  @media (max-width: 1000px) { .cols { grid-template-columns: 1fr; } }
  .block-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 14px; }
  h2 { font-size: var(--fs-xl); }
  .count { font-size: var(--fs-s); }
  .group + .group { border-top: 1px solid var(--line); margin-top: 6px; }
  .group { padding-bottom: 6px; }
  .group h3 { font-size: var(--fs-s); font-weight: 600; color: var(--muted); padding: 16px 20px 6px; }
  .group h3 a { display: inline-flex; align-items: center; gap: 8px; }
  .group h3 b { color: var(--text); font-weight: 700; }
  .sq { width: 9px; height: 9px; border-radius: 2px; background: var(--c); }
  ul { list-style: none; margin: 0; padding: 0; }
  .skel-rows > div { display: flex; justify-content: space-between; gap: 20px; padding: 18px 20px; }
  .skel-rows > div + div { border-top: 1px solid var(--line); }
  .late { margin-top: 18px; }
  .late summary { cursor: pointer; color: var(--u-soon); font-size: var(--fs-s); font-weight: 600; margin-bottom: 8px; }
  .empty { color: var(--muted); padding: 18px 0; margin: 0; max-width: 60ch; }
  .foot { font-size: var(--fs-s); margin: 14px 0 0; }
  .err { color: var(--u-now); font-size: var(--fs-s); margin: 0 0 8px; }
</style>
