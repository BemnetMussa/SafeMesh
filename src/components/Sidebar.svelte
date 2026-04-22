<script lang="ts">
  import { 
    Send, Radio, SlidersHorizontal, Activity, Trash2, Crosshair
  } from 'lucide-svelte';
  import { 
    nodes, logs, signalRadius, animSpeed, 
    removeNode, sendPacketAlongPath, floodBroadcast, findPath, addLog
  } from '../lib/engine';

  let nList = [];
  let logList = [];
  let rVal = 150;
  let sVal = 6;
  
  nodes.subscribe(n => nList = n);
  logs.subscribe(l => logList = l);
  signalRadius.subscribe(r => rVal = r);
  animSpeed.subscribe(s => sVal = s);
  
  let fromNode = '';
  let toNode = 'broadcast';
  let message = '';
  
  function handleRadiusChange(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value);
    signalRadius.set(val);
  }
  
  function handleSpeedChange(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value);
    animSpeed.set(val);
  }
  
  function handleFocusNode(id: string) {
    nodes.update(ns => {
      const n = ns.find(n => n.id === id);
      if (n) { n.pulseR = 0; n.pulseAlpha = 1; }
      return ns;
    });
  }
  
  function transmit() {
    if (!message.trim()) return;
    
    const rootNodes = $nodes;
    const src = rootNodes.find(n => n.id === fromNode);
    if (!src) { addLog('Select a FROM node', 'sys'); return; }
    
    addLog(`MSG: "${message}"`, 'msg');
    
    if (toNode === 'broadcast') {
      floodBroadcast(src, src.color, 'msg');
    } else {
      const dest = rootNodes.find(n => n.id === toNode);
      if (!dest) return;
      
      const path = findPath(src, dest);
      if (!path) {
        addLog(`❌ No route from ${src.label} to ${dest.label}`, 'sys');
        return;
      }
      sendPacketAlongPath(path, src.color, message, 'msg');
    }
    message = '';
  }
</script>

