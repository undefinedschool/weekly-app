import App from './App.svelte';

const app = new App({
  target: document.body,
  props: {
    nextWeek: new Date('12/23/2019, 18:00'),
  },
});

export default app;
