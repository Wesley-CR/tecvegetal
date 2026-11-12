<script lang="ts">
  import Child from './mount-child.svelte';
  let n = $state(0);
</script>
<svelte:boundary onerror={(e) => console.log('caught', e)}>
  <p>hola {n}</p>
  <Child />
</svelte:boundary>
