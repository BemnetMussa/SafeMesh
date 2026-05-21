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
  MeshScenario,
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

const DEFAULT_BATTERY        = 100;
const DEFAULT_SIGNAL         = 85;
const LOW_BATTERY_WARN       = 25;
export const WEAK_LINK_THRESHOLD = 0.3;  // links below this quality trigger an alert

// ─── Core stores ─────────────────────────────────────────────────────────────

export const canvasSignalRadius = writable(150);
export const mapSignalRadius    = writable(2500);
export const signalRadius       = writable(150);
export const animSpeed          = writable(6);
export const selectedNodeId     = writable<string | null>(null);
export const mapMode            = writable(false);
export const currentView        = writable<'topology' | 'dashboard'>('topology');

export const nodes          = writable<MeshNode[]>([]);
export const links          = writable<MeshLink[]>([]);
export const packets        = writable<any[]>([]);
export const sosWaves       = writable<any[]>([]);
export const failureFlashes = writable<{ x: number; y: number; r: number; alpha: number; xAlpha: number }[]>([]);

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

function syncSignalRadius(): void {
  signalRadius.set(get(mapMode) ? get(mapSignalRadius) : get(canvasSignalRadius));
}

// ─── ID counters ─────────────────────────────────────────────────────────────

let logIdCounter    = 0;
let eventIdCounter  = 0;
let messageIdCounter = 0;
let nodeIdCounter   = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function dist(a: MeshNode, b: MeshNode): number {
  if (get(mapMode) && a.lat != null && a.lon != null && b.lat != null && b.lon != null) {
    const R = 6371e3; // Earth radius in meters
    const phi1 = a.lat * Math.PI/180;
    const phi2 = b.lat * Math.PI/180;
    const deltaPhi = (b.lat - a.lat) * Math.PI/180;
    const deltaLambda = (b.lon - a.lon) * Math.PI/180;

    const val = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(val), Math.sqrt(1-val));
    return R * c;
  }
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
canvasSignalRadius.subscribe(() => {
  if (!get(mapMode)) syncSignalRadius();
});
mapSignalRadius.subscribe(() => {
  if (get(mapMode)) syncSignalRadius();
});
mapMode.subscribe(() => syncSignalRadius());
// NOTE: links.subscribe wired below, after _knownWeakLinks and _lastComponentCount are declared.

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
  // Exclude offline nodes so routing never traverses a dead node
  return currentNodes.filter(n => ids.has(n.id) && n.status !== 'offline');
}

// ─── Weak link monitoring ─────────────────────────────────────────────────────

const _knownWeakLinks = new Set<string>();

function checkWeakLinks(currentLinks: MeshLink[]): void {
  const nodeLabels = new Map(get(nodes).map(n => [n.id, n.label]));
  const label      = (id: string) => nodeLabels.get(id) ?? `#${id}`;

  const weakNow = new Set(
    currentLinks.filter(l => l.active && l.quality < WEAK_LINK_THRESHOLD).map(l => l.id),
  );

  weakNow.forEach(id => {
    if (!_knownWeakLinks.has(id)) {
      const l = currentLinks.find(lk => lk.id === id)!;
      addLog(`⚠ Weak link: ${label(l.source)} ↔ ${label(l.target)} (${Math.round(l.quality * 100)}%)`, 'sys');
      emitEvent('link_degraded', l.source, {
        target:  l.target,
        payload: { quality: l.quality },
        severity: 'warning',
      });
    }
  });

  _knownWeakLinks.forEach(id => {
    if (!weakNow.has(id)) {
      const l = currentLinks.find(lk => lk.id === id);
      if (l) {
        addLog(`✓ Link strengthened: ${label(l.source)} ↔ ${label(l.target)}`, 'sys');
        emitEvent('link_restored', l.source, {
          target:  l.target,
          payload: { quality: l.quality },
          severity: 'info',
        });
      }
    }
  });

  _knownWeakLinks.clear();
  weakNow.forEach(id => _knownWeakLinks.add(id));
}

// ─── Network partition detection (Gap 6) ─────────────────────────────────────

let _lastComponentCount = 0;

