param([switch]$SkipDatabase, [switch]$Production, [switch]$Development)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$runtimeNode = Get-Command node -ErrorAction SilentlyContinue
if ($runtimeNode) { $nodePath = $runtimeNode.Source } else {
  $nodePath = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
  if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Install Node.js 22 or newer, then run this script again.' }
}
$env:PATH = (Split-Path -Parent $nodePath) + [IO.Path]::PathSeparator + $env:PATH
if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
if (-not (Test-Path -LiteralPath 'node_modules')) {
  $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($npmCommand) { & $npmCommand.Source install } else {
    $pnpmPath = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm.cmd'
    if (-not (Test-Path -LiteralPath $pnpmPath)) { throw 'Install Node.js with npm, then run npm install.' }
    & $pnpmPath install
  }
  if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
}
$env:GRAPH_BACKEND = 'falkordb'
  if (-not $SkipDatabase) {
    & $nodePath --env-file-if-exists=.env scripts/check-db.mjs
    $databaseReady = $LASTEXITCODE -eq 0
    if ($databaseReady) {
      Write-Host 'FalkorDB is already available; reusing the running database.' -ForegroundColor Green
    } else {
      $dockerCommand = Get-Command docker.exe -ErrorAction SilentlyContinue
      $dockerPath = if ($dockerCommand) { $dockerCommand.Source } else { Join-Path $env:LOCALAPPDATA 'Programs/DockerDesktop/resources/bin/docker.exe' }
      if (-not (Test-Path -LiteralPath $dockerPath)) { $dockerPath = 'C:/Program Files/Docker/Docker/resources/bin/docker.exe' }
      if (-not (Test-Path -LiteralPath $dockerPath)) { throw 'Install and start Docker Desktop first, or use -SkipDatabase for FalkorDB Cloud.' }
      $existingContainer = & $dockerPath ps -a --filter 'name=^/returntrace-db$' --format '{{.Names}}'
      if ($LASTEXITCODE -ne 0) { throw 'Docker is unavailable. Start Docker Desktop and retry from a normal VS Code terminal.' }
      if ($existingContainer -eq 'returntrace-db') { & $dockerPath start returntrace-db } else { & $dockerPath compose up -d falkordb }
      if ($LASTEXITCODE -ne 0) { throw 'Docker could not start the graph. Wait for Docker Desktop to show Engine running, then retry.' }
    }
  }
if ($Production -or -not $Development) {
  & $nodePath node_modules/vite/bin/vite.js build --configLoader native
  if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
  & $nodePath --env-file-if-exists=.env server/index.mjs --production
} else {
  & $nodePath --env-file-if-exists=.env server/index.mjs
}
if ($LASTEXITCODE -ne 0) { throw 'ReturnTrace stopped with an error. Check the output above.' }
