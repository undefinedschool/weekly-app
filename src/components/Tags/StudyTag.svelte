<script>
  export let mr;
  export let description;
</script>

<div class="{mr ? mr : ''} -mt-1 mb-4">
  <span
    class="inline-block border-1 border-gray-300 rounded px-2 py-1 text-xs text-gray-600 bg-gray-200 font-semibold
    opacity-75">
    {description}
  </span>
</div>
