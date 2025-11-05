# Test Git Authentication Script
# Verifies that credentials are stored and working

Write-Host "🔍 Testing Git Authentication..." -ForegroundColor Cyan

# Check Git configuration
Write-Host "`n📋 Git Configuration:" -ForegroundColor Yellow
Write-Host "User Name: $(git config user.name)" -ForegroundColor Gray
Write-Host "User Email: $(git config user.email)" -ForegroundColor Gray
Write-Host "Credential Helper: $(git config credential.helper)" -ForegroundColor Gray

# Check remote URL
Write-Host "`n🌐 Remote URL:" -ForegroundColor Yellow
$remote = git remote get-url origin
Write-Host $remote -ForegroundColor Gray
if ($remote -like "*:*@*") {
    Write-Host "⚠️  WARNING: Token found in remote URL! This is insecure." -ForegroundColor Red
    Write-Host "   Run: git remote set-url origin https://github.com/AugieDoggie2021/status-update.git" -ForegroundColor Yellow
} else {
    Write-Host "✅ Remote URL is secure (no token in URL)" -ForegroundColor Green
}

# Test credential storage
Write-Host "`n🔑 Checking Windows Credential Manager..." -ForegroundColor Yellow
$credential = cmdkey /list | Select-String -Pattern "git:https://github.com"
if ($credential) {
    Write-Host "✅ Found stored credentials in Windows Credential Manager" -ForegroundColor Green
    Write-Host $credential -ForegroundColor Gray
} else {
    Write-Host "⚠️  No credentials found in Windows Credential Manager" -ForegroundColor Yellow
    Write-Host "   Credentials will be stored on first push" -ForegroundColor Gray
}

# Test fetch (this will trigger credential manager if needed)
Write-Host "`n🧪 Testing authentication with fetch..." -ForegroundColor Yellow
try {
    git fetch origin --dry-run 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Authentication test successful!" -ForegroundColor Green
        Write-Host "   Your credentials are working and stored." -ForegroundColor Green
    } else {
        Write-Host "⚠️  Authentication may need to be set up" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not test authentication automatically" -ForegroundColor Yellow
}

Write-Host "`n💡 To verify manually:" -ForegroundColor Cyan
Write-Host "1. Run: git fetch origin" -ForegroundColor White
Write-Host "2. If it prompts for credentials, enter:" -ForegroundColor White
Write-Host "   - Username: AugieDoggie2021" -ForegroundColor Gray
Write-Host "   - Password: Your Personal Access Token" -ForegroundColor Gray
Write-Host "3. After successful authentication, credentials will be stored" -ForegroundColor White

