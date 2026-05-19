# conscientious — combined statusline badge (PowerShell sibling of conscientious-statusline.sh).
# Reads both clarify and biblio flag files and prints:
#   "Clarify: <STATE> | Biblio: <STATE>"
# with each half independently colored:
#   on   → green (active, encouraging)
#   auto → grey  (neutral default)
#   off  → red   (active suppression)
# Separator is plain grey.
#
# Security posture mirrors caveman-statusline.ps1: refuses reparse points
# (symlinks / junctions), caps reads at 64 bytes, strips anything outside
# [a-z] before matching against a whitelist. Anything anomalous falls back
# to that flag's documented default rather than echoing attacker bytes.

$ClaudeDir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME ".claude" }
$ClarifyFlag = Join-Path $ClaudeDir ".clarify-active"
$BiblioFlag  = Join-Path $ClaudeDir ".biblio-active"

$Esc   = [char]27
$Green = "${Esc}[38;5;42m"
$Grey  = "${Esc}[38;5;244m"
$Red   = "${Esc}[38;5;196m"
$Reset = "${Esc}[0m"

function Read-StateFromFlag {
    param(
        [string]$FlagPath,
        [string]$DefaultState
    )

    if (-not (Test-Path -LiteralPath $FlagPath)) { return $DefaultState }

    try {
        $Item = Get-Item -LiteralPath $FlagPath -Force -ErrorAction Stop
        if ($Item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { return $DefaultState }
        if ($Item.Length -gt 64) { return $DefaultState }
    } catch {
        return $DefaultState
    }

    $Raw = ""
    try {
        $Line = Get-Content -LiteralPath $FlagPath -TotalCount 1 -ErrorAction Stop
        if ($null -ne $Line) { $Raw = ([string]$Line).Trim() }
    } catch {
        return $DefaultState
    }

    $State = $Raw.ToLowerInvariant()
    $State = ($State -replace '[^a-z]', '')

    switch ($State) {
        'on'   { return 'on' }
        'auto' { return 'auto' }
        'off'  { return 'off' }
        default { return $DefaultState }
    }
}

function Write-Badge {
    param(
        [string]$Label,
        [string]$State
    )

    switch ($State) {
        'on'   { $Color = $Green }
        'auto' { $Color = $Grey }
        'off'  { $Color = $Red }
        default { return }
    }

    $Upper = $State.ToUpperInvariant()
    [Console]::Write("${Color}${Label}: ${Upper}${Reset}")
}

$ClarifyState = Read-StateFromFlag -FlagPath $ClarifyFlag -DefaultState 'on'
$BiblioState  = Read-StateFromFlag -FlagPath $BiblioFlag  -DefaultState 'auto'

Write-Badge -Label 'Clarify' -State $ClarifyState
[Console]::Write("${Grey} | ${Reset}")
Write-Badge -Label 'Biblio' -State $BiblioState
