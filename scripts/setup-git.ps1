# Git Setup Script
# Configures Git for automatic authentication

Write-Host "🔧 Setting up Git configuration..." -ForegroundColor Cyan

# Set user info
Write-Host "`n📝 Configuring user info..." -ForegroundColor Yellow
git config user.name "AugieDoggie2021"
git config user.email "waldopotter@gmail.com"
Write-Host "✅ User configured" -ForegroundColor Green

# Set credential helper
Write-Host "`n🔑 Configuring credential helper..." -ForegroundColor Yellow
git config --global credential.helper manager
Write-Host "✅ Credential helper configured (Windows Credential Manager)" -ForegroundColor Green

# Verify remote
Write-Host "`n🌐 Verifying remote..." -ForegroundColor Yellow
$remote = git remote get-url origin
Write-Host "Remote: $remote" -ForegroundColor Gray

Write-Host "`n✨ Git setup complete!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Create a GitHub Personal Access Token at: https://github.com/settings/tokens" -ForegroundColor White
Write-Host "2. Select 'repo' scope" -ForegroundColor White
Write-Host "3. When you push, use:" -ForegroundColor White
Write-Host "   - Username: AugieDoggie2021" -ForegroundColor Gray
Write-Host "   - Password: [Your Personal Access Token]" -ForegroundColor Gray
Write-Host "4. Windows Credential Manager will save your credentials" -ForegroundColor White

