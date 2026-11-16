// Rysunki figur automatu (#138) liczone z wpisanych wymiarow: przezroczyste tlo, jasny kontur, wymiary ze strzalkami,
// pogrubione litery (jak na ekranach figur w HMI). Figura w proporcjach wymiarow; gdy potrzebny wymiar jest 0
// (albo ksztalt nie daje sie zamknac) - rysunek bazowy w proporcjach z HMI.
// Kazda funkcja: (v) -> tekst <svg>.

export const COL = { line: '#E4E7EA', dim: '#B4C3D1', text: '#FFFFFF', on: '#2BD39A', fillSoft: 'rgba(228,231,234,0.12)', cut: 'rgba(0,0,0,0.35)' };
const FONT = 'Segoe UI, Arial, Helvetica, sans-serif';
const DEFS = `<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z" fill="${COL.dim}"/></marker></defs>`;
const r1 = (n) => Math.round(n * 10) / 10;

export const svgBox = (w, h, body, m = 28) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-m} ${-m} ${w + 2 * m} ${h + 2 * m}">${DEFS}${body}</svg>`;
export const T = (x, y, t, s = 28, fill = COL.text, weight = 700) => `<text x="${r1(x)}" y="${r1(y)}" fill="${fill}" font-family="${FONT}" font-weight="${weight}" font-size="${s}" text-anchor="middle" dominant-baseline="central">${t}</text>`;
const small = (x, y, t, s = 13) => T(x, y, t, s, COL.dim, 400);
const P = (pts) => pts.map((p) => `${r1(p[0])},${r1(p[1])}`).join(' ');
export const poly = (pts, fill = 'none', sw = 5) => `<polygon points="${P(pts)}" fill="${fill}" stroke="${COL.line}" stroke-width="${sw}" stroke-linejoin="round"/>`;
const pathS = (d, fill = 'none', sw = 5, dash = '') => `<path d="${d}" fill="${fill}" stroke="${COL.line}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const thin = (d, dash = '') => `<path d="${d}" fill="none" stroke="${COL.dim}" stroke-width="2"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const line = (x0, y0, x1, y1) => `<line x1="${r1(x0)}" y1="${r1(y0)}" x2="${r1(x1)}" y2="${r1(y1)}" stroke="${COL.dim}" stroke-width="2" marker-start="url(#ar)" marker-end="url(#ar)"/>`;
// wymiar poziomy (pod / nad) i pionowy (z prawej / z lewej) z litera
const hd = (x0, x1, y, t, below = true, s = 26) => line(x0, y, x1, y) + (t ? T((x0 + x1) / 2, y + (below ? 20 : -20), t, s) : '');
const vd = (y0, y1, x, t, right = true, s = 26) => line(x, y0, x, y1) + (t ? T(x + (right ? 20 : -20), (y0 + y1) / 2, t, s) : '');

const pos = (n) => Number.isFinite(Number(n)) && Number(n) > 0;
const all = (...ns) => ns.every(pos);
// skala: obszar AW x AH, srodek (cx, cy); zwraca {k, x0, y0, w, h}
function fit(wmm, hmm, AW = 300, AH = 180, cx = 185, cy = 105) {
  const k = Math.min(AW / wmm, AH / hmm);
  const w = wmm * k; const h = hmm * k;
  return { k, w, h, x0: cx - w / 2, y0: cy - h / 2 };
}
// minimalna widoczna grubosc (cienkie elementy, np. profil 600 x 20) - czytelnosc
const atLeast = (v, min) => Math.max(v, min);

// litery na bokach wielokata (na zewnatrz, w polowie boku)
function inside(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]; const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function edgeLabels(pts, letters, off = 18, s = 22) {
  return letters.map((t, i) => {
    if (!t) return '';
    const [x0, y0] = pts[i]; const [x1, y1] = pts[(i + 1) % pts.length];
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = -(y1 - y0) / len; const ny = (x1 - x0) / len;
    const mx = (x0 + x1) / 2; const my = (y0 + y1) / 2;
    const sg = inside(pts, mx + nx * 4, my + ny * 4) ? -1 : 1;
    return T(mx + sg * nx * off, my + sg * ny * off, t, s);
  }).join('');
}

// ------------------------------------------------------------------------------------------------------------
export const DRAW = {};

