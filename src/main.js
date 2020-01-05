import App from './App.svelte';

const app = new App({
  target: document.body,
  props: {
    currentWeek: new Date('01/06/2020, 18:00'),
    nextWeek: new Date('01/13/2020, 18:00'),
  },
});

export default app;
