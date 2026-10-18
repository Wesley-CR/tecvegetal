import { boot } from '../lib/boot';

export default defineContentScript({
  matches: ['https://tecdigital.tec.ac.cr/*'],
  runAt: 'document_start',
  main() {
    boot();
  },
});
