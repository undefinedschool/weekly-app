<script>
  export let completedPercentage;

  $: fullBar = Math.round(completedPercentage) === 100 ? 'font-semibold' : '';
  $: progressBackgroundColor =
    completedPercentage > 67 ? 'bg-green-200' : completedPercentage > 34 ? 'bg-yellow-200' : 'bg-red-200';
  $: progressTextColor =
    completedPercentage > 67 ? 'text-green-700' : completedPercentage > 34 ? 'text-yellow-600' : 'text-red-700';
  $: completed = Math.round(completedPercentage) === 100 ? '🎉' : '';
</script>

<div class="bg-gray-200 mt-2 mb-8 mb-0 text-xl {fullBar} text-center rounded-lg">
  <div
    style="width:{Math.round(completedPercentage)}%"
    class="transition-all-4 {progressBackgroundColor} rounded-lg p-1 {progressTextColor}">
    {Math.round(completedPercentage)}% {completed}
  </div>
</div>
