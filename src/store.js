import { writable } from 'svelte/store';

// local storage progress keys
export const LS_CURRENT_WEEK_KEY = writable('currentWeekProgress');
export const LS_NEXT_WEEK_KEY = writable('nextWeekProgress');
// local storage completition keys
export const LS_CURRENT_COMPLETED_KEY = writable('currentCompleted');
export const LS_NEXT_COMPLETED_KEY = writable('nextCompleted');
// local storage progress tracking
export const currentWeekProgress = writable(
  JSON.parse(localStorage.getItem(LS_CURRENT_WEEK_KEY)) || new Array(6).fill(0)
);
export const nextWeekProgress = writable(JSON.parse(localStorage.getItem(LS_NEXT_WEEK_KEY)) || new Array(6).fill(0));
// task percentage
export const currentTaskPercentage = writable(parseFloat((100 / currentWeekProgress.length).toFixed(2)));
export const nextTaskPercentage = writable(parseFloat((100 / nextWeekProgress.length).toFixed(2)));
// completed percentage
export const currentCompletedPercentage = writable(JSON.parse(localStorage.getItem(LS_CURRENT_COMPLETED_KEY)) || 0);
export const nextCompletedPercentage = writable(JSON.parse(localStorage.getItem(LS_NEXT_COMPLETED_KEY)) || 0);

// clear local storage
//const keys = [LS_ITEMS_KEY, LS_COMPLETED_KEY];

// if (new Date('12/16/2019, 16:14')) {
//   keys.forEach(key => localStorage.removeItem(key));
// }
