// Floor maps + automatic route finding for Library QR Finder (no dependencies).
// Layouts are traced from the two floor plans. Coordinates are in the plan's own pixels.
//
// Usage: import { mountFloorMap } from './floormap.js';
//        mountFloorMap(document.getElementById('floor-map'), book);
// `book` needs: floor (1 or 2) and shelf (a book-store code: A–F on Floor 1, G–H on Floor 2).
// Codes like "C3" or "C-3" also work: the leading letter picks the book store.

const room = (id, kind, x1, y1, x2, y2, lines, extra = {}) =>
  ({ id, kind, x: x1, y: y1, w: x2 - x1, h: y2 - y1, lines, ...extra });

const FLOORS = {
  1: {
    name: 'Floor 1', w: 1270, h: 680, bounds: [25, 30, 1243, 655],
    start: { x: 575, y: 598 }, startLabel: 'Entrance',
    rooms: [
      room('relax', 'area', 92, 53, 326, 158, ['Relax room']),
      room('A', 'shelf', 91, 182, 257, 575),
      room('B', 'shelf', 341, 114, 516, 204),
      room('C', 'shelf', 526, 114, 629, 282),
      room('study1', 'area', 348, 218, 501, 336, ['Study area']),
      room('tv', 'area', 747, 122, 859, 271, ['TV', 'room']),
      room('study2', 'area', 904, 134, 1004, 353, ['Study', 'area']),
      room('D', 'shelf', 1031, 121, 1177, 265),
      room('E', 'shelf', 1032, 303, 1186, 500),
      room('F', 'shelf', 788, 374, 1010, 505),
      room('staffL', 'area', 343, 400, 485, 550, ['Library staff', 'area']),
      room('face', 'door', 526, 419, 623, 534, ['Face scan', 'door'], { walk: true }),
      room('entrance', 'door', 524, 551, 625, 648, ['Entrance'], { walk: true }),
      room('gate', 'area', 658, 376, 753, 596, ['Gate staff', 'area']),
    ],
  },
  2: {
    name: 'Floor 2', w: 1210, h: 628, bounds: [0, 5, 1210, 628],
    start: { x: 541, y: 330 }, startLabel: 'Arrival (stairs / lift)',
    rooms: [
      room('G', 'shelf', 135, 72, 344, 364),
      room('studyA', 'area', 434, 86, 628, 205, ['Study area']),
      room('H', 'shelf', 704, 70, 950, 218),
      room('studyB', 'area', 1033, 111, 1156, 270, ['Study', 'area']),
      room('entrance', 'door', 439, 262, 643, 372, ['Entrance'], { walk: true }),
      room('studyC', 'area', 164, 433, 803, 554, ['Study area'], { round: true }),
      room('studyD', 'area', 821, 270, 1161, 528, ['Study area']),
    ],
  },
};

// ---------- route finding on a grid (shortest path, fewest turns, around walls) ----------
const CELL = 8, PAD = 8, TURN = 6;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const gridCache = {};

function getGrid(floor) {
  if (gridCache[floor]) return gridCache[floor];
  const f = FLOORS[floor], cols = Math.ceil(f.w / CELL), rows = Math.ceil(f.h / CELL);
  const blocked = new Uint8Array(cols * rows);
  const [bx1, by1, bx2, by2] = f.bounds;
  const walls = f.rooms.filter(r => !r.walk);
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    const px = cx * CELL + CELL / 2, py = cy * CELL + CELL / 2;
    let b = px < bx1 + 12 || px > bx2 - 12 || py < by1 + 12 || py > by2 - 12;
    if (!b) for (const r of walls) {
      if (px > r.x - PAD && px < r.x + r.w + PAD && py > r.y - PAD && py < r.y + r.h + PAD) { b = true; break; }
    }
    blocked[cy * cols + cx] = b ? 1 : 0;
  }
  return (gridCache[floor] = { cols, rows, blocked });
}

