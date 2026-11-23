// Aktualizacja z GitHub Releases: porownanie wersji, sprawdzenie (internet / brak), tylko w paczce na maszynie
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cmpVersion, Updater, UPDATE_ASSET } from '../src/server/updater.js';

const release = (tag) => ({
  ok: true,
  json: async () => ({ tag_name: tag, body: 'opis', published_at: '2026-11-23T10:00:00Z',
    assets: [{ name: UPDATE_ASSET, browser_download_url: `https://example.invalid/${tag}/${UPDATE_ASSET}` }] }),
});

function fakeInstall(version) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vizu-upd-'));
  const app = path.join(root, 'app');
  fs.mkdirSync(app);
  fs.writeFileSync(path.join(app, 'version.json'), JSON.stringify({ version }));
  fs.writeFileSync(path.join(root, 'update.ps1'), '');
  return app;
}

test('porownanie wersji', () => {
  assert.ok(cmpVersion('0.2.15', '0.2.9') > 0);
  assert.ok(cmpVersion('v0.3.1', '0.2.99') > 0);
  assert.equal(cmpVersion('0.2.5', 'v0.2.5'), 0);
  assert.ok(cmpVersion('0.2.4', '0.2.5') < 0);
});

test('nowsza wersja na GitHubie - proponowana; ta sama - nie; brak internetu - online false', async () => {
  const app = fakeInstall('0.2.10');
  const newer = new Updater(app, { fetchFn: async () => release('v0.2.12') });
  const u = await newer.check();
  assert.equal(u.installed, true);
  assert.equal(u.online, true);
  assert.equal(u.newer, true);
  assert.equal(u.latest, '0.2.12');
  assert.match(u.url, /VizuApp-update\.zip$/);

  const same = await new Updater(app, { fetchFn: async () => release('v0.2.10') }).check();
  assert.equal(same.newer, false);

  const off = await new Updater(app, { fetchFn: async () => { throw new Error('getaddrinfo ENOTFOUND api.github.com'); } }).check();
  assert.equal(off.online, false);
  assert.equal(off.newer, false);
});

test('repo (rozwoj, bez version.json) - bez aktualizacji', async () => {
  const u = new Updater(path.resolve('.'), { fetchFn: async () => release('v9.9.9') });
  assert.equal(u.installed, false);
  await assert.rejects(u.apply(), /paczce na maszynie/);
});
