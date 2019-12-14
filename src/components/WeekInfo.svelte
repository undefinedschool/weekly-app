<script>
  export let nextWeek;
  export let completedPercentage;

  function getDaysRemainingToNextWeek(today, nextWeek) {
    const diffTime = Math.abs(today - nextWeek);
    const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return remainingDays;
  }

  const today = new Date().setHours(18);
  const aDay = 1000 * 60 * 60 * 24;
  let daysRemaining = getDaysRemainingToNextWeek(today, nextWeek);

  setInterval(() => {
    daysRemaining = getDaysRemainingToNextWeek(today, nextWeek);
    console.log(daysRemaining);
  }, aDay);
</script>

<div class="mb-4">
  <p class="text-gray-700 font-semibold text-xl -mb-1">
    <!-- <button class="blink-5 text-lg opacity-75">❮</button> -->
    Próxima clase
  </p>
  <p class="font-light text-sm text-light-gray-us">
    {#if daysRemaining > 0 && Math.round(completedPercentage) === 100}
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
      <p>
        Ya estamos en la
        <span class="font-medium">clase siguiente.</span>
      </p>
    {/if}
  </p>
</div>
