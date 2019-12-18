<script>
  export let nextWeek;
  export let completedPercentage;
  export let isCurrentWeek;

  function getDaysRemainingToNextWeek(today, nextWeek) {
    const diffTime = Math.abs(today - nextWeek);
    const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return remainingDays;
  }

  const today = new Date().setHours(18);
  let daysRemaining = getDaysRemainingToNextWeek(today, nextWeek);

  setInterval(() => {
    daysRemaining = getDaysRemainingToNextWeek(today, nextWeek);
  }, 1000 * 60);
</script>

<style>
  .border-b-gray-200 {
    border-bottom: 1px solid #edf2f7;
  }

  .bg-gray-50 {
    background-color: #edf2f780;
  }
</style>

<div>
  <p class="text-gray-700 font-semibold text-xl mb-6 -ml-3 -mr-3 -mt-3 py-4 px-3 bg-gray-50 border-b-gray-200">
    <!-- <button class="blink-5 text-lg opacity-75">❮</button> -->
    {isCurrentWeek ? 'Esta' : 'Próxima'} semana
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