DRAW.RECTANGLE = (v) => {
  const [L, W] = all(v.length, v.width) ? [+v.length, +v.width] : [250, 170];
  const f = fit(L, W);
  const [x0, y0, x1, y1] = [f.x0, f.y0, f.x0 + f.w, f.y0 + f.h];
  return svgBox(400, 240, poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) + hd(x0, x1, y1 + 22, 'A') + vd(y0, y1, x1 + 22, 'B'));
};

DRAW.RECTANGLE_CUTTED = (v) => {
  const ok = all(v.length, v.width, v.radius);
  const [L, W, R] = ok ? [+v.length, +v.width, +v.radius] : [250, 170, 38];
  const f = fit(L, W);
  const r = Math.min(R * f.k, f.w / 2, f.h / 2);
  const [x0, y0, x1, y1] = [f.x0, f.y0, f.x0 + f.w, f.y0 + f.h];
  const lx = x0 + r * 0.3; const ly = y1 - r * 0.3;
  return svgBox(400, 240, `<rect x="${r1(x0)}" y="${r1(y0)}" width="${r1(f.w)}" height="${r1(f.h)}" rx="${r1(r)}" fill="none" stroke="${COL.line}" stroke-width="5"/>`
    + hd(x0, x1, y1 + 22, 'A') + vd(y0, y1, x1 + 22, 'B')
    + `<line x1="${r1(lx + 34)}" y1="${r1(ly - 34)}" x2="${r1(lx)}" y2="${r1(ly)}" stroke="${COL.dim}" stroke-width="2" marker-end="url(#ar)"/>${T(lx + 46, ly - 46, 'R')}`);
};

DRAW.TRIANGLE_RECT = (v) => {
  const [L, H] = all(v.base, v.height) ? [+v.base, +v.height] : [240, 170];
  const f = fit(L, H, 290, 175, 195);
  const [x0, y0, x1, y1] = [f.x0, f.y0, f.x0 + f.w, f.y0 + f.h];
  return svgBox(400, 240, poly([[x0, y0], [x0, y1], [x1, y1]]) + hd(x0, x1, y1 + 22, 'A') + vd(y0, y1, x0 - 22, 'H', false));
};

DRAW.TRIANGLE_EQUAL = (v) => {
  const f = fit(1, Math.sqrt(3) / 2, 300, 175);
  const [x0, y0, x1, y1] = [f.x0, f.y0, f.x0 + f.w, f.y0 + f.h];
  return svgBox(400, 240, poly([[x0, y1], [x1, y1], [(x0 + x1) / 2, y0]]) + hd(x0, x1, y1 + 22, 'A'));
};

DRAW.TRIANGLE_ISOS = (v) => {
  const [L, H] = all(v.base, v.height) ? [+v.base, +v.height] : [300, 145];
  const f = fit(L, H, 310, 175);
  const [x0, y0, x1, y1] = [f.x0, f.y0, f.x0 + f.w, f.y0 + f.h];
  const cx = (x0 + x1) / 2;
  return svgBox(400, 240, poly([[x0, y1], [x1, y1], [cx, y0]]) + thin(`M${r1(cx)},${r1(y0 + 4)} L${r1(cx)},${r1(y1 - 4)}`, '6 5')
    + line(cx, y0 + 6, cx, y1 - 6) + T(cx - 20, (y0 + y1) / 2 + 10, 'H') + hd(x0, x1, y1 + 22, 'A'));
};

const ellipse = (v) => {
  const [L, W] = all(v.length, v.width) ? [+v.length, +v.width] : [280, 145];
  const f = fit(L, W);
  const [x0, y0, x1, y1] = [f.x0, f.y0, f.x0 + f.w, f.y0 + f.h];
  return svgBox(400, 240, `<ellipse cx="${r1((x0 + x1) / 2)}" cy="${r1((y0 + y1) / 2)}" rx="${r1(f.w / 2)}" ry="${r1(f.h / 2)}" fill="none" stroke="${COL.line}" stroke-width="5"/>`
    + hd(x0, x1, y1 + 22, 'A') + vd(y0, y1, x1 + 22, 'B'));
};
DRAW.ELIPSE_ONE_POINT = ellipse;
DRAW.ELIPSE_120_POINT = ellipse;

