<script>
  export let items;
</script>

<p class="text-light-gray-us font-light text-sm mb-2">
  Tareas completadas: {items.filter(item => item).length} de {items.length}
</p>
