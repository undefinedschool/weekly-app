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

<style>
  .container {
    height: calc(100vh - 24px);
  }
</style>

<div class="bg-black-us">
  <Navbar />

  <main class="p-3">

    <div class="container max-w-xxl flex flex-col justify-center items-center m-auto">

      <Title {...titleProps} />

      <div class="flex overflow-x-auto">
        <div class="sm:w-11/12 w-2/3 shadow-md rounded p-3 bg-white-us z-10 mr-3 flex-none">
          <CurrentWeek {currentWeek} />
        </div>

        <div class="sm:w-11/12 w-2/3 shadow-md rounded p-3 bg-white-us z-10 opacity-75 hover:opacity-100 flex-none">
          <NextWeek {nextWeek} />
        </div>
      </div>

      <div class="ml-auto">
        <ReferencesLink />
        <References />
      </div>
    </div>

  </main>
</div>
