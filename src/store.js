import { writable } from 'svelte/store';

export const LOCAL_STORAGE_ITEMS_KEY = writable('items');
export const LOCAL_STORAGE_COMPLETED_KEY = writable('completed');
export const keys = writable([LOCAL_STORAGE_ITEMS_KEY, LOCAL_STORAGE_COMPLETED_KEY]);

export const items = writable(JSON.parse(localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY)) || new Array(6).fill(0));
export const taskPercentage = writable(parseFloat((100 / items.length).toFixed(2)));
export const completedPercentage = writable(JSON.parse(localStorage.getItem(LOCAL_STORAGE_COMPLETED_KEY)) || 0);
