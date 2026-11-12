<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { bg, bgView, history, saveBg, clearBg, useBg, removeFromHistory, loadHistory, setBgFromUrl, setBgFromFile, tintFromImage, type BlurMode } from '../lib/background.svelte';
  import { PRESETS, hexToTint, swatch, type Tint } from '../lib/tint';
  import Icon from './Icon.svelte';

  let { onclose }: { onclose: () => void } = $props();

  let link = $state('');
  let busy = $state(false);
  let error = $state<string | null>(null);
  let fileInput: HTMLInputElement;
  let sheet: HTMLDivElement;

  async function useLink(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    error = await setBgFromUrl(link);
    busy = false;
    if (!error) link = '';
  }
  async function useFile(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!f) return;
    busy = true;
    error = await setBgFromFile(f);
    busy = false;
    (e.currentTarget as HTMLInputElement).value = '';
  }
  function none() { clearBg(); error = null; }

  // Tono
  const sameTint = (a: Tint | null, b: Tint | null) => (!a && !b) || (!!a && !!b && a.h === b.h && a.c === b.c);
  const presetOn = $derived(PRESETS.findIndex((p) => sameTint(p.tint, bg.tint)));
  let tintMsg = $state<string | null>(null);
  async function fromImage() {
    tintMsg = null;
    const t = await tintFromImage();
    if (t) bg.tint = t;
    else tintMsg = 'No se pudo leer el color de esta imagen.';
  }
  function customColor(e: Event) {
    const t = hexToTint((e.currentTarget as HTMLInputElement).value);
    if (t) bg.tint = t;
  }

  const MODES: { v: BlurMode; label: string; hint: string }[] = [
    { v: 'glass', label: 'Vidrio', hint: 'La imagen nítida y los paneles esmerilados encima' },
    { v: 'image', label: 'Imagen', hint: 'Toda la imagen desenfocada' },
    { v: 'none', label: 'Ninguno', hint: 'Sin desenfoque' },
  ];

  // Cualquier cambio se guarda y se aplica al toque (vista previa en vivo).
  $effect(() => {
    JSON.stringify(bg);
    untrack(saveBg);
  });

  onMount(() => {
    void loadHistory();
    sheet.querySelector<HTMLElement>('input')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onclose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
</script>

<div class="scrim" onclick={onclose} role="presentation"></div>
<div class="sheet solid" role="dialog" aria-modal="true" aria-labelledby="bg-title" bind:this={sheet}>
  <div class="top">
    <h2 id="bg-title">Fondo y tono</h2>
    <button class="x" onclick={onclose} aria-label="Cerrar">×</button>
  </div>

  <form class="row" onsubmit={useLink}>
    <label class="lbl" for="bg-link">Link de Wallhaven o de una imagen</label>
    <div class="link">
      <input id="bg-link" type="url" placeholder="https://wallhaven.cc/w/…" bind:value={link} disabled={busy} />
      <button class="btn" type="submit" disabled={busy || !link.trim()}>{busy ? 'Cargando…' : 'Usar'}</button>
    </div>
    <p class="help">
      <a href="https://wallhaven.cc/toplist" target="_blank" rel="noopener">Buscar en Wallhaven <Icon name="external" size={12} /></a>
      · o <button type="button" class="linkbtn" onclick={() => fileInput.click()} disabled={busy}>subí una imagen</button>
      <input bind:this={fileInput} type="file" accept="image/*" hidden onchange={useFile} />
    </p>
  </form>

  {#if error || bgView.error}<p class="err" role="alert">{error ?? bgView.error}</p>{/if}

  <section class="row">
    <span class="lbl">Tus fondos</span>
    <div class="grid">
      <button class="tile none" class:on={!bg.current} onclick={none} title="Sin fondo">Sin fondo</button>
      {#each history.list as it (it.id)}
        <div class="tile-wrap">
          <button class="tile" class:on={bg.current === it.id} onclick={() => { error = null; useBg(it.id); }} title={it.url ?? 'Imagen subida'}>
            <img src={it.thumb || it.url} alt="" referrerpolicy="no-referrer" loading="lazy" />
          </button>
          <button class="del" onclick={() => removeFromHistory(it.id)} aria-label="Quitar del historial" title="Quitar del historial">×</button>
        </div>
      {/each}
    </div>
    {#if !history.list.length}<p class="help">Pegá el link de cualquier wallpaper de Wallhaven (la página basta) o subí una imagen. Los que uses quedan acá, guardados en este navegador.</p>{/if}
  </section>

  {#if bg.current}
    <fieldset class="row">
      <legend class="lbl">Tipo de desenfoque</legend>
      <div class="seg" role="radiogroup">
        {#each MODES as m (m.v)}
          <label class:on={bg.mode === m.v} title={m.hint}>
            <input type="radio" name="bg-mode" value={m.v} checked={bg.mode === m.v} onchange={() => (bg.mode = m.v)} />
            {m.label}
          </label>
        {/each}
      </div>
      <p class="help">{MODES.find((m) => m.v === bg.mode)?.hint}</p>
    </fieldset>

    <label class="row range" class:off={bg.mode === 'none'}>
      <span class="lbl">Desenfoque <b>{bg.blur}px</b></span>
      <input type="range" min="0" max="40" step="1" bind:value={bg.blur} disabled={bg.mode === 'none'} />
    </label>
    <label class="row range">
      <span class="lbl">Visibilidad de la imagen <b>{bg.opacity}%</b></span>
      <input type="range" min="5" max="100" step="1" bind:value={bg.opacity} />
    </label>
    <label class="row range">
      <span class="lbl">Opacidad de los paneles <b>{bg.panels}%</b></span>
      <input type="range" min="20" max="100" step="1" bind:value={bg.panels} />
    </label>
  {/if}

  <fieldset class="row">
    <legend class="lbl">Tono de la interfaz <b>{presetOn >= 0 ? PRESETS[presetOn].name : 'Personalizado'}</b></legend>
    <div class="tints" role="radiogroup">
      {#each PRESETS as p, i (p.name)}
        <label class="sw" class:on={presetOn === i} title={p.name} style="--sw:{swatch(p.tint)}">
          <input type="radio" name="bg-tint" checked={presetOn === i} onchange={() => (bg.tint = p.tint)} />
          <span class="sr-only">{p.name}</span>
        </label>
      {/each}
      <label class="sw custom" class:on={presetOn < 0} title="Elegir otro color" style="--sw:{presetOn < 0 ? swatch(bg.tint) : 'conic-gradient(oklch(0.6 0.12 0), oklch(0.6 0.12 120), oklch(0.6 0.12 240), oklch(0.6 0.12 360))'}">
        <input type="color" oninput={customColor} />
        <span class="sr-only">Otro color</span>
      </label>
    </div>
    {#if bg.current}
      <button class="linkbtn small" onclick={fromImage}>Sacar el tono del fondo</button>
    {/if}
    {#if tintMsg}<p class="help">{tintMsg}</p>{/if}
  </fieldset>
</div>

<style>
  .scrim { position: fixed; inset: 0; z-index: 40; background: rgb(0 0 0 / 0.15); }
  .sheet { position: fixed; z-index: 41; top: 70px; right: 16px; width: min(380px, calc(100vw - 32px)); max-height: calc(100vh - 86px); overflow-y: auto; padding: 18px 20px 20px; border: 1px solid var(--line-strong); border-radius: 8px; background: var(--surface); box-shadow: 0 20px 50px rgb(0 0 0 / 0.35); display: grid; gap: 16px; }
  .top { display: flex; align-items: center; justify-content: space-between; }
  h2 { font-size: var(--fs-l); }
  .x { border: 0; background: none; color: var(--muted); font-size: 22px; line-height: 1; cursor: pointer; padding: 2px 6px; border-radius: var(--r); }
  .x:hover { color: var(--text); background: var(--raise); }
  .row { display: grid; gap: 7px; margin: 0; padding: 0; border: 0; min-width: 0; }
  .lbl { font-size: var(--fs-s); font-weight: 650; color: var(--text); padding: 0; }
  legend.lbl { margin-bottom: 7px; }
  .lbl b { font-weight: 600; color: var(--muted); margin-left: 4px; }
  .link { display: flex; gap: 8px; }
  input[type='url'] { flex: 1; min-width: 0; padding: 8px 10px; border: 1px solid var(--line); border-radius: var(--r); background: var(--bg); color: var(--text); font: inherit; font-size: var(--fs-s); }
  .btn { padding: 7px 14px; border: 1px solid var(--line-strong); border-radius: var(--r); background: var(--raise); color: var(--text); font-size: var(--fs-s); font-weight: 600; cursor: pointer; }
  .btn:disabled { opacity: 0.5; cursor: default; }
  .help { margin: 0; font-size: var(--fs-xs); color: var(--muted); }
  .help a { display: inline-flex; align-items: center; gap: 3px; color: var(--text); }
  .linkbtn { border: 0; background: none; padding: 0; color: var(--text); font-size: inherit; cursor: pointer; }
  .linkbtn:hover { text-decoration: underline; text-underline-offset: 3px; }
  .err { margin: 0; font-size: var(--fs-s); color: var(--u-now); }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .tile-wrap { position: relative; }
  .tile { display: block; width: 100%; aspect-ratio: 16 / 10; padding: 0; border: 1px solid var(--line); border-radius: var(--r); overflow: hidden; background: var(--bg); cursor: pointer; }
  .tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .tile.none { font-size: var(--fs-xs); font-weight: 600; color: var(--muted); }
  .tile:hover { border-color: var(--line-strong); }
  .tile.on { outline: 2px solid var(--ok); outline-offset: 1px; border-color: transparent; }
  .del { position: absolute; top: 3px; right: 3px; width: 20px; height: 20px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%; background: rgb(0 0 0 / 0.6); color: #fff; font-size: 14px; line-height: 1; cursor: pointer; opacity: 0; }
  .tile-wrap:hover .del, .del:focus-visible { opacity: 1; }
  .tints { display: flex; flex-wrap: wrap; gap: 8px; }
  .sw { position: relative; width: 28px; height: 28px; border-radius: 50%; background: var(--sw); border: 2px solid var(--line); cursor: pointer; }
  .sw.on { outline: 2px solid var(--ok); outline-offset: 2px; }
  .sw:has(input:focus-visible) { outline: 2px solid var(--focus); outline-offset: 2px; }
  .sw input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; margin: 0; }
  .small { justify-self: start; font-size: var(--fs-xs); }
  .seg { display: grid; grid-template-columns: repeat(3, 1fr); padding: 3px; gap: 3px; border: 1px solid var(--line); border-radius: var(--r); background: var(--bg); }
  .seg label { position: relative; text-align: center; padding: 6px 0; border-radius: 4px; font-size: var(--fs-s); font-weight: 600; color: var(--muted); cursor: pointer; }
  .seg label.on { background: var(--raise-0); color: var(--text); box-shadow: 0 1px 2px rgb(0 0 0 / 0.25); }
  .seg label:has(input:focus-visible) { outline: 2px solid var(--focus); outline-offset: 1px; }
  .seg input { position: absolute; opacity: 0; pointer-events: none; }
  .range.off { opacity: 0.45; }
  input[type='range'] { width: 100%; margin: 0; accent-color: var(--ok); }
</style>