function checkNetworkPartition(): void {
  const onlineNodes = get(nodes).filter(n => n.status !== 'offline');
  if (onlineNodes.length <= 1) {
    _lastComponentCount = onlineNodes.length;
    return;
  }

  const currentLinks = get(links);
  const onlineIds    = new Set(onlineNodes.map(n => n.id));
  const adj          = new Map<string, Set<string>>();
  onlineNodes.forEach(n => adj.set(n.id, new Set()));

  currentLinks.forEach(l => {
    if (l.active && onlineIds.has(l.source) && onlineIds.has(l.target)) {
      adj.get(l.source)?.add(l.target);
      adj.get(l.target)?.add(l.source);
    }
  });

  const visited  = new Set<string>();
  let components = 0;
  for (const node of onlineNodes) {
    if (visited.has(node.id)) continue;
    components++;
    const queue = [node.id];
    visited.add(node.id);
    while (queue.length) {
      const cur = queue.shift()!;
      adj.get(cur)?.forEach(nb => {
        if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
      });
    }
  }

  if (components !== _lastComponentCount) {
    if (components > 1) {
      addLog(`⚠ Network partitioned — ${components} isolated groups`, 'sys');
      emitEvent('node_update', onlineNodes[0].id, {
        payload: { components, type: 'partition' },
        severity: 'critical',
      });
    } else if (_lastComponentCount > 1) {
      addLog('✓ Network reconnected — single partition restored', 'sys');
      emitEvent('link_restored', onlineNodes[0].id, {
        payload: { components: 1 },
        severity: 'info',
      });
    }
    _lastComponentCount = components;
  }
}

// Wire up the links subscriber now that all dependent state is initialised
links.subscribe(ls => {
  checkWeakLinks(ls);
  checkNetworkPartition();
});

// ─── Node management ─────────────────────────────────────────────────────────

