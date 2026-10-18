<script lang="ts">
  import { fmtFull, fmtRelative, fmtWhen, urgency } from '../lib/dates';
  import { STATUS_LABEL, type Status } from '../lib/parse/evals';
  import { openClassic } from '../lib/router.svelte';
  import { evalsUrl } from '../lib/data/api';
  import { courseVars } from '../lib/colors';
  import { clock } from '../lib/clock.svelte';
  import type { Assignment, Course } from '../lib/types';

  let {
    a, course, index, status, category = '', showCourse = false,
  }: { a: Assignment; course: Course; index: number; status: Status; category?: string; showCourse?: boolean } = $props();

  let open = $state(false);
  const now = $derived(clock.now);
  const live = $derived(status === 'pending' || status === 'late');
  const u = $derived(live ? urgency(a.dueAt, now) : 'none');
  const gradeText = $derived(a.grade != null ? `${a.grade}${a.outOf ? ` / ${a.outOf}` : ''}` : '');
</script>

<li class="row c" class:open id={`a-${a.id}`} style={courseVars(index)} data-u={u} data-status={status}>
  <button class="head" onclick={() => (open = !open)} aria-expanded={open}>
    <span class="name">
      {#if showCourse}<span class="code">{course.code}</span>{/if}{a.name}
    </span>
    <span class="due">
      {#if a.dueAt}
        <span class="when">{fmtWhen(a.dueAt, now)}</span>
        {#if live}<span class="rel">{fmtRelative(a.dueAt, now)}</span>{/if}
      {:else}
        <span class="when muted">Sin fecha</span>
      {/if}
    </span>
    {#if status !== 'pending'}
      <span class="state">
        {#if gradeText}<b>{gradeText}</b>{:else}{STATUS_LABEL[status]}{/if}
      </span>
    {/if}
  </button>

  {#if open}
    <div class="body">
      <dl>
        {#if category}<div><dt>Rubro</dt><dd>{category}</dd></div>{/if}
        {#if a.dueAt}<div><dt>Entrega</dt><dd>{fmtFull(a.dueAt)}</dd></div>{/if}
        <div><dt>Tardías</dt><dd>{a.lateAllowed ? 'Se aceptan' : 'No se aceptan'}</dd></div>
        {#if a.groupSize && a.groupSize !== '1'}<div><dt>Grupo</dt><dd>{a.groupSize} personas</dd></div>{/if}
        {#if a.weighted != null}<div><dt>Ponderado</dt><dd>{a.weighted}</dd></div>{/if}
      </dl>
      {#if a.description}<p class="desc">{a.description}</p>{/if}
      {#if a.links.length}
        <ul class="links">
          {#each a.links as l (l.href)}<li><a href={l.href} target="_blank" rel="noopener">{l.text}</a></li>{/each}
        </ul>
      {/if}
      {#if a.submitted}
        <p class="sub">Tu entrega: {#each a.submissionLinks as l (l.href)}<a href={l.href} target="_blank" rel="noopener">{l.text}</a> {:else}{a.submissionText}{/each}</p>
      {/if}
      {#if a.canSubmit}
        <button class="btn" class:primary={live} onclick={() => openClassic(evalsUrl(course))}>
          {a.submitted ? 'Ver o cambiar entrega en TEC Digital' : 'Entregar en TEC Digital'}
        </button>
      {/if}
    </div>
  {/if}
</li>

<style>
  .row { list-style: none; }
  .row { border-top: 1px solid var(--line); }
  .row:first-child { border-top: 0; }
  .head {
    width: 100%; display: flex; align-items: baseline; gap: 20px;
    padding: 12px 20px; background: none; border: 0; text-align: left; cursor: pointer;
  }
  .head:hover { background: var(--raise); }
  .open .head { background: var(--raise); }
  .name { flex: 1; min-width: 0; font-weight: 600; overflow-wrap: anywhere; }
  .code { color: var(--c); font-weight: 700; margin-right: 8px; font-size: var(--fs-s); }
  .due { display: flex; align-items: baseline; gap: 12px; white-space: nowrap; }
  .when { font-size: var(--fs-s); color: var(--muted); }
  .rel { font-size: var(--fs-s); font-weight: 700; min-width: 5.5rem; text-align: right; }
  [data-u='now'] .rel { color: var(--u-now); }
  [data-u='soon'] .rel { color: var(--u-soon); }
  [data-u='week'] .rel { color: var(--u-week); }
  [data-u='later'] .rel { color: var(--u-later); }
  .state { font-size: var(--fs-s); color: var(--muted); min-width: 7rem; text-align: right; white-space: nowrap; }
  .state b { color: var(--text); font-weight: 700; }
  [data-status='late'] .state { color: var(--u-soon); }
  [data-status='missed'] .state { color: var(--u-now); }
  [data-status='submitted'] .state { color: var(--ok); }
  .body { padding: 4px 20px 20px; display: grid; gap: 10px; max-width: 75ch; background: var(--raise); }
  dl { display: flex; flex-wrap: wrap; gap: 4px 24px; margin: 0; font-size: var(--fs-s); }
  dl div { display: flex; gap: 8px; }
  dt { color: var(--muted); }
  dd { margin: 0; }
  .desc { margin: 0; white-space: pre-line; font-size: var(--fs-s); }
  .links { margin: 0; padding-left: 18px; font-size: var(--fs-s); }
  .links a, .sub a { text-decoration: underline; text-underline-offset: 3px; }
  .sub { margin: 0; font-size: var(--fs-s); color: var(--ok); }
  .body .btn { justify-self: start; }
  @media (max-width: 720px) {
    .head { flex-wrap: wrap; row-gap: 2px; }
    .name { flex-basis: 100%; }
    .state { min-width: 0; }
  }
</style>
