// Rysunki figur automatu (#138) w nowym stylu HMI: przezroczyste tlo, jasny gruby kontur, wymiary ze strzalkami,
// duze pogrubione litery. Zastepuja obrazki PNG wyciagniete z DIAScreen (ten sam ksztalt i litery co w HMI).
// Uruchomienie: node scripts/gen-figure-svgs.mjs  ->  src/client/img/figures/*.svg
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/client/img/figures');

export const C = { line: '#E4E7EA', dim: '#B4C3D1', text: '#FFFFFF', on: '#2BD39A', off: 'rgba(228,231,234,0.10)', axis: '#B4B4B4' };
const SW = 5;
const DEFS = `<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z" fill="${C.dim}"/></marker></defs>`;
// m - margines wokol rysunku (litery wymiarow przy brzegu nie sa ucinane)
const svg = (w, h, body, extra = '', m = 28) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-m} ${-m} ${w + 2 * m} ${h + 2 * m}" width="${w + 2 * m}" height="${h + 2 * m}"${extra}>${DEFS}${body}</svg>\n`;
const T = (x, y, t, s = 30) => `<text x="${x}" y="${y}" fill="${C.text}" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-weight="700" font-size="${s}" text-anchor="middle" dominant-baseline="central">${t}</text>`;
const pathD = (pts, close = true) => `M${pts.map((p) => p.join(',')).join(' L')}${close ? ' Z' : ''}`;
const shape = (d, fill = 'none') => `<path d="${d}" fill="${fill}" stroke="${C.line}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round"/>`;
const poly = (pts) => shape(pathD(pts));
const thin = (d, dash = '') => `<path d="${d}" fill="none" stroke="${C.dim}" stroke-width="2"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
// linia wymiarowa ze strzalkami i litera (lx, ly - polozenie litery)
const dim = (x0, y0, x1, y1, t, lx, ly, s) => `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${C.dim}" stroke-width="2" marker-start="url(#ar)" marker-end="url(#ar)"/>${t ? T(lx, ly, t, s) : ''}`;
const hdim = (x0, x1, y, t, s, below = true) => dim(x0, y, x1, y, t, (x0 + x1) / 2, y + (below ? 22 : -22), s);
const vdim = (y0, y1, x, t, s, right = true) => dim(x, y0, x, y1, t, x + (right ? 22 : -22), (y0 + y1) / 2, s);

// litery na bokach wielokata: na zewnatrz, w polowie boku
function inside(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]; const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function edgeLabels(pts, letters, off = 18, s = 24) {
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
// os XY / XZ (male strzalki w rogu - jak w HMI ksiazki)
const axes = (x, y, a, b) => `<path d="M${x},${y - 26} L${x},${y} L${x + 26},${y}" fill="none" stroke="${C.axis}" stroke-width="2.5"/>`
  + `<text x="${x - 2}" y="${y - 34}" fill="${C.axis}" font-family="Segoe UI, Arial" font-weight="700" font-size="15" text-anchor="middle">${a}</text>`
  + `<text x="${x + 36}" y="${y + 5}" fill="${C.axis}" font-family="Segoe UI, Arial" font-weight="700" font-size="15" text-anchor="middle">${b}</text>`;

const F = {};

F.rectangle = () => svg(360, 250, poly([[40, 20], [290, 20], [290, 190], [40, 190]]) + hdim(40, 290, 212, 'A') + vdim(20, 190, 312, 'B'));

F.rectangle_rounded = () => svg(360, 250, `<rect x="40" y="20" width="250" height="170" rx="38" fill="none" stroke="${C.line}" stroke-width="${SW}"/>`
  + hdim(40, 290, 212, 'A') + vdim(20, 190, 312, 'B')
  + `<line x1="90" y1="140" x2="55" y2="175" stroke="${C.dim}" stroke-width="2" marker-end="url(#ar)"/>${T(102, 128, 'R')}`);

F.triangle_rect = () => svg(340, 250, poly([[60, 20], [60, 190], [300, 190]]) + hdim(60, 300, 212, 'A') + vdim(20, 190, 36, 'H', 30, false));

F.triangle_equal = () => svg(340, 250, poly([[70, 195], [270, 195], [170, 22]]) + hdim(70, 270, 217, 'A'));

F.triangle_isos = () => svg(360, 240, poly([[30, 175], [330, 175], [180, 30]]) + thin('M180,34 L180,171', '6 5')
  + dim(180, 36, 180, 169, '', 0, 0) + T(158, 110, 'H') + hdim(30, 330, 198, 'A'));

F.ellipse = () => svg(360, 240, `<ellipse cx="170" cy="95" rx="140" ry="72" fill="none" stroke="${C.line}" stroke-width="${SW}"/>`
  + hdim(30, 310, 192, 'A') + vdim(23, 167, 332, 'B'));

F.heart = () => svg(300, 260, thin('M40,20 H260 V205 H40 Z', '6 5')
  + shape('M150,60 C150,10 70,5 50,50 C30,100 90,150 150,205 C210,150 270,100 250,50 C230,5 150,10 150,60 Z')
  + hdim(40, 260, 228, 'A') + vdim(20, 205, 18, 'H', 30, false));

F.cross = () => {
  const p = [[110, 40], [170, 40], [170, 95], [225, 95], [225, 155], [170, 155], [170, 210], [110, 210], [110, 155], [55, 155], [55, 95], [110, 95]];
  return svg(300, 270, poly(p) + hdim(55, 225, 18, 'A', 30, false) + vdim(40, 210, 30, 'B', 30, false)
    + vdim(95, 155, 248, 'H') + hdim(110, 170, 232, 'W'));
};

F.curved_stairs = () => svg(380, 220, shape('M30,110 Q190,30 350,110 L330,140 Q190,70 50,140 Z')
  + `<line x1="190" y1="70" x2="190" y2="30" stroke="${C.dim}" stroke-width="2" marker-start="url(#ar)"/>${T(212, 30, 'R')}`
  + vdim(108, 142, 370, 'H', 28) + hdim(30, 350, 172, 'D'));

const bookTop = (y) => poly([[90, y], [330, y], [330, y + 30], [90, y + 30]]) + vdim(y, y + 30, 346, 'B', 26) + hdim(90, 330, y + 44, 'A', 26) + axes(30, y + 30, 'Y', 'X');
F.book_0 = () => svg(380, 250, bookTop(18)
  + poly([[90, 140], [330, 140], [330, 190], [90, 190]]) + thin('M96,160 C140,140 170,182 210,160 S280,140 324,160')
  + vdim(140, 190, 70, 'D', 26, false) + hdim(90, 330, 210, 'A', 26) + axes(30, 190, 'Z', 'X'));
F.book_1 = () => svg(380, 250, bookTop(18)
  + poly([[90, 140], [330, 140], [330, 190], [90, 190]]) + thin('M96,152 C140,138 170,170 210,152 S280,138 324,152') + thin('M96,176 C140,190 170,160 210,176 S280,190 324,176')
  + vdim(140, 190, 70, 'D', 26, false) + hdim(90, 330, 210, 'A', 26) + axes(30, 190, 'Z', 'X'));

F.quater_round_0 = () => svg(320, 160, shape('M20,95 L20,85 Q20,40 70,40 L300,40 L300,95 Z') + vdim(40, 95, 60, 'D', 26).replace('x="82"', 'x="84"') + hdim(20, 300, 120, 'A'));
F.quater_round_1 = () => svg(320, 160, shape('M20,95 Q20,50 65,50 L255,50 Q300,50 300,95 Z') + vdim(50, 95, 80, 'D', 26) + hdim(20, 300, 120, 'A'));

F.trapezoid45 = () => svg(300, 240, poly([[30, 170], [270, 170], [215, 60], [85, 60]]) + hdim(85, 215, 38, 'a', 28, false)
  + dim(150, 62, 150, 168, '', 0, 0) + T(128, 115, 'h', 28) + hdim(30, 270, 195, 'b', 28));
// trapez 0..2: b gora, a dol, h wysokosc
F.trapezoid_0 = () => svg(260, 270, poly([[30, 220], [230, 220], [190, 45], [70, 45]]) + thin('M130,47 L130,218', '6 5')
  + hdim(70, 190, 22, 'b', 30, false) + T(110, 132, 'h') + hdim(30, 230, 244, 'a'));
F.trapezoid_1 = () => svg(260, 270, poly([[45, 220], [235, 220], [185, 45], [45, 45]]) + hdim(45, 185, 22, 'b', 30, false)
  + vdim(45, 220, 22, 'h', 30, false).replace('x="0"', 'x="6"') + hdim(45, 235, 244, 'a'));
F.trapezoid_2 = () => svg(260, 270, poly([[25, 220], [215, 220], [215, 45], [75, 45]]) + hdim(75, 215, 22, 'b', 30, false)
  + vdim(45, 220, 238, 'h') + hdim(25, 215, 244, 'a'));
// trapez 3..6: B / A boki, H podstawa
F.trapezoid_3 = () => svg(260, 260, poly([[70, 30], [190, 15], [190, 205], [70, 195]]) + vdim(30, 195, 46, 'B', 32, false).replace('x="24"', 'x="26"')
  + vdim(15, 205, 214, 'A', 32) + hdim(70, 190, 228, 'H', 32));
F.trapezoid_4 = () => svg(260, 260, poly([[70, 15], [190, 30], [190, 195], [70, 205]]) + vdim(15, 205, 46, 'A', 32, false).replace('x="24"', 'x="26"')
  + vdim(30, 195, 214, 'B', 32) + hdim(70, 190, 228, 'H', 32));
F.trapezoid_5 = () => svg(280, 230, poly([[60, 60], [210, 25], [210, 175], [60, 175]]) + vdim(60, 175, 36, 'B', 32, false)
  + vdim(25, 175, 234, 'A', 32) + hdim(60, 210, 198, 'H', 32));
F.trapezoid_6 = () => svg(280, 230, poly([[60, 25], [210, 25], [210, 140], [60, 175]]) + vdim(25, 175, 36, 'A', 32, false)
  + vdim(25, 140, 234, 'B', 32) + hdim(60, 210, 198, 'H', 32));

// blaty: obrys + litery na bokach (kolejnosc jak w HMI)
const worktop = (w, h, pts, letters, s = 24) => svg(w, h, poly(pts) + edgeLabels(pts, letters, 20, s));
F.worktop_0 = () => worktop(380, 250, [[40, 210], [340, 210], [340, 120], [250, 120], [250, 40], [120, 40], [120, 90], [40, 90]], ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
F.worktop_1 = () => worktop(340, 250, [[40, 210], [300, 210], [300, 40], [120, 40], [120, 110], [40, 110]], ['A', 'B', 'C', 'D', '', 'E']);
F.worktop_2 = () => worktop(340, 250, [[40, 210], [300, 210], [300, 120], [220, 120], [220, 40], [40, 40]], ['A', 'B', 'C', 'D', 'E', 'F']);
F.worktop_3 = () => worktop(400, 230, [[40, 95], [130, 95], [130, 20], [340, 20], [340, 195], [190, 195], [190, 150], [40, 150]], ['G', 'F', 'E', 'D', 'C', 'B', 'A', 'H']);
F.worktop_4 = () => worktop(400, 230, [[40, 25], [210, 25], [210, 80], [320, 80], [320, 140], [160, 140], [160, 200], [40, 200]], ['G', 'F', 'E', 'D', 'C', 'B', 'A', 'H']);
F.worktop_5 = () => worktop(400, 230, [[50, 25], [330, 25], [330, 200], [180, 200], [180, 140], [50, 140]], ['E', 'D', 'C', 'B', 'A', 'F']);
F.worktop_6 = () => worktop(400, 230, [[50, 25], [330, 25], [330, 120], [180, 120], [180, 190], [50, 190]], ['E', 'D', 'C', 'B', 'A', 'F']);

// daszki: sciana (trapez) - zielona: cieta pod katem; obrazek rozciagany na przycisk (preserveAspectRatio none)
const roof = (on) => svg(320, 120, shape('M8,112 L312,112 L250,8 L70,8 Z', on ? C.on : C.off), ' preserveAspectRatio="none"', 0);
for (const w of [1, 2, 3, 4]) { F[`roof_wall${w}_0`] = () => roof(false); F[`roof_wall${w}_1`] = () => roof(true); }

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, fn] of Object.entries(F)) fs.writeFileSync(path.join(OUT, `${name}.svg`), fn());
  console.log(`${Object.keys(F).length} rysunkow -> ${OUT}`);
}
