<script>
  import ProgressBar from './components/ProgressBar.svelte';
  import Navbar from './components/Navbar.svelte';
  import Title from './components/Title.svelte';
  import FullCalendarLink from './components/FullCalendarLink.svelte';
  import WeekInfo from './components/WeekInfo.svelte';
  import TaskLink from './components/TaskLink.svelte';
  import NodeTag from './components/Tags/NodeTag.svelte';
  import CSSTag from './components/Tags/CSSTag.svelte';

  export let week;
  export let weekNumber;

  const LOCAL_STORAGE_ITEMS_KEY = 'items';
  const LOCAL_STORAGE_COMPLETED_KEY = 'completed';
  let items = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY)) || [0, 0, 0];

  let taskPercentage = parseFloat((100 / items.length).toFixed(2));
  let completedPercentage = JSON.parse(localStorage.getItem(LOCAL_STORAGE_COMPLETED_KEY)) || 0;

  function updateItems(index) {
    const currentValue = items[index];
    items[index] = 1 - currentValue;
    localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(items));
  }

  function addCompletedPercentage() {
    completedPercentage += taskPercentage;
    localStorage.setItem(LOCAL_STORAGE_COMPLETED_KEY, JSON.stringify(completedPercentage));
  }

  function substractCompletedPercentage() {
    completedPercentage -= taskPercentage;
    localStorage.setItem(LOCAL_STORAGE_COMPLETED_KEY, JSON.stringify(completedPercentage));
  }

  function handleClick(index) {
    updateItems(index);
    items[index] ? addCompletedPercentage() : substractCompletedPercentage();
  }

  // function showOnly(id) {
  //   const tasks = document.querySelectorAll('.task');
  //   tasks.forEach(task => {
  //     if (task.id !== id) {
  //       task.style.display = 'none';
  //     }
  //   });
  // }
</script>

<main class="flex flex-col h-screen justify-center items-center p-3 bg-black-us">

  <Navbar />

  <Title firstPart="{'Calendario'}" secondPart="{'semanal.'}" />

  <div class="shadow-md border-2 border-solid border-blue-us rounded h-auto max-w-2xl p-4 bg-white-us">

    <FullCalendarLink {completedPercentage} />

    <div>
      <WeekInfo {weekNumber} {week} />

      <ProgressBar {completedPercentage} />

      <p class="text-light-gray-us font-light text-sm mb-2">
        Tareas completadas: {items.filter(item => item).length} de {items.length}
      </p>

      <div id="node-tasks" class="task sm:h-64 h-auto overflow-scroll">
        <div class="border-1 rounded p-3">
          <!-- <button on:click="{() => showOnly('node-tasks')}" style="display: flex; jus">
            <NodeTag />
          </button> -->

          <NodeTag />

          <div class="sm: leading-snug leading-tight">
            <div class="mb-2">
              <label class="{items[0] ? 'line-through' : ''} inline-flex items-center">
                <input
                  type="checkbox"
                  class="form-checkbox text-cyan-us transition-all-4"
                  on:click="{() => handleClick(0)}"
                  checked="{items[0] ? true : false}" />
                <span class="{items[0] ? 'opacity-50' : ''} ml-2">
                  <span class="font-light">📚🏃Completar el capítulo</span>
                  <TaskLink
                    name="{'Core Node.js Modules'}"
                    src="{'https://www.rithmschool.com/courses/node-express-fundamentals/core-node-modules'}" />
                </span>
              </label>
            </div>

            <div>
              <label class="{items[1] ? 'line-through' : ''} inline-flex items-center">
                <input
                  type="checkbox"
                  class="form-checkbox text-cyan-us transition-all-4"
                  on:click="{() => handleClick(1)}"
                  checked="{items[1] ? true : false}" />
                <span class="{items[1] ? 'opacity-50' : ''} ml-2">
                  <span class="font-light">📚🏃Completar el workshop</span>
                  <TaskLink name="{'learnyounode'}" src="{'https://github.com/workshopper/learnyounode'}" />
                </span>
              </label>
            </div>
          </div>
        </div>

        <div id="css-tasks" class="task mt-1 border-1 rounded p-3">

          <!-- <button on:click="{() => showOnly('css-tasks')}" style="display: flex; jus">
            <CSSTag />
          </button> -->

          <CSSTag />

          <div class="sm: leading-snug leading-tight">
            <div class="mb-2">
              <label class="{items[2] ? 'line-through' : ''} inline-flex items-center; justify-content: end">
                <input
                  type="checkbox"
                  class="form-checkbox text-cyan-us transition-all-4"
                  on:click="{() => handleClick(2)}"
                  checked="{items[2] ? true : false}" />
                <span class="{items[2] ? 'opacity-50' : ''} ml-2">
                  <span class="font-light">📚🏃Completar el capítulo</span>
                  <TaskLink
                    name="{'Web Typography'}"
                    src="{'https://internetingishard.com/html-and-css/web-typography/'}" />
                  <span class="font-light">
                    de
                    <em class="font-normal">Interneting is Hard</em>
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</main>
