// Aktualizacja VizuApp z GitHub Releases (paczka budowana przez CI przy pushu na master, .github/workflows/ci.yml).
//
// check()  - wersja z app\version.json (build.ps1) i najnowsze wydanie z GitHuba; brak internetu - online: false
// apply()  - (Admin) pobiera VizuApp-update.zip do <katalog VizuApp>\update\, uruchamia update.ps1 (czeka na koniec
//            serwera, podmienia app\ - poprzednia wersja w app.old\, config.json / users.json / connection.json / alarms.db
//            zostaja) i konczy serwer; update.ps1 uruchamia nowy serwer (vizu.ps1 -ServerOnly)
//
// Tylko w paczce na maszyne (katalog ...\VizuApp\app z version.json); w repo (rozwoj) - bez aktualizacji.

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

export const UPDATE_REPO = 'PatrykChoinski/Promasz-Visu3D';
export const UPDATE_ASSET = 'VizuApp-update.zip';
const CHECK_MS = 10 * 60 * 1000;

// "0.2.15" -> [0, 2, 15]; porownanie wersji (a > b - dodatnie)
export function cmpVersion(a, b) {
  const pa = String(a || '').replace(/^v/, '').split(/[.-]/).map((x) => Number(x) || 0);
  const pb = String(b || '').replace(/^v/, '').split(/[.-]/).map((x) => Number(x) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

export function readVersion(appDir) {
  try { return JSON.parse(fs.readFileSync(path.join(appDir, 'version.json'), 'utf8')); } catch { return null; }
}

export class Updater {
  constructor(appDir, { repo = UPDATE_REPO, fetchFn = fetch, log = console.log } = {}) {
    this.appDir = appDir;
    this.root = path.dirname(appDir);
    this.repo = repo;
    this.fetch = fetchFn;
    this.log = log;
    this.version = readVersion(appDir);
    this.last = null;
    this.busy = false;
  }

  // paczka na maszyne: ...\VizuApp\app z version.json i update.ps1 obok
  get installed() {
    return Boolean(this.version) && path.basename(this.appDir).toLowerCase() === 'app'
      && fs.existsSync(path.join(this.root, 'update.ps1'));
  }

  async check(force = false) {
    if (!force && this.last && Date.now() - this.last.at < CHECK_MS) return this.last;
    const base = { at: Date.now(), current: this.version?.version ?? null, installed: this.installed, busy: this.busy };
    try {
      const r = await this.fetch(`https://api.github.com/repos/${this.repo}/releases/latest`, {
        headers: { accept: 'application/vnd.github+json', 'user-agent': 'VizuApp' }, signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) throw new Error(`GitHub ${r.status}`);
      const rel = await r.json();
      const asset = (rel.assets || []).find((a) => a.name === UPDATE_ASSET);
      const latest = String(rel.tag_name || '').replace(/^v/, '');
      this.last = { ...base, online: true, latest, url: asset?.browser_download_url ?? null, notes: String(rel.body || '').slice(0, 2000),
        published: rel.published_at ?? null,
        newer: Boolean(asset) && (!base.current || cmpVersion(latest, base.current) > 0) };
    } catch (err) {
      this.last = { ...base, online: false, error: err.message || String(err), newer: false };
    }
    return this.last;
  }

  async apply() {
    if (!this.installed) throw Object.assign(new Error('Aktualizacja tylko w paczce na maszynie (D:\\VizuApp)'), { code: 409 });
    if (this.busy) throw Object.assign(new Error('Aktualizacja już trwa'), { code: 409 });
    const info = await this.check(true);
    if (!info.online) throw Object.assign(new Error(`Brak połączenia z internetem (${info.error})`), { code: 502 });
    if (!info.newer || !info.url) throw Object.assign(new Error('Brak nowszej wersji'), { code: 409 });
    this.busy = true;
    try {
      const dir = path.join(this.root, 'update');
      fs.mkdirSync(dir, { recursive: true });
      const zip = path.join(dir, UPDATE_ASSET);
      const r = await this.fetch(info.url, { headers: { 'user-agent': 'VizuApp' }, signal: AbortSignal.timeout(300000) });
      if (!r.ok) throw new Error(`pobieranie ${r.status}`);
      fs.writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
      this.log(`[aktualizacja] pobrane ${info.latest} (${fs.statSync(zip).size} B), restart serwera`);
      // update.ps1 jako osobny proces przez WMI (Win32_Process.Create): poza grupa procesow (job) serwera - nie konczy
      // sie razem z serwerem (np. serwer uruchomiony z harmonogramu / innej konsoli)
      const cmd = `powershell.exe -nop -ep bypass -w hidden -File "${path.join(this.root, 'update.ps1')}" -Zip "${zip}" -WaitPid ${process.pid}`;
      await new Promise((resolve, reject) => {
        const ps = spawn('powershell.exe', ['-nop', '-NonInteractive', '-Command',
          `$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = '${cmd.replace(/'/g, "''")}'; CurrentDirectory = '${this.root.replace(/'/g, "''")}' }; exit $r.ReturnValue`],
        { stdio: 'ignore', windowsHide: true });
        ps.on('error', reject);
        ps.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`uruchomienie update.ps1: kod ${code}`))));
      });
      return { ok: true, version: info.latest };
    } catch (err) {
      this.busy = false;
      throw Object.assign(new Error(`Aktualizacja: ${err.message || err}`), { code: 502 });
    }
  }
}
