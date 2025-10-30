# Test GitHub Authentication
# Run this after creating your Personal Access Token

param(
    [string]$Token = ""
)

Write-Host "=== GitHub Authentication Test ===" -ForegroundColor Cyan
Write-Host ""

if ([string]::IsNullOrEmpty($Token)) {
    Write-Host "To test authentication, provide your token:" -ForegroundColor Yellow
    Write-Host "  .\test-github-auth.ps1 -Token 'ghp_your_token_here'"
    Write-Host ""
    Write-Host "Or test by trying to push to GitHub:" -ForegroundColor Yellow
    Write-Host "  Cursor will prompt you for credentials automatically"
    Write-Host ""
    exit 0
}

Write-Host "Testing GitHub authentication..." -ForegroundColor Yellow

# Test authentication by accessing a repo
try {
    $headers = @{
        "Authorization" = "token $Token"
        "Accept" = "application/vnd.github.v3+json"
    }
    
    $response = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers -Method Get
    
    Write-Host "✅ Authentication successful!" -ForegroundColor Green
    Write-Host "   Logged in as: $($response.login)" -ForegroundColor Gray
    Write-Host "   Name: $($response.name)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "✅ Your token is valid and ready to use!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Authentication failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check that:" -ForegroundColor Yellow
    Write-Host "   1. Your token is correct" -ForegroundColor Gray
    Write-Host "   2. The token has 'repo' scope" -ForegroundColor Gray
    Write-Host "   3. The token hasn't expired" -ForegroundColor Gray
}

Write-Host ""
Write-Host "⚠️  Remember: Never share your token or commit it to git!" -ForegroundColor Yellow

