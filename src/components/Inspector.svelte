<script lang="ts">
  import { X, Wifi, Zap, MapPin } from 'lucide-svelte';
  import { nodes, links, selectedNodeId } from '../lib/engine';

  $: selectedNode = $nodes.find(n => n.id === $selectedNodeId) ?? null;

  $: nodeLinks = $links.filter(
    l => l.active && (l.source === $selectedNodeId || l.target === $selectedNodeId),
  );

  $: neighbors = nodeLinks
    .flatMap(l => {
      const nId  = l.source === $selectedNodeId ? l.target : l.source;
      const node = $nodes.find(n => n.id === nId);
      return node ? [{ node, quality: l.quality }] : [];
    })
    .sort((a, b) => b.quality - a.quality);

  $: liveSignal = nodeLinks.length === 0
    ? 0
    : Math.round((nodeLinks.reduce((s, l) => s + l.quality, 0) / nodeLinks.length) * 100);

  function statusColor(status: string): string {
    if (status === 'offline') return '#475569';
    if (status === 'warning') return '#f59e0b';
    return '#10b981';
  }

  function timeStr(ts: number): string {
    return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
  }

  function batteryBarClass(pct: number): string {
    if (pct <= 25) return 'bar-crit';
    if (pct <= 50) return 'bar-warn';
    return 'bar-bat-ok';
  }
</script>

{#if selectedNode}
<div class="inspector-wrap">
  <div class="glass-panel inspector-panel">

    <!-- Header -->
    <div class="insp-header">
      <div class="insp-title-row">
        <div class="insp-dot" style="background:{selectedNode.color};box-shadow:0 0 8px {selectedNode.color};"></div>
        <span class="insp-name">{selectedNode.label}</span>
        <span class="insp-type">{selectedNode.type}</span>
      </div>
      <button class="insp-close" on:click={() => selectedNodeId.set(null)} aria-label="Close inspector">
        <X size={13} />
      </button>
    </div>

    <!-- Status -->
    <div class="insp-section">
      <div class="insp-row">
        <span class="insp-label">Status</span>
        <span
          class="status-pill"
          style="color:{statusColor(selectedNode.status)};background:{statusColor(selectedNode.status)}18;"
        >{selectedNode.status}</span>
      </div>
      <div class="insp-row">
        <span class="insp-label">Last seen</span>
        <span class="insp-val mono">{timeStr(selectedNode.last_seen)}</span>
      </div>
      <div class="insp-row">
        <span class="insp-label">Node ID</span>
        <span class="insp-val mono">#{selectedNode.id}</span>
      </div>
    </div>

    <!-- Health -->
    <div class="insp-section">
      <div class="insp-bar-row">
        <span class="insp-label"><Wifi size={11} />Signal</span>
        <div class="bar-track">
          <div class="bar-fill bar-signal" style="width:{liveSignal}%"></div>
        </div>
        <span class="insp-val mono">{liveSignal}%</span>
      </div>
      <div class="insp-bar-row">
        <span class="insp-label"><Zap size={11} />Battery</span>
        <div class="bar-track">
          <div class="bar-fill {batteryBarClass(selectedNode.battery)}" style="width:{selectedNode.battery}%"></div>
        </div>
        <span class="insp-val mono">{selectedNode.battery}%</span>
      </div>
    </div>

    <!-- Position -->
    <div class="insp-section">
      <div class="insp-row">
        <span class="insp-label"><MapPin size={11} />Position</span>
        <span class="insp-val mono">({Math.round(selectedNode.x)}, {Math.round(selectedNode.y)})</span>
      </div>
    </div>

    <!-- Neighbors -->
    <div class="insp-section insp-nb-section">
      <div class="insp-row">
        <span class="insp-label">Neighbors</span>
        <span class="count-badge">{neighbors.length}</span>
      </div>

      <div class="nb-list">
        {#if neighbors.length === 0}
          <span class="nb-empty">No connections in range</span>
        {:else}
          {#each neighbors as { node, quality }}
            <button class="nb-item" on:click={() => selectedNodeId.set(node.id)}>
              <div class="nb-dot" style="background:{node.color};"></div>
              <span class="nb-name">{node.label}</span>
              <div class="nb-bar-track">
                <div class="nb-bar-fill" style="width:{Math.round(quality * 100)}%;background:{node.color};"></div>
              </div>
              <span class="nb-pct">{Math.round(quality * 100)}%</span>
            </button>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Metadata (only when populated) -->
    {#if Object.keys(selectedNode.metadata).length > 0}
      <div class="insp-section">
        <div class="insp-row"><span class="insp-label">Metadata</span></div>
        {#each Object.entries(selectedNode.metadata) as [k, v]}
          <div class="insp-row">
            <span class="insp-label mono">{k}</span>
            <span class="insp-val mono">{String(v)}</span>
          </div>
        {/each}
      </div>
    {/if}

  </div>
</div>
{/if}

<style>
  .inspector-wrap {
    position: absolute;
    top: 80px;
    left: 24px;
    z-index: 50;
    pointer-events: auto;
    animation: slideIn 0.18s ease;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .inspector-panel {
    width: 256px;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.45);
    max-height: calc(100vh - 220px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  /* ── Header ── */
  .insp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px 10px;
    border-bottom: 1px solid var(--panel-border);
    gap: 8px;
  }

  .insp-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }

  .insp-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .insp-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-main);
    font-family: var(--font-mono);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  .insp-type {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-dim);
    background: rgba(255,255,255,0.05);
    padding: 2px 6px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .insp-close {
    background: transparent;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .insp-close:hover { background: rgba(255,255,255,0.08); color: var(--text-main); }

  /* ── Sections ── */
  .insp-section {
    padding: 10px 14px;
    border-bottom: 1px solid var(--panel-border);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .insp-section:last-child { border-bottom: none; }

  .insp-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .insp-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .insp-val {
    font-size: 11px;
    color: var(--text-main);
    text-align: right;
  }
  .mono { font-family: var(--font-mono); }

  .status-pill {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .count-badge {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--accent-primary);
    background: rgba(14,165,233,0.1);
    padding: 1px 7px;
    border-radius: 4px;
  }

  /* ── Health bars ── */
  .insp-bar-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .bar-track {
    flex: 1;
    height: 4px;
    background: rgba(255,255,255,0.08);
    border-radius: 2px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.35s ease;
  }

  .bar-signal   { background: var(--accent-primary); }
  .bar-bat-ok   { background: var(--accent-success); }
  .bar-warn     { background: var(--accent-warning); }
  .bar-crit     { background: var(--accent-danger);  }

  /* ── Neighbors ── */
  .insp-nb-section { gap: 6px; }

  .nb-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
    max-height: 150px;
    overflow-y: auto;
  }

  .nb-empty {
    font-size: 11px;
    color: var(--text-dim);
    font-style: italic;
    padding: 2px 0;
  }

  .nb-item {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 5px 7px;
    background: rgba(255,255,255,0.03);
    border: 1px solid transparent;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.15s;
    width: 100%;
    text-align: left;
  }
  .nb-item:hover {
    background: rgba(255,255,255,0.07);
    border-color: var(--panel-border);
  }

  .nb-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .nb-name {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nb-bar-track {
    width: 44px;
    height: 3px;
    background: rgba(255,255,255,0.08);
    border-radius: 2px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .nb-bar-fill {
    height: 100%;
    border-radius: 2px;
    opacity: 0.7;
  }

  .nb-pct {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-muted);
    min-width: 28px;
    text-align: right;
    flex-shrink: 0;
  }
</style>
