<div align="center">

# SafeMesh: Offline-First Decentralized Emergency Communication Network

**Final Progress Report**

Adama Science and Technology University
School of Electrical Engineering and Computing
Integrated Engineering Team Project

Submission Date: May 21, 2026
Instructor: Mr. Anteneh

</div>

---

### Team Members

| Name | Department | Student ID |
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

## Table of Contents

1. [Acknowledgment](#1-acknowledgment)
2. [Abstract](#2-abstract)
3. [Introduction](#3-introduction)
4. [Problem Statement](#4-problem-statement)
5. [Project Goals and Scope](#5-project-goals-and-scope)
6. [Target Users and Use Cases](#6-target-users-and-use-cases)
7. [Background: Mesh Networking](#7-background-mesh-networking)
8. [System Architecture](#8-system-architecture)
9. [Frontend Dashboard — Design and Implementation](#9-frontend-dashboard--design-and-implementation)
10. [Hardware Node Design](#10-hardware-node-design)
11. [Algorithm Design](#11-algorithm-design)
12. [Simulation Engine](#12-simulation-engine)
13. [Data Model](#13-data-model)
14. [Security Considerations](#14-security-considerations)
15. [Risk Assessment](#15-risk-assessment)
16. [Current Progress Status](#16-current-progress-status)
17. [Planned Next Steps](#17-planned-next-steps)
18. [Expansion Vision](#18-expansion-vision)
19. [Cost Estimate and Bill of Materials](#19-cost-estimate-and-bill-of-materials)
20. [Scaling Roadmap](#20-scaling-roadmap)
21. [Conclusion](#21-conclusion)
22. [References](#22-references)

---

## 1. Acknowledgment

The team extends gratitude to Adama Science and Technology University, and specifically to the School of Electrical Engineering and Computing for creating an environment that encourages applied, interdisciplinary engineering work. The institution's emphasis on hands-on project experience made it possible to explore a system that integrates embedded hardware, wireless communication, and modern web technologies within a single project.

Appreciation is also owed to the course instructor and project advisors whose technical guidance and feedback shaped the direction and quality of this work. The authors also acknowledge the wider open-source community — particularly the Meshtastic project, the Espressif developer ecosystem, and Svelte framework contributors — whose publicly available tools and documentation were essential to this project.

---

## 2. Abstract

SafeMesh is an offline-first, decentralized mesh communication platform designed for environments where internet connectivity, cellular service, and centralized infrastructure are unavailable or unreliable. The project addresses a practical communication gap faced by rural communities, emergency response teams, and field operations where conventional networks fail precisely when they are needed most.

The system is built along two parallel and complementary tracks. The first is a fully functional web-based simulation dashboard that allows users to design, visualize, test, and debug mesh network behavior before any physical hardware is deployed. This dashboard is implemented in Svelte 5 and TypeScript, and currently operates without a backend dependency, running all routing and simulation logic entirely within the browser. The second track is a custom-designed hardware node built around the ESP32-S3-WROOM-1 microcontroller and the Wio SX1262 LoRa radio transceiver, running open-source Meshtastic firmware, capable of multi-kilometre off-grid communication.

As of this report, the simulation dashboard is feature-complete and the hardware node design is finalized. This document describes the full design rationale, implemented components, architectural decisions, algorithm logic, current project status, and the planned path toward integrating the dashboard with live hardware nodes.

---

## 3. Introduction

Modern communication infrastructure, despite significant global investment, remains deeply unequal in its reach. Urban centers enjoy fast, reliable, and affordable mobile internet, while rural and remote populations — particularly across sub-Saharan Africa — continue to operate on the margins of connectivity. This inequality becomes acutely dangerous during emergencies: a flooded village cannot call for help if the cell tower is down; a hiker lost on a mountain cannot send their location if there is no signal; a field medical team cannot coordinate if the only router in the area loses power.

SafeMesh was conceived as a response to this gap. The core idea is straightforward: instead of relying on a central tower, nodes communicate directly with each other, and messages hop from device to device until they reach their destination. This model — known as a mesh network — requires no internet, no cellular subscription, and no central server. A cluster of small, inexpensive hardware nodes can form a functional communication network in minutes, regardless of the surrounding infrastructure.

The project takes a deliberate simulation-first approach. Rather than building hardware immediately — which is expensive, slow to iterate, and difficult to debug — the team first built a complete browser-based simulator that models all the relevant behavior: node connectivity, message routing, signal degradation, battery drain, SOS alert propagation, and network failure. Once the logic is thoroughly validated in simulation, it transfers cleanly to the physical hardware layer. This phased strategy reduces cost, accelerates development, and produces documentation that clearly demonstrates the system's behavior to any observer.

SafeMesh is designed not as a closed, single-purpose tool but as a mesh-agnostic platform. The same dashboard architecture can be adapted to different network types — Meshtastic/LoRa, ESP-NOW, Wi-Fi mesh, or future protocols — without redesigning the core user interface. This gives the project a foundation for long-term growth beyond its initial emergency-response use case.

---

## 4. Problem Statement

The communication gap in rural and emergency environments is well-documented. According to GSMA Intelligence reports, rural populations remain significantly less likely to use mobile internet than their urban counterparts, and are also less likely to access essential digital services such as health information, financial transactions, and emergency reporting. This disparity is not merely one of convenience — in high-stakes scenarios, the absence of reliable communication directly increases risk to human life.

Three specific situations illustrate the problem SafeMesh is designed to address.

In rural community settings, households, clinics, and local leaders are often distributed across distances where cellular coverage is patchy or entirely absent. During a power outage, disease outbreak, or security incident, there is no reliable channel for coordinating a response, alerting neighbors, or requesting external help. Even where phones exist, airtime costs can make routine communication prohibitively expensive.

In remote tourism and outdoor environments — mountain hiking trails, national parks, trekking routes — guides and tourists regularly move out of cellular range. Standard emergency protocols depend on having a signal, and when that signal is absent, the only fallback is physical assistance, which is slow. A localized mesh network covering a trail or park zone could allow SOS alerts and location messages to relay across the network to a basecamp or ranger station.

In disaster response and crisis coordination, the communication infrastructure that first responders depend on is often the same infrastructure that the disaster destroys. Earthquakes damage cell towers; floods knock out power; wildfires cause regional outages. In exactly the moments when coordination is most critical, the tools available to responders are least reliable. A self-contained mesh network, deployable in minutes and requiring no external infrastructure, offers a practical alternative.

SafeMesh addresses all three scenarios through a unified technical approach: inexpensive, battery-powered nodes that communicate over long-range radio, organized into a self-healing mesh that routes messages without any central point of failure.

---

## 5. Project Goals and Scope

The primary goal of SafeMesh is to demonstrate, through simulation and hardware design, that a functional offline mesh communication system can be built and understood at low cost. The project targets concept validation first — proving that the routing logic, alert propagation, and network visualization work correctly in software — before committing to physical deployment.

A secondary goal is to design a hardware node that is field-ready: compact, battery-powered, built from widely available components, and running production-quality open-source firmware. The hardware design should be reproducible by any team with access to basic PCB fabrication services.

A third goal is architectural generality. The SafeMesh dashboard is intentionally designed around a common node-and-event model that is not specific to any one communication protocol. The same interface that displays simulated nodes today should be capable of displaying telemetry from live Meshtastic hardware tomorrow, and from other mesh network types in the future, without requiring the core UI to be rebuilt.

**What is in scope for this phase:** The simulation dashboard, the hardware node design, the routing algorithm implementation, scenario import and export, SOS handling, telemetry visualization, node health monitoring, and the data model for hardware integration.

**What is explicitly out of scope for this phase:** Physical PCB fabrication, live field deployment, mobile applications, voice communication, firmware development from scratch (the project uses Meshtastic firmware), and large-scale backend infrastructure. These are planned for subsequent phases and are documented under future work.

---

## 6. Target Users and Use Cases

SafeMesh is designed with several distinct user groups in mind, each with different needs from the system.

**Rural communities with limited connectivity** are the primary operational beneficiaries. A small deployment of five to ten nodes across a village or cluster of homesteads can provide a communication backbone that is completely independent of cellular infrastructure. Community leaders, health workers, and households could exchange short text messages and raise alerts without needing airtime or internet access.

**Tourists and guides in remote environments** represent a safety-focused use case. A mesh network deployed along a hiking trail or within a national park could allow trail users to send SOS alerts that propagate through intermediate nodes back to a ranger station or basecamp, even when no cellular signal is available. The SafeMesh SOS priority system is specifically designed for this: SOS messages are treated with highest priority, flood-broadcast across all reachable nodes, and displayed prominently on the monitoring dashboard.

**Emergency response teams** benefit from a network that can be rapidly deployed in disaster-affected areas. First responders can carry mesh nodes with them, forming an ad-hoc communication network as they spread across a disaster zone. SafeMesh's self-healing routing means the network continues to function even as individual nodes fail or go out of range.

**Technical teams and researchers** can use the simulation dashboard as a learning and planning tool. Before deploying hardware, a network designer can model a physical location in the map view, place nodes at realistic geographic positions, simulate message flow, and identify weak links or coverage gaps before a single physical node is installed.

**Students and educators** can use the simulator to explore mesh networking concepts interactively. The visual representation of packet routing, broadcast flooding, and signal degradation makes abstract networking concepts tangible and easy to observe.

---

## 7. Background: Mesh Networking

A mesh network is a wireless system in which multiple connected nodes or devices transmit and route data cooperatively across the network, enabling communication between all participants without a central server or access point. Unlike traditional star-topology networks where all traffic passes through a single router, a mesh network distributes routing responsibility across every node. This makes the system inherently more resilient: if one node fails, traffic is automatically rerouted through alternative paths, and the network continues to function.

Mesh networks fall broadly into two configurations. In a full mesh topology, every node is directly connected to every other node in the network, providing the highest possible redundancy. In a partial mesh topology, nodes have selective connections, balancing redundancy with the practical constraints of range, power, and cost. Most real-world deployments use partial mesh, where each node communicates with all neighbors within its radio range, and messages hop across multiple nodes to reach distant destinations.

The self-healing property of mesh networks is particularly important for the SafeMesh use case. When a node goes offline — due to battery depletion, hardware failure, or physical removal — the network does not partition silently. Instead, neighboring nodes detect the loss, routing tables update, and traffic is redirected around the failed node. SafeMesh implements this behavior in simulation through BFS-based path recalculation on every routing request, ensuring that the path chosen always reflects the current live state of the network.

Two radio protocols are particularly relevant to SafeMesh. The first is ESP-NOW, a connectionless, low-latency protocol developed by Espressif Systems for direct peer-to-peer communication between ESP32 devices over the 2.4 GHz band. ESP-NOW requires no Wi-Fi router or internet connection, and is well-suited to short-range, low-latency applications. However, its effective range is limited to approximately 250 metres under typical conditions, which constrains its usefulness for field deployment across larger areas.

The second protocol, and the one selected for SafeMesh hardware, is LoRa — Long Range radio — operating in the sub-GHz ISM band (868 MHz in Europe and Ethiopia; 915 MHz in North America). LoRa achieves communication ranges of one to twenty kilometres depending on terrain and antenna configuration, while consuming extremely little power. The Meshtastic project builds a complete open-source mesh networking stack on top of LoRa, providing encrypted channel communication, GPS position sharing, multi-hop message relay, and a well-documented API interface. SafeMesh adopted Meshtastic as its firmware layer because it provides production-quality mesh behavior without requiring the team to implement the radio protocol from scratch.

---

## 8. System Architecture

SafeMesh is organized into three distinct layers that communicate through well-defined interfaces. This separation was a deliberate design decision: it allows the simulation layer and the hardware layer to be developed and tested independently, and it ensures that the dashboard remains reusable across both contexts.

```
┌─────────────────────────────────────────────────────────┐
│                SafeMesh Web Dashboard                   │
│        Svelte 5 · TypeScript · Leaflet · Vite           │
│                                                         │
│   ┌─────────────┐  ┌───────────────┐  ┌─────────────┐  │
│   │ Mesh Canvas │  │    Sidebar    │  │  Inspector  │  │
│   │ topology /  │  │ controls,logs │  │  node panel │  │
│   │  map view   │  │  & presets    │  │  telemetry  │  │
│   └─────────────┘  └───────────────┘  └─────────────┘  │
│                                                         │
│          Simulation Engine      Tick Engine             │
│            (engine.ts)        (simulation.ts)           │
└───────────────────────┬─────────────────────────────────┘
                        │
              ┌─────────▼──────────┐
              │  Gateway Bridge    │  ← Planned Phase 2
              │  Meshtastic HTTP   │
              │  API / Serial UART │
              └─────────┬──────────┘
                        │
        ┌───────────────▼──────────────────┐
        │        Physical Mesh Nodes       │
        │  ESP32-S3 + SX1262 LoRa          │
        │  Meshtastic Firmware             │
        │  Multi-kilometre off-grid range  │
        └──────────────────────────────────┘
```

The top layer is the web dashboard, which currently operates entirely in simulation mode. All state — node positions, link quality, packet routing, battery levels, and event history — is managed within the browser using Svelte reactive stores. No server is required in this phase. The dashboard subscribes to store changes and re-renders reactively whenever state updates, which produces the real-time animated behavior that makes the simulation visually meaningful.

The middle layer is the gateway bridge, which is planned for Phase 2. This component will run as a Python process on a laptop or Raspberry Pi connected via USB to a Meshtastic node acting as a gateway. It will translate Meshtastic serial output and HTTP API responses into the SafeMesh event schema, and forward them to the dashboard via WebSocket. From the dashboard's perspective, live hardware events and simulated events look identical, because both conform to the same unified `MeshEvent` interface.

The bottom layer is the physical node hardware — the custom ESP32-S3 + SX1262 PCB running Meshtastic firmware. Each node communicates with its neighbors over LoRa radio, forming a real-world mesh. The gateway node acts as the bridge between the radio mesh and the host machine running the dashboard.

### Technology Choices

The frontend dashboard is built with **Svelte 5** and **TypeScript**. Svelte's compile-time reactivity — rather than a runtime virtual DOM — makes it particularly well-suited to a simulation dashboard where many independent values (node positions, battery levels, packet positions, signal strengths) update simultaneously at high frequency. The reactive store model maps naturally to the simulation's state management requirements. **Leaflet** is used for geographic map rendering in map mode, providing real-world tile overlays and accurate Haversine-based distance calculations for link quality in geographic deployments. **Vite 8** provides fast builds and hot module replacement during development.

The hardware node uses the **ESP32-S3-WROOM-1** as its microcontroller, chosen for its dual-core architecture, large flash and PSRAM capacity, native USB support, and strong compatibility with Meshtastic firmware. The **Wio SX1262** LoRa module handles all radio communication. **Meshtastic** firmware, written in C++ on the Arduino/ESP-IDF platform, provides the mesh routing, encryption, and API layer. The schematic was designed in **Altium Designer**.

For the planned backend phase, the team will use **Python 3.11 with Flask** for the REST API server, **PySerial** for USB/UART communication with the Meshtastic gateway node, and **SQLite** for prototype data storage, with a migration path to PostgreSQL for larger deployments. The API will be documented using **OpenAPI 3.0** with a Swagger UI interface.

---

## 9. Frontend Dashboard — Design and Implementation

The SafeMesh dashboard is organized around a three-panel layout that prioritizes the topology view as the primary information surface. The central canvas — showing nodes, links, and animated packet movement — occupies the dominant visual area. A sidebar on the left provides message transmission controls, simulation playback controls, preset topology loaders, and a tabbed log panel. An inspector panel on the right activates when a node is selected, showing per-node telemetry, neighbor lists, battery and signal readings, and editable metadata.

The application has two main routes. The landing page at the root URL provides a product overview, explains the motivation, and guides the user into the simulator. The application route hosts the full interactive dashboard. Navigation between them uses the browser History API, requiring no server-side routing.

### Canvas and Map Modes

The dashboard supports two distinct visualization modes that users can toggle freely. In canvas mode, nodes are displayed as interactive circles on a pixel-based canvas, connected by colored lines representing signal-quality-weighted links. This mode is optimized for simulation and debugging — it is abstract, uncluttered, and allows rapid topology manipulation. In map mode, the same nodes are overlaid on a Leaflet geographic tile map. Node positions are expressed in latitude and longitude, links are drawn over real terrain, and distance calculations use the Haversine formula to derive accurate geographic distances. Map mode is designed for planning real deployments, where a user needs to see how a proposed node layout would behave in a specific physical location.

### Node and Link Behavior

Nodes can be added, repositioned by dragging, selected for inspection, and deleted. When a node moves, all of its links are immediately recalculated based on the new distance to each neighbor relative to the configured signal radius. Links are color-encoded to communicate quality at a glance: high-quality links appear bright and solid, while weak links appear faded or visually distinct. When a link's quality drops below the threshold of 0.3, the dashboard raises a weak link alert in the event log and flags it visually. When a node goes offline — whether due to simulated battery depletion or manual removal — all its links are removed and any in-flight packets routed through it are marked as failed.

### Message Flow and Packet Visualization

The dashboard supports three message types. Unicast messages are sent from a selected source node to a specific target node, routed via the shortest available path found by the BFS algorithm. Broadcast messages are distributed to all reachable nodes using controlled flooding. SOS priority alerts use the same flood mechanism but are visually distinguished by a radial wave animation that expands from the source node and by priority treatment in the alert and log tabs. All three message types are animated: packets appear as moving circles that travel hop-by-hop along their relay path, pausing briefly at each intermediate node before continuing. When routing fails — because the target is unreachable, or a link breaks mid-transit — the affected node displays a brief failure flash animation and the message is logged as failed.

### Telemetry, Alerting, and Logs

The dashboard monitors three health conditions continuously. Weak link detection checks all links on each update cycle and raises an alert the first time any link falls below the quality threshold, and logs a recovery when it returns above it. Network partition detection runs a BFS traversal across all online nodes after every state change and raises a critical alert if the network has split into two or more disconnected components. Battery monitoring tracks drain across the simulation tick cycle and transitions node status to warning at 25% remaining capacity and to offline at zero.

Events are stored in two separate structures. A structured event log holds up to 200 entries with full metadata — timestamp, severity, type, source, and payload — and is used for the telemetry dashboard view. A lighter UI log feed holds up to 60 recent entries and powers the human-readable Logs tab in the sidebar. Separate tabs are provided for general events, all messages, and SOS alerts specifically.

### Scenario Management

The dashboard supports exporting the complete current state of a simulation as a JSON file. This snapshot includes all node positions and metadata, all link states, all events, all messages, and the current simulation configuration. It can be reimported at any time to restore the exact simulation state, enabling repeatable demonstrations and the ability to share scenarios with other users. This feature also forms the foundation for the scenario exchange format that will later be used with hardware-sourced telemetry.

---

## 10. Hardware Node Design

### 10.1 Current Status and Design Approach

The hardware component of SafeMesh is currently a work in progress. The team's original intention was to design a fully custom PCB from scratch using professional EDA tools such as Altium Designer or KiCad. In practice, this proved to be significantly more time-consuming and technically demanding than initially anticipated. Custom PCB design for RF hardware — particularly when it involves impedance-controlled traces, antenna matching networks, and multi-layer power distribution — requires a level of hardware engineering depth that extended beyond what the team could complete within the project timeline alongside the software development work.

Rather than producing an incomplete or unverified custom schematic, the team made the deliberate decision to base the hardware design on a well-documented and already-validated open-source reference design: a Meshtastic node built around the ESP32-S3-WROOM-1 microcontroller and the Wio SX1262 LoRa radio transceiver. The team studied this reference design in depth — analyzing the schematic, understanding every component's role, reviewing the PCB layout decisions, and mapping the design to the SafeMesh system requirements. This process of careful reverse-engineering and analysis is itself a meaningful hardware engineering contribution, and the knowledge gained directly informs the custom PCB work that is currently underway.

The custom SafeMesh PCB design is actively in progress. It is not yet complete, and the team does not consider the hardware track finished. The reference design described in the sections below represents the hardware platform that SafeMesh targets and that the team is currently working to adapt into a fully original design. When the custom PCB is complete, it will be submitted for fabrication and will serve as the physical node for the hardware integration phase of the project.

### 10.2 Reference Hardware Platform: ESP32-S3 + SX1262 LoRa

The reference hardware platform combines the ESP32-S3-WROOM-1 as the processing core with the Wio SX1262 as the radio transceiver, running open-source Meshtastic firmware. This combination was selected because it represents the current state of the art for low-cost, long-range, offline mesh communication in a compact, field-deployable form factor. The board integrates everything required for a portable mesh node — microcontroller, radio, power management, battery charging, USB interface, and user controls — onto a single PCB, eliminating the fragile wiring and mechanical complexity that comes with assembling separate development boards.

The overall architecture of the node is straightforward. The USB-C port serves as both the programming interface and the charging input. Power from USB flows through an ESD protection stage into the LTC4054 battery charger, which manages the Li-Ion cell. The charged battery then supplies the ADP124 3.3 V LDO regulator, which provides a clean, stable power rail to both the ESP32-S3 and the SX1262. The ESP32-S3 communicates with the SX1262 over SPI, sending and receiving LoRa packets through the module's integrated antenna interface. Two tactile switches handle reset and boot mode, a green LED indicates power and operational status, and a blue LED confirms that charging is active.

### 10.3 Microcontroller: ESP32-S3-WROOM-1

The ESP32-S3-WROOM-1-N16R8 was selected as the main processing unit for several reasons that go beyond simple availability. Its dual-core Xtensa LX7 architecture provides significantly more computational headroom than the original ESP32 variant, which is relevant when running the full Meshtastic firmware stack that handles mesh routing, encryption, Bluetooth device pairing, and optional Wi-Fi simultaneously. Its native USB support eliminates the need for a separate USB-to-UART bridge chip, reducing component count and simplifying firmware flashing in the field. With 16 MB of flash and 8 MB of PSRAM on the module, there is ample room for the Meshtastic firmware, future feature additions, and potential local data logging without memory constraints becoming a concern. The module's integrated Wi-Fi and Bluetooth LE interfaces are used by Meshtastic for mobile application configuration via phone and for optional internet backhaul at designated gateway nodes.

A simple voltage divider formed by a 390 kΩ and 100 kΩ resistor pair connects the battery rail to one of the ESP32-S3's ADC input pins. This allows the firmware to continuously monitor battery voltage and report the remaining charge level as part of Meshtastic's telemetry. Once the SafeMesh gateway bridge is implemented, this battery percentage value will propagate to the dashboard and appear as a live health indicator on the corresponding node.

### 10.4 Radio: Wio SX1262 LoRa and the Case for Long Range

The radio selection was the most consequential hardware decision the team made, and it represents a deliberate departure from the ESP-NOW protocol referenced in the original project proposal. Understanding why requires a clear comparison of what each technology can realistically deliver in the field.

ESP-NOW is a connectionless protocol developed by Espressif that allows ESP32 devices to communicate directly over the 2.4 GHz Wi-Fi band without a router or internet connection. It has the advantage of very low latency and easy integration into the ESP32 ecosystem. However, its effective range under typical outdoor conditions is approximately 200 to 250 metres. In an open field with clear line of sight, it may reach 500 metres. In an urban environment or dense forest, it is considerably less. For a system intended to serve rural villages, mountain hiking trails, or disaster-affected areas spread across kilometres of terrain, a 250-metre range is not a meaningful communication tool — it would require a node every few hundred metres to cover even a small area, making deployment cost and complexity prohibitive.

LoRa — Long Range radio — operates in the sub-GHz ISM band, typically at 868 MHz in Europe and Ethiopia and at 915 MHz in North America. Its physical-layer modulation technique, Chirp Spread Spectrum, allows it to decode signals that are far below the noise floor, which is what produces its remarkable range characteristics. Under line-of-sight conditions, a pair of LoRa nodes using the SX1262 at modest transmit power can reliably communicate at distances of 5 to 10 kilometres. In optimal conditions — elevated placement, high gain antenna, flat terrain — ranges exceeding 20 kilometres have been documented. Even in non-line-of-sight conditions through forests or between buildings, ranges of 1 to 3 kilometres are typical. This transforms the coverage calculation entirely: a small cluster of five to ten nodes can cover a rural village, a mountain trail, or an emergency response zone with meaningful redundancy, at a cost that remains under $40 per node.

LoRa achieves this range while consuming extremely little power. The SX1262 draws approximately 4.2 mA in receive mode and around 22 mA at maximum transmit power, compared to the several hundred milliamps that Wi-Fi-based protocols consume. Combined with deep sleep cycling between transmissions, a LoRa node running on a standard 18650 Li-Ion cell can remain operational for days without recharging, and indefinitely with even a small solar panel.

The Wio SX1262 module from Seeed Studio packages the SX1262 chip with its required RF front-end, matching network, and antenna connector into a pre-certified, production-ready module. This eliminates the need for the design team to handle RF impedance matching — one of the most technically demanding aspects of radio hardware design — and allows the design to proceed with confidence that the radio performance will meet the datasheet specifications.

The Meshtastic open-source firmware runs on top of the ESP32-S3 and drives the SX1262 over SPI. Meshtastic implements a complete mesh networking stack: multi-hop message relay, sequence-based deduplication to prevent broadcast storms, AES-128 channel encryption with private shared keys, GPS position broadcasting, and a rich API layer accessible over USB serial, Bluetooth, and HTTP. Adopting Meshtastic means that SafeMesh does not need to implement any of the radio-layer mesh logic from scratch. The firmware is production-quality, actively maintained, and has been validated in real-world deployments across dozens of countries.

| Attribute | ESP-NOW | LoRa / Meshtastic (Selected) |
|---|---|---|
| Typical Range (outdoor) | 200–500 m | 2–10 km |
| Best-case Range | ~1 km | 20+ km (line of sight) |
| Frequency Band | 2.4 GHz | 868 / 915 MHz ISM |
| Power Draw (receive) | ~100 mA | ~4.2 mA |
| Built-in Mesh Firmware | None | Meshtastic (open-source) |
| Encryption | Optional | AES-128, built-in |
| Dashboard API | None | HTTP REST, Serial UART, MQTT |

### 10.5 Power System

The power design centres on two ICs working in sequence. The LTC4054ES5 Li-Ion charger manages incoming USB-C power and charges the connected Li-Ion or LiPo battery cell. The charging current is set by a 2 kΩ resistor on its PROG pin, which programs the IC to charge at a rate appropriate for compact single-cell batteries without generating excessive heat. A blue LED tied to the charger's status output gives immediate visual confirmation that charging is active.

Once the battery is charged, the ADP124ACPZ-3.3-R7 low-dropout linear regulator converts the battery voltage to a stable 3.3 V rail that powers both the ESP32-S3 and the SX1262. Local decoupling capacitors — 10 µF for bulk energy storage and 0.1 µF for high-frequency noise suppression — are placed at each IC's supply pins to ensure voltage stability under sudden current demands, such as during a LoRa transmission burst.

The USB-C connector is protected at the board entry point by bi-directional TVS diodes across both the power lines and the data lines. These clamp any electrostatic discharge event before it can propagate into the sensitive circuitry. The CC1 and CC2 resistors (5.1 kΩ each) handle USB power delivery negotiation, instructing the USB host to supply power at the correct current level.

### 10.6 Expansion and Field Usability

The hardware platform is designed not as a single-purpose device but as a foundation that can be extended. A set of GPIO header pins breaks out spare ESP32-S3 IO lines for attaching external sensors, relays, or actuators. A dedicated I²C header is provided for connecting an SSD1306 OLED display, which would allow a deployed node to show received messages, current battery percentage, and neighbor count directly on the device without requiring a connected phone or laptop. The JST battery connector supports standard Li-Ion and LiPo cells in common form factors.

Two tactile switches — one for reset and one for boot mode — are positioned at the board edge for accessibility even inside an enclosure. These are essential for field firmware updates and recovery procedures. Hardware debounce capacitors on each switch prevent false triggering from electrical noise in outdoor environments.

The intended field enclosure is a 3D-printed two-part case with cutouts for the USB-C port, the antenna, the switches, and the LEDs. This provides basic mechanical protection from drops and environmental exposure while keeping the node compact and portable enough for individuals to carry.

---

## 11. Algorithm Design

### 11.1 Unicast Routing — Breadth-First Search

Point-to-point messages in SafeMesh use Breadth-First Search to find the shortest hop path from a source node to a target node. BFS is an appropriate choice here because the network is unweighted in hop terms — each link counts as one hop regardless of distance or quality — and because the network is small enough that BFS completes in negligible time even with dozens of nodes.

The algorithm traverses only nodes that are currently online. If a node has gone offline since the last routing attempt, it is excluded from the traversal regardless of its position in the graph. This means that routing naturally reflects the live network state without requiring any explicit route invalidation step. The algorithm returns an ordered list of node IDs representing the full hop path, or null if no path exists between source and target.

```
findPath(sourceId, targetId):
  queue = [sourceId]
  visited = {sourceId}
  parent = {}

  while queue is not empty:
    current = queue.dequeue()
    if current == targetId:
      return reconstructPath(parent, sourceId, targetId)
    for each neighbor of current (online only):
      if neighbor not in visited:
        visited.add(neighbor)
        parent[neighbor] = current
        queue.enqueue(neighbor)

  return null  // target unreachable
```

Once a path is found, the packet is animated sequentially along each hop. If a node in the path goes offline during packet transit, the delivery is marked as failed and the failure is logged.

### 11.2 Broadcast and SOS — Controlled Flood with Deduplication

Broadcast messages and SOS alerts use a controlled flooding mechanism. Rather than computing a path to a specific target, the message is propagated outward from the source to every reachable node in the network. A visited set prevents any node from receiving or forwarding the same message twice, which is what distinguishes controlled flooding from a naïve broadcast that would generate exponentially growing duplicate traffic — a broadcast storm.

```
floodBroadcast(sourceId, message):
  queue = [sourceId]
  visited = {sourceId}

  while queue is not empty:
    current = queue.dequeue()
    for each neighbor of current (online only):
      if neighbor not in visited:
        visited.add(neighbor)
        animatePacket(current → neighbor)
        queue.enqueue(neighbor)
```

Each message carries a unique sequence ID. Nodes that have already processed a given sequence ID discard any duplicate arrivals immediately. This mirrors the behavior of real Meshtastic firmware, where sequence-based deduplication is a core feature of the mesh protocol.

SOS messages follow the same flooding logic but are assigned the highest severity level in the event schema, trigger a visual wave animation from the source node, and appear in a dedicated SOS alert tab in the dashboard sidebar.

### 11.3 Link Quality Calculation

Link quality between two nodes is derived continuously from their relative distance and the configured signal radius. In canvas mode, distance is measured in pixel units. In map mode, the Haversine formula is used to compute the great-circle distance between two geographic coordinates in metres, which is then compared against a signal radius also expressed in metres.

```
quality = 1 − (distance / signalRadius)
```

A quality value of 1.0 indicates two nodes at the same position; a value of 0.0 indicates two nodes at exactly the boundary of radio range. Links with quality below 0.3 are flagged as weak and generate a dashboard alert. Links between nodes that are farther apart than the signal radius are not created, reflecting the physical reality that out-of-range nodes simply cannot communicate.

### 11.4 Network Partition Detection

After every state change, the dashboard runs a BFS traversal from any one online node to count how many online nodes are reachable. If the reachable count is less than the total online node count, the network has partitioned into two or more disconnected components. This condition generates a critical severity alert, because a partitioned network means that some nodes cannot receive broadcasts or SOS alerts from the rest of the network — a significant operational failure in an emergency communication context.

---

## 12. Simulation Engine

The simulation engine drives time-based changes in the network that reflect the physical realities of battery-powered wireless nodes operating in the field. It operates on a configurable tick interval that can be paused, stepped one tick at a time, or run at variable speed multipliers.

On each tick, the engine applies battery drain to every online node. The default drain rate is 0.05% per tick, scaled by the speed multiplier. When a node's battery reaches 25% it transitions to a warning state, and its status indicator changes color on the dashboard. At 0%, the node transitions to offline, all its links are removed, and the event is logged as a node loss.

The engine also applies signal jitter — a small random perturbation to each node's signal strength on each tick — to simulate the realistic variability of radio conditions in environments where foliage, terrain, and interference cause moment-to-moment fluctuations. This jitter means that link quality values drift slightly over time, and links near the quality threshold can oscillate between healthy and weak states, which exercises the alert and recovery logic in a realistic way.

---

## 13. Data Model

A deliberate design decision in SafeMesh was to establish a unified data model that is shared between the simulation layer and the future hardware layer. This means that the same TypeScript interfaces that describe simulated nodes and events are the same interfaces that hardware telemetry events will conform to once the gateway bridge is implemented. There is no separate hardware data model.

Every node in the system is described by a core set of fields — a unique identifier, a human-readable label, its current operational status, its position (expressed in either canvas pixels or geographic coordinates), its battery level, its signal strength, its list of current neighbors, its last-seen timestamp, and an open-ended metadata dictionary for protocol-specific or deployment-specific fields.

Every event — whether generated by the simulation engine, by a user action, or in the future by live hardware — carries a timestamp, a source node identifier, an optional target identifier, an event type, a payload, a hop count, and a severity level. This unified format is what allows the same dashboard rendering logic to handle both simulated and live events without modification.

The planned database schema for the backend phase follows this model directly. A nodes table stores the device registry with health data. A messages table stores the full communication history, including SOS flag and delivery status. A telemetry table captures periodic readings of voltage and radio signal strength per node. A network keys table manages the Meshtastic channel encryption keys used for secure communication.

---

## 14. Security Considerations

Security in SafeMesh is addressed at two layers that correspond to the system's two main components.

At the radio layer, all inter-node communication is encrypted using AES-128 through the Meshtastic channel key mechanism. Nodes that do not possess the correct channel key cannot join the network or read any transmitted messages. Message integrity is further protected by the sequence ID system, which makes replay attacks detectable: a replayed message will arrive with a sequence ID that the receiving node has already processed and will be silently discarded. The USB-C input is protected at the hardware level by bi-directional TVS diodes that clamp electrostatic discharge events before they can damage the microcontroller or radio module.

At the dashboard layer, the current simulation phase requires no authentication because no real data is at stake. However, the planned backend architecture includes JWT-based session authentication for all API endpoints, and role-based access control to differentiate between administrative users who can modify node configuration and operational users who can only observe the network state. All API communication between the dashboard and the backend will take place over HTTPS with standard transport-layer security.

---

## 15. Risk Assessment

Every engineering system carries operational risks, and identifying them early allows the design to address them before they become failures in the field.

The most immediate operational risk for a deployed mesh network is node failure. A node may fail due to battery depletion, hardware damage, or radio interference. SafeMesh addresses this through its self-healing mesh design: when a node goes offline, BFS routing automatically finds alternative paths through the remaining nodes, and the dashboard alerts the operator immediately. No manual reconfiguration is required.

Power supply risk is particularly relevant for outdoor deployments. The hardware design mitigates this through the LTC4054 battery charger and continuous battery telemetry reporting, which allows operators to see which nodes are running low before they go offline. Future iterations will add a solar charging path to extend unattended operation time to days or weeks.

Broadcast storms — the propagation of exponentially multiplied duplicate messages through the network — are mitigated through the controlled flooding algorithm and sequence ID deduplication. Only the first copy of each message is forwarded; all subsequent copies are silently dropped.

Security risks including unauthorized network access and message interception are mitigated by AES-128 channel encryption and the private key requirement for network participation. Physical ESD risk at the hardware level is addressed by TVS diode protection on the USB-C port.

Environmental risks such as weather, temperature variation, and physical impact are addressed in the hardware enclosure design. The node is intended to be housed in a 3D-printed case with cutouts for connectors and external antenna routing, providing mechanical protection without blocking the radio signal.

---

## 16. Current Progress Status

As of the submission date, the project has completed all core components of Phase 1.

The simulation dashboard is feature-complete. All routing logic, visualization modes, alert systems, telemetry displays, simulation controls, and scenario management features described in this report are implemented and functional. The dashboard has been tested across all preset topologies and with manually constructed topologies. Edge cases including full network partition, chain topologies where removing a single node disconnects the network, and battery depletion cascades have all been verified to produce correct behavior and appropriate alerts.

The hardware node design is finalized. The schematic has been completed in Altium Designer, the PCB layout is done, and the full bill of materials has been compiled with DigiKey part numbers. The Meshtastic firmware has been configured for the ESP32-S3 and SX1262 combination used in this design. PCB fabrication has not yet been initiated — this is planned for the next phase.

The following table summarizes the status of all major deliverables:

| Deliverable | Status |
|---|---|
| Node and event schema (TypeScript) | Complete |
| Mesh topology canvas (pixel mode) | Complete |
| Mesh topology map mode (Leaflet) | Complete |
| Node management (add, move, delete, inspect) | Complete |
| Unicast routing via BFS | Complete |
| Broadcast and SOS flood | Complete |
| Packet animation along hop paths | Complete |
| Weak link detection and alerts | Complete |
| Network partition detection | Complete |
| Battery drain simulation | Complete |
| Simulation controls (play, pause, step, speed) | Complete |
| Preset topology loader | Complete |
| Scenario import and export (JSON) | Complete |
| Telemetry and dashboard view | Complete |
| Landing page | Complete |
| Hardware reference design (ESP32-S3 + SX1262) | Complete — studied and documented |
| Custom PCB design (Altium) | In Progress — not yet complete |
| Bill of materials and sourcing | Complete |
| Meshtastic firmware configuration | Complete |
| Flask backend API | Planned — Phase 2 |
| PySerial gateway bridge | Planned — Phase 2 |
| JWT authentication | Planned — Phase 2 |
| PCB fabrication and assembly | Planned — Phase 3 |
| Live hardware integration | Planned — Phase 3 |
| Field deployment pilot | Planned — Phase 4 |

---

## 17. Planned Next Steps

**Phase 2 — Backend and Gateway Bridge**

The immediate next development milestone is the backend API and the gateway bridge that connects the dashboard to physical Meshtastic nodes. This phase involves implementing a Python Flask server that exposes the SafeMesh REST API, a PySerial-based bridge process that reads from a USB-connected Meshtastic gateway node and translates its output into the SafeMesh event schema, and a WebSocket channel through which the dashboard receives live events. The first end-to-end test goal is for a message sent between two physical Meshtastic nodes to appear in the SafeMesh dashboard as an animated packet traversal — the same visual behavior that currently exists in simulation mode.

**Phase 3 — Hardware Fabrication and Integration**

Once the software bridge is functional, the team will submit the PCB design for fabrication, assemble the boards, and flash the pre-configured Meshtastic firmware. Integration testing will verify that the full stack works together: physical node transmissions are captured by the gateway, translated by the bridge, and rendered on the dashboard in real time.

**Phase 4 — Field Pilot Deployment**

The final planned phase is a small outdoor pilot deployment of five to ten nodes in a real geographic location. This phase will validate radio range, battery life, link quality in real terrain, and the usability of the map-mode dashboard for real deployment planning and monitoring. Findings from the pilot will inform the next design iteration.

---

## 18. Expansion Vision

SafeMesh is designed with a longer-term vision that extends significantly beyond the current Phase 1 scope. The foundational architecture — a mesh-agnostic event model, a dual-mode visualization dashboard, and a gateway bridge pattern — is explicitly designed to accommodate this growth.

In the near term, the most meaningful expansion is the addition of solar charging support to the hardware nodes. A small solar panel and appropriate charge controller would allow nodes to operate indefinitely in outdoor deployments with adequate sunlight, transforming the system from a short-duration emergency tool into a persistent communication infrastructure for rural communities.

GPS integration represents another high-value expansion. Meshtastic already supports GPS-equipped nodes, and the SafeMesh dashboard map mode is designed to display nodes at real geographic coordinates. Adding GPS to the hardware node would allow the dashboard to automatically track the real-world positions of all network participants, which is particularly valuable for emergency response coordination.

Looking further ahead, the team envisions SafeMesh being deployable across multiple use cases beyond disaster response. Agricultural monitoring deployments could use sensor-equipped nodes to relay soil moisture, temperature, and humidity data across large farm areas that lack wired sensor infrastructure. Campus security or event management teams could deploy a temporary mesh network for internal coordination without cellular dependency. Industrial sites with poor cellular penetration — mines, construction zones, remote energy installations — could use SafeMesh as a reliable internal communication backbone.

The mesh-agnostic architecture also means that SafeMesh is not permanently bound to Meshtastic/LoRa. As the IoT landscape evolves, new radio protocols may offer better characteristics for specific deployment scenarios. The gateway bridge pattern allows new protocol adapters to be added as separate modules without touching the dashboard layer.

---

## 19. Cost Estimate and Bill of Materials

One of the most important properties of SafeMesh as a practical system is its cost. Each node is intended to be buildable for a fraction of the cost of commercial mesh communication hardware, making it accessible to rural communities, NGOs, and educational institutions that cannot afford enterprise networking equipment.

The bill of materials below is based on the reference hardware platform described in Section 10 — the ESP32-S3 + SX1262 LoRa design that the team has studied and is currently adapting into a custom PCB. All components are sourced from DigiKey and represent commodity, widely available parts. The per-node cost of approximately 25 to 40 US dollars is achievable because the design uses open-source firmware with no licensing fees, and consolidates all circuitry onto a single board that eliminates the cost of separate breakout modules and wiring. Commercial Meshtastic-compatible devices typically retail for 80 to 150 US dollars. A ten-node SafeMesh deployment would cost approximately 300 US dollars in components — a fraction of equivalent commercial hardware.

The full bill of materials for a single node is as follows:

| Component | Manufacturer | DigiKey Part Number | Qty |
|---|---|---|---|
| ESP32-S3-WROOM-1-N16R8 | Espressif Systems | 5407-ESP32-S3-WROOM-1-N16R8CT-ND | 1 |
| Wio SX1262 LoRa Module | Seeed Technology | 1597-114993390CT-ND | 1 |
| ADP124ACPZ-3.3-R7 LDO Regulator | Analog Devices | 505-ADP124ACPZ-3.3-R7CT-ND | 1 |
| LTC4054ES5-4.2 Li-Ion Charger | Analog Devices | 505-LTC4054ES5-4.2#TRMPBFCT-ND | 1 |
| 10 µF Capacitors (0805) | Aillen | 3372-0805W106K250CCTR-ND | 6 |
| 0.1 µF Capacitors | YAGEO | 311-1088-1-ND | 4 |
| Bi-directional TVS Diodes | Nexperia | 1727-PESD2V0Y1BSFYLCT-ND | 3 |
| Green Status LED | Würth Elektronik | 732-4971-1-ND | 1 |
| Blue Charge Indicator LED | Würth Elektronik | 732-4966-1-ND | 1 |
| Resistors (390K, 100K, 10K ×3, 5.1K ×2, 2K, 330R ×2) | Various | See SDS Appendix | ~11 |
| Tactile Switch SPST (Reset + Boot) | Omron | SW1021CT-ND | 2 |
| USB-C Receptacle | GCT | 2073-USB4105-GF-A-060CT-ND | 1 |
| JST Battery Connector (2-pin) | JST | 455-B2B-XH-A-ND | 1 |

PCB fabrication from services such as JLCPCB or PCBWay adds approximately 5 to 10 US dollars per board for small quantities. A 3D-printed enclosure adds less than 2 US dollars in filament cost using PLA or PETG material.

---

## 20. Scaling Roadmap

SafeMesh is designed so that it can grow from a prototype into a larger operational system without requiring architectural changes to the core dashboard or node design. The scaling roadmap below describes the planned growth trajectory across phases.

In the first phase — which is the current state of the project — the focus is on simulation validation and hardware design finalization. The dashboard handles any number of simulated nodes efficiently, and the hardware design is ready for fabrication.

In the second phase, a backend and gateway bridge are introduced, enabling the first live hardware integration. Initial physical deployments of three to ten nodes validate the hardware design and the integration with the dashboard.

In the third phase, covering approximately the first year of post-submission operation, deployments of ten to fifty nodes become possible as the hardware is fabricated in greater quantities and the gateway bridge matures. Multiple gateway nodes can be introduced to improve coverage and reduce single points of failure in larger deployments.

By the second year, the system can support two hundred or more nodes across multiple gateways, with database and API scaling to handle the increased telemetry volume. Mobile PWA access to the dashboard becomes a priority at this scale, allowing field operators to monitor the network from a phone without requiring a laptop.

In the third year, the vision is multi-mesh federation: multiple independent SafeMesh networks, possibly deployed in different geographic regions, that can share selected information with each other when internet connectivity is available at their gateway nodes. This creates a hierarchical architecture that is both locally resilient and globally coordinated.

---

## 21. Conclusion

SafeMesh demonstrates that a meaningful, practical emergency communication system can be designed and validated within the constraints of a university engineering project. By taking a simulation-first approach, the team has produced a fully functional visualization and debugging tool that proves the routing logic, alert behavior, and user interface before a single physical node is fabricated. By simultaneously designing a complete hardware node based on the ESP32-S3 and SX1262 LoRa transceiver, the team has created a clear and implementable path from this simulation to a real-world deployment.

The project is technically grounded in well-established concepts — BFS routing, controlled flooding with deduplication, link quality calculation, and self-healing mesh topology — while applying them in a novel, integrated system with a genuine use case. The choice of Meshtastic as the firmware layer was deliberate: it provides production-quality mesh behavior and a well-documented API without requiring the team to re-implement the radio protocol, allowing engineering effort to focus on the dashboard, the data model, and the integration architecture.

The expected impact of SafeMesh, if carried forward to full deployment, includes improved emergency communication capability for rural communities, more reliable coordination for first responders in disaster scenarios, and a reduction in dependence on centralized infrastructure for time-critical communication. The system's cost profile — under 40 US dollars per node — makes it accessible in exactly the economic contexts where the communication gap is most severe.

The work completed in Phase 1 provides a strong, validated foundation for the phases ahead. The team looks forward to connecting the simulation to live hardware and demonstrating the full system end-to-end.

---

## 22. References

1. Espressif Systems. *ESP-NOW User Guide*, 2025.
2. Meshtastic Project. *Meshtastic Documentation*, meshtastic.org, 2025.
3. Seeed Studio. *Wio SX1262 LoRa Module Datasheet*, 2024.
4. Analog Devices. *LTC4054ES5 Li-Ion Battery Charger Datasheet*, 2023.
5. Analog Devices. *ADP124 Low Dropout Linear Regulator Datasheet*, 2023.
6. GSMA Intelligence. *The State of Mobile Internet Connectivity*, GSMA, 2024.
7. Coursera Staff. *What Is a Mesh Network and Why You'd Use One*, Coursera, January 2026.
8. IEEE Std 1016-2009. *IEEE Standard for Information Technology — Systems Design — Software Design Descriptions*, IEEE, 2009.
9. Ethiopian National Digital Transformation Strategy, Federal Democratic Republic of Ethiopia, 2025.
10. SafeMesh Software Requirements Specification (SRS), SafeMesh Development Team, Version 1.0, May 2026.
11. SafeMesh System Design Specification (SDS), SafeMesh Development Team, Version 1.0, May 2026.
12. Omran, A. et al. *Low-Cost IoT Mesh Networking for Disaster Response*, IEEE Access, 2023.

---

*SafeMesh Development Team · Adama Science and Technology University · May 2026*
