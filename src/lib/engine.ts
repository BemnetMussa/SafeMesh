import { writable, get } from 'svelte/store';
import type {
  MeshNode,
  MeshLink,
  MeshEvent,
  MeshEventType,
  EventSeverity,
  MeshMessage,
  MeshMessageType,
  MeshMessageStatus,
  SimulationConfig,
} from '../types';

// ─── Backward-compat alias ───────────────────────────────────────────────────
// Components that still import `type Node` from engine continue to work.
export type Node = MeshNode;

// ─── Log entry (UI-only, lightweight event summary for the telemetry feed) ───
export type LogEntry = {
  id: number;
  time: string;
  text: string;
  type: 'sys' | 'msg' | 'sos' | 'hop';
};

// ─── Constants ───────────────────────────────────────────────────────────────

export const NODE_COLORS = [
  '#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#2dd4bf',
];

const DEFAULT_BATTERY   = 100;
const DEFAULT_SIGNAL    = 85;
const LOW_BATTERY_WARN  = 25;

// ─── Core stores ─────────────────────────────────────────────────────────────

export const signalRadius   = writable(150);
export const animSpeed      = writable(6);
export const selectedNodeId = writable<string | null>(null);

export const nodes          = writable<MeshNode[]>([]);
export const links          = writable<MeshLink[]>([]);
export const packets        = writable<any[]>([]);
export const sosWaves       = writable<any[]>([]);

export const packetCount    = writable(0);
export const globalStatus   = writable<'IDLE' | 'ROUTING' | 'DELIVERED' | 'NO ROUTE' | 'SOS'>('IDLE');
export const logs           = writable<LogEntry[]>([]);

// ─── New Phase-1 stores ───────────────────────────────────────────────────────

export const events         = writable<MeshEvent[]>([]);
export const messages       = writable<MeshMessage[]>([]);
export const simulationConfig = writable<SimulationConfig>({
  speed: 1,
  status: 'idle',
  tick: 0,
  seed: Date.now(),
});

// ─── ID counters ─────────────────────────────────────────────────────────────

let logIdCounter    = 0;
let eventIdCounter  = 0;
let messageIdCounter = 0;
let nodeIdCounter   = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function dist(a: MeshNode, b: MeshNode): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Log ─────────────────────────────────────────────────────────────────────

export function addLog(text: string, type: LogEntry['type'] = 'sys'): void {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  logs.update(l => {
    const next = [...l, { id: ++logIdCounter, time, text, type }];
    if (next.length > 60) next.shift();
    return next;
  });
}

// ─── Events ──────────────────────────────────────────────────────────────────

export function emitEvent(
  event_type: MeshEventType,
  source: string,
  options: {
    target?: string;
    payload?: Record<string, unknown>;
    hop_count?: number;
    severity?: EventSeverity;
  } = {},
): MeshEvent {
  const ev: MeshEvent = {
    id: String(++eventIdCounter),
    timestamp: Date.now(),
    source,
    target: options.target,
    event_type,
    payload: options.payload ?? {},
    hop_count: options.hop_count ?? 0,
    severity: options.severity ?? 'info',
  };

  events.update(evs => {
    const next = [...evs, ev];
    if (next.length > 200) next.shift();
    return next;
  });

  return ev;
}

// ─── Links ───────────────────────────────────────────────────────────────────

export function updateLinks(): void {
  const currentNodes = get(nodes);
  const radius       = get(signalRadius);
  const newLinks: MeshLink[] = [];

  for (let i = 0; i < currentNodes.length; i++) {
    for (let j = i + 1; j < currentNodes.length; j++) {
      const d = dist(currentNodes[i], currentNodes[j]);
      if (d <= radius) {
        const quality = parseFloat((1 - d / radius).toFixed(3));
        const [sid, tid] = [currentNodes[i].id, currentNodes[j].id].sort();
        newLinks.push({ id: `${sid}__${tid}`, source: currentNodes[i].id, target: currentNodes[j].id, quality, active: true });
      }
    }
  }

  links.set(newLinks);
}

nodes.subscribe(() => updateLinks());
signalRadius.subscribe(() => updateLinks());

export function getNeighbors(node: MeshNode): MeshNode[] {
  const currentLinks = get(links);
  const currentNodes = get(nodes);
  const ids = new Set<string>();
  currentLinks.forEach(l => {
    if (l.active) {
      if (l.source === node.id) ids.add(l.target);
      if (l.target === node.id) ids.add(l.source);
    }
  });
  return currentNodes.filter(n => ids.has(n.id));
}

// ─── Node management ─────────────────────────────────────────────────────────

