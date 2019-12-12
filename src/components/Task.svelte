<!-- <script>
  import items from '../App.svelte';
  import { handleClick } from '..App.svelte';
  import TaskLink from './TaskLink.svelte';

  export let id;
  export let pre;
  export let name;
  export let src;
</script><div class="task">
  <label class="{items[{ id }] ? 'line-through' : ''} inline-flex items-center">
    <input
      type="checkbox"
      class="form-checkbox text-cyan-us transition-all-4"
      on:click="{() => handleClick({ id })}"
      checked="{items[{ id }] ? true : false}" />
    <span class="{items[{ id }] ? 'opacity-50' : ''} ml-2">
      <span class="font-light">{pre}</span>
      <TaskLink {name} {src} />
    </span>
  </label>
</div> -->