<aside class="floating-hud">
  
  <!-- Right HUD Panel: Transmit & Controls -->
  <div class="glass-panel panel controls-panel">
    <section>
      <div class="section-title">
        <Radio size={14} /> Transmit
      </div>
      <div class="form-row">
        <select bind:value={fromNode}>
          <option value="" disabled>Origin node...</option>
          {#each nList as n}
            <option value={n.id}>{n.label}</option>
          {/each}
        </select>
        <select bind:value={toNode}>
          <option value="broadcast">Broadcast (All)</option>
          {#each nList as n}
            <option value={n.id}>{n.label}</option>
          {/each}
        </select>
      </div>
      <div class="input-group">
        <input type="text" placeholder="Enter message payload..." bind:value={message} on:keydown={e => e.key === 'Enter' && transmit()} />
        <button class="btn-send" on:click={transmit}>
          <Send size={14} />
        </button>
      </div>
    </section>

    <section>
      <div class="section-title">
        <SlidersHorizontal size={14} /> Link Tuning
      </div>
      <div class="slider-group">
        <div class="slider-label"><span>Signal Map</span><span class="val">{rVal}m</span></div>
        <input type="range" min="60" max="360" value={rVal} on:input={handleRadiusChange} />
      </div>
      <div class="slider-group">
        <div class="slider-label"><span>Flow Rate</span><span class="val">{sVal}x</span></div>
        <input type="range" min="1" max="10" value={sVal} on:input={handleSpeedChange} />
      </div>
    </section>

    <section class="nodes-section">
      <div class="section-title">
        <Crosshair size={14} /> Active Cluster
      </div>
      <div class="node-list">
        {#if nList.length === 0}
          <div class="empty-state">No nodes detected</div>
        {:else}
          {#each nList as n}
            <div class="node-item" role="button" tabindex="0" on:click={() => handleFocusNode(n.id)}>
              <div class="node-dot" style="background: {n.color}; box-shadow: 0 0 10px {n.color};"></div>
              <span class="node-name" style="color: {n.color}">{n.label}</span>
              <button class="btn-del" on:click|stopPropagation={() => removeNode(n.id)} aria-label="Remove node">
                <Trash2 size={12} />
              </button>
            </div>
          {/each}
        {/if}
      </div>
    </section>
  </div>

  <!-- Left Bottom HUD Panel: Logs -->
  <div class="glass-panel panel logs-panel">
    <div class="section-title" style="padding: 12px 14px 6px">
      <Activity size={14} /> Telemetry Feed
    </div>
    <div class="log-scroll">
      {#each logList as log (log.id)}
        <div class="log-entry type-{log.type}">
          <span class="log-time">{log.time}</span>
          <span class="log-text">{log.text}</span>
        </div>
      {/each}
    </div>
  </div>

</aside>

<style>
  .floating-hud {
    position: absolute;
    inset: 0;
    pointer-events: none; /* Passes clicks underlying canvas */
    z-index: 50; /* Above canvas, below header */
  }
  
  .panel {
    position: absolute;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    pointer-events: auto; /* Catch clicks for panel contents */
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    overflow: hidden;
  }

  .controls-panel {
    top: 24px;
    right: 24px;
    width: 320px;
    max-height: calc(100% - 48px);
  }

  .logs-panel {
    bottom: 24px;
    left: 24px;
    width: 380px;
    height: 280px;
  }
  
  section {
    padding: 16px;
    border-bottom: 1px solid var(--panel-border);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  section:last-child {
    border-bottom: none;
  }
  
  .nodes-section { flex: 0 1 200px; min-height: 120px; overflow: hidden; }
  
  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
    margin-bottom: 2px;
  }

  .form-row, .input-group {
    display: flex;
    gap: 8px;
  }
  
  select {
    flex: 1;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    color: var(--text-main);
    padding: 8px;
    font-size: 12px;
    outline: none;
    transition: border-color 0.2s;
    appearance: none;
  }
  select:focus { border-color: var(--accent-primary); }
  
  input[type="text"] {
    flex: 1;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    color: var(--text-main);
    padding: 8px 12px;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;
  }
  input[type="text"]:focus { border-color: var(--accent-primary); }
  input[type="text"]::placeholder { color: var(--text-dim); }
  
  .btn-send {
    background: var(--accent-primary);
    color: white;
    border: none;
    border-radius: 6px;
    width: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-send:hover {
    background: #0284c7;
    transform: translateY(-1px);
  }

  .slider-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .slider-label {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--text-muted);
  }
  .slider-label .val {
    font-family: var(--font-mono);
    color: var(--accent-primary);
  }
  input[type="range"] {
    width: 100%;
    accent-color: var(--accent-primary);
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    outline: none;
    -webkit-appearance: none;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px; height: 12px;
    background: var(--accent-primary);
    border-radius: 50%;
    cursor: pointer;
  }

  .node-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-y: auto;
    padding-right: 4px;
    height: 100%;
  }
  .empty-state {
    font-size: 12px;
    color: var(--text-dim);
    font-style: italic;
    padding: 8px 0;
  }
  .node-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
    width: 100%;
  }
  .node-item:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: var(--panel-border);
  }
  .node-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
  }
  .node-name {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 12px;
  }
  .btn-del {
    background: transparent;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    opacity: 0;
    transition: all 0.2s;
    padding: 2px;
  }
  .node-item:hover .btn-del { opacity: 1; }
  .btn-del:hover { color: var(--accent-danger); }

  .log-scroll {
    overflow-y: auto;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0 14px 14px 14px;
  }
  
  .log-entry {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: 6px;
    border-left: 2px solid transparent;
    background: rgba(0, 0, 0, 0.2);
    font-size: 11px;
    line-height: 1.4;
    animation: fadeIn 0.3s ease;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .log-time {
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 9px;
  }
  .log-text {
    font-family: var(--font-mono);
  }
  
  .type-sys { border-left-color: var(--accent-primary); color: var(--text-muted); }
  .type-msg { border-left-color: var(--accent-success); color: var(--text-main); }
  .type-sos { border-left-color: var(--accent-danger); color: #fda4af; background: rgba(244, 63, 94, 0.05); }
  .type-hop { border-left-color: var(--accent-warning); color: var(--accent-warning); }
</style>
