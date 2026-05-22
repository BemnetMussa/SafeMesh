# SafeMesh — Final Progress Report

**Adama Science and Technology University**
School of Electrical Engineering and Computing
Integrated Engineering Team Project

| Field | Detail |
|---|---|
| **Project Name** | SafeMesh: Offline-First Decentralized Communication Network |
| **Submission Date** | May 21, 2026 |
| **Instructor** | Mr. Anteneh |
| **Branch** | `feat/fronted-finalize` |

---

## Team Members

| Name | Department | ID |
|---|---|---|
| Abenezer Abebe | Software Engineering | UGR/30068/15 |
| Aman Abdela | Software Engineering | UGR/30134/15 |
| Aschalew Daraje | Software Engineering | UGR/30188/15 |
| Tsion Wubshet | Software Engineering | UGR/31333/15 |
| Abubeker Assefa | Software Engineering | UGR/30106/15 |
| Yusuf Mohammed | Computer Science & Engineering | UGR/31467/15 |
| Sirajudin Seid | Computer Science & Engineering | UGR/31238/15 |
| Ezra Leye | Software Engineering | UGR/30516/15 |
| Jalete Kebede | Software Engineering | UGR/30722/15 |
| Kirubel Asfaw | Electrical & Computer Engineering | UGR/25485/14 |
| Yididya Teklu | Electrical & Computer Engineering | UGR/31409/15 |
| Bemnet Mussa | Software Engineering | UGR/30257/15 |

---

## Abstract

SafeMesh is an offline-first, decentralized mesh communication platform designed for environments where internet, cellular, and central infrastructure are unavailable. The system is built around two parallel tracks: a fully functional web-based simulation dashboard that allows users to visualize, test, and debug mesh network behavior before hardware deployment; and a custom-designed hardware node based on the ESP32-S3 microcontroller and the SX1262 LoRa radio transceiver running Meshtastic firmware.

The dashboard enables real-time visualization of mesh topology, packet routing, SOS alert propagation, node health monitoring, and simulation playback. It is implemented in Svelte 5 and TypeScript, designed as a Progressive Web App with no backend dependency in its current simulation phase. The hardware node is a custom PCB integrating the ESP32-S3-WROOM-1, the Wio SX1262 LoRa module, a USB-C interface, LTC4054 Li-Ion battery charger, and ADP124 3.3V LDO regulator — capable of multi-kilometre off-grid communication through the open-source Meshtastic protocol.

This report documents the complete design decisions, implemented components, architecture, current system state, and planned next steps toward hardware-dashboard integration.

---

## Table of Contents

