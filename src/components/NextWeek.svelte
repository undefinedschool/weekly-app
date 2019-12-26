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
  const nextWeekProgress = JSON.parse(localStorage.getItem(LS_NEXT_WEEK_KEY)) || new Array(5).fill(0);
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

<div>
  <WeekInfo dueDate="{nextWeek}" completedPercentage="{nextCompletedPercentage}" />

  <ProgressBar completedPercentage="{nextCompletedPercentage}" />

  <CompletedTasks items="{nextWeekProgress}" />

  <div class="h-64 overflow-y-auto">

    <div class="border-1 rounded p-3 shadow mb-2 bg-white">
      <div class="flex justify-end mb-2">
        <ExpressTag />
      </div>

      <div class="sm:leading-snug leading-tight">
        <div class="task mb-2">
          <Task
            isChecked="{nextWeekProgress[0]}"
            handleClick="{() => handleClick(0)}"
            taskPre="{'Completar el capítulo'}"
            taskName="{'Express Router 🏃'}"
            taskSrc="{'https://www.rithmschool.com/courses/node-express-fundamentals/express-router'}" />
        </div>

        <div class="task mb-2">
          <Task
            isChecked="{nextWeekProgress[1]}"
            handleClick="{() => handleClick(1)}"
            taskPre="{'Completar el tutorial'}"
            taskName="{'ExpressJS Project Structure 🏃'}"
            taskSrc="{'https://www.brianemilius.com/expressjs-structure/'}" />
        </div>
      </div>
    </div>

    <div class="border-1 rounded p-3 shadow mb-1 bg-white">
      <div class="flex justify-end mb-2">
        <MiscTag />
      </div>

      <div class="sm:leading-snug leading-tight">
        <div class="task mb-2">
          <Task
            isChecked="{nextWeekProgress[2]}"
            handleClick="{() => handleClick(2)}"
            taskName="{'Local Node Environment Variables with DotEnv 🏃'}"
            taskSrc="{'https://www.youtube.com/watch?v=i14ekt_DAt0'}" />
        </div>

        <div class="task mb-2">
          <Task
            isChecked="{nextWeekProgress[3]}"
            handleClick="{() => handleClick(3)}"
            taskName="{'How to Improve Your Developer Resume Bullets 🏃'}"
            taskSrc="{'https://dev.to/stetsenko_me/how-to-improve-your-junior-developer-resume-bullets-34cm'}" />
        </div>
      </div>
    </div>

    <div class="border-1 rounded p-3 shadow mb-1 bg-white">
      <div class="flex justify-end mb-2">
        <CSSTag />
      </div>

      <div class="sm:leading-snug leading-tight">
        <div class="task mb-2">
          <Task
            isChecked="{nextWeekProgress[4]}"
            handleClick="{() => handleClick(4)}"
            taskName="{'Next-generation web styling (Chrome Dev Summit 2019) 📹'}"
            taskSrc="{'https://www.youtube.com/watch?v=-oyeaIirVC0'}" />
        </div>

      </div>
    </div>

  </div>
</div>
