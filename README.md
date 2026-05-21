# SafeMesh

**Offline-First Emergency Communication Mesh Simulation**

SafeMesh is a web-based simulation of a low-cost offline communication network inspired by **ESP32** and **ESP-NOW**-style mesh messaging. It shows how short text messages and **SOS alerts** can move between nearby nodes without internet, cellular service, or a central telecom tower—useful for rural areas, remote tourism, and emergency situations where normal networks fail or are unreliable.

> **Note:** This project is a **simulation and visualization tool**, not a deployed radio network. It validates message flow, relay logic, and dashboard concepts before any real hardware work.

---

## Table of contents

- [Problem](#problem)
- [Goals](#goals)
- [Features](#features)
- [Screenshots & routes](#screenshots--routes)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Using the simulator](#using-the-simulator)
- [Project structure](#project-structure)
- [Scenario export / import](#scenario-export--import)
- [Scope & limitations](#scope--limitations)
- [Future work](#future-work)
- [License](#license)

---

## Problem

Many rural and remote communities still face limited, expensive, or inconsistent network coverage. In emergencies—disasters, lost tourists, isolated field teams—the lack of reliable communication slows response and increases risk. SafeMesh demonstrates how a **local mesh** can relay urgent short messages when towers and internet are unavailable.

## Goals

- Simulate a low-cost offline system that relays **short messages** and **SOS alerts** between nearby nodes.
- Visualize message flow, hops, and network health in a **web dashboard**.
- Illustrate practical mesh concepts: **controlled flooding**, **duplicate suppression**, and **priority SOS handling**.
- Provide a clear path from **concept validation** (this repo) to future **ESP32 field trials**.

## Features

### Mesh simulation (`/app`)

| Area | Description |
|------|-------------|
| **Topology canvas** | Drag nodes, pan/zoom, adjust signal range; links form automatically when nodes are within range. |
| **Map mode** | Place nodes on a real map (Leaflet); distances use meters (Haversine) instead of pixels. |
| **Routing** | BFS pathfinding for unicast messages; flood broadcast for SOS. |
| **SOS** | Emergency broadcasts with visual waves, critical logs, and mesh-wide flood routing. |
| **Health monitoring** | Weak-link alerts, network partition detection, battery drain simulation, node status (`online` / `warning` / `offline`). |
| **Presets** | Star, chain, full mesh, and ring topologies. |
| **Node inspector** | Per-node battery, signal, neighbors, type, and metadata. |
| **Telemetry dashboard** | Aggregate network stats and Meshtastic-style RF placeholders. |
| **Scenarios** | Export and import full network state as JSON. |

### Landing page (`/`)

Project overview: problem statement, target users, capabilities, honest scope, and link into the simulator.

---

## Screenshots & routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page — project context and documentation-style sections |
| `/app` | Main simulator — topology view, sidebar controls, inspector |

Navigation uses the browser history API (`pushState` / `popstate`). Use the header brand control or landing CTAs to move between home and app.

---

## Tech stack

- **[Svelte 5](https://svelte.dev/)** + **TypeScript**
- **[Vite 8](https://vite.dev/)** — dev server and build
- **[Leaflet](https://leafletjs.com/)** — map mode
- **[lucide-svelte](https://lucide.dev/)** — icons
- Central state and mesh logic in `src/lib/engine.ts`
- Optional tick-based simulation in `src/lib/simulation.ts` (battery drain, play/pause)

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (20+ recommended)
- npm (or pnpm / yarn)

### Install

```bash
git clone <your-repo-url>
cd SafeMesh
npm install
```

### Development

```bash
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

### Build & preview

```bash
npm run build
npm run preview
```

### Type check

```bash
npm run check
```

---

## Using the simulator

1. Open **`/`** and click **Launch SafeMesh** (or go directly to **`/app`**).
2. **Add nodes** via the header or click the canvas; drag nodes to reposition.
3. Adjust **signal range** in the sidebar (pixels in canvas mode, meters in map mode).
4. **Send messages**: pick source/destination (or broadcast), enter text, transmit.
5. Trigger **SOS** from the header to flood the mesh with a priority alert.
6. Select a node to open the **inspector** (details, neighbors, metadata).
7. Use **simulation controls** (play/pause) to drain batteries and stress the network.
8. Switch to **Dashboard** in the header for aggregate telemetry.
9. **Export / import** scenarios from the sidebar for reports or demos.

### Map mode

Toggle map view on the canvas toolbar. Nodes can be placed with geographic coordinates; link distance uses real-world meters. Toggle back to canvas mode for pixel-based layout.

---

## Project structure

```
SafeMesh/
├── index.html
├── package.json
├── src/
│   ├── App.svelte              # Routes: / vs /app
│   ├── app.css                 # Global theme
│   ├── main.ts
│   ├── types/
│   │   └── index.ts            # MeshNode, MeshLink, MeshEvent, MeshMessage, MeshScenario
│   ├── lib/
│   │   ├── engine.ts           # Stores, routing, messaging, SOS, scenarios
│   │   └── simulation.ts       # Tick loop, battery drain, sim controls
│   └── components/
│       ├── Landing.svelte
│       ├── Header.svelte
│       ├── MeshCanvas.svelte   # Canvas + Leaflet
│       ├── Sidebar.svelte      # Controls, logs, transmit, scenarios
│       ├── Inspector.svelte
│       └── Dashboard.svelte
└── README.md
```

### Core types

- **`MeshNode`** — position, battery, signal, status, optional `lat`/`lon`
- **`MeshLink`** — auto-derived from range; **quality** 0–1 from distance
- **`MeshMessage`** — `unicast` | `broadcast` | `sos` with hop path and delivery status
- **`MeshEvent`** — structured telemetry (join, link degraded, SOS, etc.)
- **`MeshScenario`** — JSON snapshot for import/export

---

## Scenario export / import

Export from the sidebar saves a `.json` file containing nodes, links, events, messages, and simulation config. Import restores the network for demos or documentation.

Example shape:

```json
{
  "version": "1.0",
  "name": "My Scenario",
  "created_at": 1710000000000,
  "nodes": [],
  "links": [],
  "events": [],
  "messages": [],
  "simulation": { "speed": 1, "status": "idle", "tick": 0, "seed": 1710000000000 }
}
```

---

## Scope & limitations

### What this project includes

- Simulated ESP32-like nodes and link behavior
- Controlled message flooding and hop visualization
- SOS priority handling and alerting
- Web dashboard for message flow and network status
- Node status, logs, and scenario persistence (JSON)

### What this project does **not** include

- Physical hardware fabrication or live field deployment
- Proof of real radio range, battery life, or RF performance
- Replacement of cellular networks at scale
- Production-grade security or GPS/mobile apps (reserved for future work)

---

## Future work

- Port simulation logic to **real ESP32** hardware (ESP-NOW / LoRa)
- Battery and solar testing in the field
- GPS integration and small-area trials
- Stronger duplicate-suppression and routing policies
- Live gateway connection to Meshtastic or similar stacks

---

## Target users

- Rural communities with weak or no cellular coverage
- Tourists and guides in remote parks, mountains, and trekking routes
- Emergency response teams during disasters or network outages
- Local organizations (campus security, farms, construction sites, industrial sites)

---

## License

Add your license here (e.g. MIT) once chosen for the course or repository.

---

## Acknowledgments

Inspired by offline mesh ideas (ESP-NOW short-packet design, disaster-prone deployment scenarios) and tools like **Meshtastic** for low-power radio mesh gateways. SafeMesh is an educational simulation for understanding relay behavior and dashboard design—not a certified emergency communications product.
