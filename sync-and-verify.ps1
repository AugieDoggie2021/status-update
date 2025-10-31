# Sync and Verify Git Push Script
# This script commits, pushes, and verifies that changes are on GitHub

param(
    [string]$CommitMessage = "",
    [switch]$SkipCommit = $false
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== Git Sync and Verify ===" -ForegroundColor Cyan
Write-Host ""

# Check if we're in a git repository
if (-not (Test-Path .git)) {
    Write-Host "❌ Error: Not a git repository" -ForegroundColor Red
    exit 1
}

# Get current branch
$branch = git rev-parse --abbrev-ref HEAD
Write-Host "Branch: $branch" -ForegroundColor Yellow

# Check for uncommitted changes
$status = git status --porcelain
if (($status) -and (-not $SkipCommit)) {
    Write-Host "`n📝 Uncommitted changes detected:" -ForegroundColor Yellow
    git status --short
    
    if (-not $CommitMessage) {
        Write-Host "`n❌ Error: Uncommitted changes found but no commit message provided" -ForegroundColor Red
        Write-Host "Usage: .\sync-and-verify.ps1 -CommitMessage 'Your message'" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "`n🔄 Staging changes..." -ForegroundColor Yellow
    git add .
    
    Write-Host "💾 Committing: $CommitMessage" -ForegroundColor Yellow
    git commit -m $CommitMessage
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Commit failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Committed successfully" -ForegroundColor Green
} elseif ($status) {
    Write-Host "⚠️  Uncommitted changes detected (skipping commit)" -ForegroundColor Yellow
} else {
    Write-Host "✅ Working tree clean" -ForegroundColor Green
}

# Get local and remote commit info
Write-Host "`n📊 Checking commit status..." -ForegroundColor Yellow

# Fetch latest from remote
Write-Host "🔄 Fetching from origin..." -ForegroundColor Yellow
git fetch origin --quiet 2>&1 | Out-Null

# Get local commit hash
$localCommit = git rev-parse HEAD
Write-Host "📌 Local HEAD: $($localCommit.Substring(0, 7))" -ForegroundColor Cyan

# Try to get remote commit hash
$remoteCommit = ""
try {
    $remoteCommit = git rev-parse origin/$branch 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "📌 Remote HEAD: $($remoteCommit.Substring(0, 7))" -ForegroundColor Cyan
    } else {
        $remoteCommit = ""
        Write-Host "⚠️  Remote branch not found (first push?)" -ForegroundColor Yellow
    }
} catch {
    $remoteCommit = ""
    Write-Host "⚠️  Remote branch not found (first push?)" -ForegroundColor Yellow
}

# Check if we need to push
$needsPush = $true
if ($remoteCommit -and $localCommit -eq $remoteCommit) {
    $needsPush = $false
    Write-Host "`n✅ Local and remote are in sync" -ForegroundColor Green
} elseif ($remoteCommit) {
    # Check if local is ahead
    $ahead = git rev-list --count origin/$branch..HEAD 2>&1
    if ($ahead -and [int]$ahead -gt 0) {
        Write-Host "`n📤 Local is ahead by $ahead commit(s)" -ForegroundColor Yellow
    } else {
        $needsPush = $false
        Write-Host "`n✅ Local and remote are in sync" -ForegroundColor Green
    }
} else {
    Write-Host "`n📤 Ready to push (first push to this branch)" -ForegroundColor Yellow
}

# Push if needed
if ($needsPush) {
    Write-Host "`n🚀 Pushing to origin/$branch..." -ForegroundColor Yellow
    
    # Push with verbose output to catch auth issues
    $pushOutput = git push origin $branch 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Push successful!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Push failed!" -ForegroundColor Red
        Write-Host $pushOutput -ForegroundColor Red
        
        # Check for common errors
        if ($pushOutput -match "authentication failed" -or $pushOutput -match "Permission denied") {
            Write-Host "`n⚠️  Authentication issue detected" -ForegroundColor Yellow
            Write-Host "You may need to set up a GitHub Personal Access Token." -ForegroundColor Yellow
            Write-Host "See: SETUP_AUTH.md for instructions" -ForegroundColor Yellow
        } elseif ($pushOutput -match "rejected") {
            Write-Host "`n⚠️  Push was rejected (remote has new commits)" -ForegroundColor Yellow
            Write-Host "Run: git pull --rebase origin $branch" -ForegroundColor Yellow
        }
        
        exit 1
    }
}

# Verify push was successful
Write-Host "`n🔍 Verifying push..." -ForegroundColor Yellow
Start-Sleep -Seconds 2  # Give GitHub a moment to update

git fetch origin --quiet 2>&1 | Out-Null

$newRemoteCommit = git rev-parse origin/$branch 2>&1
if ($LASTEXITCODE -eq 0) {
    if ($newRemoteCommit -eq $localCommit) {
        Write-Host "✅ Verification successful!" -ForegroundColor Green
        Write-Host "📌 Remote commit: $($newRemoteCommit.Substring(0, 7))" -ForegroundColor Cyan
        Write-Host "`n🎉 All changes are now on GitHub!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Warning: Remote commit doesn't match local" -ForegroundColor Yellow
        Write-Host "   This might be a timing issue. Check GitHub in a moment." -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Could not verify remote commit" -ForegroundColor Yellow
    Write-Host "   Check GitHub manually to confirm push" -ForegroundColor Yellow
}

# Show recent commits
Write-Host "`n📋 Recent commits:" -ForegroundColor Yellow
git log --oneline -5 --decorate

Write-Host "`n✅ Sync complete!" -ForegroundColor Green
Write-Host ""