DRAW.HEART = (v) => {
  const [L, H] = all(v.length, v.height) ? [+v.length, +v.height] : [220, 185];
  const f = fit(L, H, 280, 180);
  const { x0, y0, w, h } = f;
  const X = (u) => r1(x0 + u * w); const Y = (t) => r1(y0 + t * h);
  const d = `M${X(0.5)},${Y(0.22)} C${X(0.5)},${Y(-0.05)} ${X(0.14)},${Y(-0.08)} ${X(0.05)},${Y(0.16)} C${X(-0.04)},${Y(0.43)} ${X(0.23)},${Y(0.7)} ${X(0.5)},${Y(1)}`
    + ` C${X(0.77)},${Y(0.7)} ${X(1.04)},${Y(0.43)} ${X(0.95)},${Y(0.16)} C${X(0.86)},${Y(-0.08)} ${X(0.5)},${Y(-0.05)} ${X(0.5)},${Y(0.22)} Z`;
  return svgBox(400, 240, thin(`M${r1(x0)},${r1(y0)} H${r1(x0 + w)} V${r1(y0 + h)} H${r1(x0)} Z`, '6 5') + pathS(d)
    + hd(x0, x0 + w, y0 + h + 22, 'A') + vd(y0, y0 + h, x0 - 22, 'H', false));
};

DRAW.CROSS = (v) => {
  const ok = all(v.length, v.width, v.height, v.width2) && +v.height < +v.width && +v.width2 < +v.length;
  const [L, W, H, W2] = ok ? [+v.length, +v.width, +v.height, +v.width2] : [170, 170, 60, 60];
  const f = fit(L, W, 260, 175);
  const { x0, y0, k } = f; const x1 = x0 + f.w; const y1 = y0 + f.h;
  const cx = (x0 + x1) / 2; const cy = (y0 + y1) / 2; const a = (W2 * k) / 2; const b = (H * k) / 2;
  const p = [[cx - a, y0], [cx + a, y0], [cx + a, cy - b], [x1, cy - b], [x1, cy + b], [cx + a, cy + b], [cx + a, y1], [cx - a, y1],
    [cx - a, cy + b], [x0, cy + b], [x0, cy - b], [cx - a, cy - b]];
  return svgBox(400, 240, poly(p) + hd(x0, x1, y0 - 20, 'A', false) + vd(y0, y1, x0 - 22, 'B', false)
    + vd(cy - b, cy + b, x1 + 18, 'H') + hd(cx - a, cx + a, y1 + 20, 'W'));
};

DRAW.CURVED_STAIRS = (v) => {
  let ok = all(v.radius, v.length, v.height) && +v.radius > +v.length / 2;
  let [R, D, H] = ok ? [+v.radius, +v.length, +v.height] : [400, 320, 30];
  let s = R - Math.sqrt(R * R - (D / 2) ** 2);
  if (!ok) s = 40;
  const f = fit(D, s + H, 310, 160, 185, 100);
  const { x0, y0, k } = f; const x1 = x0 + f.w;
  const rk = ok ? R * k : Math.hypot(f.w / 2, 0) * 1.6;
  const ys = y0 + s * k; const hk = H * k;
  const d = `M${r1(x0)},${r1(ys)} A${r1(rk)},${r1(rk)} 0 0 1 ${r1(x1)},${r1(ys)} L${r1(x1)},${r1(ys + hk)} A${r1(rk)},${r1(rk)} 0 0 0 ${r1(x0)},${r1(ys + hk)} Z`;
  const cx = (x0 + x1) / 2;
  return svgBox(400, 240, pathS(d) + `<line x1="${r1(cx)}" y1="${r1(y0 + 4)}" x2="${r1(cx)}" y2="${r1(y0 - 30)}" stroke="${COL.dim}" stroke-width="2" marker-start="url(#ar)"/>${T(cx + 20, y0 - 26, 'R')}`
    + vd(ys, ys + atLeast(hk, 8), x1 + 20, 'H') + hd(x0, x1, ys + hk + 30, 'D'));
};

