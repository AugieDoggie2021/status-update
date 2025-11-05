# Git Sync Script
# Automates pull, sync, commit, and push operations

param(
    [string]$CommitMessage = "Auto-sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    [switch]$Pull = $true,
    [switch]$Push = $true,
    [switch]$AutoCommit = $false
)

$ErrorActionPreference = "Stop"

# Navigate to repo root
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "🔍 Checking git status..." -ForegroundColor Cyan

# Configure git if needed
if (-not (git config user.name)) {
    Write-Host "⚙️  Configuring git user..." -ForegroundColor Yellow
    git config user.name "AugieDoggie2021"
    git config user.email "waldopotter@gmail.com"
}

# Configure credential helper
git config credential.helper manager

# Pull latest changes
if ($Pull) {
    Write-Host "⬇️  Pulling latest changes..." -ForegroundColor Cyan
    try {
        git fetch origin
        $localCommit = git rev-parse HEAD
        $remoteCommit = git rev-parse origin/main 2>$null
        
        if ($remoteCommit -and $localCommit -ne $remoteCommit) {
            Write-Host "📥 Merging remote changes..." -ForegroundColor Yellow
            git pull origin main --no-edit
        } else {
            Write-Host "✅ Already up to date" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  Pull failed: $_" -ForegroundColor Yellow
    }
}

# Check for uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Host "📝 Found uncommitted changes:" -ForegroundColor Yellow
    git status --short
    
    if ($AutoCommit) {
        Write-Host "💾 Staging and committing changes..." -ForegroundColor Cyan
        git add -A
        git commit -m $CommitMessage
    } else {
        Write-Host "ℹ️  Use -AutoCommit to automatically commit changes" -ForegroundColor Gray
    }
} else {
    Write-Host "✅ No uncommitted changes" -ForegroundColor Green
}

# Check if ahead of remote
$localCommits = git rev-list --count origin/main..HEAD 2>$null
if ($localCommits -gt 0) {
    Write-Host "📤 Pushing $localCommits commit(s) to remote..." -ForegroundColor Cyan
    
    if ($Push) {
        try {
            git push origin main
            Write-Host "✅ Successfully pushed to origin/main" -ForegroundColor Green
        } catch {
            Write-Host "❌ Push failed: $_" -ForegroundColor Red
            Write-Host "💡 Make sure you have credentials configured in Windows Credential Manager" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "ℹ️  Skipping push (use -Push to enable)" -ForegroundColor Gray
    }
} else {
    Write-Host "✅ No commits to push" -ForegroundColor Green
}

Write-Host "`n✨ Sync complete!" -ForegroundColor Green

