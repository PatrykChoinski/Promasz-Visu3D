// Szukanie sterownikow w sieci: serwery OPC UA (port 4840) w podsieciach kart sieciowych komputera z VizuApp.
// Polaczenie TCP + komunikat Hello OPC UA (odpowiedz ACK / ERR = serwer OPC UA), potem nazwa serwera z GetEndpoints.

import net from 'node:net';
import os from 'node:os';

const PORT = 4840;

// Adresy do sprawdzenia: localhost i podsieci IPv4 kart (najwyzej /22; wieksze sieci - /24 wokol adresu karty)
export function scanHosts(ifaces = os.networkInterfaces()) {
  const hosts = new Set(['127.0.0.1']);
  for (const n of Object.values(ifaces).flat()) {
    if (!n || n.family !== 'IPv4' || n.internal || n.address.startsWith('169.254.')) continue;
    const ip = toInt(n.address);
    const prefix = Math.max(22, maskBits(n.netmask));
    if (prefix >= 31) continue;
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const net0 = (ip & mask) >>> 0;
    const count = 2 ** (32 - prefix);
    for (let i = 1; i < count - 1; i++) hosts.add(toIp((net0 + i) >>> 0));
  }
  return [...hosts];
}

const toInt = (ip) => ip.split('.').reduce((a, x) => ((a << 8) | Number(x)) >>> 0, 0);
const toIp = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');
const maskBits = (m) => (m ? toInt(m).toString(2).replace(/0/g, '').length : 24);

function hello(endpoint) {
  const url = Buffer.from(endpoint, 'utf8');
  const b = Buffer.alloc(32 + url.length);
  b.write('HELF', 0, 'ascii');
  b.writeUInt32LE(b.length, 4);
  b.writeUInt32LE(0, 8);        // ProtocolVersion
  b.writeUInt32LE(65536, 12);   // ReceiveBufferSize
  b.writeUInt32LE(65536, 16);   // SendBufferSize
  b.writeUInt32LE(0, 20);       // MaxMessageSize
  b.writeUInt32LE(0, 24);       // MaxChunkCount
  b.writeInt32LE(url.length, 28);
  url.copy(b, 32);
  return b;
}

// true - pod adresem jest serwer OPC UA
export function probeOpcUa(host, port = PORT, timeout = 600) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port });
    let done = false;
    const end = (ok) => { if (done) return; done = true; s.destroy(); resolve(ok); };
    s.setTimeout(timeout, () => end(false));
    s.on('error', () => end(false));
    s.on('connect', () => s.write(hello(`opc.tcp://${host}:${port}`)));
    s.on('data', (d) => end(['ACK', 'ERR'].includes(d.subarray(0, 3).toString('ascii'))));
    s.on('close', () => end(false));
  });
}

async function serverName(endpoint, timeout = 4000) {
  let client;
  try {
    const { OPCUAClient } = await import('node-opcua-client');
    client = OPCUAClient.create({ endpointMustExist: false, connectionStrategy: { maxRetry: 0, initialDelay: 100, maxDelay: 200 } });
    const work = (async () => {
      await client.connect(endpoint);
      const eps = await client.getEndpoints();
      return eps[0]?.server?.applicationName?.text || '';
    })();
    return await Promise.race([work, new Promise((r) => setTimeout(() => r(''), timeout))]);
  } catch {
    return '';
  } finally {
    client?.disconnect().catch(() => {});
  }
}

// [{endpoint, host, name, local}] - serwery OPC UA w sieci; local - na tym komputerze
export async function scanOpcUa({ hosts = scanHosts(), port = PORT, timeout = 600, parallel = 128 } = {}) {
  const found = [];
  let i = 0;
  const worker = async () => {
    while (i < hosts.length) {
      const h = hosts[i++];
      if (await probeOpcUa(h, port, timeout)) found.push(h);
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, hosts.length) }, worker));
  const own = new Set(Object.values(os.networkInterfaces()).flat().filter((n) => n?.family === 'IPv4').map((n) => n.address));
  // ten komputer: tylko localhost (bez drugiego wpisu z adresem karty)
  const list = found.includes('127.0.0.1') ? found.filter((h) => !own.has(h) || h === '127.0.0.1') : found;
  const out = await Promise.all(list.map(async (host) => {
    const endpoint = `opc.tcp://${host === '127.0.0.1' ? 'localhost' : host}:${port}`;
    return { endpoint, host, name: await serverName(endpoint), local: host === '127.0.0.1' || own.has(host) };
  }));
  return out.sort((a, b) => toInt(a.host) - toInt(b.host));
}
