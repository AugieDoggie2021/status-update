# Git Authentication Setup

This guide ensures Git operations work without manual intervention.

## Quick Setup

### 1. Configure Git Credential Manager (Windows)

Git Credential Manager should already be installed with Git for Windows. Verify it's configured:

```powershell
git config --global credential.helper manager
```

### 2. Set Git User Info

Already configured in the repo, but you can verify:

```powershell
git config user.name    # Should show: AugieDoggie2021
git config user.email   # Should show: waldopotter@gmail.com
```

### 3. First-Time Authentication

On your first push, Windows Credential Manager will prompt you:
- **Username**: `AugieDoggie2021`
- **Password**: Use a GitHub Personal Access Token (PAT), NOT your GitHub password

### 4. Create GitHub Personal Access Token (if needed)

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name it: `Cursor Git Access`
4. Select scopes:
   - ✅ **repo** (Full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)

### 5. Store Credentials

When Git prompts for credentials:
- **Username**: `AugieDoggie2021`
- **Password**: Paste your Personal Access Token

Windows Credential Manager will save these credentials automatically.

## Using the Sync Script

The `scripts/git-sync.ps1` script automates all Git operations:

```powershell
# Pull latest changes and push local commits
.\scripts\git-sync.ps1

# Auto-commit uncommitted changes
.\scripts\git-sync.ps1 -AutoCommit -CommitMessage "Your commit message"

# Pull only (no push)
.\scripts\git-sync.ps1 -Push:$false

# Push only (no pull)
.\scripts\git-sync.ps1 -Pull:$false
```

## Manual Operations

If you prefer manual control:

```powershell
# Pull latest changes
git fetch origin
git pull origin main

# Commit changes
git add -A
git commit -m "Your commit message"

# Push to remote
git push origin main
```

## Troubleshooting

### Credentials not working?

1. Check Windows Credential Manager:
   - Open "Credential Manager" from Windows Settings
   - Look for `git:https://github.com` entry
   - Update or delete it if needed

2. Re-authenticate:
   ```powershell
   git push origin main
   # Enter username: AugieDoggie2021
   # Enter password: [Your Personal Access Token]
   ```

### Push fails with "authentication failed"?

- Make sure you're using a Personal Access Token, not your GitHub password
- Verify the token has `repo` scope
- Check if the token has expired (tokens can expire)

### Credential Manager not found?

Install Git Credential Manager:
```powershell
winget install Git.Git
```

Or download from: https://git-scm.com/download/win

