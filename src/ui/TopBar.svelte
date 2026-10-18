<script lang="ts">
  import { router, openClassic, openClassicForCurrent, href } from '../lib/router.svelte';
  import { refreshAll } from '../lib/data/resource.svelte';
  import { courseVars } from '../lib/colors';
  import { courses } from './state.svelte';
  import Icon from './Icon.svelte';
  import Menu from './Menu.svelte';

  let { onsearch }: { onsearch: () => void } = $props();

  let refreshing = $state(false);
  async function refresh() {
    refreshing = true;
    await refreshAll();
    refreshing = false;
  }

  let theme = $state<'auto' | 'light' | 'dark'>(
    (() => { try { return (localStorage.getItem('tecvegetal:theme') as any) || 'auto'; } catch { return 'auto'; } })(),
  );
  $effect(() => {
    const el = document.documentElement;
    if (theme === 'auto') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', theme);
    try { localStorage.setItem('tecvegetal:theme', theme); } catch { /* nada */ }
  });
  const nextTheme = { auto: 'dark', dark: 'light', light: 'auto' } as const;
  const themeLabel = { auto: 'Tema: según el sistema', dark: 'Tema: oscuro', light: 'Tema: claro' } as const;

  const data = $derived(courses.data);
  const portal = $derived(data?.portal);
  const personal = $derived((portal?.menu ?? []).filter((l) => /calendar|file-storage/.test(l.href)));
  const account = $derived((portal?.menu ?? []).filter((l) => !/calendar|file-storage/.test(l.href)));
  const external = (u: string) => { try { return new URL(u).origin !== location.origin || /\.pdf($|\?)/i.test(u); } catch { return false; } };
  const activeId = $derived(router.route.name === 'course' ? router.route.courseId : null);
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
</script>

