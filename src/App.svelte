<script lang="ts">
  import { onMount } from 'svelte';
  import Header from './components/Header.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import MeshCanvas from './components/MeshCanvas.svelte';
  import { bootDemo } from './lib/engine';

  onMount(() => {
    // Initial demo setup based on window size
    const w = window.innerWidth - 320;
    const h = window.innerHeight - 60;
    bootDemo(w, h);
  });
</script>

<div class="app-container">
  <Header />
  <div class="main-content">
    <MeshCanvas />
    <Sidebar />
  </div>
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
  }
  
  .main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
</style>
