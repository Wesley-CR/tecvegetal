// Un solo reloj para toda la UI ("en 51 min" se actualiza solo).
export const clock = $state({ now: Date.now() });

let started = false;
export function startClock(): void {
  if (started) return;
  started = true;
  setInterval(() => (clock.now = Date.now()), 30_000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) clock.now = Date.now();
  });
}