1. [Project Goals](#1-project-goals)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Frontend Dashboard — Implemented](#4-frontend-dashboard--implemented)
5. [Hardware Node Design](#5-hardware-node-design)
6. [Data Model](#6-data-model)
7. [Algorithm Design](#7-algorithm-design)
8. [Simulation Engine](#8-simulation-engine)
9. [Security Design](#9-security-design)
10. [Risk Assessment](#10-risk-assessment)
11. [Current Progress Status](#11-current-progress-status)
12. [Planned Next Steps](#12-planned-next-steps)
13. [Bill of Materials & Cost Estimate](#13-bill-of-materials--cost-estimate)
14. [Scaling Roadmap](#14-scaling-roadmap)
15. [References](#15-references)

---

## 1. Project Goals

SafeMesh addresses a critical gap in communication infrastructure for rural, remote, and disaster-affected environments where cellular and internet connectivity cannot be assumed. The system is designed around three core objectives:

**1. Simulation-First Validation**
Before deploying physical hardware, the team built a complete web-based simulator that allows any mesh topology to be modeled, tested, and debugged. This reduces the cost and risk of hardware iteration and provides a clear visual tool for understanding mesh routing behavior.

**2. Mesh-Agnostic Dashboard Architecture**
The dashboard is designed around a common node-and-event data model, meaning it is not tied to one protocol or vendor. The same frontend can later support ESP-NOW, Meshtastic/LoRa, Wi-Fi mesh, or other node types without requiring a redesign of the UI layer.

**3. Real-World Hardware Readiness**
Parallel to the software track, the team designed a custom PCB that integrates the ESP32-S3 and SX1262 LoRa transceiver, running Meshtastic open-source firmware. This forms the hardware target for the first live integration of the SafeMesh dashboard.

**Target Users:**
- Field engineers and developers building or testing mesh deployments
- Emergency response and disaster-response teams
- Students and researchers learning mesh networking through interactive simulation
- Rural community organizations needing low-cost, infrastructure-free communication

---

## 2. System Architecture

SafeMesh follows a three-layer architecture:

```
┌─────────────────────────────────────────────────────┐
│              SafeMesh Web Dashboard                 │
│   (Svelte 5 · TypeScript · Leaflet · Vite)          │
│                                                     │
│  ┌──────────────┐  ┌───────────┐  ┌─────────────┐  │
│  │ Mesh Canvas  │  │ Sidebar   │  │  Inspector  │  │
│  │ (topology /  │  │ (controls,│  │ (node       │  │
│  │  map view)   │  │  logs,    │  │  telemetry) │  │
│  └──────────────┘  │  presets) │  └─────────────┘  │
│                    └───────────┘                    │
│         Simulation Engine (engine.ts)               │
│         Tick Engine    (simulation.ts)              │
└────────────────────┬────────────────────────────────┘
                     │  (planned: WebSocket / Serial bridge)
┌────────────────────▼────────────────────────────────┐
│              Gateway Bridge Layer                   │
│        (Meshtastic HTTP API / Serial UART)          │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│            Physical Mesh Nodes                      │
│   ESP32-S3 + SX1262 LoRa · Meshtastic Firmware      │
│         Multi-kilometre off-grid range              │
└─────────────────────────────────────────────────────┘
```

The dashboard currently operates in **simulation mode** — all node state, routing, and events are handled entirely in the browser using reactive Svelte stores. The gateway bridge layer is the next implementation milestone, after which the same dashboard will display live telemetry from physical Meshtastic nodes.

---

## 3. Technology Stack

### Frontend Dashboard (Implemented)

| Layer | Technology |
|---|---|
| Framework | Svelte 5 + TypeScript |
| Build Tool | Vite 8 |
| Map Rendering | Leaflet |
| Icons | lucide-svelte |
| Type Checking | svelte-check + TypeScript 6 |
| Routing | Browser History API (pushState / popstate) |
| State Management | Svelte reactive stores |

### Hardware Node (Designed)

| Component | Technology |
|---|---|
| Microcontroller | ESP32-S3-WROOM-1-N16R8 (dual-core, 16MB flash, 8MB PSRAM) |
| Radio | Wio SX1262 LoRa module (SPI) |
| Firmware | Meshtastic (open-source, C++ / Arduino) |
| Power Input | USB-C with TVS ESD protection |
| Battery Charger | LTC4054ES5 Li-Ion charger IC |
| Voltage Regulator | ADP124ACPZ-3.3-R7 (LDO, 3.3V) |
| Schematic Tool | Altium Designer |

### Planned Backend (Next Phase)

| Layer | Technology |
|---|---|
| API Server | Python 3.11 + Flask |
| Gateway Bridge | PySerial (USB/UART to Meshtastic) |
| Database | SQLite (prototype) → PostgreSQL (production) |
| API Spec | OpenAPI 3.0 / Swagger UI |
| Auth | JWT-based session tokens |

---

## 4. Frontend Dashboard — Implemented

The SafeMesh dashboard is the most complete component of the system. It is a fully functional mesh network simulator running entirely in the browser, with no backend dependency in the current phase.

### 4.1 Application Layout

The dashboard uses a three-panel layout:

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Node count · Link count · Alerts · SOS · Reset     │
├─────────────────┬───────────────────────┬───────────────────┤
│                 │                       │                   │
│   Sidebar       │    MeshCanvas         │   Inspector       │
│                 │    (topology or map)  │   (node detail)   │
│  · Transmit UI  │                       │                   │
│  · Presets      │    Packet animation   │  · Battery        │
│  · Sim controls │    Node drag/move     │  · Signal         │
│  · Log tabs     │    Pan / Zoom         │  · Neighbors      │
│                 │    Link quality color │  · Metadata       │
└─────────────────┴───────────────────────┴───────────────────┘
```

An alternative **Dashboard / Telemetry view** replaces the canvas with aggregate event history, message flow tables, and network statistics.

### 4.2 Key Components

| File | Responsibility |
|---|---|
| `src/lib/engine.ts` | Central store management, BFS routing, messaging, link quality, health monitoring, scenario import/export |
| `src/lib/simulation.ts` | Tick-based simulation: battery drain, signal jitter, play/pause/step/reset/speed |
| `src/types/index.ts` | Shared TypeScript interfaces: `MeshNode`, `MeshLink`, `MeshEvent`, `MeshMessage`, `MeshScenario` |
| `src/components/MeshCanvas.svelte` | Canvas + Leaflet dual-mode rendering, packet animation, drag, pan/zoom |
| `src/components/Header.svelte` | Stats display, SOS trigger, node add, reset, view toggle |
| `src/components/Sidebar.svelte` | Message transmit, signal range slider, preset topologies, simulation controls, log/event/SOS tabs |
| `src/components/Inspector.svelte` | Per-node detail panel with metadata editing |
| `src/components/Dashboard.svelte` | Aggregate telemetry: event history, message flow, network stats |
| `src/components/Landing.svelte` | Marketing and documentation landing page |
| `src/App.svelte` | Route handling between `/` (landing) and `/app` (simulator) |

### 4.3 Implemented Features

**Topology Visualization**
- Canvas mode: abstract pixel-based graph — ideal for simulation and debugging
- Map mode: Leaflet geographic overlay — ideal for real-world deployment planning
- Toggle between modes without losing node positions
- Node drag-to-move, pan, zoom, hover selection

**Node Management**
- Add, remove, reposition, and inspect nodes
- Auto-link recalculation when nodes move or signal range changes
- Node status: `online`, `warning` (low battery), `offline`
- Node metadata: battery level, signal strength, neighbors, last seen

**Message & Packet Flow**
- Unicast messages: BFS shortest-path routing from source to target
- Broadcast messages: controlled flooding across all reachable nodes
- SOS priority alerts: flood broadcast with visual wave animation
- Animated packet travel along hop paths
- Failure detection: red flash on failed routing, escalating alert on repeated failures
- Full message history with status (`queued` → `in-flight` → `delivered` / `failed`)

**Telemetry & Alerts**
- Weak link detection: alerts when link quality drops below threshold (< 0.3)
- Network partition detection: BFS component count; alerts on disconnected subgraphs
- Battery drain simulation: 0.05% per tick; warning at ≤ 25%, offline at 0%
- Signal jitter: randomized per tick for realistic behavior
- Event log (max 200 structured entries) and UI log feed (max 60 entries)
- Separate tabs: Logs · Events · Messages · SOS Alerts

**Simulation Controls**
- Play / Pause / Step / Reset
- Variable speed multiplier
- Preset topologies: Star · Chain · Mesh · Ring
- Scenario export (JSON snapshot of all nodes, links, events, messages, simulation state)
- Scenario import (full state restore for repeatable demos)

**Link Quality Model**
- Canvas mode: `quality = 1 − (pixelDistance / signalRadius)`
- Map mode: Haversine formula for geographic distance in meters
- Links visually encoded by color intensity (strong = bright, weak = faded)

---

## 5. Hardware Node Design

The SafeMesh hardware node is a custom PCB designed to serve as the first physical mesh node. It is built on the **ESP32-S3-WROOM-1** microcontroller and the **Wio SX1262** LoRa radio transceiver, running **Meshtastic** open-source firmware. This combination provides multi-kilometre off-grid communication at low cost.

> **Design Note:** The hardware design is based on a well-documented Meshtastic node reference design which was reverse-engineered and extended by the SafeMesh hardware team. The board integrates all required components into a single PCB, eliminating external wiring and making the node field-ready.

### 5.1 Hardware Architecture

```
┌────────────────────────────────────────────────┐
│              SafeMesh Node PCB                 │
│                                                │
│  USB-C ──► TVS Protection ──► LTC4054 ──► BAT │
│                                     │          │
│                                  ADP124        │
│                                  (3.3V LDO)    │
│                                     │          │
│                         ┌───────────┴──────┐   │
│                         │  ESP32-S3-WROOM-1│   │
│                         │  Dual-core · WiFi│   │
│                         │  BT · 16MB flash │   │
│                         └────────┬─────────┘   │
│                                  │ SPI          │
│                         ┌────────▼─────────┐   │
│                         │  Wio SX1262 LoRa │   │
│                         │  868/915 MHz ISM │   │
│                         │  km-scale range  │   │
│                         └──────────────────┘   │
│                                                │
│  GPIO Headers · OLED Header · Battery ADC      │
│  Reset + Boot Tactile Switches · Status LEDs   │
└────────────────────────────────────────────────┘
```

### 5.2 Key Design Decisions

**ESP32-S3-WROOM-1 as the MCU**
The S3 variant was chosen over the classic ESP32 for its improved dual-core architecture, native USB support, larger flash (16MB) and PSRAM (8MB), and better Bluetooth LE performance. This headroom supports future Meshtastic firmware updates and potential GPS/sensor integration without hardware changes.

**SX1262 LoRa over ESP-NOW**
LoRa via the SX1262 was selected for its multi-kilometre range (up to 20km line-of-sight), ultra-low power consumption, and sub-GHz ISM band operation, which is far more suitable for emergency field deployment than the 250m range of ESP-NOW. The Wio SX1262 module is pre-certified and includes an integrated RF front-end, eliminating complex antenna matching work.

**Meshtastic Firmware**
Meshtastic provides a production-ready, open-source mesh protocol with built-in channel encryption, GPS position sharing, group messaging, and a mature mobile + web client ecosystem. It exposes an HTTP REST API, Bluetooth GATT, and serial UART interface, all of which are viable integration points for the SafeMesh dashboard bridge.

**Power System**
The LTC4054ES5 handles Li-Ion charging from the USB-C input at a current set by a 2kΩ resistor on the PROG pin. The ADP124 3.3V LDO then supplies both the ESP32-S3 and SX1262 with a clean, stable rail. A voltage divider (390kΩ / 100kΩ) on an ADC pin allows the firmware to report battery percentage through the Meshtastic network — visible on the SafeMesh dashboard.

**Expansion Capability**
The board exposes GPIO header pins, an I²C OLED display header, and a JST battery connector. This allows future attachment of sensors, displays, or GPS modules without PCB modification.

### 5.3 Protocol Comparison

| Attribute | ESP-NOW | Meshtastic / LoRa (Selected) |
|---|---|---|
| Range | ~250m | 1–20km (line of sight) |
| Frequency Band | 2.4GHz (WiFi) | 868/915MHz ISM |
| Power Consumption | Higher | Ultra-low |
| Infrastructure Needed | None | None |
| Firmware Maturity | Basic | Production-grade open-source |
| Dashboard API | None built-in | HTTP REST, BT, Serial, MQTT |
| Encryption | Optional | Built-in AES-128 channel keys |

---

## 6. Data Model

### 6.1 Node Schema

Each node in the SafeMesh model carries:

```typescript
interface MeshNode {
  id: string;
  label: string;
  type: 'standard' | 'gateway' | 'sos-origin';
  status: 'online' | 'warning' | 'offline';
  position: { x: number; y: number };        // canvas
  geoPosition?: { lat: number; lng: number }; // map mode
  battery: number;       // 0–100
  signal: number;        // 0–1
  neighbors: string[];
  lastSeen: number;      // timestamp
  metadata: Record<string, string>;
}
```

### 6.2 Event Schema

All simulation and hardware events share a unified format:

```typescript
interface MeshEvent {
  id: string;
  timestamp: number;
  source: string;
  target?: string;
  type: 'message' | 'sos' | 'node-join' | 'node-loss' | 'link-weak' | 'partition' | 'battery-low';
  payload: Record<string, unknown>;
  hopCount: number;
  severity: 'info' | 'warning' | 'critical';
}
```

This unified schema means the same frontend rendering logic handles both simulated events and future live hardware telemetry events without modification.

### 6.3 Planned Database Schema (Backend Phase)

| Table | Key Fields | Purpose |
|---|---|---|
| `nodes` | `node_id`, `mac`, `battery`, `last_seen` | Device registry and health |
| `messages` | `seq_id`, `sender`, `content`, `timestamp`, `is_sos` | Full message history |
| `telemetry` | `node_id`, `voltage`, `rssi`, `timestamp` | Per-node performance metrics |
| `network_keys` | `key_hash`, `created_at` | Channel encryption key management |

---

## 7. Algorithm Design

The SafeMesh simulation engine implements five distinct algorithms, each solving a specific problem in mesh networking. A significant portion of the team's engineering effort went into designing, implementing, and validating these algorithms inside the browser — with no external libraries, running in real time against a reactive Svelte store graph.

---

### 7.1 Background: Industry Standard — AODV

Before describing SafeMesh's algorithms, it is worth contextualising them against the academic and industry standard for ad-hoc mesh routing.

**AODV (Ad-hoc On-Demand Distance Vector)** — defined in IETF RFC 3561 (Perkins, Belding-Royer, Das, 2003) — is the most widely cited routing protocol for mobile ad-hoc networks (MANETs). It is reactive: routes are discovered on demand via a flood of Route Request (RREQ) packets, and only the route back from the destination to the source is recorded. It avoids storing full topology state, making it efficient for dynamic, resource-constrained networks.

```
AODV Route Discovery (simplified):
  Source floods RREQ(dest) across the network
  Each node checks: do I know a fresh route to dest?
    YES → unicast RREP back toward source
    NO  → rebroadcast RREQ (increment hop count)
  Source receives RREP → route established
  Data packets follow the discovered route
  Route Errors (RERR) propagate back when links break
```

**How SafeMesh relates to AODV:**
SafeMesh's architecture shares AODV's core principle — on-demand route discovery, no pre-computed routing tables, and flood-based network awareness. However, SafeMesh simplifies the model for simulation purposes: since the entire network graph is available in memory (as Svelte stores), it replaces AODV's distributed RREQ/RREP handshake with a direct BFS traversal over the live graph. The result is equivalent to AODV's minimum-hop route, computed instantaneously rather than via a multi-step network exchange. This is a deliberate design choice appropriate for a simulator; the hardware layer (Meshtastic firmware) implements the full distributed protocol on real nodes.

---

### 7.2 Algorithm 1 — BFS Shortest-Path Unicast Routing

**Problem:** Given a source node and a destination node, find the minimum-hop path through currently reachable (online) nodes.

**Algorithm:** Breadth-First Search (BFS) over the live node graph.

**Why BFS over Dijkstra?**
In an unweighted graph (where all hops have equal cost), BFS is provably optimal for minimum-hop routing and runs in O(V + E) time. Dijkstra's algorithm would give the same result but with O((V + E) log V) overhead. Since link quality is a monitoring signal rather than a routing cost in SafeMesh v1, BFS is the correct choice.

**Implementation** (`src/lib/engine.ts:382`):

```
ALGORITHM: findPath(source, destination)
  INPUT:  source node, destination node
  OUTPUT: ordered array of nodes [source → ... → destination], or null

  if source == destination → return [source]

  visited ← {source.id}
  queue   ← [(source, [source])]

  while queue is not empty:
    (current, path) ← dequeue(queue)
    for each neighbor of current (online nodes only):
      if neighbor == destination → return path + [neighbor]
      if neighbor.id not in visited:
        visited.add(neighbor.id)
        enqueue(queue, (neighbor, path + [neighbor]))

  return null  // no route exists
```

**Complexity:** O(V + E) where V = number of online nodes, E = number of active links.

**Properties:**
- Guarantees minimum hop count (optimal for latency in mesh networks)
- Automatically excludes offline nodes from routing
- Returns `null` cleanly when no path exists, triggering a route failure event
- Stateless — recomputed fresh on every message send, so topology changes are always reflected

---

### 7.3 Algorithm 2 — Controlled Flood Broadcast with Deduplication

**Problem:** Propagate a message to every reachable node in the network without creating broadcast storms or infinite relay loops.

**Algorithm:** BFS-based level-order flood with a visited-set for deduplication.

**Why not pure flooding?**
Naive flooding (every node retransmits every packet to all neighbors) causes a broadcast storm — exponential packet multiplication. The visited-set ensures each node relays a message exactly once, reducing total transmissions from O(2^n) to O(E).

**Implementation** (`src/lib/engine.ts:511`):

```
ALGORITHM: floodBroadcast(source, type)
  INPUT:  source node, message type (broadcast | sos)
  OUTPUT: message delivered to all reachable nodes

  visited ← {source.id}
  queue   ← [source]
  hopCount ← 0

  while queue is not empty:
    level ← copy(queue); clear(queue)
    hopCount++

    for each node in level:
      for each neighbor of node:
        if neighbor.id not in visited:
          visited.add(neighbor.id)
          queue.push(neighbor)
          animate packet: node → neighbor   // visual hop

    await travel_time  // stagger hops for animation

  mark message as delivered (visited.size nodes reached)
```

**Complexity:** O(V + E) — each node and link visited exactly once.

**Properties:**
- Level-order traversal produces a natural wave-front animation matching real radio propagation
- SOS messages use the same algorithm but trigger additional visual wave effects at the source
- `visited` set is the deduplication mechanism — analogous to Sequence ID tracking in Meshtastic firmware
- Propagation is asynchronous (`await sleep`) so the UI updates per hop rather than all at once

---

### 7.4 Algorithm 3 — Haversine Geographic Distance

**Problem:** In map mode, nodes have real geographic coordinates (latitude, longitude). Pixel distance is meaningless — distance must be computed on the surface of the Earth.

**Algorithm:** Haversine formula — computes great-circle distance between two points on a sphere.

**Implementation** (`src/lib/engine.ts:82`):

```
ALGORITHM: dist(nodeA, nodeB) — map mode
  INPUT:  two nodes with (lat, lon) in degrees
  OUTPUT: distance in metres

  R ← 6,371,000  // Earth radius in metres

  φ₁ ← nodeA.lat × π/180
  φ₂ ← nodeB.lat × π/180
  Δφ ← (nodeB.lat − nodeA.lat) × π/180
  Δλ ← (nodeB.lon − nodeA.lon) × π/180

  a ← sin²(Δφ/2) + cos(φ₁) × cos(φ₂) × sin²(Δλ/2)
  c ← 2 × atan2(√a, √(1−a))

  return R × c  // distance in metres
```

**Why it matters:**
Without the Haversine formula, placing two nodes 2km apart at different latitudes would produce incorrect link quality scores and incorrect signal range calculations. Using true geodesic distance makes the map mode simulation physically accurate — a node with a 2.5km signal radius correctly links to all nodes within 2.5km of actual ground distance, matching what a real LoRa radio would achieve.

---

### 7.5 Algorithm 4 — BFS Connected Components (Network Partition Detection)

**Problem:** After a node goes offline or a link degrades, the network may split into isolated islands that cannot communicate. Detect this automatically and alert the operator.

**Algorithm:** BFS connected-component counting over the online-node subgraph.

**Implementation** (`src/lib/engine.ts:238`):

```
ALGORITHM: checkNetworkPartition()
  INPUT:  current nodes (online only), current links
  OUTPUT: emits critical alert if components > 1

  onlineNodes ← nodes where status ≠ 'offline'
  if |onlineNodes| ≤ 1 → return

  build adjacency map from active links between online nodes

  visited    ← {}
  components ← 0

  for each node in onlineNodes:
    if node.id in visited → continue
    components++
    BFS from node:
      mark all reachable online nodes as visited

  if components ≠ lastComponentCount:
    if components > 1 → emit CRITICAL: "Network partitioned — N isolated groups"
    if components == 1 → emit INFO: "Network reconnected"
    lastComponentCount ← components
```

**Complexity:** O(V + E) per check, triggered reactively on every link state change.

**Properties:**
- Runs automatically whenever the `links` store changes (Svelte reactive subscription)
- Only fires an alert when the partition state *changes*, preventing repeated duplicate alerts
- Detects both partition onset and partition recovery
- Critical for disaster-response use cases — operator knows immediately when the network splits

---

### 7.6 Algorithm 5 — Link Quality Scoring and Weak Link Detection

**Problem:** Quantify the reliability of each radio link and alert when a link becomes too weak to be trusted for routing.

**Link Quality Formula:**

```
quality = 1 − (distance / signalRadius)

Range: [0.0, 1.0]
  1.0 = nodes at same position (maximum strength)
  0.0 = nodes at the edge of signal range (minimum strength)
  < 0 = link does not exist (nodes out of range, no link created)
```

**Weak Link Threshold:** `quality < 0.3` triggers a warning alert.

**Implementation** (`src/lib/engine.ts:148` for link generation, `196` for monitoring):

```
ALGORITHM: updateLinks()
  for each pair (nodeA, nodeB):
    d ← dist(nodeA, nodeB)
    if d ≤ signalRadius:
      quality ← 1 − (d / signalRadius)
      create or update link(nodeA, nodeB, quality)
    else:
      remove link if exists

ALGORITHM: checkWeakLinks(links)
  weakNow ← {link | link.quality < WEAK_LINK_THRESHOLD}

  for each link in weakNow not in knownWeakLinks:
    emit WARNING: "Weak link: NodeA ↔ NodeB (quality%)"

  for each link in knownWeakLinks not in weakNow:
    emit INFO: "Link strengthened: NodeA ↔ NodeB"

  knownWeakLinks ← weakNow
```

**Properties:**
- Links are recomputed on every node move and every signal radius change
- The threshold at 0.3 (30% quality) was chosen as the point below which real LoRa links become unreliable under interference — consistent with Meshtastic's own link quality thresholds
- State diffing (`weakNow` vs `knownWeakLinks`) ensures alerts fire exactly once per transition, not on every tick

---

### 7.7 Algorithm 6 — Route Failure Escalation

**Problem:** A single failed route could be noise (a node briefly offline). Repeated failures from the same source node indicate a structural connectivity problem that needs escalation.

**Algorithm:** Per-source failure counter with modular escalation.

```
ALGORITHM: trackRouteFail(sourceId)
  failCount[sourceId]++

  if failCount[sourceId] % 3 == 0:
    severity ← failCount >= 6 ? CRITICAL : WARNING
    emit alert: "Node X has N consecutive routing failures"
```

**Properties:**
- Alert fires on 3rd, 6th, 9th… failure — not on every failed send
- Severity escalates from WARNING to CRITICAL at 6+ failures
- Counter resets to zero on any successful delivery from that source
- Prevents alert fatigue while still surfacing persistent connectivity problems

---

### 7.8 Algorithm Summary

| # | Algorithm | Used For | Complexity | Location |
|---|---|---|---|---|
| 1 | BFS Shortest Path | Unicast routing | O(V+E) | `engine.ts:382` |
| 2 | BFS Flood + Deduplication | Broadcast / SOS | O(V+E) | `engine.ts:511` |
| 3 | Haversine Formula | Geographic distance in map mode | O(1) per pair | `engine.ts:82` |
| 4 | BFS Connected Components | Network partition detection | O(V+E) | `engine.ts:238` |
| 5 | Linear Quality Scoring + Diff | Link quality & weak link alerts | O(E) | `engine.ts:148,196` |
| 6 | Modular Failure Counter | Route failure escalation | O(1) | `engine.ts:593` |

All six algorithms run entirely in the browser with no server dependency. Together they form the core intelligence of the SafeMesh simulation engine.

---

## 8. Simulation Engine

The simulation engine (`src/lib/simulation.ts`) drives the time-based behavior of the network:

| Feature | Behavior |
|---|---|
| Battery drain | −0.05% per tick × speed multiplier |
| Signal jitter | Random ±noise per tick per node |
| Status thresholds | Warning at ≤ 25% battery, offline at 0% |
| Tick modes | Play (continuous), Pause, Step (single tick), Reset |
| Speed control | 0.5×, 1×, 2×, 4× multipliers |
| Event emission | Status changes, battery warnings, partition detection |

The engine is decoupled from the UI — all components subscribe to reactive Svelte stores and re-render automatically when state changes. This architecture is intentionally designed to later accept incoming hardware telemetry events through the same store interface.

---

## 9. Security Design

### Radio Layer (Hardware)

| Mechanism | Implementation |
|---|---|
| Channel Encryption | AES-128 via Meshtastic channel keys |
| Network Access Control | Shared channel key required to join |
| Message Integrity | Sequence ID + encrypted payload |
| ESD Protection | Bi-directional TVS diodes on USB-C lines |

### Dashboard Layer (Planned — Backend Phase)

| Mechanism | Implementation |
|---|---|
| Session Auth | JWT-based tokens |
| Role-Based Access | Admin / Operator / View-Only |
| API Protection | Token-required endpoints |
| Data Retention | Configurable message expiry policies |

---

## 10. Risk Assessment

| Risk | Mitigation |
|---|---|
| Node hardware failure | Self-healing mesh: automatic reroute around failed nodes |
| Power shortage | LTC4054 charger + battery telemetry monitoring; solar panel support planned |
| Message flooding / broadcast storms | Sequence ID deduplication, controlled flooding |
| Network partition | BFS partition detection with critical dashboard alert |
| Security breach | AES-128 channel keys + key rotation in Meshtastic firmware |
| Radio interference | Sub-GHz LoRa band less congested than 2.4GHz; adaptive spreading factor |
| Environmental damage | 3D-printed protective enclosure designed for field deployment |
| Weak link degradation | Real-time quality monitoring with visual and alert warning |

---

## 11. Current Progress Status

### Overall

```
[▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░]  90% Complete
```

### By Component

| Component | Status | Notes |
|---|---|---|
| Node & Event schema | ✅ Complete | `src/types/index.ts` |
| Mesh topology canvas | ✅ Complete | Canvas + Leaflet map mode |
| Node management (add/move/delete/inspect) | ✅ Complete | |
| Unicast routing (BFS) | ✅ Complete | |
| Broadcast & SOS flood | ✅ Complete | |
| Packet animation | ✅ Complete | |
| Telemetry & alert system | ✅ Complete | Weak link, partition, battery |
| Simulation controls (play/pause/step/speed) | ✅ Complete | |
| Preset topologies | ✅ Complete | Star, Chain, Mesh, Ring |
| Scenario import / export (JSON) | ✅ Complete | |
| Landing page | ✅ Complete | |
| Dashboard / Telemetry view | ✅ Complete | |
| Hardware PCB design | ✅ Complete | ESP32-S3 + SX1262 LoRa |
| Hardware BOM & sourcing | ✅ Complete | DigiKey parts list ready |
| Meshtastic firmware | ✅ Complete | Pre-configured for this PCB |
| Flask backend API | 🔲 Planned | Next phase |
| Database schema | 🔲 Planned | Next phase |
| Serial / HTTP gateway bridge | 🔲 Planned | Dashboard ↔ Meshtastic nodes |
| JWT authentication | 🔲 Planned | Backend phase |
| Live hardware integration | 🔲 Planned | After bridge layer |
| PCB fabrication & assembly | 🔲 Planned | Post-submission |

---

## 12. Planned Next Steps

**Phase 2 — Backend & Bridge Layer**

1. Implement Flask REST API with endpoints:
   - `GET /api/v1/nodes/status` — live node registry
   - `GET /api/v1/messages` — message history
   - `POST /api/v1/commands` — send commands to nodes
2. Build PySerial gateway bridge to ingest Meshtastic serial output
3. Map Meshtastic telemetry events to the SafeMesh `MeshEvent` schema
4. Connect dashboard to live backend via WebSocket or polling

**Phase 3 — Hardware Integration**

1. Fabricate PCB (JLCPCB / PCBWay)
2. Assemble and flash Meshtastic firmware
3. Run end-to-end test: physical nodes → gateway → dashboard
4. Validate that same dashboard UI works for both simulation and live mode

**Phase 4 — Field Deployment**

1. 3D print enclosures for field-ready nodes
2. Add solar panel support to power system
3. Small pilot: 5–10 node outdoor deployment
4. Collect real-world telemetry, iterate on dashboard

---

## 13. Bill of Materials & Cost Estimate

### Per-Node Hardware BOM

| Component | Part | Qty | Supplier |
|---|---|---|---|
| ESP32-S3-WROOM-1-N16R8 | Espressif | 1 | DigiKey: 5407-ESP32-S3-WROOM-1-N16R8CT-ND |
| Wio SX1262 LoRa Module | Seeed Studio | 1 | DigiKey: 1597-114993390CT-ND |
| ADP124ACPZ-3.3-R7 LDO | Analog Devices | 1 | DigiKey: 505-ADP124ACPZ-3.3-R7CT-ND |
| LTC4054ES5-4.2 Charger | Analog Devices | 1 | DigiKey: 505-LTC4054ES5-4.2#TRMPBFCT-ND |
| 10µF Capacitors | Aillen | 6 | DigiKey: 3372-0805W106K250CCTR-ND |
| 0.1µF Capacitors | YAGEO | 4 | DigiKey: 311-1088-1-ND |
| TVS Diodes (bi-directional) | Nexperia | 3 | DigiKey: 1727-PESD2V0Y1BSFYLCT-ND |
| Green LED | Würth Elektronik | 1 | DigiKey: 732-4971-1-ND |
| Blue LED | Würth Elektronik | 1 | DigiKey: 732-4966-1-ND |
| Resistors (390K, 100K, 10K, 5.1K, 2K, 330R) | Various | ~10 | DigiKey (per BOM) |
| Tactile Switch SPST | Omron | 2 | DigiKey: SW1021CT-ND |
| USB-C Receptacle | GCT | 1 | DigiKey: 2073-USB4105-GF-A-060CT-ND |
| JST Battery Connector | JST | 1 | DigiKey: 455-B2B-XH-A-ND |

**Estimated Cost Per Node: $25–40 USD**
*(including PCB fabrication — significantly below commercial Meshtastic devices at $100+)*

### Pilot Network Cost

| Scale | Estimated Total |
|---|---|
| Single node (prototype) | ~$35 USD |
| 5-node pilot network | ~$150 USD |
| 10-node community deployment | ~$300 USD |

---

## 14. Scaling Roadmap

| Timeframe | Milestone |
|---|---|
| **Now (MVP)** | Simulation dashboard complete; hardware design finalized |
| **Phase 2 (1–2 months)** | Backend bridge live; dashboard connected to physical Meshtastic nodes |
| **Phase 3 (3–6 months)** | 5–10 node outdoor pilot; solar power integration |
| **Year 1** | 10–50 node deployments in target environments |
| **Year 2** | 200+ nodes; multi-gateway support; mobile PWA |
| **Year 3** | Multi-mesh federation; cross-region coordination |

---

## 15. References

1. Perkins, C., Belding-Royer, E., Das, S. *Ad hoc On-Demand Distance Vector (AODV) Routing*. IETF RFC 3561, July 2003.
2. Clausen, T., Jacquet, P. *Optimized Link State Routing Protocol (OLSR)*. IETF RFC 3626, October 2003.
3. Johnson, D., Hu, Y., Maltz, D. *The Dynamic Source Routing Protocol (DSR) for Mobile Ad Hoc Networks*. IETF RFC 4728, February 2007.
4. Meshtastic Project. *Meshtastic Firmware Documentation & Managed Flood Routing*. meshtastic.org
5. Espressif Systems. *ESP-NOW User Guide* (2025).
6. Seeed Studio. *Wio SX1262 LoRa Module Datasheet*.
7. Analog Devices. *LTC4054 Li-Ion Charger Datasheet*.
8. Analog Devices. *ADP124 Low Dropout Regulator Datasheet*.
9. Sinnott, R.W. *Virtues of the Haversine*. Sky and Telescope, Vol. 68, No. 2, p. 159, 1984.
10. IEEE Std 1016-2009 — *Software Design Descriptions*.
11. GSMA. *Off-Grid Connectivity Reports* (2024).
12. Ethiopian National Digital Transformation Strategy (2025).
13. SafeMesh Software Requirements Specification (SRS), Version 1.0 (May 2026).
14. SafeMesh System Design Specification (SDS), Version 1.0 (May 2026).

---

*SafeMesh Development Team · Adama Science and Technology University · May 2026*
