import { expect, it } from 'vitest';
import { cmpVersion } from '../src/lib/update.svelte';

it('compara versiones como números', () => {
  expect(cmpVersion('1.10.0', '1.9.2')).toBe(1);
  expect(cmpVersion('v1.1.2', '1.1.2')).toBe(0);
  expect(cmpVersion('1.1.2', '1.2')).toBe(-1);
});
