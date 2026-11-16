// #138 Rysunki pogladowe figur automatu z literami wymiarow - jak ekrany figur w HMI (DIAScreen).
//
// Obrazki: narysowane na nowo jako SVG (scripts/gen-figure-svgs.mjs -> src/client/img/figures) wg obrazkow z projektu
// DIAScreen (HMI/PilaJednosuportowaINNER.dpa, ekrany figur 130..154) - te same ksztalty i litery. Wariant obrazka jak w HMI - wg zmiennej przelacznika
// (iTrapezoidType, iWorktopType, iBookType, iQuaterRoundType; daszki - 4 przyciski scian bRoof1..4Wall).
// Litery: tekst obok pola na ekranie figury (np. "A" obok HMI2.fFigureLength) - tu wg nazwy zmiennej PLC w etykiecie pola.
// Figury bez obrazka w HMI (Narozniki, Ociekacze, Frez stol, Naroza L, Dziury, Indukcja, Wielokat) - schemat SVG
// w tym samym stylu co rysunki SVG z scripts/gen-figure-svgs.mjs (jasny kontur, strzalki wymiarow, pogrubione litery,
// przezroczyste tlo).

import { DRAW } from './figdraw.js';

const IMG = (name, ext = 'svg') => ({ img: `img/figures/${name}.${ext}` });
const START = { fFigureXStartPosition: 'X', fFigureYStartPosition: 'Y' };

// --- SVG w stylu rysunkow HMI ------------------------------------------------------------------

