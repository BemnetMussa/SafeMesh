<script lang="ts">
  import {
    Shield,
    Radio,
    AlertTriangle,
    Mountain,
    Users,
    Cpu,
    Layers,
    ArrowRight,
    WifiOff,
    Repeat,
    Filter,
    Activity,
    MapPin,
    FileJson,
  } from 'lucide-svelte';

  export let onOpenApp: () => void = () => {};

  const capabilities = [
    {
      icon: Cpu,
      title: 'Simulated ESP32 nodes',
      text: 'Each node behaves like a low-power radio peer—battery, signal, and online status—without physical hardware.',
    },
    {
      icon: Repeat,
      title: 'Controlled message flooding',
      text: 'Short text and SOS alerts propagate hop-by-hop across nearby links, mirroring ESP-NOW-style relay behavior.',
    },
    {
      icon: Filter,
      title: 'Duplicate suppression',
      text: 'Sequence-style tracking prevents the same packet from flooding the mesh again as it circles the network.',
    },
    {
      icon: AlertTriangle,
      title: 'SOS priority handling',
      text: 'Emergency broadcasts get higher visibility—visual waves, critical logs, and flood routing across all reachable nodes.',
    },
    {
      icon: Activity,
      title: 'Live dashboard view',
      text: 'Watch message flow, delivery paths, weak links, partitions, and telemetry in one web-based control surface.',
    },
    {
      icon: MapPin,
      title: 'Topology + map modes',
      text: 'Place nodes on a canvas or real map to reason about coverage in pixels or meters before any field trial.',
    },
  ];

  const audiences = [
    { icon: Users, label: 'Rural communities', detail: 'Coordination when cellular coverage is weak or absent.' },
    { icon: Mountain, label: 'Remote tourism', detail: 'Guides and visitors in parks, mountains, and trekking routes.' },
    { icon: AlertTriangle, label: 'Emergency teams', detail: 'Disaster response when towers and internet fail.' },
    { icon: Radio, label: 'Local organizations', detail: 'Campus security, farms, construction, and industrial sites.' },
  ];

  const builtItems = [
    'Node-to-node relay visualization',
    'SOS alerts with priority routing',
    'Message history and hop paths',
    'Network health and partition alerts',
    'Scenario export / import (JSON)',
  ];

  const notBuilt = [
    'Physical hardware fabrication',
    'Live field deployment',
    'Full production telecom replacement',
    'Advanced GPS or mobile apps (future work)',
  ];
</script>

