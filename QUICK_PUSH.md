# Quick Push Instructions

Since terminal commands are having issues, run this PowerShell script manually:

```powershell
cd C:\Users\t.horne\Desktop\experiments\advisory-status-tracker
.\scripts\push-now.ps1
```

This script will:
1. Configure Git with your credentials
2. Stage all changes
3. Commit the changes
4. Push to GitHub
5. Secure the remote URL (remove token from URL, use credential manager)

## Alternative: Manual Commands

If the script doesn't work, run these commands manually:

```powershell
cd C:\Users\t.horne\Desktop\experiments\advisory-status-tracker

# Configure Git
git config credential.helper manager
git config user.name "AugieDoggie2021"
git config user.email "waldopotter@gmail.com"

# Set remote with token (temporary - use your actual token)
# Option 1: Use environment variable
$env:GITHUB_TOKEN = "your-token-here"
git remote set-url origin "https://AugieDoggie2021:$env:GITHUB_TOKEN@github.com/AugieDoggie2021/status-update.git"

# Option 2: Directly (NOT RECOMMENDED - will be blocked by GitHub)
# git remote set-url origin https://AugieDoggie2021:YOUR_TOKEN_HERE@github.com/AugieDoggie2021/status-update.git

# Stage, commit, and push
git add -A
git commit -m "Add Git automation scripts and setup documentation"
git push origin main

# Secure remote URL (remove token)
git remote set-url origin https://github.com/AugieDoggie2021/status-update.git
```

## Security Note

After the first push, the token will be stored in Windows Credential Manager. The remote URL is then secured (token removed from URL). Future pushes will use the stored credentials automatically.

