<script lang="ts">
  import { onMount } from 'svelte';
  import Header from './components/Header.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import MeshCanvas from './components/MeshCanvas.svelte';
  import Inspector from './components/Inspector.svelte';
  import Dashboard from './components/Dashboard.svelte';
  import Landing from './components/Landing.svelte';
  import { bootDemo, currentView } from './lib/engine';

  let route: 'home' | 'app' = 'home';

  function syncRouteFromLocation() {
    route = window.location.pathname.startsWith('/app') ? 'app' : 'home';
    syncDocumentScroll(route);
  }

  function syncDocumentScroll(r: 'home' | 'app') {
    const isLanding = r === 'home';
    document.documentElement.classList.toggle('route-landing', isLanding);
    document.body.classList.toggle('route-landing', isLanding);
  }

  if (typeof document !== 'undefined') {
    syncDocumentScroll(
      window.location.pathname.startsWith('/app') ? 'app' : 'home',
    );
  }

  function goTo(path: '/' | '/app') {
    window.history.pushState({}, '', path);
    syncRouteFromLocation();
  }

  function openApp() {
    currentView.set('topology');
    goTo('/app');
  }

  function goHome() {
    goTo('/');
  }

  onMount(() => {
    // Initial demo setup based on window size
    const w = window.innerWidth - 320;
    const h = window.innerHeight - 60;
    bootDemo(w, h);

    syncRouteFromLocation();
    const handlePopState = () => syncRouteFromLocation();
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.documentElement.classList.remove('route-landing');
      document.body.classList.remove('route-landing');
    };
  });
</script>

<div class="app-container" class:home-route={route === 'home'}>
  {#if route === 'home'}
    <Landing onOpenApp={openApp} />
  {:else}
    <Header onGoHome={goHome} />
    <div class="main-content">
      {#if $currentView === 'topology'}
        <MeshCanvas />
        <Inspector />
        <Sidebar />
      {:else}
        <Dashboard />
      {/if}
    </div>
  {/if}
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
  }

  .app-container.home-route {
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }
  
  .main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
    position: relative;
  }
</style>
