# tcm-herb-lookup one-click deploy
# Usage:  .\deploy.ps1 "your commit message"
# (double-click won't pass a message; run from PowerShell to set one)
param([string]$Message = "update content")

Set-Location $PSScriptRoot

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
