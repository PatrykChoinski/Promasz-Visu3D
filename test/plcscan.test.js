// Szukanie PLC (OPC UA) w sieci i maszyn z VizuApp (/api/hello)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startFakePlc } from './fake-plc-server.js';
import { scanHosts, probeOpcUa, scanOpcUa, scanVizu } from '../src/server/plcscan.js';
import { loadConfig, createServer, pickHosts } from '../src/server/main.js';

const PORT = 48491;
let plc;

before(async () => { plc = await startFakePlc(PORT); });
after(async () => { await plc.stop(); });

test('adresy do sprawdzenia: localhost i podsieci kart (bez petli zwrotnej i 169.254)', () => {
  const hosts = scanHosts({
    wifi: [{ family: 'IPv4', address: '192.168.1.111', netmask: '255.255.255.0', internal: false }],
    lo: [{ family: 'IPv4', address: '127.0.0.1', netmask: '255.0.0.0', internal: true }],
    apipa: [{ family: 'IPv4', address: '169.254.3.4', netmask: '255.255.0.0', internal: false }],
    big: [{ family: 'IPv4', address: '10.20.30.40', netmask: '255.0.0.0', internal: false }],
  });
  assert.ok(hosts.includes('127.0.0.1'));
  assert.ok(hosts.includes('192.168.1.254') && hosts.includes('192.168.1.1'));
  assert.ok(!hosts.includes('192.168.1.0') && !hosts.includes('192.168.1.255'));
  assert.ok(!hosts.some((h) => h.startsWith('169.254.')));
  // duza siec - najwyzej /22 wokol adresu karty
  assert.equal(hosts.filter((h) => h.startsWith('10.')).length, 1022);
});

test('serwer OPC UA rozpoznany po Hello / ACK, inny port - nie', async () => {
  assert.equal(await probeOpcUa('127.0.0.1', PORT), true);
  const other = http.createServer((q, r) => r.end('x'));
  await new Promise((r) => other.listen(0, '127.0.0.1', r));
  try {
    assert.equal(await probeOpcUa('127.0.0.1', other.address().port), false);
  } finally { other.close(); }
  const found = await scanOpcUa({ hosts: ['127.0.0.1'], port: PORT });
  assert.equal(found.length, 1);
  assert.equal(found[0].endpoint, `opc.tcp://localhost:${PORT}`);
  assert.equal(found[0].local, true);
});

test('/api/hello z CORS (telefon szuka maszyn), /api/connection/scan tylko dla Serwisu', async () => {
  const cfg = { ...loadConfig('nie-ma-takiego-pliku.json'), endpoint: 'opc.tcp://localhost:4840' };
  const server = createServer(cfg, null, { enabled: true, session: () => null, names: () => [] }, { write: {}, read: [] });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const r = await fetch(`${base}/api/hello`);
    assert.equal(r.headers.get('access-control-allow-origin'), '*');
    const h = await r.json();
    assert.equal(h.app, 'VizuApp');
    assert.equal(h.endpoint, 'opc.tcp://localhost:4840');
    assert.equal((await fetch(`${base}/api/connection/scan`)).status, 403);
    // maszyny z VizuApp szuka serwer (strona pyta tylko swoj serwer)
    const vz = await scanVizu({ hosts: ['127.0.0.1'], port: server.address().port });
    assert.equal(vz.length, 1);
    assert.equal(vz[0].endpoint, 'opc.tcp://localhost:4840');
    assert.equal(vz[0].url, `http://127.0.0.1:${server.address().port}/`);
    const m = await fetch(`${base}/manifest.webmanifest`);
    if (m.ok) assert.match(m.headers.get('content-type'), /manifest\+json/);
  } finally { server.close(); }
});

test('maszyna z kilkoma kartami - jeden wpis, adres z podsieci telefonu', () => {
  const found = [
    { host: '10.12.0.14', name: 'A' }, { host: '192.168.1.111', name: 'A' },
    { host: '172.21.62.39', name: 'B' }, { host: '192.168.1.254', name: 'B' },
  ];
  assert.deepEqual(pickHosts(found, '::ffff:192.168.1.254').map((h) => h.host), ['192.168.1.111', '192.168.1.254']);
  assert.deepEqual(pickHosts(found, '10.12.0.14').map((h) => h.host), ['10.12.0.14', '172.21.62.39']);
});
