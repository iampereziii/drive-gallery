# apply-culls.ps1 — Copy the photos you tagged in Drive Gallery into a picks folder.
#
# Reads the cull manifest (CULL_FILE, default .culls\culls.json) and COPIES each
# tagged photo to  <Dest>\<Liked|Maybe|No>\<original relative path>.
# Originals are never moved, renamed, or deleted. Files already at the destination
# are skipped, so re-running is safe. The server never runs this — you (or Claude) do.
#
# Always dry-run first:
#   powershell -ExecutionPolicy Bypass -File scripts\apply-culls.ps1 -Dest E:\Picks -WhatIf
# Then for real:
#   powershell -ExecutionPolicy Bypass -File scripts\apply-culls.ps1 -Dest E:\Picks
#   powershell -ExecutionPolicy Bypass -File scripts\apply-culls.ps1 -Dest E:\Picks -Tags Like,Maybe

[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $true)]
  [string]$Dest,

  [ValidateSet('Like', 'Maybe', 'No')]
  [string[]]$Tags = @('Like'),

  [string]$CullFile
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

# --- Locate the manifest: -CullFile, else CULL_FILE in .env, else the default ---
if (-not $CullFile) {
  $envFile = Join-Path $repoRoot '.env'
  if (Test-Path $envFile) {
    $match = Select-String -Path $envFile -Pattern '^\s*CULL_FILE\s*=\s*(.+?)\s*$' | Select-Object -First 1
    if ($match) { $CullFile = $match.Matches[0].Groups[1].Value.Trim('"', "'") }
  }
}
if (-not $CullFile) { $CullFile = '.culls\culls.json' }
if (-not [System.IO.Path]::IsPathRooted($CullFile)) { $CullFile = Join-Path $repoRoot $CullFile }
if (-not (Test-Path -LiteralPath $CullFile)) { throw "Cull manifest not found: $CullFile (tag some photos first)." }

$manifest = Get-Content -LiteralPath $CullFile -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $manifest.root) { throw "Manifest has no 'root': $CullFile" }

$root = [System.IO.Path]::GetFullPath($manifest.root).TrimEnd('\')
$destFull = [System.IO.Path]::GetFullPath($Dest).TrimEnd('\')

function Test-Inside([string]$parent, [string]$child) {
  return ($child -eq $parent) -or $child.StartsWith($parent + '\', [System.StringComparison]::OrdinalIgnoreCase)
}

# Copying into the photo root would put picks back onto the browsed tree.
if (Test-Inside $root $destFull) { throw "-Dest must not be inside the photo root ($root)." }
if (-not (Test-Path -LiteralPath $root)) { throw "Photo root is not available (drive unplugged?): $root" }

$folderFor = @{ like = 'Liked'; maybe = 'Maybe'; no = 'No' }
$wanted = $Tags | ForEach-Object { $_.ToLowerInvariant() }

$copied = 0; $skipped = 0; $missing = 0; $unsafe = 0
$missingList = New-Object System.Collections.Generic.List[string]

foreach ($prop in $manifest.items.PSObject.Properties) {
  $rel = $prop.Name
  $tag = [string]$prop.Value.tag
  if ($wanted -notcontains $tag) { continue }

  $relWin = $rel -replace '/', '\'
  $src = [System.IO.Path]::GetFullPath((Join-Path $root $relWin))
  if (-not (Test-Inside $root $src)) { $unsafe++; Write-Warning "Skipping path outside root: $rel"; continue }

  if (-not (Test-Path -LiteralPath $src -PathType Leaf)) { $missing++; $missingList.Add($rel); continue }

  $target = Join-Path (Join-Path $destFull $folderFor[$tag]) $relWin
  if (Test-Path -LiteralPath $target) { $skipped++; continue }

  if ($PSCmdlet.ShouldProcess($target, "Copy from $src")) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
    Copy-Item -LiteralPath $src -Destination $target
  }
  $copied++
}

$verb = if ($WhatIfPreference) { 'Would copy' } else { 'Copied' }
Write-Host ""
Write-Host "$verb $copied photo(s) to $destFull  (tags: $($Tags -join ', '))" -ForegroundColor Green
if ($skipped) { Write-Host "Skipped $skipped already at destination." }
if ($missing) {
  Write-Warning "$missing tagged photo(s) no longer exist at the source:"
  $missingList | ForEach-Object { Write-Host "  $_" }
}
if ($unsafe) { Write-Warning "$unsafe manifest entr(ies) pointed outside the root and were ignored." }
