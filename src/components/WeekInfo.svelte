<script>
  export let dueDate;
  export let completedPercentage;
  export let isCurrentWeek = false;

  function getDaysRemainingToNextWeek(today, dueDate) {
    const diffTime = dueDate - today;
    const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return remainingDays;
  }

  const today = new Date().setHours(18);
  let daysRemaining = getDaysRemainingToNextWeek(today, dueDate);

  setInterval(() => {
    daysRemaining = getDaysRemainingToNextWeek(today, dueDate);
  }, 1000 * 60);

  $: weekTitle = isCurrentWeek ? 'Esta' : 'Próxima';
</script>

<div>
  <p
    class="text-gray-700 font-semibold text-lg mb-6 -ml-3 -mr-3 -mt-3 py-4 px-3 bg-gray-50 rounded-t border-b-gray-200">
    <!-- <button class="blink-5 text-lg opacity-75">❮</button> -->
    {weekTitle} semana
  </p>
  <p class="font-light text-sm text-gray-600">
    {#if Math.round(completedPercentage) === 100 && daysRemaining > 0}
      <p>
        <span class="font-medium">¡Excelente!</span>
        Estás al día 💪
      </p>
    {:else if daysRemaining > 1}
      <p>
        Te quedan
        <span class="font-medium">{daysRemaining}</span>
        días para completar estas tareas
      </p>
    {:else if daysRemaining === 1}
      <p class="text-red-500">
        Te queda
        <span class="font-medium">{daysRemaining}</span>
        día para completar estas tareas
      </p>
    {:else}
      <p class="text-teal-600">
        Ya estamos en la
        <span class="font-medium">clase siguiente.</span>
      </p>
    {/if}
  </p>
</div>
