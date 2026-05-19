# conscientious — combined statusline badge (PowerShell sibling of conscientious-statusline.sh).
# Reads the clarify, biblio, and remind-me-propose flag files (plus the
# per-project reminder count via remind-me-store.js) and prints:
#   "Clarify: <STATE> | Biblio: <STATE> | Reminders: <N> (Propose: <STATE>)"
# with each state half independently colored:
#   on   → green (active, encouraging)
#   auto → grey  (neutral default)
#   off  → red   (active suppression)
# Separator is plain grey. Count is rendered in blue so it stands apart from
# the on/auto/off semantics.
#
# Security posture mirrors caveman-statusline.ps1: refuses reparse points
# (symlinks / junctions), caps reads at 64 bytes, strips anything outside
# [a-z] before matching against a whitelist. Anything anomalous falls back
# to that flag's documented default rather than echoing attacker bytes.

$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$ClaudeDir   = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME ".claude" }
$ClarifyFlag = Join-Path $ClaudeDir ".clarify-active"
$BiblioFlag  = Join-Path $ClaudeDir ".biblio-active"
$ProposeFlag = Join-Path $ClaudeDir ".remind-me-propose-active"

$Esc   = [char]27
$Green = "${Esc}[38;5;42m"
$Grey  = "${Esc}[38;5;244m"
$Red   = "${Esc}[38;5;196m"
$Blue  = "${Esc}[38;5;39m"
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

function Read-ReminderCount {
    # Falls back to 0 when node is missing or the CLI errors so the statusline
    # never disrupts the prompt over a transient I/O issue.
    $NodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $NodeCmd) { return 0 }
    try {
        $Out = & node (Join-Path $ScriptDir 'remind-me-store.js') count 2>$null
        if ($null -eq $Out) { return 0 }
        $Digits = ([string]$Out).Trim() -replace '[^0-9]', ''
        if ([string]::IsNullOrEmpty($Digits)) { return 0 }
        return [int]$Digits
    } catch {
        return 0
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

$ClarifyState  = Read-StateFromFlag -FlagPath $ClarifyFlag -DefaultState 'on'
$BiblioState   = Read-StateFromFlag -FlagPath $BiblioFlag  -DefaultState 'auto'
$ProposeState  = Read-StateFromFlag -FlagPath $ProposeFlag -DefaultState 'on'
$ReminderCount = Read-ReminderCount

Write-Badge -Label 'Clarify' -State $ClarifyState
[Console]::Write("${Grey} | ${Reset}")
Write-Badge -Label 'Biblio' -State $BiblioState
[Console]::Write("${Grey} | ${Grey}Reminders: ${Blue}${ReminderCount}${Grey} (")
Write-Badge -Label 'Propose' -State $ProposeState
[Console]::Write("${Grey})${Reset}")
