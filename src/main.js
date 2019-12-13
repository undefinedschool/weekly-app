import App from './App.svelte';

const app = new App({
  target: document.body,
  props: {
    today: new Date('12/16/2019, 18:00'),
    nextWeek: new Date('12/23/2019, 18:00'),
    weekNumber: 42,
  },
});

export default app;
