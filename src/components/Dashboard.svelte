<script lang="ts">
  import { Cpu, Radio, Battery, Activity, HardDrive, Settings } from 'lucide-svelte';
  import { nodes, links, packetCount } from '../lib/engine';
  
  $: activeNodes = $nodes.filter(n => n.status !== 'offline').length;
  $: offlineNodes = $nodes.length - activeNodes;
  $: avgBattery = $nodes.length > 0 ? Math.round($nodes.reduce((s, n) => s + n.battery, 0) / $nodes.length) : 0;
  
  // Fake telemetry simulating ESP32 Meshtastic metrics
  const loraFreq = "868 MHz (EU)"; // Or 915 MHz
  const channelUtil = "14.2%";
  const avgSnr = "6.4 dB";
  
</script>

<div class="dashboard-container glass-panel">
  <div class="dash-header">
    <Cpu size={28} color="var(--accent-primary)" />
    <h2>Hardware Telemetry <span>ESP32 Meshtastic Gateway</span></h2>
  </div>
  
  <div class="dash-grid">
    <!-- Network Health -->
    <div class="dash-card">
      <div class="card-header"><Activity size={16} /> Network Health</div>
      <div class="stat-row">
        <span class="stat-label">Active Nodes</span>
        <span class="stat-val status-ok">{activeNodes}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Offline Nodes</span>
        <span class="stat-val {offlineNodes > 0 ? 'status-danger' : 'status-ok'}">{offlineNodes}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Total Links</span>
        <span class="stat-val">{$links.filter(l => l.active).length}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Packets Relayed</span>
        <span class="stat-val">{$packetCount}</span>
      </div>
    </div>
    
    <!-- RF Metrics -->
    <div class="dash-card">
      <div class="card-header"><Radio size={16} /> RF & LoRa Metrics</div>
      <div class="stat-row">
        <span class="stat-label">Frequency Band</span>
        <span class="stat-val">{loraFreq}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Channel Utilization</span>
        <span class="stat-val">{channelUtil}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Average SNR</span>
        <span class="stat-val">{avgSnr}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Tx Power</span>
        <span class="stat-val">22 dBm</span>
      </div>
    </div>
    
    <!-- Hardware Status -->
    <div class="dash-card">
      <div class="card-header"><HardDrive size={16} /> Hardware Node Info</div>
      <div class="hw-desc">
        <p><strong>Device:</strong> DIY Meshtastic ESP32-S3 + LoRa node</p>
        <p><strong>Radio:</strong> SX1262 LoRa module</p>
        <p><strong>Range capability:</strong> ~2km - 10km (Single link)</p>
        <p><strong>Multi-hop:</strong> Up to 20+ km open line-of-sight</p>
      </div>
      <div class="stat-row" style="margin-top:12px">
        <span class="stat-label"><Battery size={14} /> Mesh Avg Battery</span>
        <span class="stat-val {avgBattery < 30 ? 'status-danger' : 'status-ok'}">{avgBattery}%</span>
      </div>
    </div>
    
    <!-- Logs / Bridge Status -->
    <div class="dash-card bridge-card">
      <div class="card-header"><Settings size={16} /> USB / Serial Bridge Status</div>
      <div class="bridge-status">
        <div class="status-indicator active"></div>
        <span>Connected to /dev/ttyUSB0 (115200 baud)</span>
      </div>
      <div class="terminal-log">
        <div class="log-line">[SYS] ESP32-S3 firmware initialized...</div>
        <div class="log-line">[RF] SX1262 configured for 868MHz.</div>
        <div class="log-line">[MESH] Joined default channel (LongFast).</div>
        <div class="log-line">[GPS] Fix acquired. Satellites: 7.</div>
        <div class="log-line">[SYNC] Awaiting packet streams from LoRa network...</div>
      </div>
    </div>
  </div>
</div>

<style>
  .dashboard-container {
    position: absolute;
    inset: 24px;
    border-radius: 12px;
    padding: 32px;
    display: flex;
    flex-direction: column;
    gap: 32px;
    overflow-y: auto;
    z-index: 10;
  }
  
  .dash-header {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .dash-header h2 {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-main);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .dash-header h2 span {
    font-size: 14px;
    font-weight: 400;
    color: var(--accent-primary);
  }
  
  .dash-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 24px;
  }
  
  .dash-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 1px solid var(--panel-border);
    padding-bottom: 12px;
    margin-bottom: 8px;
  }
  
  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
  }
  
  .stat-label {
    font-size: 13px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .stat-val {
    font-family: var(--font-mono);
    font-size: 15px;
    font-weight: 600;
    color: var(--text-main);
  }
  
  .status-ok { color: var(--accent-success); }
  .status-danger { color: var(--accent-danger); }
  
  .hw-desc {
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.6;
  }
  .hw-desc p { margin-bottom: 6px; }
  .hw-desc strong { color: var(--text-main); }
  
  .bridge-card {
    grid-column: 1 / -1;
  }
  
  .bridge-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--accent-success);
    font-family: var(--font-mono);
    margin-bottom: 8px;
  }
  
  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent-success);
    box-shadow: 0 0 8px var(--accent-success);
  }
  
  .terminal-log {
    background: rgba(0, 0, 0, 0.5);
    border-radius: 6px;
    padding: 16px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-muted);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .log-line {
    border-left: 2px solid var(--accent-primary);
    padding-left: 8px;
  }
</style>
