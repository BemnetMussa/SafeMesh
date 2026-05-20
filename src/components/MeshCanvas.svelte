<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-svelte';
  import {
    nodes, links, packets, sosWaves, signalRadius,
    addNode, triggerSOS, type Node,
  } from '../lib/engine';
  import type { MeshLink } from '../types';

  // ─── Canvas refs ──────────────────────────────────────────────────────────
  let canvas: HTMLCanvasElement;
  let bgCanvas: HTMLCanvasElement;
  let minimapCanvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let bgCtx: CanvasRenderingContext2D;
  let minimapCtx: CanvasRenderingContext2D;
  let wrap: HTMLElement;
  let rfId: number;

  // ─── Store state ─────────────────────────────────────────────────────────
  let sRadius      = 150;
  let currentNodes: Node[]     = [];
  let currentLinks: MeshLink[] = [];
  let currentPackets: any[]    = [];
  let currentWaves:  any[]     = [];
  let nodeMap = new Map<string, Node>();

  const unsubs = [
    signalRadius.subscribe(r => sRadius = r),
    nodes.subscribe(n => {
      currentNodes = n;
      nodeMap = new Map(n.map(nd => [nd.id, nd]));
    }),
    links.subscribe(l  => currentLinks  = l),
    packets.subscribe(p => currentPackets = p),
    sosWaves.subscribe(w => currentWaves  = w),
  ];

  // ─── Camera ───────────────────────────────────────────────────────────────
  // Reassign whole object so Svelte's template reactivity picks up the change.
  let camera = { x: 0, y: 0, scale: 1 };

  $: zoomPct = Math.round(camera.scale * 100);
  $: worldCursor = {
    x: Math.round((mouseX - camera.x) / camera.scale),
    y: Math.round((mouseY - camera.y) / camera.scale),
  };

  function toWorld(sx: number, sy: number) {
    return {
      x: (sx - camera.x) / camera.scale,
      y: (sy - camera.y) / camera.scale,
    };
  }

  // ─── Interaction state ────────────────────────────────────────────────────
  let dragging:    Node | null = null;
  let dragOffX = 0, dragOffY = 0;
  let hoverNode:   Node | null = null;
  let mouseX = 0,  mouseY = 0;
  let spaceDown  = false;
  let isPanning  = false;
  let panStart   = { x: 0, y: 0 };
  let panCamStart = { x: 0, y: 0 };

  // ─── Node status visuals ──────────────────────────────────────────────────
  const STATUS_COLOR: Record<string, string> = {
    warning: '#f59e0b',
    offline: '#475569',
  };

  function nodeColor(n: Node): string {
    return STATUS_COLOR[n.status] ?? n.color;
  }

  function nodeAlpha(n: Node): number {
    return n.status === 'offline' ? 0.45 : 1;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function hexAlpha(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function varColor(name: string) {
    if (typeof getComputedStyle === 'undefined') return '#fff';
    return getComputedStyle(document.body).getPropertyValue(name).trim() || '#fff';
  }

  // ─── Canvas setup ─────────────────────────────────────────────────────────
  function resize() {
    if (!canvas || !bgCanvas || !wrap) return;
    const w   = wrap.clientWidth;
    const h   = wrap.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width  = w * dpr; canvas.height  = h * dpr;
    canvas.style.width  = `${w}px`; canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    bgCanvas.width  = w * dpr; bgCanvas.height  = h * dpr;
    bgCanvas.style.width  = `${w}px`; bgCanvas.style.height = `${h}px`;
    bgCtx.scale(dpr, dpr);

    drawGrid(w, h);
  }

  function drawGrid(w: number, h: number) {
    bgCtx.clearRect(0, 0, w, h);
    const rad = bgCtx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
    rad.addColorStop(0, 'rgba(14, 165, 233, 0.03)');
    rad.addColorStop(1, 'transparent');
    bgCtx.fillStyle = rad;
    bgCtx.fillRect(0, 0, w, h);
    bgCtx.strokeStyle = 'rgba(255,255,255,0.02)';
    bgCtx.lineWidth = 1;
    const step = 60;
    for (let x = 0; x < w; x += step) {
      bgCtx.beginPath(); bgCtx.moveTo(x, 0); bgCtx.lineTo(x, h); bgCtx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      bgCtx.beginPath(); bgCtx.moveTo(0, y); bgCtx.lineTo(w, y); bgCtx.stroke();
    }
  }

  // ─── Camera controls ──────────────────────────────────────────────────────
  export function fitToScreen() {
    if (!wrap) return;
    if (currentNodes.length === 0) { camera = { x: 0, y: 0, scale: 1 }; return; }
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    const pad = 100;
    const minX = Math.min(...currentNodes.map(n => n.x));
    const maxX = Math.max(...currentNodes.map(n => n.x));
    const minY = Math.min(...currentNodes.map(n => n.y));
    const maxY = Math.max(...currentNodes.map(n => n.y));
    const scale = Math.min(w / (maxX - minX + pad * 2), h / (maxY - minY + pad * 2), 2);
    camera = {
      x: (w - (maxX + minX) * scale) / 2,
      y: (h - (maxY + minY) * scale) / 2,
      scale,
    };
  }

  function zoomBy(factor: number) {
    if (!wrap) return;
    const cx = wrap.clientWidth  / 2;
    const cy = wrap.clientHeight / 2;
    const ns = Math.max(0.1, Math.min(4, camera.scale * factor));
    camera = {
      x: cx - (cx - camera.x) * (ns / camera.scale),
      y: cy - (cy - camera.y) * (ns / camera.scale),
      scale: ns,
    };
  }

  // ─── Minimap ──────────────────────────────────────────────────────────────
  const MM_W = 150;
  const MM_H = 90;

  function renderMinimap() {
    if (!minimapCtx || !wrap || currentNodes.length === 0) return;
    const cw = wrap.clientWidth;
    const ch = wrap.clientHeight;
    const sx = MM_W / cw;
    const sy = MM_H / ch;
    const m  = minimapCtx;

    m.clearRect(0, 0, MM_W, MM_H);
    m.fillStyle = 'rgba(5,6,8,0.85)';
    m.fillRect(0, 0, MM_W, MM_H);

    // Viewport rect
    const vpX = (-camera.x / camera.scale) * sx;
    const vpY = (-camera.y / camera.scale) * sy;
    const vpW = (cw / camera.scale) * sx;
    const vpH = (ch / camera.scale) * sy;
    m.fillStyle   = 'rgba(255,255,255,0.04)';
    m.fillRect(vpX, vpY, vpW, vpH);
    m.strokeStyle = 'rgba(255,255,255,0.2)';
    m.lineWidth   = 1;
    m.strokeRect(vpX, vpY, vpW, vpH);

    // Links
    currentLinks.forEach(link => {
      const a = nodeMap.get(link.source);
      const b = nodeMap.get(link.target);
      if (!a || !b) return;
      m.beginPath();
      m.moveTo(a.x * sx, a.y * sy);
      m.lineTo(b.x * sx, b.y * sy);
      m.strokeStyle = `rgba(255,255,255,${0.08 + link.quality * 0.1})`;
      m.lineWidth   = 0.5;
      m.stroke();
    });

    // Nodes
    currentNodes.forEach(n => {
      m.beginPath();
      m.arc(n.x * sx, n.y * sy, 2.5, 0, Math.PI * 2);
      m.fillStyle   = nodeColor(n);
      m.globalAlpha = nodeAlpha(n);
      m.fill();
      m.globalAlpha = 1;
    });

    // Border
    m.strokeStyle = 'rgba(255,255,255,0.08)';
    m.lineWidth   = 1;
    m.strokeRect(0, 0, MM_W, MM_H);
  }

  // ─── Main render loop ─────────────────────────────────────────────────────
  function render() {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // Apply camera transform — all world-space drawing goes inside save/restore
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    // 1. Links
    currentLinks.forEach(link => {
      const a = nodeMap.get(link.source);
      const b = nodeMap.get(link.target);
      if (!a || !b) return;

      const alpha     = 0.15 + link.quality * 0.45;
      const lineWidth = 0.8  + link.quality * 1.7;

      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, hexAlpha(nodeColor(a), alpha));
      grad.addColorStop(1, hexAlpha(nodeColor(b), alpha));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth   = lineWidth;
      ctx.stroke();

      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const d  = Math.round(Math.hypot(a.x - b.x, a.y - b.y));
      ctx.fillStyle   = `rgba(255,255,255,${0.12 + link.quality * 0.18})`;
      ctx.font        = '10px "JetBrains Mono", monospace';
      ctx.textAlign   = 'center';
      ctx.fillText(`${d}m`, mx, my - 4);
    });

    // 2. SOS waves
    const activeWaves = currentWaves.filter(w => w.alpha > 0.01);
    sosWaves.set(activeWaves);
    activeWaves.forEach(w => {
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(244,63,94,${w.alpha})`;
      ctx.lineWidth   = 2.5;
      ctx.stroke();
      w.r    += 3.5;
      w.alpha *= 0.94;
    });

    // 3. Packets
    const live = currentPackets.filter(p => p.progress < 1);
    packets.set(live);
    live.forEach(p => {
      p.progress = Math.min(1, p.progress + p.speed);
      const px = p.fromX + (p.toX - p.fromX) * p.progress;
      const py = p.fromY + (p.toY - p.fromY) * p.progress;

      p.trail.push({ x: px, y: py });
      if (p.trail.length > 20) p.trail.shift();

      p.trail.forEach((pt: { x: number; y: number }, i: number) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = hexAlpha(p.color, (i / p.trail.length) * 0.4);
        ctx.fill();
      });

      ctx.beginPath();
      ctx.arc(px, py, p.type === 'sos' ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle  = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = p.type === 'sos' ? 15 : 8;
      ctx.fill();
      ctx.shadowBlur  = 0;
    });

    // 4. Nodes
    currentNodes.forEach(n => {
      const nColor    = nodeColor(n);
      const alpha     = nodeAlpha(n);
      const isHovered = hoverNode?.id === n.id;

      ctx.globalAlpha = alpha;

      // Pulse ring
      if (n.pulseAlpha > 0.01) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = hexAlpha(nColor, n.pulseAlpha);
        ctx.lineWidth   = 2;
        ctx.stroke();
        n.pulseR    += 3;
        n.pulseAlpha *= 0.92;
      }

      // Signal radius fill
      const radGrad = ctx.createRadialGradient(n.x, n.y, sRadius * 0.1, n.x, n.y, sRadius);
      radGrad.addColorStop(0, hexAlpha(nColor, isHovered ? 0.12 : 0.05));
      radGrad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(n.x, n.y, sRadius, 0, Math.PI * 2);
      ctx.fillStyle = radGrad;
      ctx.fill();

      // Hover dashed ring
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, sRadius, 0, Math.PI * 2);
        ctx.strokeStyle = hexAlpha(nColor, 0.2);
        ctx.lineWidth   = 1;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Outer glow disc
      ctx.beginPath();
      ctx.arc(n.x, n.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = hexAlpha(nColor, 0.15);
      ctx.fill();

      // Core circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, 8, 0, Math.PI * 2);
      ctx.fillStyle   = '#0f111a';
      ctx.fill();
      ctx.strokeStyle = nColor;
      ctx.lineWidth   = 2.5;
      ctx.stroke();

      // Offline × mark
      if (n.status === 'offline') {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth   = 1.5;
        ctx.beginPath(); ctx.moveTo(n.x - 4, n.y - 4); ctx.lineTo(n.x + 4, n.y + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(n.x + 4, n.y - 4); ctx.lineTo(n.x - 4, n.y + 4); ctx.stroke();
      }

      // Warning badge
      if (n.status === 'warning') {
        ctx.beginPath();
        ctx.arc(n.x + 6, n.y - 6, 3, 0, Math.PI * 2);
        ctx.fillStyle   = '#f59e0b';
        ctx.globalAlpha = 1;
        ctx.fill();
      }

      // Label
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = varColor('--text-main');
      ctx.font        = '500 11px "Inter", sans-serif';
      ctx.textAlign   = 'center';
      ctx.fillText(n.label, n.x, n.y + 26);

      ctx.globalAlpha = 1;
    });

    ctx.restore(); // end camera transform

    // Empty state (screen-space)
    if (currentNodes.length === 0) {
      ctx.textAlign   = 'center';
      ctx.fillStyle   = 'rgba(255,255,255,0.07)';
      ctx.font        = '500 15px "Inter", sans-serif';
      ctx.fillText('Click anywhere on the canvas to place a node', w / 2, h / 2 - 10);
      ctx.fillStyle   = 'rgba(255,255,255,0.03)';
      ctx.font        = '400 11px "Inter", sans-serif';
      ctx.fillText('or load a scenario from the controls panel', w / 2, h / 2 + 14);
    }

    renderMinimap();

    rfId = requestAnimationFrame(render);
  }

  // ─── Hit test ─────────────────────────────────────────────────────────────
  function nodeAt(sx: number, sy: number, r = 20): Node | null {
    const { x, y } = toWorld(sx, sy);
    const hitR     = r / camera.scale;
    for (let i = currentNodes.length - 1; i >= 0; i--) {
      if (Math.hypot(currentNodes[i].x - x, currentNodes[i].y - y) < hitR) return currentNodes[i];
    }
    return null;
  }

  // ─── Wheel zoom ───────────────────────────────────────────────────────────
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const rect   = canvas.getBoundingClientRect();
    const sx     = e.clientX - rect.left;
    const sy     = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 0.88;
    const ns     = Math.max(0.1, Math.min(4, camera.scale * factor));
    camera = {
      x: sx - (sx - camera.x) * (ns / camera.scale),
      y: sy - (sy - camera.y) * (ns / camera.scale),
      scale: ns,
    };
  }

  // ─── Mouse ────────────────────────────────────────────────────────────────
  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const sx   = e.clientX - rect.left;
    const sy   = e.clientY - rect.top;

    if (e.button === 2) return;

    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      e.preventDefault();
      isPanning   = true;
      panStart    = { x: sx, y: sy };
      panCamStart = { x: camera.x, y: camera.y };
      canvas.style.cursor = 'grabbing';
      return;
    }

    const world = toWorld(sx, sy);
    const hit   = nodeAt(sx, sy);
    if (hit) {
      dragging = hit;
      dragOffX = hit.x - world.x;
      dragOffY = hit.y - world.y;
      canvas.style.cursor = 'grabbing';
    } else {
      addNode(world.x, world.y);
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const sx   = e.clientX - rect.left;
    const sy   = e.clientY - rect.top;
    mouseX = sx;
    mouseY = sy;

    if (isPanning) {
      camera = { x: panCamStart.x + (sx - panStart.x), y: panCamStart.y + (sy - panStart.y), scale: camera.scale };
      return;
    }

    const world = toWorld(sx, sy);

    if (dragging) {
      nodes.update(ns => {
        dragging!.x = world.x + dragOffX;
        dragging!.y = world.y + dragOffY;
        return ns;
      });
      return;
    }

    hoverNode = nodeAt(sx, sy);
    canvas.style.cursor = spaceDown ? 'grab' : hoverNode ? 'grab' : 'crosshair';
  }

  function handleMouseUp() {
    dragging  = null;
    isPanning = false;
    document.body.style.cursor = 'default';
    canvas.style.cursor = spaceDown ? 'grab' : hoverNode ? 'grab' : 'crosshair';
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const hit  = nodeAt(e.clientX - rect.left, e.clientY - rect.top);
    if (hit) triggerSOS(hit);
  }

  // ─── Keyboard ─────────────────────────────────────────────────────────────
  function handleKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space' && !(e.target as HTMLElement)?.matches('input,textarea,select')) {
      e.preventDefault();
      spaceDown = true;
      if (!isPanning && !dragging) canvas.style.cursor = 'grab';
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.code === 'Space') {
      spaceDown = false;
      if (!isPanning && !dragging) canvas.style.cursor = hoverNode ? 'grab' : 'crosshair';
    }
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  onMount(() => {
    ctx        = canvas.getContext('2d')!;
    bgCtx      = bgCanvas.getContext('2d')!;
    minimapCtx = minimapCanvas.getContext('2d')!;

    window.addEventListener('resize',  resize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup',   handleKeyUp);
    canvas.addEventListener('wheel',   handleWheel, { passive: false });

    setTimeout(() => { resize(); rfId = requestAnimationFrame(render); }, 50);
  });

  onDestroy(() => {
    window.removeEventListener('resize',  resize);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup',   handleKeyUp);
    canvas.removeEventListener('wheel',   handleWheel);
    cancelAnimationFrame(rfId);
    unsubs.forEach(u => u());
  });
</script>

<div class="canvas-wrap" bind:this={wrap}>
  <!-- Static background grid -->
  <canvas bind:this={bgCanvas} class="bg-canvas"></canvas>

  <!-- Main interactive canvas -->
  <canvas
    bind:this={canvas}
    on:mousedown={handleMouseDown}
    on:mousemove={handleMouseMove}
    on:mouseup={handleMouseUp}
    on:mouseleave={handleMouseUp}
    on:contextmenu={handleContextMenu}
  ></canvas>

  <!-- Minimap -->
  <canvas
    bind:this={minimapCanvas}
    width={MM_W}
    height={MM_H}
    class="minimap"
    class:minimap-hidden={currentNodes.length === 0}
  ></canvas>

  <!-- Zoom controls -->
  <div class="zoom-controls glass-panel">
    <button class="zoom-btn" on:click={() => zoomBy(1.25)} title="Zoom in">
      <ZoomIn size={13} />
    </button>
    <span class="zoom-level">{zoomPct}%</span>
    <button class="zoom-btn" on:click={() => zoomBy(0.8)} title="Zoom out">
      <ZoomOut size={13} />
    </button>
    <div class="zoom-sep"></div>
    <button class="zoom-btn" on:click={fitToScreen} title="Fit to screen">
      <Maximize2 size={13} />
    </button>
  </div>

  <!-- World-space cursor coords -->
  <div class="coords">{worldCursor.x} : {worldCursor.y}</div>

  <!-- Context hint -->
  <div class="hint" class:hint-pan={spaceDown}>
    {#if spaceDown}
      Pan mode — release Space to exit
    {:else}
      Click · Drag · Scroll to Zoom · Space+Drag to Pan · Right-Click SOS
    {/if}
  </div>
</div>

<style>
  .canvas-wrap {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: transparent;
  }

  canvas {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
  }

  .bg-canvas {
    pointer-events: none;
    z-index: 1;
  }

  canvas:not(.bg-canvas):not(.minimap) {
    z-index: 2;
    cursor: crosshair;
  }

  /* ── Minimap ── */
  .minimap {
    position: absolute;
    bottom: 52px;
    right: 24px;
    width: 150px;
    height: 90px;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.08);
    z-index: 10;
    pointer-events: none;
    transition: opacity 0.3s;
  }
  .minimap-hidden { opacity: 0; pointer-events: none; }

  /* ── Zoom controls ── */
  .zoom-controls {
    position: absolute;
    top: 24px;
    left: 24px;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 6px;
    border-radius: 8px;
    z-index: 10;
    pointer-events: auto;
  }

  .zoom-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 5px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }
  .zoom-btn:hover {
    background: rgba(255,255,255,0.07);
    color: var(--text-main);
  }

  .zoom-level {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--accent-primary);
    min-width: 36px;
    text-align: center;
    padding: 0 2px;
  }

  .zoom-sep {
    width: 1px;
    height: 16px;
    background: var(--panel-border);
    margin: 0 2px;
  }

  /* ── Coords ── */
  .coords {
    position: absolute;
    bottom: 16px;
    left: 16px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-dim);
    pointer-events: none;
    z-index: 10;
  }

  /* ── Hint ── */
  .hint {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(8px);
    border: 1px solid var(--panel-border);
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 500;
    pointer-events: none;
    z-index: 10;
    letter-spacing: 0.4px;
    white-space: nowrap;
    transition: border-color 0.2s, color 0.2s;
  }

  .hint-pan {
    border-color: rgba(14, 165, 233, 0.3);
    color: var(--accent-primary);
  }
</style>
