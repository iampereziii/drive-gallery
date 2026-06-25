# start.ps1 — One-command LAN start for Drive Gallery (Windows).
# Ensures the Windows Firewall allows the port (one-time UAC prompt), then
# builds the SPA and runs the production server. Open the printed Network URL
# on your phone (same Wi-Fi).
#
# Run with:  npm run start:lan      (or)      powershell -ExecutionPolicy Bypass -File start.ps1

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# --- Resolve the port (PORT in .env, else 8080) ---
$port = 8080
if (Test-Path .env) {
  $match = Select-String -Path .env -Pattern '^\s*PORT\s*=\s*(\d+)' | Select-Object -First 1
  if ($match) { $port = [int]$match.Matches[0].Groups[1].Value }
}

# --- Ensure an inbound firewall rule exists for this port ---
$ruleName = "Drive Gallery ($port)"
$exists = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (-not $exists) {
  Write-Host "Adding Windows Firewall rule '$ruleName' (you may see a UAC prompt)..." -ForegroundColor Cyan
  $cmd = "New-NetFirewallRule -DisplayName '$ruleName' -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -Profile Private,Domain | Out-Null"
  try {
    Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile', '-Command', $cmd
    Write-Host "Firewall rule in place." -ForegroundColor Green
  } catch {
    Write-Warning "Skipped firewall rule (UAC declined). Phone access may be blocked until you add it manually:"
    Write-Host "  New-NetFirewallRule -DisplayName '$ruleName' -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -Profile Private"
  }
} else {
  Write-Host "Firewall rule '$ruleName' already present." -ForegroundColor Green
}

# --- Build the SPA, then run the production server ---
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed." }

Write-Host ""
Write-Host "Starting Drive Gallery on port $port - open the Network URL below on your phone." -ForegroundColor Cyan
Write-Host ""
npm start
