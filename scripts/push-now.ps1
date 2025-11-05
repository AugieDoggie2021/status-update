# Quick Push Script - Run this to commit and push all changes
# This script configures Git and pushes using the provided token

$ErrorActionPreference = "Stop"

# Navigate to repo root
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "🔧 Configuring Git..." -ForegroundColor Cyan

# Configure Git
git config credential.helper manager
git config user.name "AugieDoggie2021"
git config user.email "waldopotter@gmail.com"

# Set remote URL with token (read from environment or prompt)
# Token should be set as environment variable: $env:GITHUB_TOKEN
# Or you can temporarily set it here, but REMOVE IT before committing
if ($env:GITHUB_TOKEN) {
    $token = $env:GITHUB_TOKEN
    git remote set-url origin "https://AugieDoggie2021:${token}@github.com/AugieDoggie2021/status-update.git"
} else {
    Write-Host "⚠️  GITHUB_TOKEN environment variable not set. Using credential manager instead." -ForegroundColor Yellow
    Write-Host "   Set it with: `$env:GITHUB_TOKEN = 'your-token-here'" -ForegroundColor Gray
}

Write-Host "✅ Git configured" -ForegroundColor Green

Write-Host "`n📝 Staging all changes..." -ForegroundColor Cyan
git add -A

Write-Host "💾 Committing changes..." -ForegroundColor Cyan
$commitMsg = @"
Add Git automation scripts and setup documentation

- Add git-sync.ps1 script for automated pull/sync/commit/push
- Add setup-git.ps1 script for initial Git configuration
- Add SETUP_GIT_AUTH.md with detailed authentication guide
- Add npm script: git:sync for easy access
- Update README with Git operations section
"@

git commit -m $commitMsg

Write-Host "📤 Pushing to GitHub..." -ForegroundColor Cyan
git push origin main

Write-Host "`n✨ Done! All changes pushed successfully." -ForegroundColor Green

# Remove token from URL for security (use credential manager going forward)
Write-Host "`n🔒 Securing remote URL..." -ForegroundColor Yellow
git remote set-url origin "https://github.com/AugieDoggie2021/status-update.git"
Write-Host "✅ Remote URL secured. Future pushes will use Windows Credential Manager." -ForegroundColor Green

