<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { 
    nodes, links, packets, sosWaves, signalRadius, 
    addNode, triggerSOS, type Node 
  } from '../lib/engine';

  let canvas: HTMLCanvasElement;
  let bgCanvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let bgCtx: CanvasRenderingContext2D;
  let wrap: HTMLElement;

  let rfId: number;
  let sRadius = 150;
  
  let currentNodes: Node[] = [];
  let currentLinks = [];
  let currentPackets = [];
  let currentWaves = [];

  const unsubs = [
    signalRadius.subscribe(r => sRadius = r),
    nodes.subscribe(n => currentNodes = n),
    links.subscribe(l => currentLinks = l),
    packets.subscribe(p => currentPackets = p),
    sosWaves.subscribe(w => currentWaves = w)
  ];

  let dragging: Node | null = null;
  let dragOffX = 0, dragOffY = 0;
  let hoverNode: Node | null = null;
  let mouseX = 0, mouseY = 0;

  function hexAlpha(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1,3), 16) || 0;
    const g = parseInt(hex.slice(3,5), 16) || 0;
    const b = parseInt(hex.slice(5,7), 16) || 0;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function resize() {
    if (!canvas || !bgCanvas || !wrap) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    
    // Scale for HDPI displays
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    bgCanvas.width = w * dpr;
    bgCanvas.height = h * dpr;
    bgCanvas.style.width = `${w}px`;
    bgCanvas.style.height = `${h}px`;
    bgCtx.scale(dpr, dpr);
    
    drawGrid(w, h);
  }

  function drawGrid(w: number, h: number) {
    bgCtx.clearRect(0, 0, w, h);
    
    // Radial glow behind the mesh
    const rad = bgCtx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)*0.6);
    rad.addColorStop(0, 'rgba(14, 165, 233, 0.03)');
    rad.addColorStop(1, 'transparent');
    bgCtx.fillStyle = rad;
    bgCtx.fillRect(0, 0, w, h);

    // Subtle grid
    bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    bgCtx.lineWidth = 1;
    const step = 60;
    for (let x = 0; x < w; x += step) {
      bgCtx.beginPath(); bgCtx.moveTo(x, 0); bgCtx.lineTo(x, h); bgCtx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      bgCtx.beginPath(); bgCtx.moveTo(0, y); bgCtx.lineTo(w, y); bgCtx.stroke();
    }
  }

  function render() {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // 1. Draw Links
    currentLinks.forEach(([a, b]) => {
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, hexAlpha(a.color, 0.4));
      grad.addColorStop(1, hexAlpha(b.color, 0.4));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const d = Math.round(Math.hypot(a.x - b.x, a.y - b.y));
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${d}m`, mx, my - 4);
    });

    // 2. Draw SOS waves
    const activeWaves = currentWaves.filter(w => w.alpha > 0.01);
    sosWaves.set(activeWaves);
    activeWaves.forEach(w => {
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(244,63,94,${w.alpha})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      w.r += 3.5;
      w.alpha *= 0.94;
    });

    // 3. Draw Packets
    const uncompletedPkts = currentPackets.filter(p => p.progress < 1);
    packets.set(uncompletedPkts);
    uncompletedPkts.forEach(p => {
      p.progress = Math.min(1, p.progress + p.speed);
      const px = p.fromX + (p.toX - p.fromX) * p.progress;
      const py = p.fromY + (p.toY - p.fromY) * p.progress;

      p.trail.push({ x: px, y: py });
      if (p.trail.length > 20) p.trail.shift();
      
      p.trail.forEach((pt, i) => {
        const a = (i / p.trail.length) * 0.4;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = hexAlpha(p.color, a);
        ctx.fill();
      });

      ctx.beginPath();
      ctx.arc(px, py, p.type === 'sos' ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.type === 'sos' ? 15 : 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 4. Draw Nodes
    currentNodes.forEach(n => {
      // Pulse animation
      if (n.pulseAlpha > 0.01) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = hexAlpha(n.color, n.pulseAlpha);
        ctx.lineWidth = 2;
        ctx.stroke();
        n.pulseR += 3;
        n.pulseAlpha *= 0.92;
      }

      // Signal radius coverage (persistent)
      const isHovered = hoverNode && hoverNode.id === n.id;
      const radGrad = ctx.createRadialGradient(n.x, n.y, sRadius * 0.1, n.x, n.y, sRadius);
      radGrad.addColorStop(0, hexAlpha(n.color, isHovered ? 0.12 : 0.05));
      radGrad.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(n.x, n.y, sRadius, 0, Math.PI * 2);
      ctx.fillStyle = radGrad;
      ctx.fill();

      // Dashed border on hover
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, sRadius, 0, Math.PI * 2);
        ctx.strokeStyle = hexAlpha(n.color, 0.2);
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Outer glow
      ctx.beginPath();
      ctx.arc(n.x, n.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = hexAlpha(n.color, 0.15);
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(n.x, n.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#0f111a'; // match panel/bg
      ctx.fill();
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = varColor('--text-main');
      ctx.font = '500 11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(n.label, n.x, n.y + 26);
    });

    rfId = requestAnimationFrame(render);
  }

  function varColor(name: string) {
    if (typeof getComputedStyle === 'undefined') return '#fff';
    return getComputedStyle(document.body).getPropertyValue(name).trim() || '#fff';
  }

  function nodeAt(x: number, y: number, r = 20) {
    for (let i = currentNodes.length - 1; i >= 0; i--) {
      if (Math.hypot(currentNodes[i].x - x, currentNodes[i].y - y) < r) {
        return currentNodes[i];
      }
    }
    return null;
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (e.button === 2) return; // Right click handled by contextmenu

    const hit = nodeAt(x, y);
    if (hit) {
      dragging = hit;
      dragOffX = hit.x - x;
      dragOffY = hit.y - y;
      document.body.style.cursor = 'grabbing';
    } else {
      addNode(x, y);
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    if (dragging) {
      nodes.update(ns => {
        dragging.x = mouseX + dragOffX;
        dragging.y = mouseY + dragOffY;
        return ns;
      });
      return;
    }

    hoverNode = nodeAt(mouseX, mouseY);
    if (hoverNode) {
      canvas.style.cursor = 'grab';
    } else {
      canvas.style.cursor = 'crosshair';
    }
  }

  function handleMouseUp() {
    dragging = null;
    document.body.style.cursor = 'default';
    if (hoverNode) canvas.style.cursor = 'grab';
    else canvas.style.cursor = 'crosshair';
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const hit = nodeAt(e.clientX - rect.left, e.clientY - rect.top);
    if (hit) {
      triggerSOS(hit);
    }
  }

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    bgCtx = bgCanvas.getContext('2d')!;
    window.addEventListener('resize', resize);
    
    // Slight delay to ensure parent dimensions are set
    setTimeout(() => {
      resize();
      rfId = requestAnimationFrame(render);
    }, 50);
  });

  onDestroy(() => {
    window.removeEventListener('resize', resize);
    cancelAnimationFrame(rfId);
    unsubs.forEach(u => u());
  });
</script>

<div class="canvas-wrap" bind:this={wrap}>
  <canvas bind:this={bgCanvas} class="bg-canvas"></canvas>
  <canvas 
    bind:this={canvas} 
    on:mousedown={handleMouseDown}
    on:mousemove={handleMouseMove}
    on:mouseup={handleMouseUp}
    on:mouseleave={handleMouseUp}
    on:contextmenu={handleContextMenu}
  ></canvas>
  
  <div class="coords">
    X:{Math.round(mouseX)} Y:{Math.round(mouseY)}
  </div>
  
  <div class="hint">
    Click to Add Node · Drag to Move · Right-Click for SOS
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

  canvas:not(.bg-canvas) {
    z-index: 2;
  }
  
  .coords {
    position: absolute;
    bottom: 16px; left: 16px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-dim);
    pointer-events: none;
    z-index: 10;
  }
  
  .hint {
    position: absolute;
    bottom: 16px; left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    border: 1px solid var(--panel-border);
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 500;
    pointer-events: none;
    z-index: 10;
    letter-spacing: 0.5px;
  }
</style>
