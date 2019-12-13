<script>
  export let today;
  export let nextWeek;
  export let weekNumber;

  function getDaysRemainingToNextWeek(today, nextWeek) {
    const diffTime = Math.abs(today - nextWeek);
    const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return remainingDays;
  }

  const aDay = 1000 * 60 * 60 * 24;
  const daysRemaining = getDaysRemainingToNextWeek(today, nextWeek);

  setInterval(getDaysRemainingToNextWeek(today, nextWeek), aDay);
</script>

<div class="mb-4">
  <span class="block text-gray-700 font-semibold text-xl -mb-1">Semana {weekNumber}</span>
  <p class="font-light text-sm text-light-gray-us">
    {#if daysRemaining === 0}
      ⌛️ Ya estamos en la semana
      <span class="font-medium">{weekNumber + 1}.</span>
    {:else}
      ⏳
      {#if daysRemaining > 1}Faltan{:else}Sólo falta{/if}
      <span class="font-medium">{daysRemaining}</span>
      {#if daysRemaining > 1}días{:else}día{/if}
      para la próxima semana.
    {/if}

  </p>
</div>
