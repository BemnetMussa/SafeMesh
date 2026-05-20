<script lang="ts">
  import {
    Send, Radio, SlidersHorizontal, Activity, Trash2, Crosshair,
    Play, Pause, SkipForward, RotateCcw, Power, Zap,
  } from 'lucide-svelte';
  import {
    nodes, logs, signalRadius,
    removeNode, sendPacketAlongPath, floodBroadcast, findPath, addLog,
    simulationConfig,
    type Node,
  } from '../lib/engine';
  import type { LogEntry } from '../lib/engine';
  import type { SimulationConfig } from '../types';
  import {
    play, pause, step, resetSim, setSpeed,
    toggleNodeStatus, drainBattery,
  } from '../lib/simulation';

  // ─── Store subscriptions ────────────────────────────────────────────────────
  let nList:   Node[]            = [];
  let logList: LogEntry[]        = [];
  let rVal  = 150;
  let simCfg: SimulationConfig   = { speed: 1, status: 'idle', tick: 0, seed: 0 };

  nodes.subscribe(n          => nList   = n);
  logs.subscribe(l           => logList = l);
  signalRadius.subscribe(r   => rVal    = r);
  simulationConfig.subscribe(c => simCfg = c);

  // ─── Transmit ───────────────────────────────────────────────────────────────
  let fromNode = '';
  let toNode   = 'broadcast';
  let message  = '';

  function handleRadiusChange(e: Event) {
    signalRadius.set(parseInt((e.target as HTMLInputElement).value));
  }

  function handleSpeedChange(e: Event) {
    setSpeed(parseInt((e.target as HTMLInputElement).value));
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
    const src = $nodes.find(n => n.id === fromNode);
    if (!src) { addLog('Select a FROM node', 'sys'); return; }
    addLog(`MSG: "${message}"`, 'msg');
    if (toNode === 'broadcast') {
      floodBroadcast(src, src.color, 'msg');
    } else {
      const dest = $nodes.find(n => n.id === toNode);
      if (!dest) return;
      const path = findPath(src, dest);
      if (!path) { addLog(`❌ No route from ${src.label} to ${dest.label}`, 'sys'); return; }
      sendPacketAlongPath(path, src.color, message, 'msg');
    }
    message = '';
  }

  // ─── Node list helpers ──────────────────────────────────────────────────────
  function nodeDisplayColor(n: Node): string {
    if (n.status === 'offline') return '#475569';
    if (n.status === 'warning') return '#f59e0b';
    return n.color;
  }

  function batteryClass(pct: number): string {
    if (pct <= 25) return 'bat-crit';
    if (pct <= 50) return 'bat-warn';
    return 'bat-ok';
  }

  // ─── Sim status label ───────────────────────────────────────────────────────
  $: simStatusClass = simCfg.status === 'running'
    ? 'status-running'
    : simCfg.status === 'paused'
    ? 'status-paused'
    : 'status-idle';
</script>

