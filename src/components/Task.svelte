<script>
  import TaskLink from './TaskLink.svelte';

  export let isChecked;
  export let handleClick;
  export let taskPre = '';
  export let taskName;
  export let taskSrc = '#';

  $: _isChecked = isChecked ? true : false;
  $: grayedOut = isChecked ? 'opacity-50' : '';
</script>

<div>
  <label class="{isChecked ? 'line-through text-gray-us' : ''} inline-flex items-center">
    <input
      type="checkbox"
      class="form-checkbox text-cyan-us transition-all-4"
      on:click="{handleClick}"
      checked="{_isChecked}" />
    <span class="{grayedOut} ml-2 text-sm text-gray-us">
      <span class="font-light">{taskPre}</span>
      <TaskLink name="{taskName}" src="{taskSrc}" />
    </span>
  </label>
</div>
