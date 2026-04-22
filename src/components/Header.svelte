<script lang="ts">
  import { Shield, Zap, RefreshCw, Activity, Layers, Play } from 'lucide-svelte';
  import { nodes, links, packetCount, globalStatus, addNode, triggerSOS, clearAll } from '../lib/engine';

  let nNodes = 0;
  let nLinks = 0;
  let nPackets = 0;
  let currentStatus = 'IDLE';

  nodes.subscribe(n => nNodes = n.length);
  links.subscribe(l => nLinks = l.length);
  packetCount.subscribe(p => nPackets = p);
  globalStatus.subscribe(s => currentStatus = s);
  
  function handleAddNode() {
    const w = window.innerWidth - 320; // estimate canvas width
    const h = window.innerHeight - 60; // estimate canvas height
    const pad = 80;
    const x = pad + Math.random() * (w - pad * 2);
    const y = pad + Math.random() * (h - pad * 2);
    addNode(x, y);
  }
</script>

<header class="glass-panel">
  <div class="brand">
    <Shield size={22} color="var(--accent-primary)" />
    <h1>Safe<span>Mesh</span></h1>
  </div>
  
  <div class="divider"></div>
  
  <div class="stats">
    <div class="stat">
      <span class="label">NODES</span>
      <span class="value">{nNodes}</span>
    </div>
    <div class="stat">
      <span class="label">LINKS</span>
      <span class="value">{nLinks}</span>
    </div>
    <div class="stat">
      <span class="label">PACKETS</span>
      <span class="value">{nPackets}</span>
    </div>
    <div class="stat">
      <span class="label">STATUS</span>
      <span class="value status-{currentStatus === 'SOS' ? 'danger' : currentStatus !== 'IDLE' ? 'active' : 'idle'}">
        {currentStatus}
      </span>
    </div>
  </div>
  
  <div class="actions">
    <button class="btn btn-primary" on:click={handleAddNode}>
      <Layers size={14} /> Add Node
    </button>
    <button class="btn btn-danger {currentStatus === 'SOS' ? 'pulse' : ''}" on:click={() => triggerSOS()}>
      <Zap size={14} /> SOS
    </button>
    <button class="btn btn-ghost" on:click={clearAll}>
      <RefreshCw size={14} /> Reset
    </button>
  </div>
</header>

<style>
  header {
    height: 60px;
    display: flex;
    align-items: center;
    padding: 0 24px;
    gap: 20px;
    position: relative;
    z-index: 100;
    border-top: none;
    border-left: none;
    border-right: none;
    flex-shrink: 0;
  }
  
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .brand h1 {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.5px;
    color: var(--text-main);
  }
  
  .brand h1 span {
    color: var(--accent-primary);
    font-weight: 300;
  }
  
  .divider {
    width: 1px;
    height: 24px;
    background: var(--panel-border);
    margin: 0 8px;
  }
  
  .stats {
    display: flex;
    gap: 32px;
  }
  
  .stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .label {
    font-size: 10px;
    color: var(--text-muted);
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  
  .value {
    font-family: var(--font-mono);
    font-size: 16px;
    color: var(--text-main);
  }
  
  .status-idle { color: var(--text-dim); }
  .status-active { color: var(--accent-success); }
  .status-danger { color: var(--accent-danger); font-weight: 700; }
  
  .actions {
    margin-left: auto;
    display: flex;
    gap: 12px;
  }
  
  .btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-main);
  }
  
  .btn:hover {
    transform: translateY(-1px);
  }
  
  .btn:active {
    transform: translateY(0);
  }
  
  .btn-primary {
    background: rgba(14, 165, 233, 0.1);
    color: var(--accent-primary);
    border-color: rgba(14, 165, 233, 0.2);
  }
  .btn-primary:hover {
    background: rgba(14, 165, 233, 0.15);
    border-color: rgba(14, 165, 233, 0.3);
  }
  
  .btn-danger {
    background: rgba(244, 63, 94, 0.1);
    color: var(--accent-danger);
    border-color: rgba(244, 63, 94, 0.2);
  }
  .btn-danger:hover {
    background: rgba(244, 63, 94, 0.15);
    border-color: rgba(244, 63, 94, 0.3);
    box-shadow: 0 0 12px rgba(244, 63, 94, 0.2);
  }
  
  .btn-ghost {
    color: var(--text-muted);
  }
  .btn-ghost:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-main);
  }
  
  .pulse {
    animation: danger-pulse 1s infinite alternate;
  }
  
  @keyframes danger-pulse {
    from { box-shadow: 0 0 0 rgba(244, 63, 94, 0.4); }
    to { box-shadow: 0 0 16px rgba(244, 63, 94, 0.6); background: rgba(244, 63, 94, 0.2); }
  }
</style>
