<!-- <script>
  import items from '../App.svelte';
  import { handleClick } from '../App.svelte';
  import TaskLink from './TaskLink.svelte';

  export let taskId;
</script><div class="task mb-2">
  <label class="{items[{ taskId }] ? 'line-through' : ''} inline-flex items-center">
    <input
      type="checkbox"
      class="form-checkbox text-cyan-us transition-all-4"
      on:click="{() => handleClick({ taskId })}"
      checked="{items[{ taskId }] ? true : false}" />
    <span class="{items[{ taskId }] ? 'opacity-50' : ''} ml-2 text-sm">
      <span class="font-light">Ver</span>
      <TaskLink name="{'How to Use __dirname in Node.js'}" src="{'https://alligator.io/nodejs/how-to-use__dirname/'}" />
      🏃
    </span>
  </label>
</div> -->