export function addNode(x: number, y: number, label?: string): MeshNode {
  nodeIdCounter++;
  const idStr  = String(nodeIdCounter);
  const lbl    = label || `Node ${idStr.padStart(2, '0')}`;
  const color  = NODE_COLORS[(nodeIdCounter - 1) % NODE_COLORS.length];

  const newNode: MeshNode = {
    id:              idStr,
    label:           lbl,
    type:            'generic',
    color,
    x,
    y,
    neighbors:       [],
    signal_strength: DEFAULT_SIGNAL,
    status:          'online',
    battery:         DEFAULT_BATTERY,
    last_seen:       Date.now(),
    pulseR:          0,
    pulseAlpha:      0,
    metadata:        {},
  };

  nodes.update(ns => [...ns, newNode]);
  addLog(`Node ${lbl} joined`, 'sys');
  emitEvent('node_join', idStr, { payload: { label: lbl }, severity: 'info' });

  return newNode;
}

export function removeNode(id: string): void {
  nodes.update(ns => {
    const n = ns.find(n => n.id === id);
    if (n) {
      addLog(`Node ${n.label} disconnected`, 'sys');
      emitEvent('node_leave', id, { payload: { label: n.label }, severity: 'warning' });
    }
    return ns.filter(n => n.id !== id);
  });
  if (get(selectedNodeId) === id) selectedNodeId.set(null);
}

export function updateNodeStatus(id: string, status: MeshNode['status']): void {
  nodes.update(ns =>
    ns.map(n => n.id === id ? { ...n, status, last_seen: Date.now() } : n),
  );
  emitEvent('node_update', id, { payload: { status }, severity: status === 'offline' ? 'critical' : status === 'warning' ? 'warning' : 'info' });
}

export function updateNodeBattery(id: string, battery: number): void {
  nodes.update(ns =>
    ns.map(n => n.id === id ? { ...n, battery: Math.max(0, Math.min(100, battery)) } : n),
  );
  if (battery <= LOW_BATTERY_WARN) {
    addLog(`⚠ Low battery on node ${id}: ${battery}%`, 'sys');
    emitEvent('battery_low', id, { payload: { battery }, severity: 'warning' });
  }
}

export function clearAll(): void {
  nodes.set([]);
  links.set([]);
  packets.set([]);
  sosWaves.set([]);
  events.set([]);
  messages.set([]);
  packetCount.set(0);
  nodeIdCounter = 0;
  simulationConfig.update(c => ({ ...c, tick: 0, status: 'idle' }));
  addLog('Mesh network reset', 'sys');
}

// ─── Routing ─────────────────────────────────────────────────────────────────

export function findPath(fromNode: MeshNode, toNode: MeshNode): MeshNode[] | null {
  if (fromNode.id === toNode.id) return [fromNode];
  const visited = new Set([fromNode.id]);
  const queue: [MeshNode, MeshNode[]][] = [[fromNode, [fromNode]]];

  while (queue.length > 0) {
    const [cur, path] = queue.shift()!;
    for (const nb of getNeighbors(cur)) {
      if (nb.id === toNode.id) return [...path, nb];
      if (!visited.has(nb.id)) {
        visited.add(nb.id);
        queue.push([nb, [...path, nb]]);
      }
    }
  }
  return null;
}

// ─── Messages ────────────────────────────────────────────────────────────────

function createMessage(
  type: MeshMessageType,
  origin: string,
  content: string,
  destination?: string,
): MeshMessage {
  const msg: MeshMessage = {
    id:          String(++messageIdCounter),
    type,
    origin,
    destination,
    content,
    hops:        [origin],
    status:      'queued',
    timestamp:   Date.now(),
  };
  messages.update(ms => [...ms, msg]);
  return msg;
}

function updateMessageStatus(id: string, status: MeshMessageStatus, hops?: string[]): void {
  messages.update(ms =>
    ms.map(m =>
      m.id === id
        ? { ...m, status, ...(hops ? { hops } : {}) }
        : m,
    ),
  );
}

// ─── Packet animation ────────────────────────────────────────────────────────

