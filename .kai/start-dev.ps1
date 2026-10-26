# Starts the Vite dev server as a detached background process.
# Detached on purpose: a dev server is long-lived, so this returns immediately
# instead of blocking the caller until the server exits.
$root = Split-Path -Parent $PSScriptRoot
$outLog = Join-Path $PSScriptRoot 'dev-server.log'
$errLog = Join-Path $PSScriptRoot 'dev-server.err.log'

# strictPort is true in vite.config.js, so a second start would fail rather than
# pick another port - report the existing process instead of starting a duplicate.
$busy = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($busy) {
  Write-Output "ALREADY_LISTENING pid=$($busy[0].OwningProcess)"
  exit 0
}

$proc = Start-Process -FilePath 'npm.cmd' `
  -ArgumentList 'run', 'dev' `
  -WorkingDirectory $root `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog `
  -PassThru -WindowStyle Hidden

Write-Output "STARTED pid=$($proc.Id) root=$root"
