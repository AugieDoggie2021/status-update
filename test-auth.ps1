# Quick authentication test script
# Tests if you can authenticate with GitHub

Write-Host "`n=== Testing GitHub Authentication ===" -ForegroundColor Cyan
Write-Host ""

# Check if we're in a git repository
if (-not (Test-Path .git)) {
    Write-Host "❌ Error: Not a git repository" -ForegroundColor Red
    exit 1
}

# Check remote URL
Write-Host "📡 Checking remote URL..." -ForegroundColor Yellow
$remoteUrl = git remote get-url origin
Write-Host "   Remote: $remoteUrl" -ForegroundColor Cyan

# Determine if using HTTPS or SSH
if ($remoteUrl -match "^https://") {
    Write-Host "   Protocol: HTTPS" -ForegroundColor Cyan
    Write-Host "   Auth method: Personal Access Token or Credentials" -ForegroundColor Cyan
    
    Write-Host "`n🔍 Testing HTTPS authentication..." -ForegroundColor Yellow
    Write-Host "   Attempting to fetch from origin..." -ForegroundColor Gray
    
    $fetchOutput = git fetch origin --dry-run 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ HTTPS authentication successful!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ HTTPS authentication failed" -ForegroundColor Red
        Write-Host "`n💡 To set up authentication:" -ForegroundColor Yellow
        Write-Host "   1. Create a Personal Access Token: https://github.com/settings/tokens" -ForegroundColor Gray
        Write-Host "   2. Use it as your password when Git prompts" -ForegroundColor Gray
        Write-Host "   3. Or see SETUP_AUTH.md for detailed instructions" -ForegroundColor Gray
    }
    
} elseif ($remoteUrl -match "^git@") {
    Write-Host "   Protocol: SSH" -ForegroundColor Cyan
    Write-Host "   Auth method: SSH Key" -ForegroundColor Cyan
    
    Write-Host "`n🔍 Testing SSH authentication..." -ForegroundColor Yellow
    Write-Host "   Testing connection to GitHub..." -ForegroundColor Gray
    
    $sshTest = ssh -T git@github.com 2>&1
    if ($sshTest -match "successfully authenticated") {
        Write-Host "   ✅ SSH authentication successful!" -ForegroundColor Green
        Write-Host "   $sshTest" -ForegroundColor Gray
    } elseif ($sshTest -match "Permission denied") {
        Write-Host "   ❌ SSH authentication failed" -ForegroundColor Red
        Write-Host "`n💡 To set up SSH:" -ForegroundColor Yellow
        Write-Host "   1. Generate SSH key: ssh-keygen -t ed25519 -C 'your_email@example.com'" -ForegroundColor Gray
        Write-Host "   2. Add to GitHub: https://github.com/settings/keys" -ForegroundColor Gray
        Write-Host "   3. Or see SETUP_AUTH.md for detailed instructions" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  SSH test output: $sshTest" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Unknown remote URL format" -ForegroundColor Yellow
}

# Check for uncommitted changes
Write-Host "`n📝 Checking for uncommitted changes..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "   ⚠️  You have uncommitted changes" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ Working tree clean" -ForegroundColor Green
}

# Check sync status
Write-Host "`n📊 Checking sync status..." -ForegroundColor Yellow
git fetch origin --quiet 2>&1 | Out-Null

$branch = git rev-parse --abbrev-ref HEAD
$localCommit = git rev-parse HEAD
Write-Host "   Branch: $branch" -ForegroundColor Cyan
Write-Host "   Local:  $($localCommit.Substring(0, 7))" -ForegroundColor Cyan

try {
    $remoteCommit = git rev-parse origin/$branch 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Remote: $($remoteCommit.Substring(0, 7))" -ForegroundColor Cyan
        
        if ($localCommit -eq $remoteCommit) {
            Write-Host "   ✅ Local and remote are in sync" -ForegroundColor Green
        } else {
            $ahead = git rev-list --count origin/$branch..HEAD 2>&1
            $behind = git rev-list --count HEAD..origin/$branch 2>&1
            
            if ([int]$ahead -gt 0) {
                Write-Host "   📤 Local is ahead by $ahead commit(s)" -ForegroundColor Yellow
            }
            if ([int]$behind -gt 0) {
                Write-Host "   📥 Local is behind by $behind commit(s)" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "   ⚠️  Remote branch not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not check remote status" -ForegroundColor Yellow
}

Write-Host "`n✅ Test complete!" -ForegroundColor Green
Write-Host ""

