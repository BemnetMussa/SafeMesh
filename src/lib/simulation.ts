import { get } from 'svelte/store';
import {
  nodes, animSpeed, simulationConfig,
  updateNodeStatus, updateNodeBattery, addLog,
} from './engine';

// ─── Private state ────────────────────────────────────────────────────────────

let _tickTimer: ReturnType<typeof setInterval> | null = null;

function _intervalMs(): number {
  return Math.round(1000 / get(simulationConfig).speed);
}

function _doTick(): void {
  simulationConfig.update(c => ({ ...c, tick: c.tick + 1 }));
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