export async function sendPacketAlongPath(
  path: MeshNode[],
  color: string,
  payload: string,
  type: 'msg' | 'sos' = 'msg',
): Promise<void> {
  if (!path || path.length < 2) return;
  globalStatus.set('ROUTING');

  const msgType: MeshMessageType  = type === 'sos' ? 'sos' : 'unicast';
  const msg = createMessage(msgType, path[0].id, payload, path[path.length - 1].id);

  const hopIds = [path[0].id];

  for (let i = 0; i < path.length - 1; i++) {
    const s = get(animSpeed);
    const travelTimeMs = 1200 / s;
    const from = path[i];
    const to   = path[i + 1];

    hopIds.push(to.id);
    updateMessageStatus(msg.id, 'in-flight', [...hopIds]);

    nodes.update(ns => {
      const n = ns.find(n => n.id === from.id);
      if (n) { n.pulseR = 0; n.pulseAlpha = 1; n.last_seen = Date.now(); }
      return ns;
    });

    if (i === 0) {
      addLog(
        type === 'sos'
          ? `🆘 SOS via ${from.label}`
          : `📤 TX: ${from.label} -> ${path[path.length - 1].label}`,
        type === 'sos' ? 'sos' : 'msg',
      );
      emitEvent('message_sent', from.id, {
        target: path[path.length - 1].id,
        payload: { content: payload, message_id: msg.id },
        severity: type === 'sos' ? 'critical' : 'info',
      });
    }

    packets.update(ps => [...ps, {
      fromX: from.x, fromY: from.y,
      toX: to.x, toY: to.y,
      progress: 0, color, type,
      speed: 16.66 / Math.max(1, travelTimeMs),
      trail: [],
    }]);

    packetCount.update(c => c + 1);
    await sleep(travelTimeMs);

    if (i === path.length - 2) {
      addLog(`✅ DELIVERED to ${to.label}`, 'sys');
      updateMessageStatus(msg.id, 'delivered', hopIds);
      emitEvent('message_received', to.id, {
        target: to.id,
        payload: { content: payload, message_id: msg.id, hops: hopIds.length - 1 },
        hop_count: hopIds.length - 1,
        severity: 'info',
      });
      nodes.update(ns => {
        const n = ns.find(n => n.id === to.id);
        if (n) { n.pulseR = 0; n.pulseAlpha = 1; n.last_seen = Date.now(); }
        return ns;
      });
      globalStatus.set('DELIVERED');
      setTimeout(() => {
        if (get(globalStatus) === 'DELIVERED') globalStatus.set('IDLE');
      }, 2000);
    }
  }
}

export async function floodBroadcast(
  source: MeshNode,
  color: string,
  type: 'msg' | 'sos' = 'msg',
): Promise<void> {
  const visited = new Set([source.id]);
  const queue   = [source];

  globalStatus.set(type === 'sos' ? 'SOS' : 'ROUTING');

  const msgType: MeshMessageType = type === 'sos' ? 'sos' : 'broadcast';
  const msg = createMessage(msgType, source.id, type === 'sos' ? 'EMERGENCY BROADCAST' : 'Broadcast');

  if (type === 'sos') {
    addLog(`🆘 EMERGENCY BROADCAST from ${source.label}!`, 'sos');
    emitEvent('sos', source.id, { payload: { message_id: msg.id }, severity: 'critical' });
  }

  let hopCount = 0;

  while (queue.length > 0) {
    const level = [...queue];
    queue.length = 0;

    const s            = get(animSpeed);
    const travelTimeMs = 1200 / s;
    let anyPropagated  = false;
    hopCount++;

    level.forEach(node => {
      getNeighbors(node).forEach(nb => {
        if (!visited.has(nb.id)) {
          visited.add(nb.id);
          queue.push(nb);
          anyPropagated = true;

          nodes.update(ns => {
            const n = ns.find(nx => nx.id === node.id);
            if (n) { n.pulseR = 0; n.pulseAlpha = 1; n.last_seen = Date.now(); }
            return ns;
          });

          packets.update(ps => [...ps, {
            fromX: node.x, fromY: node.y,
            toX: nb.x, toY: nb.y,
            progress: 0, color, type,
            speed: 16.66 / Math.max(1, travelTimeMs),
            trail: [],
          }]);

          packetCount.update(c => c + 1);
        }
      });
    });

    if (queue.length > 0 && anyPropagated) await sleep(travelTimeMs);
  }

  updateMessageStatus(msg.id, 'delivered', Array.from(visited));
  emitEvent('message_received', source.id, {
    payload: { message_id: msg.id, reached: visited.size },
    hop_count: hopCount,
    severity: 'info',
  });

  setTimeout(() => {
    if (get(globalStatus) !== 'IDLE') globalStatus.set('IDLE');
  }, 1000);
}

// ─── SOS ─────────────────────────────────────────────────────────────────────

export function triggerSOS(sourceNode?: MeshNode): void {
  const currentNodes = get(nodes);
  const src = sourceNode ?? currentNodes[Math.floor(Math.random() * currentNodes.length)];
  if (!src) return;

  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      sosWaves.update(sw => [
        ...sw,
        { x: src.x, y: src.y, r: 0, alpha: 0.8, maxR: get(signalRadius) * 3.5 },
      ]);
    }, i * 300);
  }

  floodBroadcast(src, '#f43f5e', 'sos');
}

// ─── Demo boot ───────────────────────────────────────────────────────────────

export function bootDemo(w: number, h: number): void {
  clearAll();
  logs.set([]);
  setTimeout(() => {
    addNode(w * 0.2, h * 0.5, 'Alpha');
    addNode(w * 0.4, h * 0.35, 'Beta');
    addNode(w * 0.6, h * 0.65, 'Gamma');
    addNode(w * 0.8, h * 0.45, 'Delta');
    addLog('SafeMesh cluster initialized', 'sys');
  }, 100);
}
