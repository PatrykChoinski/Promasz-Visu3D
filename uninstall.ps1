# Dezinstalacja VizuApp (wywoluje instalator, installer.iss): zatrzymanie serwera z tego katalogu, regula zapory VizuApp
$root = $PSScriptRoot
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.ExecutablePath -like "$root*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Get-NetFirewallRule -DisplayName 'VizuApp' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
