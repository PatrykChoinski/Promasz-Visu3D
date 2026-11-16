// #138 Rysunki pogladowe figur automatu: kazda figura ma rysunek, pliki istnieja, litery jak na ekranach HMI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIGURES } from '../src/shared/figures/index.js';
import { defaults } from '../src/shared/ops.js';
import { FIGURE_PICS, figurePicture, fieldLetter, labelVar } from '../src/shared/figpics.js';

const CLIENT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'client');
const exists = (rel) => fs.existsSync(path.join(CLIENT, rel));

test('kazda figura automatu ma rysunek (obrazek z HMI albo schemat SVG) i pliki obrazkow istnieja', () => {
  for (const fig of FIGURES) {
    const pic = figurePicture(fig.id, defaults(fig.fields));
    assert.ok(pic, `brak rysunku: ${fig.id}`);
    assert.ok(pic.img || pic.svg || pic.roof, fig.id);
    if (pic.img) assert.ok(exists(pic.img), `brak pliku ${pic.img}`);
    if (pic.svg) assert.match(pic.svg, /^<svg[\s\S]*<\/svg>$/);
  }
  assert.equal(Object.keys(FIGURE_PICS).filter((id) => !FIGURES.some((f) => f.id === id)).length, 0, 'rysunki dla nieistniejacych figur');
});

test('litery: kazda zmienna z ekranu HMI odpowiada polu figury, X / Y przy punkcie startowym', () => {
  for (const fig of FIGURES) {
    const vars = fig.fields.map((f) => labelVar(f.label)).filter(Boolean);
    for (const v of Object.keys(FIGURE_PICS[fig.id].letters)) assert.ok(vars.includes(v), `${fig.id}: brak pola ze zmienna ${v}`);
    const letters = fig.fields.map((f) => fieldLetter(fig.id, f)).filter(Boolean);
    assert.ok(letters.length > 0, `${fig.id}: brak liter`);
  }
  const rect = FIGURES.find((f) => f.id === 'RECTANGLE');
  // ostatnie pole - rodzaj ciecia (iManualInternal), bez litery
  assert.deepEqual(rect.fields.map((f) => fieldLetter('RECTANGLE', f)), ['X', 'Y', 'A', 'B', null, null]);
  const cross = FIGURES.find((f) => f.id === 'CROSS');
  assert.equal(fieldLetter('CROSS', cross.fields.find((f) => f.k === 'width2')), 'W');
});

test('warianty obrazka wg przelacznika jak w HMI: typ trapezu, blatu, ksiazki, cwiercwalka, sciany daszkow', () => {
  const opts = (id, k) => FIGURES.find((f) => f.id === id).fields.find((f) => f.k === k).o.map(([v]) => v);
  for (const [id, k] of [['TRAPEZOID', 'type'], ['WORKTOP', 'type'], ['QUATER_ROUND', 'quaterType']]) {
    const seen = new Set();
    for (const v of opts(id, k)) seen.add(figurePicture(id, { [k]: v }).svg);
    assert.equal(seen.size, opts(id, k).length, `${id}: rozne rysunki dla roznych typow`);
  }
  for (const v of opts('BOOKS', 'bookType')) {
    const pic = figurePicture('BOOKS', { bookType: v });
    assert.equal(pic.img, `img/figures/book_${v}.png`);
    assert.ok(exists(pic.img));
  }
  const roof = figurePicture('ROOFS', { wall1: true, wall2: false, wall3: true, wall4: false });
  assert.deepEqual(roof.walls.map((r) => [r.wall, r.on]), [[1, true], [2, false], [3, true], [4, false]]);
  assert.equal((roof.svg.match(/#2BD39A/g) || []).length, 2, 'zielone tylko sciany wykonywane');
});

test('rysunki w proporcjach wpisanych wymiarow, wymiar 0 - rysunek bazowy', () => {
  const box = (svg) => { const m = /<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)"/.exec(svg); return m && Number(m[3]) / Number(m[4]); };
  const poly = (svg) => /<polygon points="([^"]+)"/.exec(svg)[1].split(' ').map((p) => p.split(',').map(Number));
  const ratio = (pts) => { const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]); return (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys)); };
  assert.ok(Math.abs(ratio(poly(figurePicture('RECTANGLE', { length: 2000, width: 500 }).svg)) - 4) < 0.05);
  assert.ok(Math.abs(ratio(poly(figurePicture('RECTANGLE', { length: 500, width: 500 }).svg)) - 1) < 0.05);
  const base = figurePicture('RECTANGLE', { length: 0, width: 500 }).svg;
  assert.equal(base, figurePicture('RECTANGLE', { length: 1000, width: 0 }).svg, 'zero - ten sam rysunek bazowy');
  assert.ok(Math.abs(box(figurePicture('MILL_TABLE', { length: 900, width: 300 }).svg) - 3) < 0.05);
  // blat typu 5 z dlugosci zamykajacych obrys - w proporcjach; niezamkniety - bazowy
  const w5 = figurePicture('WORKTOP', { type: 5, lengths: [1000, 500, 1500, 2000, 2500, 1500] }).svg;
  assert.notEqual(w5, figurePicture('WORKTOP', { type: 5, lengths: [1, 2, 3, 4, 5, 6] }).svg);
  assert.equal(figurePicture('WORKTOP', { type: 5, lengths: [1, 2, 3, 4, 5, 6] }).svg, figurePicture('WORKTOP', { type: 5, lengths: [] }).svg);
});

test('indukcja: odsuniecie ramki O i rzut boczny z glebokoscia D; ociekacz: rowki i rzut boczny D1 / D2', () => {
  const ind = figurePicture('INDUCTION', { length: 560, width: 490, depth: 10, angle: 20 }).svg;
  for (const t of ['>O<', '>D<', 'rzut boczny', 'przelot']) assert.ok(ind.includes(t), `indukcja: ${t}`);
  const sd = figurePicture('SINK_DRAINER', { length: 400, width: 300, jump: 20, twoDepths: true, startDepth: 2, endDepth: 8 }).svg;
  for (const t of ['>D1<', '>D2<', 'rzut boczny', '<polyline']) assert.ok(sd.includes(t), `ociekacz: ${t}`);
});