const W = 400; const H = 270;
const LINE = 'stroke="#E4E7EA" stroke-width="5" fill="none" stroke-linejoin="round"';
const THIN = 'stroke="#B4C3D1" stroke-width="2" fill="none"';
const TXT = (x, y, t, size = 30) => `<text x="${x}" y="${y}" fill="#FFFFFF" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-weight="700" font-size="${size}" text-anchor="middle" dominant-baseline="middle">${t}</text>`;
const DEFS = '<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z" fill="#B4C3D1"/></marker></defs>';
const dim = (x0, y0, x1, y1) => `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" ${THIN} marker-start="url(#ar)" marker-end="url(#ar)"/>`;
const svg = (body) => ({ svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${DEFS}${body}</svg>` });

// prostokat ramki A x B (wspolny dla figur frezu), x0..x1, y0..y1
const R = { x0: 70, y0: 30, x1: 340, y1: 210 };
const frameDims = (a = 'A', b = 'B') => `${dim(R.x0, R.y1 + 25, R.x1, R.y1 + 25)}${TXT((R.x0 + R.x1) / 2, R.y1 + 48, a)}`
  + `${dim(R.x1 + 25, R.y0, R.x1 + 25, R.y1)}${TXT(R.x1 + 45, (R.y0 + R.y1) / 2, b)}`;
const rect = (x0, y0, x1, y1, style = LINE) => `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" ${style}/>`;
const hole = (x, y, r = 11) => `<circle cx="${x}" cy="${y}" r="${r}" ${LINE.replace('stroke-width="6"', 'stroke-width="4"')}/>`;

const SVG = {
  // Narozniki: otwory w rogach prostokata A x B (promien naroza)
  RECTANGLE_CORNERS: () => svg(`${rect(R.x0, R.y0, R.x1, R.y1, THIN.replace('fill="none"', 'fill="none" stroke-dasharray="8 6"'))}`
    + `${[[R.x0, R.y0], [R.x1, R.y0], [R.x1, R.y1], [R.x0, R.y1]].map(([x, y]) => hole(x, y)).join('')}${frameDims()}`),
  // Dziury: 4 otwory w rogach prostokata A x B
  HOLES: () => svg(`${rect(R.x0, R.y0, R.x1, R.y1, THIN.replace('fill="none"', 'fill="none" stroke-dasharray="8 6"'))}`
    + `${[[R.x0, R.y0], [R.x1, R.y0], [R.x1, R.y1], [R.x0, R.y1]].map(([x, y]) => hole(x, y, 14)).join('')}${frameDims()}`),
  // Ociekacz: rowki wzdluz X ze spadkiem w obszarze A x B
  SINK_DRAINER: () => svg(`${rect(R.x0, R.y0, R.x1, R.y1)}`
    + `${[0, 1, 2, 3, 4].map((i) => { const y = R.y0 + 25 + i * 32; return `<line x1="${R.x0 + 20}" y1="${y}" x2="${R.x1 - 20}" y2="${y}" stroke="#E4E7EA" stroke-width="4"/>`; }).join('')}${frameDims()}`),
  // Planowanie stolu: przejscia frezu A x B, glebokosc D
  MILL_TABLE: () => svg(`${rect(R.x0, R.y0, R.x1, R.y1)}`
    + `<polyline points="${[0, 1, 2, 3, 4, 5].map((i) => { const y = R.y0 + 15 + i * 30; return i % 2 ? `${R.x1 - 15},${y} ${R.x0 + 15},${y}` : `${R.x0 + 15},${y} ${R.x1 - 15},${y}`; }).join(' ')}" ${THIN.replace('stroke-width="2"', 'stroke-width="3"')}/>`
    + `${frameDims()}${TXT(R.x0 - 30, (R.y0 + R.y1) / 2, 'D')}<text x="${R.x0 - 30}" y="${(R.y0 + R.y1) / 2 + 26}" fill="#B4C3D1" font-family="Arial" font-size="13" text-anchor="middle">głęb.</text>`),
  // Naroza L: ramiona H w 4 rogach prostokata A x B
  L_CORNERS: () => {
    const h = 55;
    const corners = [[R.x0, R.y0, 1, 1], [R.x1, R.y0, -1, 1], [R.x1, R.y1, -1, -1], [R.x0, R.y1, 1, -1]];
    return svg(`${rect(R.x0, R.y0, R.x1, R.y1, THIN.replace('fill="none"', 'fill="none" stroke-dasharray="8 6"'))}`
      + corners.map(([x, y, sx, sy]) => `<polyline points="${x + sx * h},${y} ${x},${y} ${x},${y + sy * h}" ${LINE}/>`).join('')
      + `${frameDims()}${dim(R.x0, R.y0 - 14, R.x0 + h, R.y0 - 14)}${TXT(R.x0 + h + 20, R.y0 - 14, 'H', 26)}`);
  },
  // Indukcja: otwor (prostokat wewn.) A x B i ramka odsunieta
  INDUCTION: () => svg(`${rect(R.x0, R.y0, R.x1, R.y1)}${rect(R.x0 + 22, R.y0 + 22, R.x1 - 22, R.y1 - 22, THIN.replace('fill="none"', 'fill="none" stroke-dasharray="8 6"'))}${frameDims()}`),
};

// Wielokat: punkty z pol (aPolygonX/Y wzgledem startu), numery wierzcholkow
function polygonSvg(v) {
  const pts = [[0, 0], ...(v.px || []).map((x, i) => [Number(x) || 0, Number(v.py?.[i]) || 0])];
  if (pts.length < 2) return svg(TXT(W / 2, H / 2, 'X, Y'));
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min((W - 80) / Math.max(1, x1 - x0), (H - 70) / Math.max(1, y1 - y0));
  const P = ([x, y]) => [40 + (x - x0) * k, H - 35 - (y - y0) * k];
  const poly = pts.map(P);
  return svg(`<polygon points="${poly.map((p) => p.join(',')).join(' ')}" ${LINE}/>`
    + poly.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="6" fill="#FF8A1F"/>${TXT(x + 14, y - 14, String(i + 1), 18)}`).join(''));
}

// Daszki: sciety ostroslup z gory w proporcjach A x B; szerokosc scian rosnie z kat pochylenia tarczy (tan B),
// na srodku wpisany kat. Daszek wewnetrzny (bFigureInner) - ostroslup do gory nogami (zaglebienie): ciemne dno,
// przekroj w rogu. Sciany klikalne (data-wall) - strona przelacza bRoofNWall.
function roofSvg(v) {
  const A = Math.max(1, Number(v.length) || 1); const B = Math.max(1, Number(v.width) || 1);
  const ang = Number(v.bAngle) || 0;
  const inner = !!v.inner;
  const k = Math.min(290 / A, 170 / B);
  const w = A * k; const h = B * k;
  const x0 = 200 - w / 2; const y0 = 105 - h / 2; const x1 = x0 + w; const y1 = y0 + h;
  const m = Math.min(w, h);
  const t = Math.tan((Math.min(Math.max(Math.abs(ang), 0), 80) * Math.PI) / 180);
  const d = Math.min(0.32 * m, Math.max(0.12 * m, 0.22 * m * t));
  const [i0, j0, i1, j1] = [x0 + d, y0 + d, x1 - d, y1 - d];
  const walls = {
    1: [[x0, y1], [x1, y1], [i1, j1], [i0, j1]], 2: [[x1, y0], [x1, y1], [i1, j1], [i1, j0]],
    3: [[x0, y0], [x1, y0], [i1, j0], [i0, j0]], 4: [[x0, y0], [x0, y1], [i0, j1], [i0, j0]],
  };
  const mid = (pts) => [pts.reduce((s, p) => s + p[0], 0) / 4, pts.reduce((s, p) => s + p[1], 0) / 4];
  const body = [1, 2, 3, 4].map((n) => {
    const on = !!v[`wall${n}`];
    const [mx, my] = mid(walls[n]);
    return `<g data-wall="${n}" style="cursor:pointer"><title>Ściana ${n}</title>`
      + `<polygon points="${walls[n].map((p) => p.map((c) => c.toFixed(1)).join(',')).join(' ')}" fill="${on ? '#2BD39A' : 'rgba(228,231,234,0.08)'}" stroke="#E4E7EA" stroke-width="4" stroke-linejoin="round"${on ? '' : ' stroke-dasharray="10 7"'}/>`
      + `<text x="${mx}" y="${my}" fill="${on ? '#0A1F33' : '#B4C3D1'}" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="20" text-anchor="middle" dominant-baseline="central" pointer-events="none">${n}</text></g>`;
  }).join('');
  const top = `<rect x="${i0}" y="${j0}" width="${Math.max(0, i1 - i0)}" height="${Math.max(0, j1 - j0)}" fill="${inner ? 'rgba(0,0,0,0.35)' : 'none'}" stroke="#E4E7EA" stroke-width="3" pointer-events="none"/>`
    + `<rect x="170" y="${(j0 + j1) / 2 - 15}" width="60" height="30" rx="15" fill="#0A1F33" stroke="#B4C3D1" stroke-width="1.5" pointer-events="none"/>`
    + `<text x="200" y="${(j0 + j1) / 2}" fill="#FFFFFF" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="18" text-anchor="middle" dominant-baseline="central" pointer-events="none">${Math.round(ang * 10) / 10}°</text>`;
  // przekroj: zewnetrzny - ostroslup (gora wezsza), wewnetrzny - zaglebienie (do gory nogami)
  const sec = inner
    ? `<path d="M2,232 L14,232 L24,254 L46,254 L56,232 L68,232 L68,264 L2,264 Z" fill="rgba(228,231,234,0.15)" stroke="#E4E7EA" stroke-width="2.5" stroke-linejoin="round"/>`
    : `<path d="M2,264 L14,236 L56,236 L68,264 Z" fill="rgba(228,231,234,0.15)" stroke="#E4E7EA" stroke-width="2.5" stroke-linejoin="round"/>`;
  const secTxt = `<text x="35" y="226" fill="#B4C3D1" font-family="Segoe UI, Arial, sans-serif" font-size="12" text-anchor="middle">${inner ? 'wewnętrzny' : 'zewnętrzny'}</text>`;
  return svg(body + top + `${dim(x0, y1 + 20, x1, y1 + 20)}${TXT(200, y1 + 40, 'A')}${dim(x1 + 20, y0, x1 + 20, y1)}${TXT(x1 + 40, 105, 'B')}` + sec + secTxt);
}

// --- figury -------------------------------------------------------------------------------------

// letters: zmienna PLC (w etykiecie pola) -> litera z ekranu HMI; picture(v) -> {img} | {svg} | {roof: [...]}
export const FIGURE_PICS = {
  RECTANGLE: { screen: 'Prostokat (130)', letters: { fFigureLength: 'A', fFigureWidth: 'B' }, picture: () => IMG('rectangle') },
  TRIANGLE_RECT: { screen: 'Tr_Prostokatny (131)', letters: { fFigureBase: 'A', fFigureHeight: 'H' }, picture: () => IMG('triangle_rect') },
  TRIANGLE_EQUAL: { screen: 'Tr_Rownoboczny (132)', letters: { fFigureBase: 'A' }, picture: () => IMG('triangle_equal') },
  TRIANGLE_ISOS: { screen: 'Tr_Rownoramienny (133)', letters: { fFigureBase: 'A', fFigureHeight: 'H' }, picture: () => IMG('triangle_isos') },
  RECTANGLE_CUTTED: { screen: 'Prostokat_Zaokraglony (134)', letters: { fFigureLength: 'A', fFigureWidth: 'B', fFigureRadius: 'R' }, picture: () => IMG('rectangle_rounded') },
  RECTANGLE_CORNERS: { screen: 'Narożniki (136)', letters: { fFigureLength: 'A', fFigureWidth: 'B' }, picture: () => SVG.RECTANGLE_CORNERS() },
  HOLES: { screen: 'Dziury (152)', letters: { fFigureLength: 'A', fFigureWidth: 'B' }, picture: () => SVG.HOLES() },
  ROOFS: {
    screen: 'Daszki (137)', letters: { fFigureLength: 'A', fFigureWidth: 'B' },
    // sciety ostroslup w widoku z gory, sciany pod 45 st.; przyciski scian bRoof1..4Wall jak w HMI
    // (1 dol, 2 prawa, 3 gora, 4 lewa): zielona - sciana wykonywana, przerywany obrys - pominieta
    picture: (v) => ({ ...roofSvg(v), walls: [1, 2, 3, 4].map((w) => ({ wall: w, on: !!v[`wall${w}`] })) }),
  },
  SINK_DRAINER: { screen: 'Ociekacze (138)', letters: { fFigureLength: 'A', fFigureWidth: 'B' }, picture: () => SVG.SINK_DRAINER() },
  ELIPSE_ONE_POINT: { screen: 'Elipsa (139)', letters: { fFigureLength: 'A', fFigureWidth: 'B' }, picture: () => IMG('ellipse') },
  ELIPSE_120_POINT: { screen: 'Elipsa (139)', letters: { fFigureLength: 'A', fFigureWidth: 'B' }, picture: () => IMG('ellipse') },
  TRAPEZOID: { screen: 'Trapez (142)', letters: { fFigureLength: 'A', fFigureWidth: 'B', fFigureHeight: 'H' }, picture: (v) => IMG(`trapezoid_${clamp(v.type, 0, 6)}`) },
  WORKTOP: { screen: 'Blat (143)', letters: {}, listLetters: { aWorktopLenghts: 'A, B, C, D, E, F, G, H' }, picture: (v) => IMG(`worktop_${clamp(v.type, 0, 6)}`) },
  MILL_TABLE: { screen: 'Frez stół (144)', letters: { fFigureLength: 'A', fFigureWidth: 'B', fFigureDepth: 'D' }, picture: () => SVG.MILL_TABLE() },
  CURVED_STAIRS: { screen: 'Zaokraglone schody (145)', letters: { fFigureRadius: 'R', fFigureLength: 'D', fFigureHeight: 'H' }, picture: () => IMG('curved_stairs') },
  L_CORNERS: { screen: 'L Narożniki (146)', letters: { fFigureHeight: 'H', fFigureLength: 'A', fFigureWidth: 'B' }, picture: () => SVG.L_CORNERS() },
  CROSS: { screen: 'Krzyz (147)', letters: { fFigureLength: 'A', fFigureWidth: 'B', fFigureHeight: 'H', fCrossWidth2: 'W' }, picture: () => IMG('cross') },
  BOOKS: {
    screen: 'Ksiazka (148)',
    letters: { fFigureLength: 'A', fFigureWidth: 'B', fFigureDepthStart: 'D', fBookDepth2: 'D2', fBookDepth3: 'D3', fBookDepth4: 'D4', fBookDepth5: 'D5' },
    picture: (v) => IMG(`book_${clamp(v.bookType, 0, 1)}`, 'png'), // obrazek z HMI (bez zmian)
  },
  QUATER_ROUND: { screen: 'Cwiercwalek (149)', letters: { fFigureLength: 'A', fFigureWidth: 'B', fFigureDepthStart: 'D' }, picture: (v) => IMG(`quater_round_${clamp(v.quaterType, 0, 1)}`) },
  TRAPEZOID45: { screen: 'Trapez (153)', letters: { fFigureWidth: 'B', fFigureHeight: 'H' }, picture: () => IMG('trapezoid45') },
  HEART: { screen: 'Serce (154)', letters: { fFigureLength: 'A', fHeartHeightPart: 'H' }, picture: () => IMG('heart') },
  INDUCTION: { screen: 'brak ekranu w HMI - schemat Visu3D', letters: { fFigureLength: 'A', fFigureWidth: 'B' }, picture: () => SVG.INDUCTION() },
  POLYGON: { screen: 'Wielokat (155)', letters: { fProgramStartPositionX: 'X', fProgramStartPositionY: 'Y' }, picture: (v) => polygonSvg(v) },
};

function clamp(v, lo, hi) {
  const n = Math.round(Number(v) || 0);
  return Math.max(lo, Math.min(hi, n));
}

// Zmienna PLC z etykiety pola: "Dlugosc (fFigureLength)" -> fFigureLength
export const labelVar = (label) => (/\(([A-Za-z_][\w.[\]]*)[^()]*\)\s*$/.exec(label || '') || [])[1] || null;

// Litera pola figury (A, B, H, R, D, W, X, Y ...) albo null
export function fieldLetter(figId, field) {
  const pic = FIGURE_PICS[figId];
  const v = labelVar(field.label);
  if (!v) return null;
  if (pic?.letters?.[v]) return pic.letters[v];
  if (pic?.listLetters?.[v]) return pic.listLetters[v];
  return START[v] || null;
}

// Rysunek figury dla wartosci pol v
export function figurePicture(figId, v = {}) {
  const pic = FIGURE_PICS[figId];
  if (!pic) return null;
  // rysunek z wpisanych wymiarow (figdraw.js); Ksiazka - obrazek z HMI, Daszki i Wielokat - wlasne rysunki
  if (DRAW[figId]) return { svg: DRAW[figId](v), screen: pic.screen };
  return { ...pic.picture(v), screen: pic.screen };
}
