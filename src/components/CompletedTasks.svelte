<script>
  import { fade } from 'svelte/transition';

  export let items;
  export let completedPercentage;
</script>

<p class="text-light-gray-us font-light text-sm mb-2">
  Tareas completadas: {items.filter(item => item).length} de {items.length}
  {#if Math.round(completedPercentage) === 100}
    <span transition:fade>✨</span>
  {/if}
</p>
