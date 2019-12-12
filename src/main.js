import App from './App.svelte';

const app = new App({
  target: document.body,
  props: {
    week: '16 al 23 de Diciembre',
    weekNumber: 42,
  },
});

export default app;
