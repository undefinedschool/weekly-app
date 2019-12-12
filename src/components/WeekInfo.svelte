<script>
  export let week;
  export let weekNumber;
</script>

<div class="mb-4">
  <span class="text-gray-700 font-semibold text-xl">Semana {weekNumber}</span>
  <p class="text-light-gray-us font-light">
    ({week} de {new Date().getFullYear()})
  </p>
</div>
