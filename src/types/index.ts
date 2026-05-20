// ─── Node ─────────────────────────────────────────────────────────────────────

export type NodeType = 'generic' | 'relay' | 'sensor' | 'gateway';

export type NodeStatus = 'online' | 'warning' | 'offline';

export interface MeshNode {
  // Identity & display
  id: string;
  label: string;
  type: NodeType;
  color: string;           // hex, used for canvas rendering

  // Canvas position
  x: number;
  y: number;

  // Connectivity
  neighbors: string[];     // IDs of directly connected nodes
  signal_strength: number; // 0–100

  // Health
  status: NodeStatus;
  battery: number;         // 0–100
  last_seen: number;       // unix ms

  // Animation state (canvas-only, not persisted to scenario)
  pulseR: number;
  pulseAlpha: number;

  // Extensible metadata for future node profiles
  metadata: Record<string, unknown>;
}

// ─── Link ─────────────────────────────────────────────────────────────────────

export interface MeshLink {
  id: string;       // `${sourceId}__${targetId}` (IDs sorted so a–b === b–a)
  source: string;   // node id
  target: string;   // node id
  quality: number;  // 0–1, 1 = perfect signal
  active: boolean;
}

// ─── Event ────────────────────────────────────────────────────────────────────

export type MeshEventType =
  | 'node_join'
  | 'node_leave'
  | 'node_update'
  | 'link_degraded'
  | 'link_restored'
  | 'message_sent'
  | 'message_received'
  | 'message_failed'
  | 'battery_low'
  | 'sos';

export type EventSeverity = 'info' | 'warning' | 'critical';

export interface MeshEvent {
  id: string;
  timestamp: number;       // unix ms
  source: string;          // originating node id
  target?: string;         // destination node id (optional)
  event_type: MeshEventType;
  payload: Record<string, unknown>;
  hop_count: number;
  severity: EventSeverity;
}

// ─── Message ──────────────────────────────────────────────────────────────────

export type MeshMessageType = 'unicast' | 'broadcast' | 'sos';

export type MeshMessageStatus = 'queued' | 'in-flight' | 'delivered' | 'failed';

export interface MeshMessage {
  id: string;
  type: MeshMessageType;
  origin: string;          // source node id
  destination?: string;    // target node id (unicast only)
  content: string;
  hops: string[];          // ordered relay path of node ids
  status: MeshMessageStatus;
  timestamp: number;       // unix ms when the message was created
}

// ─── Simulation ───────────────────────────────────────────────────────────────

export type SimulationStatus = 'idle' | 'running' | 'paused';

export interface SimulationConfig {
  speed: number;          // tick rate multiplier: 0.5–10
  status: SimulationStatus;
  tick: number;           // current tick counter
  seed: number;           // used for deterministic replay
}

// ─── Scenario (import / export) ───────────────────────────────────────────────

export interface MeshScenario {
  version: string;
  name: string;
  created_at: number;
  nodes: MeshNode[];
  links: MeshLink[];
  events: MeshEvent[];
  messages: MeshMessage[];
  simulation: SimulationConfig;
}