class Heap {
  constructor() { this.a = []; }
  push(c, s) { const a = this.a; a.push([c, s]); let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop();
    if (a.length) { a[0] = last; let i = 0;
      for (;;) { let l = 2 * i + 1, r = l + 1, m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top; }
  get size() { return this.a.length; }
}

export function findRoute(floor, zoneId) {
  const f = FLOORS[floor], zone = f.rooms.find(r => r.id === zoneId);
  if (!zone) return null;
  const { cols, rows, blocked } = getGrid(floor);

  // start cell = nearest free cell to the start point
  let sx = Math.floor(f.start.x / CELL), sy = Math.floor(f.start.y / CELL), best = null;
  for (let rad = 0; rad < 10 && !best; rad++)
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      const x = sx + dx, y = sy + dy;
      if (x >= 0 && y >= 0 && x < cols && y < rows && !blocked[y * cols + x]) { best = [x, y]; dy = rad + 1; break; }
    }
  if (!best) return null;
  const startCell = best[1] * cols + best[0];

  // goal cells = free cells right beside the destination book store
  const m = PAD + CELL + 2, goal = new Uint8Array(cols * rows);
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    const px = cx * CELL + CELL / 2, py = cy * CELL + CELL / 2;
    if (!blocked[cy * cols + cx] && px > zone.x - m && px < zone.x + zone.w + m && py > zone.y - m && py < zone.y + zone.h + m)
      goal[cy * cols + cx] = 1;
  }

  const dist = new Float32Array(cols * rows * 4).fill(Infinity), prev = new Int32Array(cols * rows * 4).fill(-1);
  const heap = new Heap();
  for (let d = 0; d < 4; d++) { dist[startCell * 4 + d] = 0; heap.push(0, startCell * 4 + d); }
  let end = -1;
  while (heap.size) {
    const [c, s] = heap.pop();
    if (c > dist[s]) continue;
    const cell = s >> 2, d = s & 3;
    if (goal[cell]) { end = s; break; }
    const cx = cell % cols, cy = (cell / cols) | 0;
    for (let nd = 0; nd < 4; nd++) {
      const nx = cx + DIRS[nd][0], ny = cy + DIRS[nd][1];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || blocked[ny * cols + nx]) continue;
      const ns = (ny * cols + nx) * 4 + nd, nc = c + 1 + (nd !== d ? TURN : 0);
      if (nc < dist[ns]) { dist[ns] = nc; prev[ns] = s; heap.push(nc, ns); }
    }
  }
  if (end < 0) return null;

  const cells = [];
  for (let s = end; s !== -1; s = prev[s]) cells.push(s >> 2);
  cells.reverse();
  const pts = cells.map(c => ({ x: (c % cols) * CELL + CELL / 2, y: ((c / cols) | 0) * CELL + CELL / 2 }));
  // keep only the corners
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    if ((b.x - a.x) * (c.y - b.y) !== (b.y - a.y) * (c.x - b.x)) out.push(b);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// ---------- book -> map zone ----------
export function resolveBook(book) {
  const n = parseInt(String(book.floor ?? '').replace(/\D/g, ''), 10);   // "1", "Floor 1" -> 1
  const hint = [1, 2].includes(n) ? n : null;
  const find = (c) => { for (const fl of [hint, 1, 2].filter(Boolean)) {
    const z = FLOORS[fl].rooms.find(r => r.kind === 'shelf' && r.id === c); if (z) return { floor: fl, zone: z }; } return null; };
  // Look in shelf, then section: accepts "C", "C3", "C-3", "Section C", "Shelf C"
  const raws = [book.shelf_code, book.shelf, book.section].map(v => String(v ?? '').trim().toUpperCase()).filter(Boolean);
  let hit = null;
  for (const raw of raws) {
    const tight = raw.replace(/[^A-Z0-9]/g, '');
    hit = find(tight)
       || (/^[A-H]\d*$/.test(tight) && find(tight[0]))
       || (() => { const m = raw.match(/\b([A-H])\b/); return m && find(m[1]); })();
    if (hit) break;
  }
  return { floor: hit ? hit.floor : (hint || 1), zone: hit ? hit.zone : null, code: raws[0] || '' };
}