// trapez: 0..2 a (dol) = A, b (gora) = B, h = H; 3..6 boki B / A, podstawa H
DRAW.TRAPEZOID = (v) => {
  const t = Math.max(0, Math.min(6, Math.round(+v.type || 0)));
  const ok = all(v.length, v.width, v.height);
  const [A, B, H] = ok ? [+v.length, +v.width, +v.height] : (t <= 2 ? [200, 120, 175] : [190, 165, 120]);
  if (t <= 2) {
    const wmax = Math.max(A, B);
    const f = fit(wmax, H, 260, 175);
    const { x0, y0, k } = f; const y1 = y0 + f.h; const a = A * k; const b = B * k; const wm = f.w;
    let bot; let top;
    if (t === 0) { bot = [x0 + (wm - a) / 2, x0 + (wm + a) / 2]; top = [x0 + (wm - b) / 2, x0 + (wm + b) / 2]; }
    if (t === 1) { bot = [x0, x0 + a]; top = [x0, x0 + b]; }
    if (t === 2) { bot = [x0 + wm - a, x0 + wm]; top = [x0 + wm - b, x0 + wm]; }
    const p = [[bot[0], y1], [bot[1], y1], [top[1], y0], [top[0], y0]];
    const hx = t === 1 ? x0 - 22 : t === 2 ? x0 + wm + 22 : null;
    return svgBox(400, 240, poly(p) + hd(top[0], top[1], y0 - 20, 'b', false) + hd(bot[0], bot[1], y1 + 22, 'a')
      + (hx === null ? thin(`M${r1(x0 + wm / 2)},${r1(y0 + 3)} L${r1(x0 + wm / 2)},${r1(y1 - 3)}`, '6 5') + T(x0 + wm / 2 - 18, (y0 + y1) / 2, 'h') : vd(y0, y1, hx, 'h', t === 2)));
  }
  // 3..6: B lewa, A prawa (4, 6 - odwrotnie), H podstawa
  const left = t === 3 || t === 5 ? B : A; const right = t === 3 || t === 5 ? A : B;
  const hm = Math.max(left, right);
  const f = fit(H, hm, 220, 175);
  const { x0, y0, k } = f; const x1 = x0 + f.w; const y1 = y0 + f.h; const l = left * k; const r = right * k;
  let p;
  if (t === 3 || t === 4) p = [[x0, y0 + (f.h - l) / 2], [x1, y0 + (f.h - r) / 2], [x1, y0 + (f.h + r) / 2], [x0, y0 + (f.h + l) / 2]];
  else if (t === 5) p = [[x0, y1 - l], [x1, y1 - r], [x1, y1], [x0, y1]];
  else p = [[x0, y0], [x1, y0], [x1, y0 + r], [x0, y0 + l]];
  const lt = t === 3 || t === 5 ? 'B' : 'A'; const rt = t === 3 || t === 5 ? 'A' : 'B';
  return svgBox(400, 240, poly(p) + vd(p[0][1], p[3][1], x0 - 22, lt, false) + vd(p[1][1], p[2][1], x1 + 22, rt) + hd(x0, x1, y1 + 22, 'H'));
};

DRAW.TRAPEZOID45 = (v) => {
  const ok = all(v.width, v.height) && +v.width > 2 * +v.height;
  const [B, H] = ok ? [+v.width, +v.height] : [240, 110];
  const f = fit(B, H, 300, 150);
  const { x0, y0, k } = f; const x1 = x0 + f.w; const y1 = y0 + f.h; const hk = H * k;
  const p = [[x0, y1], [x1, y1], [x1 - hk, y0], [x0 + hk, y0]];
  const cx = (x0 + x1) / 2;
  return svgBox(400, 240, poly(p) + hd(x0 + hk, x1 - hk, y0 - 20, 'a', false) + line(cx, y0 + 4, cx, y1 - 4) + T(cx - 20, (y0 + y1) / 2, 'h') + hd(x0, x1, y1 + 22, 'b'));
};

