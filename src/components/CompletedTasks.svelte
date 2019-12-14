<script>
  export let items;
</script>

<div>
  <p class="text-light-gray-us font-light text-xs mb-1">
    <span class="font-medium">{items.filter(item => item).length}</span>
    de {items.length} tareas completadas
  </p>
</div>
