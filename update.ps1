# Aktualizacja VizuApp (uruchamia serwer - src/server/updater.js, przycisk "Aktualizuj" w oknie Polaczenie, Admin):
# czeka na koniec starego serwera, rozpakowuje VizuApp-update.zip, podmienia app\ (poprzednia wersja -> app.old\)
# i skrypty, uruchamia nowy serwer. Blad - przywraca poprzednia wersje. Log: update\update.log.
# config.json, users.json, connection.json, alarms.db i node.exe zostaja bez zmian.
param([Parameter(Mandatory)][string]$Zip, [int]$WaitPid = 0)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$dir = Join-Path $root 'update'
$log = Join-Path $dir 'update.log'
New-Item -ItemType Directory -Force $dir | Out-Null
function Write-Log($m) { "$(Get-Date -Format s) $m" | Add-Content -Path $log -Encoding utf8 }

$app = Join-Path $root 'app'
$old = Join-Path $root 'app.old'
$new = Join-Path $dir 'new'
try {
    Write-Log "start: $Zip"
    if ($WaitPid) { try { Wait-Process -Id $WaitPid -Timeout 30 -ErrorAction Stop } catch { } }
    # inne serwery VizuApp z tego katalogu (np. drugi node.exe) - zatrzymane, zeby pliki nie byly zablokowane
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.ExecutablePath -like "$root*" } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Milliseconds 500

    if (Test-Path $new) { Remove-Item $new -Recurse -Force }
    Expand-Archive -Path $Zip -DestinationPath $new -Force
    if (-not (Test-Path (Join-Path $new 'app\src\server\main.js'))) { throw 'w paczce brak app\src\server\main.js' }

    if (Test-Path $old) { Remove-Item $old -Recurse -Force }
    Rename-Item $app 'app.old'
    try {
        Move-Item (Join-Path $new 'app') $app
    } catch {
        Rename-Item $old 'app'
        throw
    }
    foreach ($f in 'vizu.ps1', 'install-phone.ps1', 'vizu.ico') {
        $src = Join-Path $new $f
        if (Test-Path $src) { Copy-Item $src (Join-Path $root $f) -Force }
    }
    # update.ps1 na koncu (ten skrypt jest juz wczytany)
    $self = Join-Path $new 'update.ps1'
    if (Test-Path $self) { Copy-Item $self (Join-Path $root 'update.ps1') -Force }
    Remove-Item $new -Recurse -Force
    Write-Log "ok: $(Get-Content (Join-Path $app 'version.json') -Raw)"
} catch {
    Write-Log "BLAD: $($_.Exception.Message)"
}
& (Join-Path $root 'vizu.ps1') -ServerOnly
Write-Log 'serwer uruchomiony'