// blat: kierunki bokow i litery jak w HMI; dlugosci z listy (A, B, C ...); niezamkniety - rysunek bazowy
const WORKTOPS = [
  { pts: [[40, 210], [340, 210], [340, 120], [250, 120], [250, 40], [120, 40], [120, 90], [40, 90]], letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] },
  { pts: [[40, 210], [300, 210], [300, 40], [120, 40], [120, 110], [40, 110]], letters: ['A', 'B', 'C', 'D', '', 'E'] },
  { pts: [[40, 210], [300, 210], [300, 120], [220, 120], [220, 40], [40, 40]], letters: ['A', 'B', 'C', 'D', 'E', 'F'] },
  { pts: [[40, 95], [130, 95], [130, 20], [340, 20], [340, 195], [190, 195], [190, 150], [40, 150]], letters: ['G', 'F', 'E', 'D', 'C', 'B', 'A', 'H'] },
  { pts: [[40, 25], [210, 25], [210, 80], [320, 80], [320, 140], [160, 140], [160, 200], [40, 200]], letters: ['G', 'F', 'E', 'D', 'C', 'B', 'A', 'H'] },
  { pts: [[50, 25], [330, 25], [330, 200], [180, 200], [180, 140], [50, 140]], letters: ['E', 'D', 'C', 'B', 'A', 'F'] },
  { pts: [[50, 25], [330, 25], [330, 120], [180, 120], [180, 190], [50, 190]], letters: ['E', 'D', 'C', 'B', 'A', 'F'] },
];
function worktopPts(base, lengths) {
  const L = (letter) => +lengths[letter.charCodeAt(0) - 65];
  const n = base.pts.length;
  const out = [[0, 0]];
  for (let i = 0; i < n; i++) {
    const [ax, ay] = base.pts[i]; const [bx, by] = base.pts[(i + 1) % n];
    const len = Math.hypot(bx - ax, by - ay);
    const letter = base.letters[i];
    if (!letter) return null; // bok bez litery - dlugosc z pozostalych, nie liczymy
    const l = L(letter);
    if (!pos(l)) return null;
    const [px, py] = out[out.length - 1];
    out.push([px + ((bx - ax) / len) * l, py + ((by - ay) / len) * l]);
  }
  const [ex, ey] = out.pop();
  const span = Math.max(...out.map((p) => Math.abs(p[0])), ...out.map((p) => Math.abs(p[1])), 1);
  return Math.hypot(ex, ey) < span * 0.01 ? out : null;
}
DRAW.WORKTOP = (v) => {
  const t = Math.max(0, Math.min(6, Math.round(+v.type || 0)));
  const base = WORKTOPS[t];
  const real = worktopPts(base, v.lengths || []);
  let pts = base.pts;
  if (real) {
    const xs = real.map((p) => p[0]); const ys = real.map((p) => p[1]);
    const f = fit(Math.max(...xs) - Math.min(...xs) || 1, Math.max(...ys) - Math.min(...ys) || 1, 300, 175, 190, 115);
    pts = real.map(([x, y]) => [f.x0 + (x - Math.min(...xs)) * f.k, f.y0 + (y - Math.min(...ys)) * f.k]);
  }
  return svgBox(400, 240, poly(pts) + edgeLabels(pts, base.letters));
};

// profile (cwiercwalek): przekroj - dlugosc A, wysokosc D (min. grubosc dla czytelnosci)
DRAW.QUATER_ROUND = (v) => {
  const t = Math.round(+v.quaterType || 0) ? 1 : 0;
  const [A, D] = all(v.length, v.depth) ? [+v.length, +v.depth] : [280, 55];
  const k = 300 / A; const w = 300; const h = Math.min(120, atLeast(D * k, 34));
  const [x0, y1] = [35, 130]; const y0 = y1 - h; const x1 = x0 + w; const r = Math.min(h, w / 3);
  const d = t === 0
    ? `M${x0},${y1} L${x0},${r1(y0 + r)} Q${x0},${r1(y0)} ${r1(x0 + r)},${r1(y0)} L${x1},${r1(y0)} L${x1},${y1} Z`
    : `M${x0},${y1} Q${x0},${r1(y0)} ${r1(x0 + r)},${r1(y0)} L${r1(x1 - r)},${r1(y0)} Q${x1},${r1(y0)} ${x1},${y1} Z`;
  return svgBox(400, 190, pathS(d) + vd(y0, y1, x0 + r + 18, 'D') + hd(x0, x1, y1 + 22, 'A'));
};

