<script>
  import ProgressBar from './components/ProgressBar.svelte';
  import Navbar from './components/Navbar.svelte';
  import Title from './components/Title.svelte';
  import FullCalendarLink from './components/FullCalendarLink.svelte';
  import WeekInfo from './components/WeekInfo.svelte';
  import CompletedTasks from './components/CompletedTasks.svelte';
  import TaskLink from './components/TaskLink.svelte';
  import NodeTag from './components/Tags/NodeTag.svelte';
  import ExpressTag from './components/Tags/ExpressTag.svelte';

  export let week;
  export let weekNumber;

  const LOCAL_STORAGE_ITEMS_KEY = 'items';
  const LOCAL_STORAGE_COMPLETED_KEY = 'completed';
  // const tasksNumber = () => document.querySelectorAll('.task').length;
  // const tasks = new Array(tasksNumber()).fill(0);

  export let items = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY)) || [0, 0, 0, 0];
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

  export function handleClick(index) {
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

      <CompletedTasks {items} {completedPercentage} />

      <div class="sm:h-64 h-auto overflow-scroll">
        <div class="border-1 rounded p-3">
          <!-- <button on:click="{() => showOnly('node-tasks')}" style="display: flex; jus">
            <NodeTag />
          </button> -->

          <div class="flex justify-end">
            <NodeTag mr="{'mr-1'}" />
            <ExpressTag />
          </div>

          <div class="sm: leading-snug leading-tight">

            <div class="task mb-2">
              <label class="{items[0] ? 'line-through' : ''} inline-flex items-center">
                <input
                  type="checkbox"
                  class="form-checkbox text-cyan-us transition-all-4"
                  on:click="{() => handleClick(0)}"
                  checked="{items[0] ? true : false}" />
                <span class="{items[0] ? 'opacity-50' : ''} ml-2">
                  <span class="font-light">📚🏃Completar el capítulo</span>
                  <TaskLink
                    name="{'Introduction to Express.js'}"
                    src="{'https://www.rithmschool.com/courses/node-express-fundamentals/introduction-to-express'}" />
                </span>
              </label>
            </div>

            <div class="task mb-2">
              <label class="{items[1] ? 'line-through' : ''} inline-flex items-center">
                <input
                  type="checkbox"
                  class="form-checkbox text-cyan-us transition-all-4"
                  on:click="{() => handleClick(1)}"
                  checked="{items[1] ? true : false}" />
                <span class="{items[1] ? 'opacity-50' : ''} ml-2">
                  <span class="font-light">📚🏃Completar el capítulo</span>
                  <TaskLink
                    name="{'Create a Web Server'}"
                    src="{'https://github.com/thejsway/thejsway/blob/master/manuscript/chapter25.md'}" />
                </span>
              </label>
            </div>

            <div class="task mb-2">
              <label class="{items[2] ? 'line-through' : ''} inline-flex items-center">
                <input
                  type="checkbox"
                  class="form-checkbox text-cyan-us transition-all-4"
                  on:click="{() => handleClick(2)}"
                  checked="{items[2] ? true : false}" />
                <span class="{items[2] ? 'opacity-50' : ''} ml-2">
                  <span class="font-light">🏃Ver</span>
                  <TaskLink
                    name="{'How to Use __dirname in Node.js'}"
                    src="{'https://alligator.io/nodejs/how-to-use__dirname/'}" />
                </span>
              </label>
            </div>

            <div class="task">
              <label class="{items[3] ? 'line-through' : ''} inline-flex items-center">
                <input
                  type="checkbox"
                  class="form-checkbox text-cyan-us transition-all-4"
                  on:click="{() => handleClick(3)}"
                  checked="{items[3] ? true : false}" />
                <span class="{items[3] ? 'opacity-50' : ''} ml-2">
                  <span class="font-light">📚🏃Ver</span>
                  <TaskLink
                    name="{'Notas sobre ExpressJS'}"
                    src="{'https://github.com/undefinedschool/notes-expressjs/'}" />
                </span>
              </label>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</main>
