<script lang="ts">
  import type { Snippet } from 'svelte';

  // Menú desplegable: se posiciona fixed bajo su botón para no quedar recortado,
  // cierra con Escape, click afuera o al elegir algo.
  let { label, trigger, children, align = 'end', width = 260 }: {
    label: string; trigger: Snippet; children: Snippet<[() => void]>; align?: 'start' | 'end'; width?: number;
  } = $props();

  let open = $state(false);
  let btn: HTMLButtonElement;
  let panel = $state<HTMLDivElement>();
  let pos = $state({ top: 0, left: 0 });

  function place() {
    const r = btn.getBoundingClientRect();
    const left = align === 'end' ? r.right - width : r.left;
    pos = { top: r.bottom + 6, left: Math.max(8, Math.min(left, window.innerWidth - width - 8)) };
  }
  function toggle() {
    if (!open) place();
    open = !open;
  }
  const close = () => { open = false; };

  $effect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!panel?.contains(e.target as Node) && !btn.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { close(); btn.focus(); } };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    panel?.querySelector<HTMLElement>('a, button')?.focus();
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
    };
  });
</script>

<button bind:this={btn} class="trigger" class:open aria-haspopup="true" aria-expanded={open} aria-label={label} title={label} onclick={toggle}>
  {@render trigger()}
</button>
{#if open}
  <div bind:this={panel} class="menu" style="top:{pos.top}px;left:{pos.left}px;width:{width}px" role="menu">
    {@render children(close)}
  </div>
{/if}

<style>
  .trigger { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 8px; border: 0; border-radius: var(--r); background: transparent; color: var(--muted); cursor: pointer; }
  .trigger:hover, .trigger.open { color: var(--text); background: var(--raise); }
  .menu { position: fixed; z-index: 30; background: var(--surface); border: 1px solid var(--line-strong); border-radius: 6px; box-shadow: 0 10px 30px rgb(0 0 0 / 0.28); padding: 6px; max-height: 70vh; overflow-y: auto; }
  .menu :global(a), .menu :global(button.item) { display: flex; align-items: center; gap: 10px; width: 100%; padding: 7px 10px; border: 0; border-radius: 3px; background: none; color: var(--text); font-size: var(--fs-s); text-align: left; cursor: pointer; text-decoration: none; }
  .menu :global(a:hover), .menu :global(button.item:hover), .menu :global(a:focus-visible), .menu :global(button.item:focus-visible) { background: var(--raise); outline: none; }
  .menu :global(hr) { border: 0; border-top: 1px solid var(--line); margin: 6px 0; }
  .menu :global(.hint) { margin-left: auto; color: var(--faint); display: inline-flex; }
</style>
