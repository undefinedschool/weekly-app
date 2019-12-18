<script>
  export let items;
</script>

<div>
  <p class="text-light-gray-us font-light text-xs mb-1">
    <span class="font-semibold">{items.filter(item => item).length}</span>
    <span class="opacity-75">/</span>
    {items.length} tareas completadas
  </p>
</div>
