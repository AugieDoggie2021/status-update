# Test Git Access for Cursor
# Run this script to verify Git is accessible

Write-Host "=== Git Access Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Find Git
Write-Host "1. Finding Git installation..." -ForegroundColor Yellow
$gitPath = where.exe git 2>$null
if ($gitPath) {
    Write-Host "   ✓ Git found: $gitPath" -ForegroundColor Green
} else {
    Write-Host "   ✗ Git not found in PATH" -ForegroundColor Red
    $gitExe = "C:\Users\t.horne\AppData\Local\Programs\Git\cmd\git.exe"
    if (Test-Path $gitExe) {
        Write-Host "   ✓ Git exists at: $gitExe" -ForegroundColor Green
        Write-Host "   ⚠ But not in PATH - Cursor may need full path" -ForegroundColor Yellow
    } else {
        Write-Host "   ✗ Git not found" -ForegroundColor Red
        exit 1
    }
}

# Test 2: Git Version
Write-Host "`n2. Testing git --version..." -ForegroundColor Yellow
try {
    if ($gitPath) {
        $version = git --version 2>&1
    } else {
        $version = & "C:\Users\t.horne\AppData\Local\Programs\Git\cmd\git.exe" --version 2>&1
    }
    Write-Host "   ✓ $version" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Failed: $_" -ForegroundColor Red
}

# Test 3: Git Config
Write-Host "`n3. Checking Git configuration..." -ForegroundColor Yellow
try {
    if ($gitPath) {
        $name = git config --global user.name 2>&1
        $email = git config --global user.email 2>&1
    } else {
        $git = "C:\Users\t.horne\AppData\Local\Programs\Git\cmd\git.exe"
        $name = & $git config --global user.name 2>&1
        $email = & $git config --global user.email 2>&1
    }
    Write-Host "   ✓ User name: $name" -ForegroundColor Green
    Write-Host "   ✓ User email: $email" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Failed: $_" -ForegroundColor Red
}

# Test 4: Current Directory Git Status
Write-Host "`n4. Checking current directory..." -ForegroundColor Yellow
$currentDir = Get-Location
Write-Host "   Current: $currentDir" -ForegroundColor Gray

if (Test-Path "$currentDir\.git") {
    Write-Host "   ✓ Git repository initialized" -ForegroundColor Green
    
    try {
        if ($gitPath) {
            $status = git status --short 2>&1
        } else {
            $git = "C:\Users\t.horne\AppData\Local\Programs\Git\cmd\git.exe"
            $status = & $git status --short 2>&1
        }
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ Git status works" -ForegroundColor Green
            if ($status) {
                Write-Host "   📝 Changes detected:" -ForegroundColor Yellow
                $status | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
            } else {
                Write-Host "   ✓ No uncommitted changes" -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "   ⚠ Git status check failed: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠ Not a git repository (run 'git init' first)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
if ($gitPath) {
    Write-Host "✅ Git is accessible via 'git' command" -ForegroundColor Green
    Write-Host "✅ Cursor should be able to run git commands" -ForegroundColor Green
} else {
    Write-Host "⚠️  Git is installed but not in PATH" -ForegroundColor Yellow
    Write-Host "   Cursor can still use git via full path" -ForegroundColor Gray
    Write-Host "   Recommendation: Add Git to PATH (see CURSOR_GIT_SETUP.md)" -ForegroundColor Yellow
}

Write-Host "`n📚 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Set up GitHub authentication (see CURSOR_GIT_SETUP.md)" -ForegroundColor Gray
Write-Host "   2. Ask Cursor to sync your repo!" -ForegroundColor Gray

