# Telefon / tablet bez laptopa: serwer VizuApp na komputerze maszyny udostepniony w sieci (Wi-Fi maszyny).
# Uruchom raz na maszynie jako administrator (PowerShell "Uruchom jako administrator"):
#   powershell -nop -ep bypass -File D:\VizuApp\install-phone.ps1
# 1. config.json: "httpHost": "0.0.0.0" (strona w sieci, nie tylko na panelu)
# 2. zapora Windows: port 8128 (TCP) przychodzacy
# 3. autostart serwera po zalogowaniu do Windows (skrot w Autostart: vizu.ps1 -ServerOnly)
# Potem na telefonie: http://<IP maszyny>:8128/ (adresy ponizej), logowanie Operator / Serwis / Admin.
$ErrorActionPreference = 'Stop'
$dir = $PSScriptRoot
$port = 8128

$cfgFile = Join-Path $dir 'config.json'
$raw = Get-Content $cfgFile -Raw
$cfg = $raw | ConvertFrom-Json
if ($cfg.httpPort) { $port = $cfg.httpPort }
if ($cfg.httpHost -ne '0.0.0.0') {
    if ($raw -match '"httpHost"\s*:') { $raw = $raw -replace '"httpHost"\s*:\s*"[^"]*"', '"httpHost": "0.0.0.0"' }
    else { $raw = $raw -replace '^\s*\{', "{`n  `"httpHost`": `"0.0.0.0`"," }
    [IO.File]::WriteAllText($cfgFile, $raw, (New-Object Text.UTF8Encoding $false))
    Write-Host 'config.json: httpHost = 0.0.0.0'
}

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($admin) {
    Get-NetFirewallRule -DisplayName 'VizuApp' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    New-NetFirewallRule -DisplayName 'VizuApp' -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow -Profile Any | Out-Null
    Write-Host "Zapora: port $port otwarty (regula VizuApp)"
} else {
    Write-Warning "Bez uprawnien administratora - zapora nie zmieniona. Uruchom ponownie jako administrator albo otworz port $port recznie."
}

$startup = [Environment]::GetFolderPath('Startup')
$lnk = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $startup 'VizuApp serwer.lnk'))
$lnk.TargetPath = 'powershell.exe'
$lnk.Arguments = "-nop -ep bypass -w hidden -File `"$(Join-Path $dir 'vizu.ps1')`" -ServerOnly"
$lnk.WorkingDirectory = $dir
$lnk.WindowStyle = 7
$lnk.Save()
Write-Host "Autostart: $startup\VizuApp serwer.lnk"

# serwer z nowymi ustawieniami (stary - zatrzymany, jesli dziala z tego katalogu)
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like '*app\src\server\main.js*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
& (Join-Path $dir 'vizu.ps1') -ServerOnly

$ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | ForEach-Object IPAddress
Write-Host ''
Write-Host 'Na telefonie (ta sama siec Wi-Fi):'
foreach ($ip in $ips) { Write-Host "  http://$($ip):$port/" }
