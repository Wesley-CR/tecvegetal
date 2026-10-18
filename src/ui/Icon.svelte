<script lang="ts" module>
  // Un solo set de íconos dibujados a mano: trazo 1.6, 20×20, terminaciones redondas.
  const PATHS = {
    search: 'M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm4.3-1.7L17 17',
    refresh: 'M16 10a6 6 0 1 1-1.8-4.3M16 3.5V7h-3.5',
    theme: 'M10 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm0 0v13',
    apps: 'M4.5 4.5h3v3h-3zm8 0h3v3h-3zm-8 8h3v3h-3zm8 0h3v3h-3z',
    user: 'M10 10a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM4 16.5c.9-2.6 3.2-4 6-4s5.1 1.4 6 4',
    external: 'M11 4h5v5M16 4l-7 7M14 12v3.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5H8',
    chevron: 'M6 8l4 4 4-4',
    calendar: 'M4 6h12v10H4zM4 9h12M7.5 3.5v3M12.5 3.5v3',
    folder: 'M3 6a1 1 0 0 1 1-1h3.5l1.5 1.8h7a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
    doc: 'M6 3h5.5L15 6.5V17H6zM11 3v4h4',
  } as const;
  export type IconName = keyof typeof PATHS;
</script>

<script lang="ts">
  let { name, size = 16 }: { name: IconName; size?: number } = $props();
</script>

<svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <path d={PATHS[name]} />
</svg>