// ---------- drawing ----------
const tx = (r, lines) => {
  const lh = 26, y0 = r.y + r.h / 2 - ((lines.length - 1) * lh) / 2 + 8;
  return `<text class="fm-label" x="${r.x + r.w / 2}" y="${y0}" text-anchor="middle">${lines.map((l, i) => `<tspan x="${r.x + r.w / 2}" dy="${i ? lh : 0}">${l}</tspan>`).join('')}</text>`;
};

function svgFloor(floor, dest) {
  const f = FLOORS[floor], isDest = dest.zone && dest.floor === floor;
  const route = isDest ? findRoute(floor, dest.zone.id) : null;
  const [bx1, by1, bx2, by2] = f.bounds;
  const rooms = f.rooms.map(r => {
    const lines = r.lines || (r.w < 130 ? ['Book', `store ${r.id}`] : [`Book store ${r.id}`]);
    const cls = `fm-room fm-${r.kind}${isDest && dest.zone.id === r.id ? ' fm-dest' : ''}`;
    return `<rect class="${cls}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${r.round ? 36 : 6}"/>${tx(r, lines)}`;
  }).join('');
  const d = route ? route.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ') : '';
  const s = route ? route[0] : f.start;
  const pin = isDest ? `<g class="fm-pin" transform="translate(${dest.zone.x + dest.zone.w / 2} ${dest.zone.y + dest.zone.h / 2 - 8})">
      <circle class="fm-pulse" r="18"/><path d="M0 0 C-20 -26 -20 -56 0 -56 C20 -56 20 -26 0 0Z"/><circle cx="0" cy="-38" r="7" fill="#fff"/></g>` : '';
  return `<svg class="fm-svg" viewBox="0 0 ${f.w} ${f.h}" role="img" aria-label="${f.name} map">
    <rect class="fm-floor" x="${bx1}" y="${by1}" width="${bx2 - bx1}" height="${by2 - by1}" rx="12"/>
    ${rooms}
    ${route ? `<path class="fm-route" d="${d}"/>` : ''}
    <circle class="fm-start" cx="${s.x}" cy="${s.y}" r="12"/>
    <text class="fm-startlabel" x="${s.x + 20}" y="${s.y + 6}">${f.startLabel}</text>
    ${pin}</svg>`;
}

export function mountFloorMap(container, book, opts = {}) {
  if (!container) return;
  const dest = resolveBook(book || {});
  let current = opts.floor || dest.floor;   // auto-select the book's floor
  const render = () => {
    const note = dest.zone
      ? `Book store <strong>${dest.zone.id}</strong> on <strong>${FLOORS[dest.floor].name}</strong>${dest.floor === 2 ? '. Take the stairs/lift up from Floor 1; the route starts where you arrive.' : '. Follow the blue route from the entrance.'}`
      : `This book's shelf${dest.code ? ` (“${dest.code}”)` : ''} isn't on the map yet. Showing ${FLOORS[current].name}.`;
    container.innerHTML = `
      <div class="fm-head"><h2>Find it on the map</h2>
        <div class="fm-tabs" role="tablist">${[1, 2].map(n => `<button role="tab" class="fm-tab${n === current ? ' active' : ''}" data-floor="${n}" aria-selected="${n === current}">${FLOORS[n].name}${dest.zone && dest.floor === n ? ' ⌖' : ''}</button>`).join('')}</div></div>
      <p class="fm-note">${note}</p>
      ${svgFloor(current, dest)}
      <ul class="fm-legend"><li><i class="k-route"></i>Route</li><li><i class="k-shelf"></i>Book store</li><li><i class="k-dest"></i>Destination</li><li><i class="k-start"></i>Start</li></ul>`;
    container.querySelectorAll('.fm-tab').forEach(b => b.addEventListener('click', () => { current = +b.dataset.floor; render(); }));
  };
  render();
}

// Valid book-store codes per floor, for admin dropdowns: { 1: ['A',...], 2: ['G','H'] }
export const SHELF_OPTIONS = Object.fromEntries(
  Object.entries(FLOORS).map(([n, f]) => [n, f.rooms.filter(r => r.kind === 'shelf').map(r => r.id)]));
