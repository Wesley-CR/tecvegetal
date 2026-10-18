<script lang="ts">
  import { crDayKey, crStartOfDay, DAY, fmtTime } from '../lib/dates';
  import { courseVars } from '../lib/colors';
  import type { Item } from './state.svelte';

  let { items, now, days = 14 }: { items: Item[]; now: number; days?: number } = $props();

  const DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const start = $derived(crStartOfDay(now));
  const cols = $derived(
    Array.from({ length: days }, (_, i) => {
      const t = start + i * DAY + 12 * 3600_000;
      const d = new Date(t - 6 * 3600_000);
      const key = crDayKey(t);
      return {
        key,
        dow: DOW[d.getUTCDay()],
        day: d.getUTCDate(),
        weekend: d.getUTCDay() === 0 || d.getUTCDay() === 6,
        today: i === 0,
        weekStart: i > 0 && d.getUTCDay() === 1,
        items: items.filter((x) => x.a.dueAt != null && crDayKey(x.a.dueAt) === key),
      };
    }),
  );

  function jump(id: string) {
    const el = document.getElementById(`a-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (el?.querySelector('button') as HTMLButtonElement | null)?.focus({ preventScroll: true });
  }
</script>

<div class="scroll">
  <ol class="rail" aria-label="Entregas de los próximos {days} días">
    {#each cols as col (col.key)}
      <li class:today={col.today} class:weekend={col.weekend} class:week-start={col.weekStart}>
        <div class="date"><span class="dow">{col.today ? 'hoy' : col.dow}</span><span class="day">{col.day}</span></div>
        {#each col.items as it (it.a.id)}
          <button class="due c" style={courseVars(it.index)} onclick={() => jump(it.a.id)} title="{it.a.name} ({it.course.name})">
            <b>{it.course.code}</b><span>{fmtTime(it.a.dueAt!)}</span>
          </button>
        {/each}
      </li>
    {/each}
  </ol>
</div>

<style>
  .scroll { overflow-x: auto; margin: 0 -2px; padding: 0 2px; }
  .rail { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(14, minmax(66px, 1fr)); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  li { display: flex; flex-direction: column; gap: 6px; padding: 12px 6px 16px; min-height: 132px; min-width: 0; }
  li + li { border-left: 1px solid var(--line); }
  li.week-start { border-left-color: var(--line-strong); }
  .weekend { background: color-mix(in srgb, var(--side) 60%, transparent); }
  .date { display: flex; align-items: baseline; gap: 5px; padding: 0 3px 4px; }
  .dow { font-size: var(--fs-xs); color: var(--faint); }
  .day { font-size: var(--fs-l); font-weight: 700; color: var(--muted); }
  .today .day, .today .dow { color: var(--mark); }
  .due {
    display: flex; flex-wrap: wrap; align-items: baseline; column-gap: 6px; row-gap: 0;
    width: 100%; min-width: 0; padding: 5px 7px; border: 0; border-radius: 4px; cursor: pointer;
    background: color-mix(in srgb, var(--c) 20%, transparent); color: var(--text);
    font-size: 12px; line-height: 1.35; text-align: left; overflow: hidden;
  }
  .due b { font-weight: 700; }
  .due span { color: var(--muted); }
  .due:hover { background: color-mix(in srgb, var(--c) 34%, transparent); }
</style>