<header>
  <div class="wrap bar">
    <a class="mark" href={href.home()} aria-label="TEC Vegetal, ir al inicio">tec<span>Vegetal</span></a>

    <nav class="courses" aria-label="Cursos del semestre">
      {#each data?.current ?? [] as c, i (c.id)}
        <a class="chip c" style={courseVars(i)} href={href.course(c)} title={c.name} aria-current={activeId === c.id ? 'page' : undefined}>
          <i aria-hidden="true"></i>{c.code}
        </a>
      {/each}
    </nav>

    <div class="tools">
      <button class="search" onclick={onsearch} title="Buscar cursos, tareas o archivos">
        <Icon name="search" /><span class="lbl">Buscar</span><kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>

      <button class="icon" onclick={refresh} disabled={refreshing} title="Actualizar datos de TEC Digital">
        <span class:spin={refreshing}><Icon name="refresh" /></span><span class="sr-only">Actualizar</span>
      </button>

      <button class="icon" onclick={() => (theme = nextTheme[theme])} title={themeLabel[theme]}>
        <Icon name="theme" /><span class="sr-only">{themeLabel[theme]}</span>
      </button>

      <Menu label="Más: comunidades, cátedras y semestres anteriores" width={320}>
        {#snippet trigger()}<span class="lbl">Más</span><Icon name="chevron" size={14} />{/snippet}
        {#snippet children(close)}
          {#each personal as l (l.href)}
            <a href={l.href} onclick={close}><Icon name={/calendar/.test(l.href) ? 'calendar' : 'folder'} />{l.text}</a>
          {/each}
          {#if portal?.communities.length}
            <hr />
            <p class="group">Comunidades y cátedras</p>
            {#each portal.communities as m (m.href)}
              <a href={m.href} onclick={close} style="padding-left:{10 + Math.max(0, m.depth - 1) * 14}px">{m.name}</a>
            {/each}
          {/if}
          {#if data?.past.length}
            <hr />
            <p class="group">Semestres anteriores</p>
            {#each data.past as g (g.label)}
              <p class="sub">{g.label}</p>
              {#each g.courses as c (c.id)}
                <a href={href.course(c)} onclick={close}><span class="pc">{c.code}</span>{c.name}</a>
              {/each}
            {/each}
          {/if}
        {/snippet}
      </Menu>

      {#if portal?.apps.length}
        <Menu label="Aplicaciones de TEC Digital" width={300}>
          {#snippet trigger()}<Icon name="apps" />{/snippet}
          {#snippet children(close)}
            <div class="apps">
              {#each portal.apps as app (app.href)}
                <a href={app.href} target="_blank" rel="noopener" onclick={close}>
                  {#if app.icon}<img src={app.icon} alt="" width="28" height="28" />{/if}
                  <span>{app.name}</span>
                </a>
              {/each}
            </div>
          {/snippet}
        </Menu>
      {/if}

      <button class="classic" onclick={openClassicForCurrent} title="Abrir esta misma página en el TEC Digital original">
        <span class="lbl">Página original</span><Icon name="external" size={14} />
      </button>

      <Menu label="Tu cuenta" width={270}>
        {#snippet trigger()}<Icon name="user" />{/snippet}
        {#snippet children(close)}
          {#if portal?.user}
            <div class="who"><b>{portal.user.name}</b><span>{portal.user.email}</span></div>
            <hr />
          {/if}
          {#each account as l (l.href)}
            <a href={l.href} target={external(l.href) ? '_blank' : undefined} rel={external(l.href) ? 'noopener' : undefined} onclick={close}>
              {l.text}{#if external(l.href)}<span class="hint"><Icon name="external" size={14} /></span>{/if}
            </a>
          {/each}
          <button class="item" onclick={() => { close(); openClassic('/dotlrn/index?classic'); }}>Notificaciones y SMS</button>
          <hr />
          <a href={portal?.logout ?? '/register/logout'} data-classic>Salir</a>
        {/snippet}
      </Menu>
    </div>
  </div>
</header>

<style>
  header { position: sticky; top: 0; z-index: 20; height: 58px; background: color-mix(in srgb, var(--bg) 92%, transparent); border-bottom: 1px solid var(--line); }
  .bar { height: 100%; display: flex; align-items: center; gap: 22px; }
  .mark { font-weight: 800; font-size: 21px; letter-spacing: -0.02em; flex: none; }
  .mark:hover { text-decoration: none; }
  .mark span { color: var(--ok); }
  .courses { display: flex; gap: 4px; flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: none; }
  .chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px; font-size: var(--fs-s); font-weight: 700; color: var(--muted); white-space: nowrap; }
  .chip i { width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
  .chip:hover { color: var(--text); background: var(--raise); text-decoration: none; }
  .chip[aria-current='page'] { color: var(--text); background: var(--raise); }
  .tools { display: flex; align-items: center; gap: 2px; }
  .search { display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 8px 0 10px; margin-right: 6px; border: 1px solid var(--line); border-radius: var(--r); background: var(--surface); color: var(--muted); cursor: pointer; font-size: var(--fs-s); }
  .search:hover { border-color: var(--line-strong); color: var(--text); }
  kbd { font: inherit; font-size: 11px; padding: 1px 6px; border-radius: 3px; border: 1px solid var(--line); color: var(--faint); }
  .icon { display: inline-flex; align-items: center; height: 32px; padding: 0 8px; border: 0; border-radius: var(--r); background: transparent; color: var(--muted); cursor: pointer; }
  .icon:hover { color: var(--text); background: var(--raise); }
  .icon:disabled { cursor: default; }
  .lbl { font-size: var(--fs-s); font-weight: 600; }
  .classic { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px; margin: 0 4px; border: 1px solid var(--line); border-radius: var(--r); background: transparent; color: var(--muted); cursor: pointer; }
  .classic:hover { color: var(--text); border-color: var(--line-strong); }
  .spin { display: inline-flex; animation: spin 0.9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .group { margin: 4px 10px 2px; font-size: var(--fs-xs); font-weight: 700; color: var(--faint); }
  .sub { margin: 8px 10px 0; font-size: var(--fs-xs); color: var(--faint); }
  .pc { color: var(--faint); font-weight: 600; flex: none; }
  .apps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
  .apps a { flex-direction: column; text-align: center; gap: 6px; padding: 10px 4px; font-size: var(--fs-xs); line-height: 1.25; }
  .who { display: grid; padding: 6px 10px; font-size: var(--fs-s); }
  .who span { color: var(--muted); font-size: var(--fs-xs); overflow-wrap: anywhere; }
  @media (max-width: 760px) {
    .bar { gap: 12px; }
    .search .lbl, kbd, .tools :global(.trigger .lbl) { display: none; }
  }
</style>