export function addNode(x: number, y: number, label?: string, lat?: number, lon?: number): MeshNode {
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
    lat,
    lon,
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

export function updateNodeType(id: string, type: MeshNode['type']): void {
  nodes.update(ns => ns.map(n => n.id === id ? { ...n, type } : n));
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
  _knownWeakLinks.clear();
  _routeFailCounts.clear();
  _lastComponentCount = 0;
  nodes.set([]);
  links.set([]);
  packets.set([]);
  sosWaves.set([]);
  failureFlashes.set([]);
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
      _routeFailCounts.delete(path[0].id); // reset on success
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

// ─── Failure flash ────────────────────────────────────────────────────────────

export function flashFail(x: number, y: number): void {
  failureFlashes.update(ff => [
    ...ff,
    { x, y, r: 0,  alpha: 0.85, xAlpha: 1.0 },
    { x, y, r: 14, alpha: 0.40, xAlpha: 0   },
  ]);
}

// ─── Route failure tracking (Gap 3) ──────────────────────────────────────────

const _routeFailCounts = new Map<string, number>();
const ROUTE_FAIL_ALERT_EVERY = 3; // alert on 3rd, 6th, 9th … failure

function trackRouteFail(sourceId: string): void {
  const count = (_routeFailCounts.get(sourceId) ?? 0) + 1;
  _routeFailCounts.set(sourceId, count);

  if (count % ROUTE_FAIL_ALERT_EVERY === 0) {
    const label = get(nodes).find(n => n.id === sourceId)?.label ?? `#${sourceId}`;
    addLog(`🔴 ${label} has ${count} consecutive routing failures`, 'sys');
    emitEvent('message_failed', sourceId, {
      payload: { fail_count: count },
      severity: count >= ROUTE_FAIL_ALERT_EVERY * 2 ? 'critical' : 'warning',
    });
  }
}

// ─── Failed message record ────────────────────────────────────────────────────

export function recordFailedMessage(origin: string, destination: string, content: string): void {
  const msg: MeshMessage = {
    id:          String(++messageIdCounter),
    type:        'unicast',
    origin,
    destination,
    content,
    hops:        [origin],
    status:      'failed',
    timestamp:   Date.now(),
  };
  messages.update(ms => [...ms, msg]);
  trackRouteFail(origin);
}

// ─── SOS ─────────────────────────────────────────────────────────────────────

export function triggerSOS(
  sourceNode?: MeshNode,
  overridePos?: { x: number; y: number },
): void {
  const currentNodes = get(nodes);
  const src = sourceNode ?? currentNodes[Math.floor(Math.random() * currentNodes.length)];
  if (!src) return;

  const wavePos = overridePos ?? { x: src.x, y: src.y };
  const mapActive = get(mapMode);

  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      const waveBase = mapActive && src.lat != null && src.lon != null
        ? { lat: src.lat, lon: src.lon }
        : { x: wavePos.x, y: wavePos.y };
      sosWaves.update(sw => [
        ...sw,
        { ...waveBase, r: 0, alpha: 0.8, maxR: get(signalRadius) * 3.5 },
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

// ─── Preset topologies ───────────────────────────────────────────────────────

export type PresetName = 'star' | 'chain' | 'mesh' | 'ring';

const PRESET_LABELS = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'];

export function loadPreset(preset: PresetName, w: number, h: number): void {
  clearAll();
  logs.set([]);

  const cx = w / 2;
  const cy = h / 2;

  setTimeout(() => {
    switch (preset) {
      case 'star': {
        addNode(cx, cy, 'Hub');
        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
          addNode(cx + Math.cos(angle) * 130, cy + Math.sin(angle) * 130, PRESET_LABELS[i]);
        }
        break;
      }
      case 'chain': {
        const spacing = 130;
        const startX  = cx - (spacing * (PRESET_LABELS.length - 1)) / 2;
        PRESET_LABELS.forEach((lbl, i) => addNode(startX + i * spacing, cy, lbl));
        break;
      }
      case 'mesh': {
        // All 5 nodes within 140 px of every other node (radius 90 px)
        addNode(cx, cy, 'Core');
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI * 2) / 4 - Math.PI / 4;
          addNode(cx + Math.cos(angle) * 90, cy + Math.sin(angle) * 90, PRESET_LABELS[i]);
        }
        break;
      }
      case 'ring': {
        // Hex ring — only adjacent pairs fall within default signal radius (150 px)
        for (let i = 0; i < PRESET_LABELS.length; i++) {
          const angle = (i * Math.PI * 2) / PRESET_LABELS.length - Math.PI / 2;
          addNode(cx + Math.cos(angle) * 120, cy + Math.sin(angle) * 120, PRESET_LABELS[i]);
        }
        break;
      }
    }
    addLog(`Preset "${preset}" loaded`, 'sys');
  }, 100);
}

// ─── Scenario export ──────────────────────────────────────────────────────────

export function exportScenario(name: string): MeshScenario {
  return {
    version:    '1.0',
    name:       name.trim() || 'Untitled Scenario',
    created_at: Date.now(),
    nodes:      get(nodes),
    links:      get(links),
    events:     get(events),
    messages:   get(messages),
    simulation: get(simulationConfig),
  };
}

export function downloadScenario(name: string): void {
  const data  = exportScenario(name);
  const blob  = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = `${(data.name).replace(/\s+/g, '-').toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  addLog(`Scenario "${data.name}" exported`, 'sys');
}

export async function copyScenarioToClipboard(name: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(JSON.stringify(exportScenario(name), null, 2));
    addLog('Scenario JSON copied to clipboard', 'sys');
    return true;
  } catch {
    return false;
  }
}

// ─── Scenario import ──────────────────────────────────────────────────────────

export function importScenario(data: MeshScenario): void {
  simulationConfig.update(c => ({ ...c, status: 'idle' }));

  // Re-sync ID counters so new additions don't collide
  nodeIdCounter = (data.nodes ?? []).reduce((max, n) => {
    const num = parseInt(n.id);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  eventIdCounter = (data.events ?? []).reduce((max, e) => {
    const num = parseInt(e.id);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  messageIdCounter = (data.messages ?? []).reduce((max, m) => {
    const num = parseInt(m.id);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);

  _knownWeakLinks.clear();
  _routeFailCounts.clear();
  _lastComponentCount = 0;
  nodes.set((data.nodes ?? []).map(n => ({ ...n, pulseR: 0, pulseAlpha: 0 })));
  packets.set([]);
  sosWaves.set([]);
  failureFlashes.set([]);
  events.set(data.events ?? []);
  messages.set(data.messages ?? []);
  simulationConfig.set({
    ...(data.simulation ?? { speed: 1, tick: 0, seed: Date.now() }),
    status: 'idle',
  });
  logs.set([]);
  selectedNodeId.set(null);

  addLog(`Scenario "${data.name}" loaded — ${(data.nodes ?? []).length} nodes`, 'sys');
}