// --- figury frezu -------------------------------------------------------------------------------------------
const rectOf = (v, dl = 270, dw = 180) => (all(v.length, v.width) ? [+v.length, +v.width] : [dl, dw]);
const frame = (f, a = 'A', b = 'B') => hd(f.x0, f.x0 + f.w, f.y0 + f.h + 22, a) + vd(f.y0, f.y0 + f.h, f.x0 + f.w + 22, b);
const rectD = (f, dash = '') => `<rect x="${r1(f.x0)}" y="${r1(f.y0)}" width="${r1(f.w)}" height="${r1(f.h)}" fill="none" stroke="${dash ? COL.dim : COL.line}" stroke-width="${dash ? 2 : 5}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const hole = (x, y, r) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="none" stroke="${COL.line}" stroke-width="4"/>`;

DRAW.RECTANGLE_CORNERS = (v) => {
  const [L, W] = rectOf(v);
  const f = fit(L, W);
  const r = Math.min(atLeast((pos(v.radius) ? +v.radius : 0) * f.k, 9), f.w / 4, f.h / 4);
  return svgBox(400, 240, rectD(f, '8 6') + [[0, 0], [1, 0], [1, 1], [0, 1]].map(([a, b]) => hole(f.x0 + a * f.w, f.y0 + b * f.h, r)).join('') + frame(f));
};

DRAW.HOLES = (v) => {
  const [L, W] = rectOf(v);
  const f = fit(L, W);
  const sx = pos(v.shiftX) ? Math.min(+v.shiftX * f.k, f.w / 3) : 0; const sy = pos(v.shiftY) ? Math.min(+v.shiftY * f.k, f.h / 3) : 0;
  return svgBox(400, 240, rectD(f, '8 6') + [[0, 0], [1, 0], [1, 1], [0, 1]].map(([a, b]) => hole(f.x0 + (a ? f.w - sx : sx), f.y0 + (b ? f.h - sy : sy), 12)).join('') + frame(f));
};

DRAW.L_CORNERS = (v) => {
  const [L, W] = rectOf(v);
  const f = fit(L, W);
  const h = Math.min(atLeast((pos(v.height) ? +v.height : 55 / f.k) * f.k, 14), f.w / 2.2, f.h / 2.2);
  const { x0, y0 } = f; const x1 = x0 + f.w; const y1 = y0 + f.h;
  const corners = [[x0, y0, 1, 1], [x1, y0, -1, 1], [x1, y1, -1, -1], [x0, y1, 1, -1]];
  return svgBox(400, 240, rectD(f, '8 6') + corners.map(([x, y, sx, sy]) => pathS(`M${r1(x + sx * h)},${r1(y)} L${r1(x)},${r1(y)} L${r1(x)},${r1(y + sy * h)}`)).join('')
    + frame(f) + hd(x0, x0 + h, y0 - 16, '', false) + T(x0 + h + 18, y0 - 16, 'H', 24));
};

// przejscia frezu zygzakiem w prostokacie f (n linii)
const zigzag = (f, n, sw = 3) => {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const y = f.y0 + ((i + 0.5) * f.h) / n;
    const [a, b] = i % 2 ? [f.x0 + f.w - 10, f.x0 + 10] : [f.x0 + 10, f.x0 + f.w - 10];
    pts.push([a, y], [b, y]);
  }
  return `<polyline points="${P(pts)}" fill="none" stroke="${COL.dim}" stroke-width="${sw}" stroke-linejoin="round"/>`;
};

DRAW.MILL_TABLE = (v) => {
  const [L, W] = rectOf(v);
  const f = fit(L, W, 290, 175, 195);
  const n = Math.max(3, Math.min(12, Math.round(f.h / 28)));
  return svgBox(400, 240, rectD(f) + zigzag(f, n) + frame(f) + T(f.x0 - 26, f.y0 + f.h / 2, 'D') + small(f.x0 - 26, f.y0 + f.h / 2 + 24, 'głęb.'));
};

