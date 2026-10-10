$ErrorActionPreference = "Stop"

$config = Join-Path $PSScriptRoot "wrangler.jsonc"
$wrangler = Join-Path $PSScriptRoot "node_modules\.bin\wrangler.cmd"
& $wrangler deploy --config $config
if ($LASTEXITCODE -ne 0) {
  throw "Could not deploy the tracking Worker"
}
