<script>
  import ExpressTag from './Tags/ExpressTag.svelte';
  import MiscTag from './Tags/MiscTag.svelte';
  import CSSTag from './Tags/CSSTag.svelte';
  import TaskLink from './TaskLink.svelte';
  import WeekInfo from './WeekInfo.svelte';
  import ProgressBar from './ProgressBar.svelte';
  import CompletedTasks from './CompletedTasks.svelte';
  import Task from './Task.svelte';

  export let nextWeek;

  const LS_NEXT_WEEK_KEY = 'nextWeekProgress';
  const LS_NEXT_COMPLETED_KEY = 'nextCompleted';
  const nextWeekProgress = JSON.parse(localStorage.getItem(LS_NEXT_WEEK_KEY)) || new Array(2).fill(0);
  const taskPercentage = parseFloat((100 / nextWeekProgress.length).toFixed(2));
  let nextCompletedPercentage = JSON.parse(localStorage.getItem(LS_NEXT_COMPLETED_KEY)) || 0;

  function handleClick(index) {
    updateItems(index);
    nextWeekProgress[index] ? addCompletedPercentage() : substractCompletedPercentage();
  }

  function updateItems(index) {
    const currentValue = nextWeekProgress[index];
    nextWeekProgress[index] = 1 - currentValue;
    localStorage.setItem(LS_NEXT_WEEK_KEY, JSON.stringify(nextWeekProgress));
  }

  function addCompletedPercentage() {
    nextCompletedPercentage += taskPercentage;
    localStorage.setItem(LS_NEXT_COMPLETED_KEY, JSON.stringify(nextCompletedPercentage));
  }

  function substractCompletedPercentage() {
    nextCompletedPercentage -= taskPercentage;
    localStorage.setItem(LS_NEXT_COMPLETED_KEY, JSON.stringify(nextCompletedPercentage));
  }
</script>

<section>
  <WeekInfo dueDate="{nextWeek}" completedPercentage="{nextCompletedPercentage}" />

  <ProgressBar completedPercentage="{nextCompletedPercentage}" />

  <CompletedTasks items="{nextWeekProgress}" />

  <div class="max-h-64 overflow-auto">

    <div class="border-1 rounded p-3 shadow mb-1 bg-white">
      <div class="flex justify-end mb-2">
        <MiscTag />
      </div>

      <div class="sm:leading-snug leading-tight">
        <div class="task sm:mb-4 mb-3">
          <Task
            isChecked="{nextWeekProgress[0]}"
            handleClick="{() => handleClick(0)}"
            taskPre="{'Ver'}"
            taskName="{'Notas de Express 🏃'}"
            taskSrc="{'https://github.com/undefinedschool/notes-expressjs/'}" />
        </div>

        <div class="task sm:mb-4 mb-3">
          <Task
            isChecked="{nextWeekProgress[1]}"
            handleClick="{() => handleClick(1)}"
            taskPre="{'Completar el'}"
            taskName="{'Express JS Crash Course 🏃'}"
            taskSrc="{'https://www.youtube.com/watch?v=L72fhGm1tfE'}" />
        </div>
      </div>
    </div>
  </div>
</section>
