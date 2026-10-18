<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { router } from '../lib/router.svelte';
  import { session } from '../lib/data/resource.svelte';
  import { evalsRes, rootFolderRes } from '../lib/data/api';
  import { courses, findCourse } from './state.svelte';
  import TopBar from './TopBar.svelte';
  import Home from './Home.svelte';
  import CoursePage from './CoursePage.svelte';
  import Palette from './Palette.svelte';

  let paletteOpen = $state(false);

  onMount(() => {
    courses.load({ priority: true });
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        paletteOpen = !paletteOpen;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // El inicio muestra nota y pendientes de cada curso: apenas se conocen los cursos se piden sus evaluaciones (y la carpeta raíz
  // de Documentos, con menos prioridad, para que abrirla sea instantáneo).
  // Solo cambia cuando cambia la lista de cursos (no con cada dato que llega),
  // así el efecto no se re-dispara en cada actualización.
  const courseKey = $derived((courses.data?.current ?? []).map((c) => c.id).join('|'));
  $effect(() => {
    courseKey;
    untrack(() => {
      const current = courses.data?.current ?? [];
      for (const c of current) evalsRes(c).load();
      for (const c of current) rootFolderRes(c).load();
    });
  });

  const route = $derived(router.route);
  const loginUrl = $derived(`/register/?return_url=${encodeURIComponent(location.pathname + location.search)}`);

  $effect(() => {
    if (route.name === 'home') document.title = 'Inicio – TEC Vegetal';
    else {
      const ref = findCourse(route.courseId, route.base);
      const tab = { resumen: '', evals: 'Evaluaciones ', docs: 'Documentos ' }[route.tab];
      document.title = `${tab}${ref?.course.code ?? ''} – TEC Vegetal`;
    }
  });
</script>

<TopBar onsearch={() => (paletteOpen = true)} />

<main>
    {#if session.down && !session.expired}
      <div class="wrap">
        <div class="expired" role="status">
          <span>TEC Digital no está respondiendo ahora mismo. Ves la última copia guardada; TEC Vegetal reintenta solo al recargar o con el botón de actualizar.</span>
        </div>
      </div>
    {/if}
    {#if session.expired}
      <div class="wrap">
        <div class="expired" role="alert">
          <span>Tu sesión de TEC Digital expiró. Ves la última copia guardada; iniciá sesión para actualizar.</span>
          <a class="btn primary" href={loginUrl} data-classic>Iniciar sesión</a>
        </div>
      </div>
    {/if}
    {#if route.name === 'home'}
      <Home />
    {:else}
      {#key route.courseId}
        <CoursePage {route} />
      {/key}
    {/if}
</main>

{#if paletteOpen}
  <Palette onclose={() => (paletteOpen = false)} />
{/if}

<style>
  main { padding-bottom: 96px; }
  .expired { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 24px; padding: 10px 14px; border: 1px solid var(--u-now); border-radius: var(--r); background: color-mix(in srgb, var(--u-now) 12%, var(--surface)); font-size: var(--fs-s); }
</style>