<aside class="floating-hud">

  <!-- ── Controls panel ── -->
  <div class="glass-panel panel controls-panel">

    <!-- Simulation Controls -->
    <section>
      <div class="section-title">
        <Zap size={14} /> Simulation
      </div>

      <div class="sim-status-row">
        <span class="sim-badge {simStatusClass}">{simCfg.status.toUpperCase()}</span>
        <span class="sim-tick">TICK&nbsp;<span class="tick-num">{String(simCfg.tick).padStart(4, '0')}</span></span>
      </div>

      <div class="sim-btns">
        {#if simCfg.status === 'running'}
          <button class="sim-btn sim-btn-active" on:click={pause} title="Pause">
            <Pause size={13} />
          </button>
        {:else}
          <button class="sim-btn" on:click={play} title="Play">
            <Play size={13} />
          </button>
        {/if}
        <button class="sim-btn" on:click={step} title="Step one tick">
          <SkipForward size={13} />
        </button>
        <button class="sim-btn sim-btn-danger" on:click={resetSim} title="Reset simulation">
          <RotateCcw size={13} />
        </button>
      </div>

      <div class="slider-group">
        <div class="slider-label">
          <span>Speed</span>
          <span class="val">{simCfg.speed}x</span>
        </div>
        <input type="range" min="1" max="10" value={simCfg.speed} on:input={handleSpeedChange} />
      </div>
    </section>

    <!-- Transmit -->
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
        <input
          type="text"
          placeholder="Enter message payload..."
          bind:value={message}
          on:keydown={e => e.key === 'Enter' && transmit()}
        />
        <button class="btn-send" on:click={transmit}>
          <Send size={14} />
        </button>
      </div>
    </section>

    <!-- Link Tuning -->
    <section>
      <div class="section-title">
        <SlidersHorizontal size={14} /> Link Tuning
      </div>
      <div class="slider-group">
        <div class="slider-label">
          <span>Signal Range</span>
          <span class="val">{rVal}m</span>
        </div>
        <input type="range" min="60" max="360" value={rVal} on:input={handleRadiusChange} />
      </div>
    </section>

    <!-- Active Cluster -->
    <section class="nodes-section">
      <div class="section-title">
        <Crosshair size={14} /> Active Cluster
      </div>
      <div class="node-list">
        {#if nList.length === 0}
          <div class="empty-state">No nodes detected</div>
        {:else}
          {#each nList as n}
            <div
              class="node-item"
              class:node-offline={n.status === 'offline'}
              role="button"
              tabindex="0"
              on:click={() => handleFocusNode(n.id)}
              on:keydown={e => e.key === 'Enter' && handleFocusNode(n.id)}
            >
              <!-- Status dot -->
              <div
                class="node-dot"
                style="background:{nodeDisplayColor(n)};box-shadow:0 0 8px {nodeDisplayColor(n)};"
              ></div>

              <!-- Label -->
              <span class="node-name" style="color:{n.color}">{n.label}</span>

              <!-- Battery -->
              <span class="node-battery {batteryClass(n.battery)}">{n.battery}%</span>

              <!-- Power toggle (fail / restore) -->
              <button
                class="btn-power {n.status === 'offline' ? 'btn-power-restore' : ''}"
                on:click|stopPropagation={() => toggleNodeStatus(n.id)}
                title={n.status === 'offline' ? 'Restore node' : 'Fail node'}
                aria-label={n.status === 'offline' ? 'Restore node' : 'Fail node'}
              >
                <Power size={11} />
              </button>

              <!-- Drain battery -->
              <button
                class="btn-drain"
                on:click|stopPropagation={() => drainBattery(n.id)}
                title="Drain 20% battery"
                aria-label="Drain battery"
              >
                <Zap size={11} />
              </button>

              <!-- Delete -->
              <button
                class="btn-del"
                on:click|stopPropagation={() => removeNode(n.id)}
                aria-label="Remove node"
              >
                <Trash2 size={11} />
              </button>
            </div>
          {/each}
        {/if}
      </div>
    </section>
  </div>

  <!-- ── Telemetry feed ── -->
  <div class="glass-panel panel logs-panel">
    <div class="section-title" style="padding:12px 14px 6px">
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
  /* ── Layout ── */
  .floating-hud {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 50;
  }

  .panel {
    position: absolute;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    pointer-events: auto;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    overflow: hidden;
  }

  .controls-panel {
    top: 24px; right: 24px;
    width: 300px;
    max-height: calc(100% - 48px);
    overflow-y: auto;
  }

  .logs-panel {
    bottom: 24px; left: 24px;
    width: 380px;
    height: 260px;
  }

  section {
    padding: 14px 16px;
    border-bottom: 1px solid var(--panel-border);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  section:last-child { border-bottom: none; }

  .nodes-section { flex: 0 1 180px; min-height: 100px; overflow: hidden; }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
  }

  /* ── Simulation controls ── */
  .sim-status-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .sim-badge {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    padding: 2px 8px;
    border-radius: 4px;
  }
  .status-idle    { background: rgba(255,255,255,0.05); color: var(--text-dim); }
  .status-running { background: rgba(16,185,129,0.12);  color: var(--accent-success); }
  .status-paused  { background: rgba(245,158,11,0.12);  color: var(--accent-warning); }

  .sim-tick {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
  }
  .tick-num { color: var(--accent-primary); font-weight: 600; }

  .sim-btns {
    display: flex;
    gap: 6px;
  }

  .sim-btn {
    flex: 1;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    color: var(--text-muted);
    cursor: pointer;
    padding: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }
  .sim-btn:hover { background: rgba(255,255,255,0.09); color: var(--text-main); }

  .sim-btn-active {
    background: rgba(16,185,129,0.1);
    border-color: rgba(16,185,129,0.25);
    color: var(--accent-success);
  }
  .sim-btn-active:hover {
    background: rgba(16,185,129,0.18);
  }

  .sim-btn-danger:hover {
    background: rgba(244,63,94,0.1);
    border-color: rgba(244,63,94,0.2);
    color: var(--accent-danger);
  }

  /* ── Transmit ── */
  .form-row, .input-group { display: flex; gap: 8px; }

  select {
    flex: 1;
    background: rgba(0,0,0,0.2);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    color: var(--text-main);
    padding: 7px;
    font-size: 12px;
    outline: none;
    transition: border-color 0.2s;
    appearance: none;
    -webkit-appearance: none;
  }
  select:focus { border-color: var(--accent-primary); }

  input[type="text"] {
    flex: 1;
    background: rgba(0,0,0,0.2);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    color: var(--text-main);
    padding: 7px 12px;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;
  }
  input[type="text"]:focus { border-color: var(--accent-primary); }
  input[type="text"]::placeholder { color: var(--text-dim); }

  .btn-send {
    background: var(--accent-primary);
    color: #fff;
    border: none;
    border-radius: 6px;
    width: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-send:hover { background: #0284c7; transform: translateY(-1px); }

  /* ── Sliders ── */
  .slider-group { display: flex; flex-direction: column; gap: 6px; }
  .slider-label {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--text-muted);
  }
  .slider-label .val { font-family: var(--font-mono); color: var(--accent-primary); }

  input[type="range"] {
    width: 100%;
    accent-color: var(--accent-primary);
    height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px; height: 12px;
    background: var(--accent-primary);
    border-radius: 50%;
    cursor: pointer;
  }

  /* ── Node list ── */
  .node-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
    overflow-y: auto;
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
    gap: 7px;
    padding: 6px 8px;
    background: rgba(255,255,255,0.03);
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .node-item:hover {
    background: rgba(255,255,255,0.07);
    border-color: var(--panel-border);
  }
  .node-offline { opacity: 0.6; }

  .node-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .node-name {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .node-battery {
    font-family: var(--font-mono);
    font-size: 10px;
    min-width: 28px;
    text-align: right;
    flex-shrink: 0;
  }
  .bat-ok   { color: var(--accent-success); }
  .bat-warn { color: var(--accent-warning); }
  .bat-crit { color: var(--accent-danger);  }

  /* Node action buttons — visible on hover */
  .btn-power, .btn-drain, .btn-del {
    background: transparent;
    border: none;
    cursor: pointer;
    opacity: 0;
    transition: all 0.15s;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    flex-shrink: 0;
  }
  .node-item:hover .btn-power,
  .node-item:hover .btn-drain,
  .node-item:hover .btn-del { opacity: 1; }

  .btn-power:hover { color: var(--accent-warning); }
  .btn-power-restore { opacity: 1 !important; color: var(--accent-success) !important; }
  .btn-power-restore:hover { color: var(--accent-success); }
  .btn-drain:hover  { color: var(--accent-warning); }
  .btn-del:hover    { color: var(--accent-danger); }

  /* ── Log feed ── */
  .log-scroll {
    overflow-y: auto;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 0 14px 14px;
  }

  .log-entry {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 7px 10px;
    border-radius: 6px;
    border-left: 2px solid transparent;
    background: rgba(0,0,0,0.2);
    font-size: 11px;
    line-height: 1.4;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .log-time {
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 9px;
  }
  .log-text { font-family: var(--font-mono); }

  .type-sys { border-left-color: var(--accent-primary);  color: var(--text-muted); }
  .type-msg { border-left-color: var(--accent-success);  color: var(--text-main);  }
  .type-sos { border-left-color: var(--accent-danger);   color: #fda4af; background: rgba(244,63,94,0.05); }
  .type-hop { border-left-color: var(--accent-warning);  color: var(--accent-warning); }
</style>