<div class="landing">
  <div class="landing-bg" aria-hidden="true">
    <div class="grid-glow"></div>
    <div class="orb orb-a"></div>
    <div class="orb orb-b"></div>
  </div>

  <header class="top-bar">
    <div class="brand">
      <Shield size={20} strokeWidth={2.25} />
      <span>Safe<span class="accent">Mesh</span></span>
    </div>
    <nav class="top-nav" aria-label="Landing sections">
      <a href="#problem">Problem</a>
      <a href="#approach">Approach</a>
      <a href="#scope">Scope</a>
    </nav>
    <button class="nav-cta" on:click={onOpenApp}>
      Launch simulator <ArrowRight size={15} />
    </button>
  </header>

  <main class="landing-main">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-text">
        <p class="kicker">
          <WifiOff size={14} />
          Offline-first · ESP-NOW inspired · Web simulation
        </p>
        <h1>
          Emergency mesh communication,
          <em>without the internet.</em>
        </h1>
        <p class="subtitle">
          SafeMesh is a web-based simulation of a low-cost offline network. Short text messages
          and SOS alerts move between nearby nodes—no cellular towers, no central server, no
          data plan required.
        </p>
        <div class="hero-actions">
          <button class="btn btn-primary" on:click={onOpenApp}>
            <Layers size={16} />
            Open mesh simulator
          </button>
          <button class="btn btn-ghost" on:click={onOpenApp}>
            View dashboard
          </button>
        </div>
        <ul class="hero-pills" aria-label="Simulation highlights">
          <li>Controlled flooding</li>
          <li>Sequence-ID dedup</li>
          <li>SOS priority</li>
          <li>Gateway telemetry view</li>
        </ul>
      </div>

      <div class="hero-visual" aria-hidden="true">
        <div class="viz-frame">
          <div class="viz-toolbar">
            <span class="dot dot-red"></span>
            <span class="dot dot-amber"></span>
            <span class="dot dot-green"></span>
            <span class="viz-title">mesh_sim — flood_route</span>
          </div>
          <div class="mesh-stage">
            <svg class="mesh-svg" viewBox="0 0 320 220" fill="none">
              <line x1="72" y1="58" x2="158" y2="42" class="link-line" />
              <line x1="158" y1="42" x2="248" y2="88" class="link-line" />
              <line x1="72" y1="58" x2="98" y2="148" class="link-line weak" />
              <line x1="98" y1="148" x2="198" y2="168" class="link-line" />
              <line x1="198" y1="168" x2="248" y2="88" class="link-line" />
              <line x1="158" y1="42" x2="198" y2="168" class="link-line" />
              <circle cx="72" cy="58" r="10" class="node-dot hub" />
              <circle cx="158" cy="42" r="8" class="node-dot" />
              <circle cx="248" cy="88" r="8" class="node-dot" />
              <circle cx="98" cy="148" r="8" class="node-dot warn" />
              <circle cx="198" cy="168" r="8" class="node-dot" />
              <circle class="packet-dot" r="5" cx="72" cy="58">
                <animateMotion
                  dur="4s"
                  repeatCount="indefinite"
                  path="M72,58 L158,42 L248,88 L198,168 L98,148 L72,58"
                />
              </circle>
            </svg>
            <div class="sos-badge">SOS relay active</div>
          </div>
          <div class="viz-log">
            <div class="log-line"><span class="t">12:04:01</span> TX Alpha → Delta</div>
            <div class="log-line sos"><span class="t">12:04:03</span> SOS flood from Gamma</div>
            <div class="log-line ok"><span class="t">12:04:05</span> DELIVERED · 4 hops</div>
          </div>
        </div>
        <div class="viz-stats">
          <div class="viz-stat">
            <span class="n">0</span>
            <span class="l">Internet required</span>
          </div>
          <div class="viz-stat">
            <span class="n">ESP32</span>
            <span class="l">Inspired nodes</span>
          </div>
          <div class="viz-stat accent">
            <span class="n">Sim</span>
            <span class="l">Concept validation</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Problem -->
    <section id="problem" class="section problem-section">
      <div class="section-label">01 — Problem</div>
      <h2>When normal networks fail, coordination slows down.</h2>
      <div class="problem-grid">
        <p class="problem-lead">
          Rural populations remain far less likely to rely on mobile internet than urban users.
          In disasters, remote tourism, or isolated field work, weak coverage is not just an
          inconvenience—it increases risk when teams cannot exchange short, urgent messages.
        </p>
        <blockquote class="problem-quote">
          SafeMesh demonstrates how a <strong>local mesh</strong> can relay SOS alerts and
          short text across nearby nodes when towers and internet are unavailable.
        </blockquote>
      </div>
    </section>

    <!-- Capabilities -->
    <section id="approach" class="section">
      <div class="section-head">
        <div>
          <div class="section-label">02 — What you can explore</div>
          <h2>Hardware simulation meets a web dashboard.</h2>
          <p class="section-desc">
            Two layers work together: a simulated radio mesh (send, receive, relay) and a
            visualization layer that shows message flow, duplicates filtered, and network health.
          </p>
        </div>
      </div>
      <div class="cap-grid">
        {#each capabilities as item}
          <article class="cap-card">
            <div class="cap-icon"><svelte:component this={item.icon} size={18} /></div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        {/each}
      </div>
    </section>

    <!-- Audiences + built -->
    <section class="section split-section">
      <div class="split-block">
        <div class="section-label">03 — Who it is for</div>
        <h2>Built for places connectivity forgets.</h2>
        <ul class="audience-list">
          {#each audiences as a}
            <li>
              <svelte:component this={a.icon} size={17} />
              <div>
                <strong>{a.label}</strong>
                <span>{a.detail}</span>
              </div>
            </li>
          {/each}
        </ul>
      </div>
      <div class="split-block built-block">
        <div class="section-label">In this release</div>
        <h3>What the simulation includes</h3>
        <ul class="check-list">
          {#each builtItems as item}
            <li><FileJson size={14} class="check-icon" /> {item}</li>
          {/each}
        </ul>
        <p class="future-note">
          Future work: real ESP32 hardware, battery/solar testing, GPS, and small-area field trials.
        </p>
      </div>
    </section>

    <!-- Scope -->
    <section id="scope" class="section scope-section">
      <div class="scope-card">
        <div class="scope-copy">
          <div class="section-label">04 — Honest scope</div>
          <h2>Simulation first—deployment later.</h2>
          <p>
            This project validates concept, message flow, and visualization. It does not prove
            real radio range, battery life, or live-field security. That keeps the timeline
            manageable while still showing a defensible path to hardware.
          </p>
        </div>
        <ul class="scope-not">
          {#each notBuilt as item}
            <li>{item}</li>
          {/each}
        </ul>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-section">
      <div class="cta-inner">
        <h2>See messages move across the mesh.</h2>
        <p>
          Open the simulator to place nodes, trigger SOS floods, watch hop-by-hop delivery,
          and export scenarios for your project report.
        </p>
        <button class="btn btn-primary btn-lg" on:click={onOpenApp}>
          Launch SafeMesh <ArrowRight size={18} />
        </button>
      </div>
    </section>
  </main>

  <footer class="landing-footer">
    <span>SafeMesh — Offline-First Emergency Communication Mesh Simulation</span>
    <span class="footer-meta">Concept validation · Web dashboard · ESP-NOW inspired design</span>
  </footer>
</div>

<style>
  .landing {
    position: relative;
    min-height: 100vh;
    width: 100%;
    color: var(--text-main);
    font-family: var(--font-sans);
  }

  .landing-bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    background:
      radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245, 158, 11, 0.08), transparent 55%),
      radial-gradient(ellipse 60% 40% at 100% 50%, rgba(14, 165, 233, 0.06), transparent 50%),
      #030406;
  }

  .grid-glow {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(148, 163, 184, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(148, 163, 184, 0.04) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: linear-gradient(to bottom, black 0%, transparent 85%);
  }

  .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
  }

  .orb-a {
    width: 420px;
    height: 420px;
    top: -120px;
    right: -80px;
    background: rgba(14, 165, 233, 0.12);
  }

  .orb-b {
    width: 360px;
    height: 360px;
    bottom: 10%;
    left: -100px;
    background: rgba(245, 158, 11, 0.08);
  }

  .top-bar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 16px clamp(20px, 4vw, 48px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(3, 4, 6, 0.72);
    backdrop-filter: blur(16px);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
    font-size: 15px;
    letter-spacing: -0.02em;
    color: var(--text-main);
  }

  .brand .accent {
    color: #38bdf8;
  }

  .top-nav {
    display: flex;
    gap: 24px;
  }

  .top-nav a {
    color: var(--text-dim);
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    transition: color 0.15s;
  }

  .top-nav a:hover {
    color: var(--text-main);
  }

  .nav-cta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 16px;
    border-radius: 8px;
    border: 1px solid rgba(56, 189, 248, 0.35);
    background: rgba(14, 165, 233, 0.12);
    color: #7dd3fc;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.15s;
    white-space: nowrap;
  }

  .nav-cta:hover {
    background: rgba(14, 165, 233, 0.2);
    transform: translateY(-1px);
  }

  .landing-main {
    position: relative;
    z-index: 1;
    max-width: 1180px;
    margin: 0 auto;
    padding: clamp(32px, 6vw, 72px) clamp(20px, 4vw, 48px) 48px;
  }

  /* Hero */
  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.95fr);
    gap: clamp(32px, 5vw, 56px);
    align-items: center;
    padding-bottom: clamp(48px, 8vw, 88px);
  }

  .kicker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 20px;
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid rgba(245, 158, 11, 0.25);
    background: rgba(245, 158, 11, 0.08);
    color: #fcd34d;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0 0 20px;
    font-size: clamp(2.25rem, 5vw, 3.5rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
    font-weight: 700;
    max-width: 14ch;
  }

  h1 em {
    font-style: normal;
    color: #38bdf8;
  }

  .subtitle {
    margin: 0 0 28px;
    max-width: 52ch;
    font-size: 16px;
    line-height: 1.75;
    color: var(--text-muted);
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 24px;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition: transform 0.15s, background 0.15s, border-color 0.15s;
  }

  .btn:hover {
    transform: translateY(-1px);
  }

  .btn-primary {
    background: linear-gradient(135deg, rgba(14, 165, 233, 0.9), rgba(6, 182, 212, 0.75));
    border-color: rgba(125, 211, 252, 0.4);
    color: #0c1220;
    box-shadow: 0 8px 28px rgba(14, 165, 233, 0.25);
  }

  .btn-ghost {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
    color: var(--text-main);
  }

  .btn-lg {
    padding: 14px 28px;
    font-size: 15px;
  }

  .hero-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .hero-pills li {
    padding: 6px 11px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-dim);
  }

  /* Hero visual */
  .hero-visual {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .viz-frame {
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(8, 12, 18, 0.92);
    overflow: hidden;
    box-shadow:
      0 0 0 1px rgba(14, 165, 233, 0.08) inset,
      0 24px 48px rgba(0, 0, 0, 0.45);
  }

  .viz-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(0, 0, 0, 0.35);
  }

  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }

  .dot-red { background: #f87171; }
  .dot-amber { background: #fbbf24; }
  .dot-green { background: #34d399; }

  .viz-title {
    margin-left: 8px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-dim);
  }

  .mesh-stage {
    position: relative;
    padding: 12px 8px 8px;
  }

  .mesh-svg {
    width: 100%;
    height: auto;
    display: block;
  }

  .link-line {
    stroke: rgba(56, 189, 248, 0.45);
    stroke-width: 1.5;
    stroke-dasharray: 6 4;
    animation: dash-flow 1.2s linear infinite;
  }

  .link-line.weak {
    stroke: rgba(251, 191, 36, 0.4);
    stroke-dasharray: 3 6;
  }

  .node-dot {
    fill: #0ea5e9;
    stroke: rgba(125, 211, 252, 0.5);
    stroke-width: 2;
  }

  .node-dot.hub {
    fill: #22d3ee;
    filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.5));
  }

  .node-dot.warn {
    fill: #f59e0b;
  }

  .packet-dot {
    fill: #f43f5e;
    filter: drop-shadow(0 0 6px rgba(244, 63, 94, 0.8));
  }

  .sos-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    padding: 5px 10px;
    border-radius: 6px;
    background: rgba(244, 63, 94, 0.15);
    border: 1px solid rgba(244, 63, 94, 0.35);
    color: #fda4af;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    animation: pulse-warning 2s ease-in-out infinite;
  }

  .viz-log {
    padding: 10px 14px 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    font-family: var(--font-mono);
    font-size: 11px;
  }

  .log-line {
    color: var(--text-dim);
    margin-bottom: 4px;
  }

  .log-line .t {
    color: #64748b;
    margin-right: 8px;
  }

  .log-line.sos { color: #fda4af; }
  .log-line.ok { color: #6ee7b7; }

  .viz-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .viz-stat {
    padding: 14px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
    text-align: center;
  }

  .viz-stat .n {
    display: block;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.03em;
    margin-bottom: 4px;
  }

  .viz-stat .l {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
  }

  .viz-stat.accent .n {
    color: #38bdf8;
  }

  /* Sections */
  .section {
    padding: clamp(40px, 6vw, 64px) 0;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .section-label {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #38bdf8;
    margin-bottom: 12px;
  }

  .section h2 {
    margin: 0 0 16px;
    font-size: clamp(1.6rem, 3vw, 2.2rem);
    letter-spacing: -0.03em;
    line-height: 1.15;
    max-width: 22ch;
  }

  .section-desc {
    margin: 0;
    max-width: 58ch;
    color: var(--text-muted);
    line-height: 1.7;
    font-size: 15px;
  }

  .problem-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    margin-top: 8px;
  }

  .problem-lead {
    margin: 0;
    font-size: 16px;
    line-height: 1.75;
    color: var(--text-muted);
  }

  .problem-quote {
    margin: 0;
    padding: 24px 28px;
    border-radius: 12px;
    border-left: 3px solid #f59e0b;
    background: rgba(245, 158, 11, 0.06);
    font-size: 15px;
    line-height: 1.7;
    color: var(--text-main);
  }

  .problem-quote strong {
    color: #fcd34d;
    font-weight: 600;
  }

  .section-head {
    margin-bottom: 32px;
  }

  .cap-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .cap-card {
    padding: 22px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(8, 12, 18, 0.6);
    transition: border-color 0.2s, background 0.2s;
  }

  .cap-card:hover {
    border-color: rgba(56, 189, 248, 0.25);
    background: rgba(14, 165, 233, 0.04);
  }

  .cap-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    margin-bottom: 14px;
    color: #38bdf8;
    background: rgba(14, 165, 233, 0.1);
    border: 1px solid rgba(14, 165, 233, 0.2);
  }

  .cap-card h3 {
    margin: 0 0 8px;
    font-size: 15px;
    font-weight: 600;
  }

  .cap-card p {
    margin: 0;
    font-size: 13px;
    line-height: 1.65;
    color: var(--text-dim);
  }

  .split-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    align-items: start;
  }

  .split-block h2,
  .split-block h3 {
    margin: 0 0 20px;
    font-size: 1.35rem;
    letter-spacing: -0.02em;
  }

  .audience-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .audience-list li {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding: 14px 16px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.02);
    color: #38bdf8;
  }

  .audience-list strong {
    display: block;
    color: var(--text-main);
    font-size: 14px;
    margin-bottom: 2px;
  }

  .audience-list span {
    font-size: 13px;
    color: var(--text-dim);
    line-height: 1.5;
  }

  .built-block {
    padding: 28px;
    border-radius: 14px;
    border: 1px solid rgba(16, 185, 129, 0.2);
    background: rgba(16, 185, 129, 0.04);
  }

  .check-list {
    list-style: none;
    padding: 0;
    margin: 0 0 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .check-list li {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: var(--text-muted);
  }

  .check-list :global(.check-icon) {
    flex-shrink: 0;
    color: #34d399;
  }

  .future-note {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--text-dim);
    font-style: italic;
  }

  .scope-card {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 32px;
    padding: 32px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(8, 12, 18, 0.5);
  }

  .scope-copy p {
    margin: 0;
    max-width: 52ch;
    font-size: 15px;
    line-height: 1.7;
    color: var(--text-muted);
  }

  .scope-not {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .scope-not li {
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 13px;
    color: var(--text-dim);
  }

  .scope-not li::before {
    content: '— ';
    color: #64748b;
  }

  .cta-section {
    padding: 48px 0 24px;
  }

  .cta-inner {
    text-align: center;
    padding: clamp(40px, 6vw, 56px) clamp(24px, 4vw, 48px);
    border-radius: 16px;
    border: 1px solid rgba(56, 189, 248, 0.2);
    background:
      radial-gradient(ellipse at center, rgba(14, 165, 233, 0.12), transparent 70%),
      rgba(8, 12, 18, 0.8);
  }

  .cta-inner h2 {
    margin: 0 auto 12px;
    max-width: none;
    font-size: clamp(1.5rem, 3vw, 2rem);
  }

  .cta-inner p {
    margin: 0 auto 28px;
    max-width: 48ch;
    color: var(--text-muted);
    font-size: 15px;
    line-height: 1.7;
  }

  .landing-footer {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 24px clamp(20px, 4vw, 48px) 32px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 12px;
    color: var(--text-dim);
    text-align: center;
  }

  .footer-meta {
    font-family: var(--font-mono);
    font-size: 11px;
    opacity: 0.8;
  }

  @media (max-width: 960px) {
    .hero,
    .cap-grid,
    .split-section,
    .scope-card,
    .problem-grid {
      grid-template-columns: 1fr;
    }

    h1 {
      max-width: none;
    }

    .top-nav {
      display: none;
    }
  }

  @media (max-width: 600px) {
    .viz-stats {
      grid-template-columns: 1fr;
    }

    .nav-cta {
      padding: 9px 12px;
      font-size: 12px;
    }
  }
</style>
