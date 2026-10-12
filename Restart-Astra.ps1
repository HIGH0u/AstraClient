$ErrorActionPreference = 'Stop'
$astraRoot = $PSScriptRoot
$astraVersion = (Get-Content -LiteralPath (Join-Path $astraRoot 'package.json') -Raw | ConvertFrom-Json).version
$astraExe = [System.IO.Path]::GetFullPath((Join-Path $astraRoot "release\$astraVersion\Astra-win32-x64\Astra.exe"))
$astraDevExe = [System.IO.Path]::GetFullPath((Join-Path $astraRoot 'node_modules\electron\dist\electron.exe'))
$astraReleaseRoot = [System.IO.Path]::GetFullPath((Join-Path $astraRoot 'release')) + '\'
if (-not (Test-Path -LiteralPath $astraExe)) { throw 'Run npm run package first.' }
$astraProcesses = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -and (($_.Path -eq $astraDevExe) -or ($_.Path.StartsWith($astraReleaseRoot,[StringComparison]::OrdinalIgnoreCase) -and $_.ProcessName -eq 'Astra')) }
foreach ($astraProcess in $astraProcesses) { if ($astraProcess.MainWindowHandle -ne 0) { [void]$astraProcess.CloseMainWindow() } }
foreach ($astraProcess in $astraProcesses) {
    if (-not $astraProcess.WaitForExit(2500)) {
        $stillRunning = Get-Process -Id $astraProcess.Id -ErrorAction SilentlyContinue
        if ($stillRunning -and $stillRunning.Path -eq $astraProcess.Path) { Stop-Process -Id $stillRunning.Id -Force }
    }
}
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
Start-Process -FilePath $astraExe -WorkingDirectory $astraRoot -WindowStyle Normal
