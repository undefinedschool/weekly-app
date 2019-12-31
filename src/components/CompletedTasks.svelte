<script>
  export let items;

  $: numberOfCompletedTasks = items.filter(item => item).length;
</script>

<div>
  <p class="text-gray-600 font-light text-xs mb-1">
    <span class="font-semibold">{numberOfCompletedTasks}</span>
    <span class="opacity-75">/</span>
    {items.length} tareas completadas
  </p>
</div>
