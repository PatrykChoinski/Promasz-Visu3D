; Instalator VizuApp na PLC z Windows (Inno Setup 6): VizuApp-setup.exe w wydaniu (.github/workflows/release.yml).
; Zawartosc: dist\VizuApp (build.ps1 -Version ...): node.exe, app\, skrypty, vizu.ico, config.json.
; Po instalacji install-phone.ps1: strona w sieci (httpHost 0.0.0.0), zapora 8128, autostart serwera, skrot VizuApp.
; Ponowna instalacja / nowsza wersja: config.json, users.json, connection.json, alarms.db zostaja.
;   iscc /DVersion=1.0.1 installer.iss  ->  dist\VizuApp-setup.exe

#ifndef Version
  #define Version "0.0.0"
#endif

[Setup]
AppId={{6E0B7A52-3C1D-4F5E-9B21-7A9C2E4D1F30}
AppName=VizuApp
AppVersion={#Version}
AppPublisher=Promasz
AppComments=Wizualizacja i sterowanie pila mostowa Promasz (PLC przez OPC UA)
DefaultDirName={code:DefaultDir}
DisableProgramGroupPage=yes
PrivilegesRequired=admin
OutputDir=dist
OutputBaseFilename=VizuApp-setup
SetupIconFile=vizu.ico
UninstallDisplayIcon={app}\vizu.ico
UninstallDisplayName=VizuApp
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
CloseApplications=no

[Languages]
Name: "pl"; MessagesFile: "compiler:Languages\Polish.isl"

[Files]
Source: "dist\VizuApp\*"; DestDir: "{app}"; Excludes: "config.json,users.json,connection.json,alarms.db*"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "dist\VizuApp\config.json"; DestDir: "{app}"; Flags: onlyifdoesntexist uninsneveruninstall
Source: "uninstall.ps1"; DestDir: "{app}"; Flags: ignoreversion

[Run]
Filename: "powershell.exe"; Parameters: "-nop -ep bypass -File ""{app}\install-phone.ps1"""; StatusMsg: "Konfiguracja: zapora, autostart serwera, skrót VizuApp..."; Flags: runhidden waituntilterminated
Filename: "powershell.exe"; Parameters: "-nop -ep bypass -w hidden -File ""{app}\vizu.ps1"""; Description: "Uruchom VizuApp"; Flags: postinstall nowait runhidden skipifsilent runasoriginaluser

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-nop -ep bypass -File ""{app}\uninstall.ps1"""; Flags: runhidden waituntilterminated; RunOnceId: "StopVizu"

[UninstallDelete]
Type: files; Name: "{userdesktop}\VizuApp.lnk"
Type: files; Name: "{userprograms}\VizuApp.lnk"
Type: files; Name: "{userstartup}\VizuApp serwer.lnk"
Type: filesandordirs; Name: "{app}\app"
Type: filesandordirs; Name: "{app}\app.old"
Type: filesandordirs; Name: "{app}\update"
Type: filesandordirs; Name: "{app}\browser-profile"

[Code]
function DefaultDir(Param: String): String;
begin
  if DirExists('D:\') then Result := 'D:\VizuApp' else Result := ExpandConstant('{sd}\VizuApp');
end;

// serwer VizuApp z tego katalogu zatrzymany przed kopiowaniem (pliki nie zablokowane)
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Code: Integer;
begin
  Exec('powershell.exe', '-nop -ep bypass -Command "Get-CimInstance Win32_Process -Filter \"Name=''node.exe''\" | Where-Object { $_.ExecutablePath -like ''' + ExpandConstant('{app}') + '*'' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"',
    '', SW_HIDE, ewWaitUntilTerminated, Code);
  Result := '';
end;
