<script>
  import ExpressTag from './Tags/ExpressTag.svelte';
  import MiscTag from './Tags/MiscTag.svelte';
  import CSSTag from './Tags/CSSTag.svelte';
  import TaskLink from './TaskLink.svelte';
  import WeekInfo from './WeekInfo.svelte';
  import ProgressBar from './ProgressBar.svelte';
  import CompletedTasks from './CompletedTasks.svelte';
  import Task from './Task.svelte';

  export let currentWeek;

  const LS_CURRENT_WEEK_KEY = 'currentWeekProgress';
  const LS_CURRENT_COMPLETED_KEY = 'currentCompleted';
  const currentWeekProgress = JSON.parse(localStorage.getItem(LS_CURRENT_WEEK_KEY)) || new Array(3).fill(0);
  const taskPercentage = parseFloat((100 / currentWeekProgress.length).toFixed(2));
  let currentCompletedPercentage = JSON.parse(localStorage.getItem(LS_CURRENT_COMPLETED_KEY)) || 0;

  function handleClick(index) {
    updateItems(index);
    currentWeekProgress[index] ? addCompletedPercentage() : substractCompletedPercentage();
  }

  function updateItems(index) {
    const currentValue = currentWeekProgress[index];
    currentWeekProgress[index] = 1 - currentValue;
    localStorage.setItem(LS_CURRENT_WEEK_KEY, JSON.stringify(currentWeekProgress));
  }

  function addCompletedPercentage() {
    currentCompletedPercentage += taskPercentage;
    localStorage.setItem(LS_CURRENT_COMPLETED_KEY, JSON.stringify(currentCompletedPercentage));
  }

  function substractCompletedPercentage() {
    currentCompletedPercentage -= taskPercentage;
    localStorage.setItem(LS_CURRENT_COMPLETED_KEY, JSON.stringify(currentCompletedPercentage));
  }
</script>

<section>
  <WeekInfo dueDate="{currentWeek}" completedPercentage="{currentCompletedPercentage}" isCurrentWeek="{true}" />

  <ProgressBar completedPercentage="{currentCompletedPercentage}" />

  <CompletedTasks items="{currentWeekProgress}" />

  <div class="max-h-64 overflow-auto">

    <div class="border-1 rounded p-3 shadow mb-1 bg-white">
      <div class="flex justify-end mb-2">
        <MiscTag />
      </div>

      <div class="sm:leading-snug leading-tight">
        <div class="task sm:mb-4 mb-3">
          <Task
            isChecked="{currentWeekProgress[0]}"
            handleClick="{() => handleClick(0)}"
            taskName="{'101 Tips For Being A Great Programmer (& Human) 👫'}"
            taskSrc="{'https://dev.to/emmawedekind/101-tips-for-being-a-great-programmer-human-36nl'}" />
        </div>

        <div class="task sm:mb-4 mb-3">
          <Task
            isChecked="{currentWeekProgress[1]}"
            handleClick="{() => handleClick(1)}"
            taskPre="{'Ver'}"
            taskName="{'LinkedIn Profile Top Tips 🏃'}"
            taskSrc="{'https://dev.to/exampro/700-web-developers-asked-me-to-give-them-linkedin-profile-feedback-and-these-are-my-5-top-tips-5382'}" />
        </div>

        <div class="task mb-1">
          <Task
            isChecked="{currentWeekProgress[2]}"
            handleClick="{() => handleClick(2)}"
            taskPre="{'Llegar al'}"
            taskName="{'2020 ⭐️'}"
            taskSrc="{''}" />
        </div>
      </div>
    </div>
  </div>
</section>
