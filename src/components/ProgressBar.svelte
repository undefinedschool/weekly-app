<script>
  export let completedPercentage;
</script>

<div
  class="bg-gray-300 mt-2 mb-8 text-2xl {Math.round(completedPercentage) === 100 ? 'font-semibold' : ''} text-center
  rounded-lg">
  <div
    style="width:{Math.round(completedPercentage)}%"
    class="transition-all-4 {completedPercentage > 67 ? 'bg-green-200' : completedPercentage > 34 ? 'bg-yellow-200' : 'bg-red-200'}
    rounded-lg p-1 {completedPercentage > 67 ? 'text-green-700' : completedPercentage > 34 ? 'text-yellow-600' : 'text-red-700'}">
    {Math.round(completedPercentage)}% {Math.round(completedPercentage) === 100 ? '🎉' : ''}
  </div>
</div>
