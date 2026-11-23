# Paczka na maszyne: testy, strona (public/), potem dist\VizuApp\ = node.exe + app\ + config.json + skrypty.
#   -Version 0.2.15  numer wersji (app\version.json; aktualizacja z GitHub Releases porownuje wersje), domyslnie z package.json
#   -SkipTests       bez npm test (CI - testy w osobnym zadaniu)
#   -Zip             tez dist\VizuApp-update.zip (app\ + skrypty, do aktualizacji) i dist\VizuApp-full.zip (cala paczka
#                    z node.exe, bez users.json) - wydanie na GitHubie (.github/workflows/ci.yml)
param([string]$Version = '', [switch]$SkipTests, [switch]$Zip)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
npm ci
if ($LASTEXITCODE) { throw 'npm ci: blad' }
if (-not $SkipTests) {
    npm test
    if ($LASTEXITCODE) { throw 'Testy nie przeszly' }
}
npm run build:client
if ($LASTEXITCODE) { throw 'Budowa strony: blad' }

if (-not $Version) { $Version = (Get-Content package.json -Raw | ConvertFrom-Json).version }
$commit = (git rev-parse --short HEAD 2>$null)

$dist = Join-Path $PSScriptRoot 'dist\VizuApp'
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Force (Join-Path $dist 'app\src') | Out-Null
Copy-Item src\server, src\shared (Join-Path $dist 'app\src') -Recurse
Copy-Item public (Join-Path $dist 'app') -Recurse
Copy-Item package.json, package-lock.json (Join-Path $dist 'app')
@{ version = $Version; commit = "$commit"; date = (Get-Date -Format s) } | ConvertTo-Json |
    Set-Content (Join-Path $dist 'app\version.json') -Encoding ascii
Push-Location (Join-Path $dist 'app')
npm ci --omit=dev --ignore-scripts
$code = $LASTEXITCODE
Pop-Location
if ($code) { throw 'npm ci --omit=dev: blad' }
Copy-Item (Get-Command node).Source $dist
$scripts = 'vizu.ps1', 'install-phone.ps1', 'update.ps1', 'vizu.ico'
Copy-Item ($scripts + 'config.json') $dist

if ($Zip) {
    $out = Join-Path $PSScriptRoot 'dist'
    $upd = Join-Path $out 'VizuApp-update.zip'
    $full = Join-Path $out 'VizuApp-full.zip'
    Remove-Item $upd, $full -ErrorAction SilentlyContinue
    Compress-Archive -Path ((, (Join-Path $dist 'app')) + ($scripts | ForEach-Object { Join-Path $dist $_ })) -DestinationPath $upd
    Compress-Archive -Path (Join-Path $dist '*') -DestinationPath $full
    Write-Host "Wydanie $Version`: $upd, $full"
}

# logowanie (#145): users.json (skroty hasel, scripts/users.mjs) tylko z lokalnego pliku - nie ma go w repo ani w wydaniu
if (Test-Path users.json) { Copy-Item users.json $dist } else { Write-Warning 'Brak users.json - logowanie wylaczone (node scripts/users.mjs set Operator ...)' }
Write-Host "Gotowe: $dist $Version (skopiowac na maszyne do D:\VizuApp)"