// ociekacz: rowki wzdluz X co skok (jak planowanie stolu) + rzut boczny ze spadkiem glebokosci
DRAW.SINK_DRAINER = (v) => {
  const [L, W] = rectOf(v, 270, 150);
  const f = fit(L, W, 290, 120, 190, 70);
  const jump = pos(v.jump) ? +v.jump : W / 5;
  const n = Math.max(2, Math.min(16, Math.round(W / jump)));   // wiecej linii zlewa sie na rysunku
  const top = rectD(f) + zigzag(f, n, 2.5) + frame(f) + T(f.x0 - 26, f.y0 + f.h / 2, 'S', 24) + small(f.x0 - 26, f.y0 + f.h / 2 + 22, 'skok');
  // rzut boczny: plyta, dno rowka od D1 (start) do D2 (koniec) - pionowo powiekszone
  const d1 = Math.max(0, +v.startDepth || 0);
  const d2 = v.twoDepths ? Math.max(0, +v.endDepth || 0) : d1 + Math.tan(((+v.angle || 0) * Math.PI) / 180) * L;
  const sy = 205; const th = 34; const dmax = Math.max(d1, d2, 1);
  const k = 26 / dmax; const xa = f.x0; const xb = f.x0 + f.w;
  const side = `<rect x="${r1(xa)}" y="${sy}" width="${r1(f.w)}" height="${th}" fill="${COL.fillSoft}" stroke="${COL.line}" stroke-width="3"/>`
    + `<polygon points="${P([[xa, sy], [xb, sy], [xb, sy + d2 * k], [xa, sy + d1 * k]])}" fill="${COL.cut}" stroke="${COL.line}" stroke-width="2.5" stroke-linejoin="round"/>`
    + vd(sy, sy + atLeast(d1 * k, 6), xa - 14, 'D1', false, 18) + vd(sy, sy + atLeast(d2 * k, 6), xb + 16, 'D2', true, 18)
    + small((xa + xb) / 2, sy + th + 14, v.twoDepths ? 'rzut boczny – spadek dna' : `rzut boczny – spadek ${r1(+v.angle || 0)}°`);
  return svgBox(400, 260, top + side);
};

// indukcja: otwor A x B i ramka odsunieta o O (dookola) + rzut boczny: przelot i wpust ramki na glebokosc D
DRAW.INDUCTION = (v) => {
  const [L, W] = rectOf(v, 220, 190);
  const off = pos(v.angle) ? +v.angle : L / 12;
  const f = fit(L + 2 * off, W + 2 * off, 300, 140, 185, 72);
  const o = atLeast(off * f.k, 6);
  const inner = { x0: f.x0 + o, y0: f.y0 + o, w: f.w - 2 * o, h: f.h - 2 * o };
  const top = `<rect x="${r1(f.x0)}" y="${r1(f.y0)}" width="${r1(f.w)}" height="${r1(f.h)}" rx="4" fill="${COL.fillSoft}" stroke="${COL.line}" stroke-width="3" stroke-dasharray="9 6"/>`
    + `<rect x="${r1(inner.x0)}" y="${r1(inner.y0)}" width="${r1(inner.w)}" height="${r1(inner.h)}" fill="${COL.cut}" stroke="${COL.line}" stroke-width="5"/>`
    + hd(inner.x0, inner.x0 + inner.w, f.y0 + f.h + 20, 'A') + vd(inner.y0, inner.y0 + inner.h, f.x0 + f.w + 20, 'B')
    + line(f.x0, inner.y0 + inner.h / 2, inner.x0, inner.y0 + inner.h / 2) + T(f.x0 - 16, inner.y0 + inner.h / 2, 'O', 22)
    + small(inner.x0 + inner.w / 2, inner.y0 + inner.h / 2 - 9, 'otwór') + small(inner.x0 + inner.w / 2, inner.y0 + inner.h / 2 + 9, 'ramka O dookoła');
  // rzut boczny (przekroj w poprzek A): plyta, wpust ramki na glebokosc D (szer. O), w srodku przelot
  const sy = 200; const th = 36; const D = pos(v.depth) ? +v.depth : 10; const dk = Math.min(th - 10, atLeast(D * 1.4, 10));
  const xa = f.x0; const xb = f.x0 + f.w; const ia = inner.x0; const ib = inner.x0 + inner.w;
  const shape = [[xa - 34, sy], [xa, sy], [xa, sy + dk], [ia, sy + dk], [ia, sy + th], [xa - 34, sy + th]];
  const mirror = shape.map(([x, y]) => [xa + xb - x, y]);
  const side = poly(shape, COL.fillSoft, 3) + poly(mirror, COL.fillSoft, 3)
    + vd(sy, sy + dk, xa - 48, 'D', false, 20) + hd(xa, ia, sy - 12, '', false)
    + small((ia + ib) / 2, sy + th / 2, 'przelot') + small((xa + xb) / 2, sy + th + 16, 'rzut boczny');
  return svgBox(400, 262, top + side);
};
