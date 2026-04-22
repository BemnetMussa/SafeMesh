import { writable, get } from 'svelte/store';

export type Node = {
  id: string;
  x: number;
  y: number;
  label: string;
  color: string;
  pulseR: number;
  pulseAlpha: number;
};

export type LogEntry = {
  id: number;
  time: string;
  text: string;
  type: 'sys' | 'msg' | 'sos' | 'hop';
};

export const signalRadius = writable(150);
export const animSpeed = writable(6);

export const nodes = writable<Node[]>([]);
export const links = writable<[Node, Node][]>([]);
export const packetCount = writable(0);
export const globalStatus = writable<'IDLE' | 'ROUTING' | 'DELIVERED' | 'NO ROUTE' | 'SOS'>('IDLE');
export const logs = writable<LogEntry[]>([]);
export const packets = writable<any[]>([]); 
export const sosWaves = writable<any[]>([]);

let logIdCounter = 0;

export const NODE_COLORS = [
  '#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#2dd4bf'
];

export function addLog(text: string, type: LogEntry['type'] = 'sys') {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  logs.update(l => {
    const next = [...l, { id: ++logIdCounter, time, text, type }];
    if (next.length > 60) next.shift();
    return next;
  });
}

export function dist(a: Node, b: Node) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function updateLinks() {
  const currentNodes = get(nodes);
  const radius = get(signalRadius);
  const newLinks: [Node, Node][] = [];
  
  for (let i = 0; i < currentNodes.length; i++) {
    for (let j = i + 1; j < currentNodes.length; j++) {
      if (dist(currentNodes[i], currentNodes[j]) <= radius) {
        newLinks.push([currentNodes[i], currentNodes[j]]);
      }
    }
  }
  links.set(newLinks);
}

nodes.subscribe(() => updateLinks());
signalRadius.subscribe(() => updateLinks());

export function getNeighbors(node: Node): Node[] {
  const r = get(signalRadius);
  return get(nodes).filter(n => n.id !== node.id && dist(node, n) <= r);
}

let nodeIdCounter = 0;
export function addNode(x: number, y: number, label?: string) {
  nodeIdCounter++;
  const idStr = String(nodeIdCounter);
  const lbl = label || `Node ${idStr.padStart(2, '0')}`;
  const color = NODE_COLORS[(nodeIdCounter - 1) % NODE_COLORS.length];
  
  const newNode: Node = {
    id: idStr, x, y, label: lbl, color, pulseR: 0, pulseAlpha: 0
  };
  
  nodes.update(ns => [...ns, newNode]);
  updateLinks(); // Ensure sync
  addLog(`Node ${lbl} joined`, 'sys');
}

export function removeNode(id: string) {
  nodes.update(ns => {
    const n = ns.find(n => n.id === id);
    if (n) addLog(`Node ${n.label} disconnected`, 'sys');
    return ns.filter(n => n.id !== id);
  });
}

export function clearAll() {
  nodes.set([]);
  packets.set([]);
  sosWaves.set([]);
  packetCount.set(0);
  nodeIdCounter = 0;
  addLog('Mesh network reset', 'sys');
}

export function findPath(fromNode: Node, toNode: Node): Node[] | null {
  if (fromNode.id === toNode.id) return [fromNode];
  const visited = new Set([fromNode.id]);
  const queue: [Node, Node[]][] = [[fromNode, [fromNode]]];
  
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

export function sendPacketAlongPath(path: Node[], color: string, payload: string, type: 'msg' | 'sos' = 'msg') {
  if (!path || path.length < 2) return;
  globalStatus.set('ROUTING');
  
  const speed = get(animSpeed);
  
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const delay = i * (1200 / speed);
    
    setTimeout(() => {
      nodes.update(ns => {
        const n = ns.find(n => n.id === from.id);
        if (n) { n.pulseR = 0; n.pulseAlpha = 1; }
        return ns;
      });
      
      packets.update(ps => [...ps, {
        fromX: from.x, fromY: from.y,
        toX: to.x, toY: to.y,
        progress: 0, color, type,
        speed: 0.012 * get(animSpeed),
        trail: []
      }]);
      
      packetCount.update(c => c + 1);
      
      if (i === 0) {
         addLog(type === 'sos' ? `🆘 SOS via ${from.label}` : `📤 TX: ${from.label} -> ${path[path.length-1].label}`, type === 'sos' ? 'sos' : 'msg');
      }
      
      if (i === path.length - 2) {
        setTimeout(() => {
           addLog(`✅ DELIVERED to ${to.label}`, 'success' as any);
           nodes.update(ns => {
             const n = ns.find(n => n.id === to.id);
             if (n) { n.pulseR = 0; n.pulseAlpha = 1; }
             return ns;
           });
           globalStatus.set('DELIVERED');
           setTimeout(() => {
             if (get(globalStatus) === 'DELIVERED') globalStatus.set('IDLE');
           }, 2000);
        }, 900 / get(animSpeed));
      }
    }, delay);
  }
}

export function floodBroadcast(source: Node, color: string, type: 'msg' | 'sos' = 'msg') {
  const visited = new Set([source.id]);
  const queue = [source];
  let hop = 0;
  
  globalStatus.set(type === 'sos' ? 'SOS' : 'ROUTING');
  if (type === 'sos') addLog(`🆘 EMERGENCY BROADCAST from ${source.label}!`, 'sos');
  
  function processLevel() {
    if (queue.length === 0) {
      setTimeout(() => {
        if (get(globalStatus) !== 'IDLE') globalStatus.set('IDLE');
      }, 1000);
      return;
    }
    const level = [...queue];
    queue.length = 0;
    hop++;
    const s = get(animSpeed);
    const delayMs = (hop - 1) * (900 / s);
    
    level.forEach(node => {
      getNeighbors(node).forEach(nb => {
        if (!visited.has(nb.id)) {
          visited.add(nb.id);
          queue.push(nb);
          setTimeout(() => {
            nodes.update(ns => {
              const n = ns.find(nx => nx.id === node.id);
              if (n) { n.pulseR = 0; n.pulseAlpha = 1; }
              return ns;
            });
            packets.update(ps => [...ps, {
              fromX: node.x, fromY: node.y,
              toX: nb.x, toY: nb.y,
              progress: 0, color, type,
              speed: 0.014 * get(animSpeed),
              trail: []
            }]);
            packetCount.update(c => c + 1);
          }, delayMs);
        }
      });
    });
    
    if (queue.length > 0) {
      setTimeout(processLevel, 900 / s);
    }
  }
  
  processLevel();
}

export function triggerSOS(sourceNode?: Node) {
  const currentNodes = get(nodes);
  const src = sourceNode || currentNodes[Math.floor(Math.random() * currentNodes.length)];
  if (!src) return;
  
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      sosWaves.update(sw => [...sw, { x: src.x, y: src.y, r: 0, alpha: 0.8, maxR: get(signalRadius) * 3.5 }]);
    }, i * 300);
  }
  
  floodBroadcast(src, '#f43f5e', 'sos');
}

export function bootDemo(w: number, h: number) {
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
