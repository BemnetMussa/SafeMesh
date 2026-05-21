import { get } from 'svelte/store';
import {
  nodes, animSpeed, simulationConfig, emitEvent,
  updateNodeStatus, updateNodeBattery, addLog,
} from './engine';

// ─── Private state ────────────────────────────────────────────────────────────

let _tickTimer: ReturnType<typeof setInterval> | null = null;

function _intervalMs(): number {
  return Math.round(1000 / get(simulationConfig).speed);
}

function _doTick(): void {
  const cfg      = get(simulationConfig);
  const oldNodes = get(nodes);

  simulationConfig.update(c => ({ ...c, tick: c.tick + 1 }));

  // Passive battery drain: 0.05 % × speed per tick
  const drain = 0.05 * cfg.speed;

  const updated = oldNodes.map(n => {
    if (n.status === 'offline') return n;

    const battery  = +Math.max(0, n.battery - drain).toFixed(2);
    // Small random signal jitter (±2), clamped to [20, 100]
    const signal   = +Math.max(20, Math.min(100, n.signal_strength + (Math.random() * 4 - 2))).toFixed(1);

    let status = n.status;
    if      (battery === 0)                               status = 'offline';
    else if (battery <= 25 && n.status === 'online')      status = 'warning';

    return { ...n, battery, signal_strength: signal, status };
  });

  nodes.set(updated);

  // Fire threshold-crossing events (only on first crossing)
  updated.forEach((n, i) => {
    const o = oldNodes[i];
    if (n.battery <= 25 && o.battery > 25) {
      addLog(`⚠ Low battery on ${n.label}: ${Math.round(n.battery)}%`, 'sys');
      emitEvent('battery_low', n.id, { payload: { battery: n.battery }, severity: 'warning' });
    }
    if (n.status === 'offline' && o.status !== 'offline') {
      addLog(`💀 ${n.label} went offline — battery depleted`, 'sys');
      emitEvent('node_update', n.id, { payload: { status: 'offline', reason: 'battery' }, severity: 'critical' });
    }
  });
}

function _startTimer(): void {
  _clearTimer();
  _tickTimer = setInterval(_doTick, _intervalMs());
}

function _clearTimer(): void {
  if (_tickTimer !== null) {
    clearInterval(_tickTimer);
    _tickTimer = null;
  }
}

// ─── Simulation controls ──────────────────────────────────────────────────────

export function play(): void {
  if (get(simulationConfig).status === 'running') return;
  simulationConfig.update(c => ({ ...c, status: 'running' }));
  _startTimer();
}

export function pause(): void {
  _clearTimer();
  simulationConfig.update(c => ({ ...c, status: 'paused' }));
}

export function step(): void {
  _clearTimer();
  simulationConfig.update(c => ({ ...c, status: 'paused' }));
  _doTick();
}

export function resetSim(): void {
  _clearTimer();
  simulationConfig.update(c => ({ ...c, tick: 0, status: 'idle' }));
  nodes.update(ns =>
    ns.map(n => ({ ...n, status: 'online' as const, battery: 100 })),
  );
  addLog('Simulation reset — all nodes restored to full health', 'sys');
}

/** Set unified speed (1–10). Updates both tick rate and packet animation. */
export function setSpeed(speed: number): void {
  const s = Math.max(1, Math.min(10, Math.round(speed)));
  simulationConfig.update(c => ({ ...c, speed: s }));
  animSpeed.set(s);
  if (get(simulationConfig).status === 'running') _startTimer();
}

// ─── Manual node triggers ─────────────────────────────────────────────────────

export function failNode(id: string): void {
  const n = get(nodes).find(n => n.id === id);
  if (!n || n.status === 'offline') return;
  updateNodeStatus(id, 'offline');
  addLog(`Node ${n.label} set offline`, 'sys');
}

export function restoreNode(id: string): void {
  const n = get(nodes).find(n => n.id === id);
  if (!n || n.status === 'online') return;
  updateNodeStatus(id, 'online');
  addLog(`Node ${n.label} restored to online`, 'sys');
}

/** Toggle a node between online and offline. */
export function toggleNodeStatus(id: string): void {
  const n = get(nodes).find(n => n.id === id);
  if (!n) return;
  n.status === 'online' ? failNode(id) : restoreNode(id);
}

/** Reduce a node's battery by `amount` percent. */
export function drainBattery(id: string, amount = 20): void {
  const n = get(nodes).find(n => n.id === id);
  if (!n) return;
  updateNodeBattery(id, n.battery - amount);
}
