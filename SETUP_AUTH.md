# Setting Up GitHub Authentication for Cursor

This guide will help you set up GitHub authentication so Cursor can push code directly without opening external programs.

## Quick Start

**Important:** If you get "execution policy" errors when running scripts:

```powershell
# Run scripts with bypass (one-time per session)
powershell -ExecutionPolicy Bypass -File .\sync-and-verify.ps1 -CommitMessage "Your message"

# Or allow scripts in current directory (permanent)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Method 1: Personal Access Token (Recommended for HTTPS)

GitHub Personal Access Tokens (PATs) work with Windows Credential Manager, which Git already uses.

### Step 1: Create a Personal Access Token

1. Go to GitHub: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Name it: `Cursor Git Access`
4. Select scopes:
   - ✅ **repo** (Full control of private repositories)
   - ✅ **workflow** (if you use GitHub Actions)
5. Click **"Generate token"**
6. **COPY THE TOKEN IMMEDIATELY** (you won't see it again!)
   - It looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 2: Store the Token

When you push for the first time, Git will prompt for credentials:

1. **Username**: Your GitHub username (`AugieDoggie2021`)
2. **Password**: Paste your Personal Access Token (NOT your GitHub password)

Windows Credential Manager will save these credentials automatically.

**Alternative: Store token manually**

```powershell
# In PowerShell (run once)
$token = Read-Host "Enter your GitHub Personal Access Token" -AsSecureString
$tokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($token))

# Store in Git credential helper
cmdkey /generic:git:https://github.com /user:AugieDoggie2021 /pass:$tokenPlain
```

### Step 3: Test Authentication

Run this to test:

```powershell
cd advisory-status-tracker
.\sync-and-verify.ps1 -CommitMessage "Test authentication"
```

If authentication works, you'll see "✅ Push successful!"

---

## Method 2: SSH Keys (More Secure, Long-term)

SSH keys don't expire and are more secure for long-term use.

### Step 1: Generate SSH Key

```powershell
# Check if you already have SSH keys
if (Test-Path ~/.ssh/id_ed25519.pub) {
    Write-Host "✅ SSH key already exists"
    Get-Content ~/.ssh/id_ed25519.pub
} else {
    # Generate new SSH key
    ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/id_ed25519 -N '""'
    Get-Content ~/.ssh/id_ed25519.pub
}
```

### Step 2: Add SSH Key to GitHub

1. Copy the public key (from the command above)
2. Go to: https://github.com/settings/keys
3. Click **"New SSH key"**
4. Title: `Cursor - Windows`
5. Paste your public key
6. Click **"Add SSH key"**

### Step 3: Switch Remote to SSH

```powershell
cd advisory-status-tracker
git remote set-url origin git@github.com:AugieDoggie2021/status-update.git
```

### Step 4: Test SSH Connection

```powershell
ssh -T git@github.com
```

You should see: `Hi AugieDoggie2021! You've successfully authenticated...`

---

## Method 3: GitHub CLI (gh)

If you have GitHub CLI installed:

```powershell
# Authenticate
gh auth login

# This will:
# - Open a browser for OAuth
# - Store credentials automatically
# - Work with both HTTPS and SSH
```

---

## Verification

After setting up authentication, test it:

```powershell
cd advisory-status-tracker
.\sync-and-verify.ps1 -CommitMessage "Test: Verify authentication setup"
```

You should see:
- ✅ Push successful!
- ✅ Verification successful!

---

## Troubleshooting

### "Authentication failed" when pushing

1. **Check your token/SSH key is valid**
   - For PAT: Check it's not expired at https://github.com/settings/tokens
   - For SSH: Run `ssh -T git@github.com`

2. **Clear stored credentials and re-enter**
   ```powershell
   # Windows Credential Manager
   cmdkey /list | Select-String git
   # Delete and re-add if needed
   ```

3. **Check remote URL**
   ```powershell
   git remote -v
   # Should show your repo URL
   ```

### "Permission denied (publickey)"

- Your SSH key isn't added to GitHub
- Or you're using HTTPS but Git is trying SSH (or vice versa)
- Run: `git remote set-url origin https://github.com/AugieDoggie2021/status-update.git`

### Token/SSH works but push still fails

- Check you have push access to the repository
- Verify the branch name matches (usually `main`)

---

## Security Notes

- ✅ Personal Access Tokens can be revoked anytime on GitHub
- ✅ SSH keys don't expire but can be removed
- ✅ `.env.local` is in `.gitignore` - your secrets are safe
- ⚠️ Never commit tokens or keys to the repository

---

## Next Steps

Once authenticated, you can use:

```powershell
# Quick sync script
.\sync-and-verify.ps1 -CommitMessage "Your commit message"

# Or manually
git add .
git commit -m "Your message"
git push
```

Cursor will be able to run all git commands automatically! 🎉

