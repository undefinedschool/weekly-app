<script>
  import Navbar from './components/Navbar.svelte';
  import Title from './components/Title.svelte';
  import References from './components/References.svelte';
  import ReferencesLink from './components/ReferencesLink.svelte';

  import CurrentWeek from './components/CurrentWeek.svelte';
  import NextWeek from './components/NextWeek.svelte';

  export let currentWeek;
  export let nextWeek;

  const titleProps = {
    firstPart: 'Progreso',
    secondPart: 'semanal',
  };
</script>

<div class="bg-black-us">
  <header>
    <Navbar />
  </header>

  <main class="p-3">

    <section class="app-container max-w-xxl flex flex-col justify-center items-center m-auto">

      <Title {...titleProps} />

      <section class="flex overflow-auto">
        <div class="overflow-auto sm:w-11/12 w-2/3 shadow-md rounded p-3 bg-white-us z-10 mr-3 flex-none">
          <CurrentWeek {currentWeek} />
        </div>

        <div
          class="overflow-auto sm:w-11/12 w-2/3 shadow-md rounded p-3 bg-white-us z-10 opacity-75 hover:opacity-100
          flex-none">
          <NextWeek {nextWeek} />
        </div>
      </section>

      <footer class="ml-auto">
        <ReferencesLink />
        <References />
      </footer>
    </section>

  </main>
</div>
