# tcm-herb-lookup one-click deploy
# Usage:  .\deploy.ps1 "your commit message"
# (double-click won't pass a message; run from PowerShell to set one)
param([string]$Message = "update content")

Set-Location $PSScriptRoot

# --- Cache-busting -----------------------------------------------------------
# Stamp the asset URLs (style.css / data.js / app.js) in index.html with a fresh
# version number on every deploy, so browsers always fetch the newest files.
# No more hard-refresh: a normal reload picks up the change.
$v = Get-Date -Format 'yyyyMMddHHmm'
$idx = Join-Path $PSScriptRoot 'index.html'
$html = [System.IO.File]::ReadAllText($idx, [System.Text.Encoding]::UTF8)
$rx = '(?<pre>(?:href|src)=")(?<file>style\.css|data\.js|app\.js)(?:\?v=[0-9]+)?(?<post>")'
$repl = '${pre}${file}?v=' + $v + '${post}'
$html = $html -replace $rx, $repl
[System.IO.File]::WriteAllText($idx, $html, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "== Cache-bust version: $v =="

Write-Host "== Staging changes =="
git add -A

# nothing to commit?
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "No changes to deploy."
    exit 0
}

Write-Host "== Commit: $Message =="
git commit -m $Message

Write-Host "== Push =="
git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "Push failed. Check your network / git remote and try again."
    exit 1
}

Write-Host ""
Write-Host "Done. GitHub Pages will update in about 1 minute."
Write-Host "URL: https://lu0428.github.io/tcm-herb-lookup/"
