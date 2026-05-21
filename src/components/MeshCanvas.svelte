<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { ZoomIn, ZoomOut, Maximize2, MapPin, Grid3x3 } from 'lucide-svelte';
  import L from 'leaflet';
  import {
    nodes, links, packets, sosWaves, failureFlashes, signalRadius, mapMode,
    addNode, triggerSOS, WEAK_LINK_THRESHOLD, type Node,
  } from '../lib/engine';
  import type { MeshLink } from '../types';

  // ─── Map mode state ───────────────────────────────────────────────────────
  let mapDiv: HTMLDivElement;
  let leafletMap: L.Map | null = null;
  let _mapActive = false;

  const SATELLITE_URL  = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const SATELLITE_ATTR = 'Tiles &copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
  const LABELS_URL     = 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

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
  let currentNodes:   Node[]     = [];
  let currentLinks:   MeshLink[] = [];
  let currentPackets: any[]      = [];
  let currentWaves:   any[]      = [];
  let currentFlashes: any[]      = [];
  let nodeMap = new Map<string, Node>();

  const unsubs = [
    signalRadius.subscribe(r  => sRadius         = r),
    nodes.subscribe(n => {
      currentNodes = n;
      nodeMap = new Map(n.map(nd => [nd.id, nd]));
    }),
    links.subscribe(l          => currentLinks   = l),
    packets.subscribe(p        => currentPackets = p),
    sosWaves.subscribe(w       => currentWaves   = w),
    failureFlashes.subscribe(f => currentFlashes = f),
    mapMode.subscribe(active  => {
      _mapActive = active;
      if (active) enterMapMode(); else exitMapMode();
    }),
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

  // ─── Map mode helpers ─────────────────────────────────────────────────────

  // Returns screen position for a node: projected lat/lon in map mode, world coords in canvas mode
  function nodeScreenPos(n: Node): { x: number; y: number } {
    if (_mapActive && leafletMap && n.lat != null && n.lon != null) {
      const pt = leafletMap.latLngToContainerPoint(L.latLng(n.lat, n.lon));
      return { x: pt.x, y: pt.y };
    }
    return { x: n.x, y: n.y };
  }

  // Assign lat/lon to canvas-mode nodes using current Leaflet viewport
  function assignLatLon() {
    if (!leafletMap) return;
    const lmap = leafletMap;
    nodes.update(ns => ns.map(n => {
      if (n.lat != null && n.lon != null) return n;
      const sx     = n.x * camera.scale + camera.x;
      const sy     = n.y * camera.scale + camera.y;
      const latlng = lmap.containerPointToLatLng(L.point(sx, sy));
      return { ...n, lat: latlng.lat, lon: latlng.lng };
    }));
  }

  function setMapInteractivity(enabled: boolean) {
    if (!leafletMap) return;
    if (enabled) {
      leafletMap.dragging.enable();
      leafletMap.scrollWheelZoom.enable();
      leafletMap.doubleClickZoom.enable();
      leafletMap.touchZoom.enable();
      leafletMap.boxZoom.enable();
      leafletMap.keyboard.enable();
      if ((leafletMap as any).tap) (leafletMap as any).tap.enable();
    } else {
      leafletMap.dragging.disable();
      leafletMap.scrollWheelZoom.disable();
      leafletMap.doubleClickZoom.disable();
      leafletMap.touchZoom.disable();
      leafletMap.boxZoom.disable();
      leafletMap.keyboard.disable();
      if ((leafletMap as any).tap) (leafletMap as any).tap.disable();
    }
  }

  function forceMapLayout() {
    requestAnimationFrame(() => {
      leafletMap?.invalidateSize();
      requestAnimationFrame(() => leafletMap?.invalidateSize());
    });
  }

  async function enterMapMode() {
    // Ensure mapDiv is bound (should be, since it's always in the DOM, but tick() makes it robust)
    if (!mapDiv) await tick();
    if (!mapDiv) return;

    // Create the Leaflet map once (then reuse it on subsequent toggles)
    if (!leafletMap) {
      const seeded = currentNodes.find(n => n.lat != null && n.lon != null);
      const center: [number, number] = seeded ? [seeded.lat!, seeded.lon!] : [51.505, -0.09];

      leafletMap = L.map(mapDiv, {
        center,
        zoom: 14,
        zoomControl: false,
        preferCanvas: false,
      });

      L.tileLayer(SATELLITE_URL, { attribution: SATELLITE_ATTR, maxZoom: 19 }).addTo(leafletMap);
      L.tileLayer(LABELS_URL,    { opacity: 0.7, maxZoom: 19 }).addTo(leafletMap);
      L.control.zoom({ position: 'topleft' }).addTo(leafletMap);

      leafletMap.on('click', (e: L.LeafletMouseEvent) => {
        const lmap = leafletMap!;
        const pt   = lmap.latLngToContainerPoint(e.latlng);
        addNode(pt.x, pt.y, undefined, e.latlng.lat, e.latlng.lng);
      });

      leafletMap.on('contextmenu', (e: L.LeafletMouseEvent) => {
        e.originalEvent.preventDefault();
        const pt  = leafletMap!.latLngToContainerPoint(e.latlng);
        const hit = nodeAtScreen(pt.x, pt.y, 28);
        if (hit) {
          const pos = nodeScreenPos(hit);
          triggerSOS(hit, { x: pos.x, y: pos.y });
        }
      });
    }

    setMapInteractivity(true);
    forceMapLayout();

    // After layout settles, assign geo coords to any nodes that only have x/y
    setTimeout(() => {
      if (!leafletMap) return;
      assignLatLon();
      const geoNodes = currentNodes.filter(n => n.lat != null && n.lon != null);
      if (geoNodes.length > 1) {
        const avgLat = geoNodes.reduce((s, n) => s + n.lat!, 0) / geoNodes.length;
        const avgLon = geoNodes.reduce((s, n) => s + n.lon!, 0) / geoNodes.length;
        leafletMap.setView([avgLat, avgLon], leafletMap.getZoom());
      }
    }, 250);
  }

  function exitMapMode() {
    if (!leafletMap) return;
    const lmap = leafletMap;
    nodes.update(ns => ns.map(n => {
      if (n.lat == null || n.lon == null) return n;
      const pt = lmap.latLngToContainerPoint(L.latLng(n.lat, n.lon));
      return { ...n, x: (pt.x - camera.x) / camera.scale, y: (pt.y - camera.y) / camera.scale };
    }));
    setMapInteractivity(false);
  }

  // Screen-space hit test (used in map mode where canvas has pointer-events:none)
  function nodeAtScreen(sx: number, sy: number, r = 20): Node | null {
    for (let i = currentNodes.length - 1; i >= 0; i--) {
      const pos = nodeScreenPos(currentNodes[i]);
      if (Math.hypot(pos.x - sx, pos.y - sy) < r) return currentNodes[i];
    }
    return null;
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

    // In map mode: no camera transform — positions are projected to screen space each frame.
    // In canvas mode: apply camera transform and use world-space positions.
    let frameNodes: Node[];
    let frameMap: Map<string, Node>;

    if (_mapActive && leafletMap) {
      const lmap = leafletMap;
      frameNodes = currentNodes
        .filter(n => n.lat != null && n.lon != null)
        .map(n => {
          const pt = lmap.latLngToContainerPoint(L.latLng(n.lat!, n.lon!));
          return { ...n, x: pt.x, y: pt.y };
        });
      frameMap = new Map(frameNodes.map(n => [n.id, n]));
    } else {
      frameNodes = currentNodes;
      frameMap   = nodeMap;
      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.scale, camera.scale);
    }

    // 1. Links
    currentLinks.forEach(link => {
      const a = frameMap.get(link.source);
      const b = frameMap.get(link.target);
      if (!a || !b) return;

      const isWeak    = link.quality < WEAK_LINK_THRESHOLD;
      const alpha     = 0.15 + link.quality * 0.45;
      const lineWidth = 0.8  + link.quality * 1.7;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);

      if (isWeak) {
        ctx.strokeStyle = `rgba(245,158,11,${0.25 + link.quality * 0.5})`;
        ctx.lineWidth   = 1;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const srcNode = frameMap.get(link.source);
        const tgtNode = frameMap.get(link.target);
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0, hexAlpha(nodeColor(srcNode ?? a), alpha));
        grad.addColorStop(1, hexAlpha(nodeColor(tgtNode ?? b), alpha));
        ctx.strokeStyle = grad;
        ctx.lineWidth   = lineWidth;
        ctx.stroke();
      }

      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const d  = Math.round(Math.hypot(a.x - b.x, a.y - b.y));
      ctx.fillStyle   = isWeak
        ? `rgba(245,158,11,0.5)`
        : `rgba(255,255,255,${0.12 + link.quality * 0.18})`;
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
    frameNodes.forEach(n => {
      const nColor    = nodeColor(n);
      const alpha     = nodeAlpha(n);
      const isHovered = !_mapActive && hoverNode?.id === n.id;
      const { x: nx, y: ny } = n; // in map mode these are screen coords; in canvas mode world coords

      ctx.globalAlpha = alpha;

      // Pulse ring
      if (n.pulseAlpha > 0.01) {
        ctx.beginPath();
        ctx.arc(nx, ny, n.pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = hexAlpha(nColor, n.pulseAlpha);
        ctx.lineWidth   = 2;
        ctx.stroke();
        n.pulseR    += 3;
        n.pulseAlpha *= 0.92;
      }

      // Signal radius fill — only in canvas mode (meaningless geographically in map mode)
      if (!_mapActive) {
        const radGrad = ctx.createRadialGradient(nx, ny, sRadius * 0.1, nx, ny, sRadius);
        radGrad.addColorStop(0, hexAlpha(nColor, isHovered ? 0.12 : 0.05));
        radGrad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(nx, ny, sRadius, 0, Math.PI * 2);
        ctx.fillStyle = radGrad;
        ctx.fill();

        if (isHovered) {
          ctx.beginPath();
          ctx.arc(nx, ny, sRadius, 0, Math.PI * 2);
          ctx.strokeStyle = hexAlpha(nColor, 0.2);
          ctx.lineWidth   = 1;
          ctx.setLineDash([4, 6]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Outer glow disc
      ctx.beginPath();
      ctx.arc(nx, ny, 14, 0, Math.PI * 2);
      ctx.fillStyle = hexAlpha(nColor, _mapActive ? 0.25 : 0.15);
      ctx.fill();

      // Core circle
      ctx.beginPath();
      ctx.arc(nx, ny, 8, 0, Math.PI * 2);
      ctx.fillStyle   = _mapActive ? 'rgba(10,12,20,0.85)' : '#0f111a';
      ctx.fill();
      ctx.strokeStyle = nColor;
      ctx.lineWidth   = 2.5;
      ctx.stroke();

      // Offline × mark
      if (n.status === 'offline') {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth   = 1.5;
        ctx.beginPath(); ctx.moveTo(nx - 4, ny - 4); ctx.lineTo(nx + 4, ny + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(nx + 4, ny - 4); ctx.lineTo(nx - 4, ny + 4); ctx.stroke();
      }

      // Warning badge
      if (n.status === 'warning') {
        ctx.beginPath();
        ctx.arc(nx + 6, ny - 6, 3, 0, Math.PI * 2);
        ctx.fillStyle   = '#f59e0b';
        ctx.globalAlpha = 1;
        ctx.fill();
      }

      // Node-type indicator
      ctx.globalAlpha = alpha;
      if (n.type === 'gateway') {
        ctx.beginPath();
        ctx.arc(nx, ny, 13, 0, Math.PI * 2);
        ctx.strokeStyle = hexAlpha(nColor, 0.45);
        ctx.lineWidth   = 1;
        ctx.setLineDash([2, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (n.type === 'relay') {
        const s = 3.5;
        ctx.beginPath();
        ctx.moveTo(nx, ny - s - 1);
        ctx.lineTo(nx - s, ny + s - 1);
        ctx.lineTo(nx + s, ny + s - 1);
        ctx.closePath();
        ctx.fillStyle = hexAlpha(nColor, 0.85);
        ctx.fill();
      } else if (n.type === 'sensor') {
        ctx.beginPath();
        ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = hexAlpha(nColor, 0.9);
        ctx.fill();
      }

      // Label
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = _mapActive ? 'rgba(255,255,255,0.95)' : varColor('--text-main');
      ctx.font        = '500 11px "Inter", sans-serif';
      ctx.textAlign   = 'center';
      ctx.fillText(n.label, nx, ny + 26);

      ctx.globalAlpha = 1;
    });

    // 5. Failure flashes (expanding red ring + fading × mark)
    const liveFlashes = currentFlashes.filter(f => f.alpha > 0.01);
    failureFlashes.set(liveFlashes);
    liveFlashes.forEach(f => {
      ctx.beginPath();
      ctx.arc(f.x, f.y, 8 + f.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(244,63,94,${f.alpha})`;
      ctx.lineWidth   = 2;
      ctx.stroke();

      if (f.xAlpha > 0.01) {
        const s = 11;
        ctx.strokeStyle = `rgba(244,63,94,${f.xAlpha})`;
        ctx.lineWidth   = 2.5;
        ctx.lineCap     = 'round';
        ctx.beginPath(); ctx.moveTo(f.x - s, f.y - s); ctx.lineTo(f.x + s, f.y + s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(f.x + s, f.y - s); ctx.lineTo(f.x - s, f.y + s); ctx.stroke();
        ctx.lineCap     = 'butt';
        f.xAlpha *= 0.84;
      }

      f.r    += 2.5;
      f.alpha *= 0.88;
    });

    if (!_mapActive) ctx.restore(); // end camera transform (canvas mode only)

    // Empty state (screen-space)
    if (currentNodes.length === 0) {
      ctx.textAlign   = 'center';
      ctx.fillStyle   = _mapActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.07)';
      ctx.font        = '500 15px "Inter", sans-serif';
      ctx.fillText(
        _mapActive ? 'Click the map to place a node' : 'Click anywhere on the canvas to place a node',
        w / 2, h / 2 - 10,
      );
      ctx.fillStyle   = _mapActive ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.03)';
      ctx.font        = '400 11px "Inter", sans-serif';
      ctx.fillText(
        _mapActive ? 'Right-click a node for emergency SOS' : 'or load a scenario from the controls panel',
        w / 2, h / 2 + 14,
      );
    }

    if (!_mapActive) renderMinimap();

    rfId = requestAnimationFrame(render);
  }

  // ─── Hit test ─────────────────────────────────────────────────────────────
  function nodeAt(sx: number, sy: number, r = 20): Node | null {
    if (_mapActive) return nodeAtScreen(sx, sy, r);
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
    if (_mapActive) return; // handled by Leaflet contextmenu
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
    if (leafletMap) { leafletMap.remove(); leafletMap = null; }
  });
</script>

<div class="canvas-wrap" bind:this={wrap}>
  <!-- Leaflet satellite map background (always present; toggled by opacity/pointer-events) -->
  <div bind:this={mapDiv} class="map-layer" class:map-layer-hidden={!_mapActive}></div>

  {#if _mapActive && !leafletMap}
    <div class="map-loading">Loading map…</div>
  {/if}

  <!-- Static background grid (canvas mode only) -->
  <canvas bind:this={bgCanvas} class="bg-canvas" class:hidden={_mapActive}></canvas>

  <!-- Main interactive canvas — pointer-events:none in map mode (Leaflet handles clicks) -->
  <canvas
    bind:this={canvas}
    class:canvas-map-overlay={_mapActive}
    on:mousedown={handleMouseDown}
    on:mousemove={handleMouseMove}
    on:mouseup={handleMouseUp}
    on:mouseleave={handleMouseUp}
    on:contextmenu={handleContextMenu}
  ></canvas>

  <!-- Minimap (canvas mode only) -->
  <canvas
    bind:this={minimapCanvas}
    width={MM_W}
    height={MM_H}
    class="minimap"
    class:minimap-hidden={currentNodes.length === 0 || _mapActive}
  ></canvas>

  <!-- Zoom / view controls (canvas mode only) -->
  {#if !_mapActive}
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
  {/if}

  <!-- Mode toggle — always visible -->
  <div class="mode-toggle glass-panel" class:mode-toggle-map={_mapActive}>
    <button
      class="mode-btn"
      class:mode-btn-active={!_mapActive}
      on:click={() => mapMode.set(false)}
      title="Canvas mode"
    >
      <Grid3x3 size={13} /> Canvas
    </button>
    <button
      class="mode-btn"
      class:mode-btn-active={_mapActive}
      on:click={() => mapMode.set(true)}
      title="Satellite map mode"
    >
      <MapPin size={13} /> Map
    </button>
  </div>

  <!-- World-space cursor coords (canvas mode only) -->
  {#if !_mapActive}
    <div class="coords">{worldCursor.x} : {worldCursor.y}</div>
  {/if}

  <!-- Context hint -->
  <div class="hint" class:hint-pan={spaceDown && !_mapActive}>
    {#if _mapActive}
      Click to place node · Right-click node for SOS · Scroll to zoom
    {:else if spaceDown}
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
  .bg-canvas.hidden { display: none; }

  canvas:not(.bg-canvas):not(.minimap) {
    z-index: 2;
    cursor: crosshair;
  }

  /* In map mode the canvas is a transparent overlay — Leaflet handles all clicks */
  .canvas-map-overlay {
    pointer-events: none !important;
    background: transparent !important;
  }

  /* ── Leaflet map layer ── */
  .map-layer {
    position: absolute;
    inset: 0;
    z-index: 0;
  }
  .map-layer-hidden {
    opacity: 0;
    pointer-events: none;
  }
  .map-loading {
    position: absolute;
    left: 24px;
    bottom: 18px;
    z-index: 30;
    padding: 8px 10px;
    border-radius: 10px;
    font-size: 12px;
    color: rgba(255,255,255,0.85);
    background: rgba(0,0,0,0.35);
    border: 1px solid rgba(255,255,255,0.08);
    pointer-events: none;
  }
  /* Override Leaflet's default z-indices so our canvas stays on top */
  :global(.leaflet-pane)       { z-index: 1 !important; }
  :global(.leaflet-top),
  :global(.leaflet-bottom)     { z-index: 5 !important; }

  /* ── Mode toggle ── */
  .mode-toggle {
    position: absolute;
    top: 24px;
    right: 24px;
    display: flex;
    gap: 2px;
    padding: 3px;
    border-radius: 8px;
    z-index: 20;
    pointer-events: auto;
  }
  .mode-toggle-map { right: 80px; } /* shift right in map mode to avoid Leaflet zoom control overlap */

  .mode-btn {
    display: flex; align-items: center; gap: 5px;
    background: transparent; border: none;
    color: var(--text-dim); cursor: pointer;
    padding: 5px 10px; border-radius: 5px;
    font-size: 11px; font-weight: 500;
    transition: all 0.15s;
  }
  .mode-btn:hover { background: rgba(255,255,255,0.07); color: var(--text-main); }
  .mode-btn-active {
    background: rgba(14,165,233,0.12);
    color: var(--accent-primary);
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
