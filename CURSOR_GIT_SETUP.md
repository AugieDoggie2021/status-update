# Setting Up Git for Cursor AI Agent

## ✅ Current Status

Git is **already installed** and configured:
- Git version: **2.51.2.windows.1**
- Location: `C:\Users\t.horne\AppData\Local\Programs\Git\cmd\git.exe`
- User configured: **Tom**
- Email configured: **140753622+AugieDoggie2021@users.noreply.github.com**

## 🔧 Issue: PowerShell PATH

Git is installed but PowerShell sometimes can't find it. Cursor can use Git via the full path, but we'll make it easier.

## 🚀 Quick Setup (Choose One)

### Option 1: Restart PowerShell Session (Easiest)

1. **Close and reopen Cursor** (this refreshes the environment)
2. This will reload PATH variables and Git should work

### Option 2: Add Git to PATH (Permanent Fix)

1. **Open System Properties:**
   - Press `Win + R`
   - Type: `sysdm.cpl` and press Enter
   - Click **"Environment Variables"**

2. **Edit PATH:**
   - Under "User variables", find `Path`
   - Click **"Edit"**
   - Click **"New"**
   - Add: `C:\Users\t.horne\AppData\Local\Programs\Git\cmd`
   - Click **"OK"** on all dialogs

3. **Restart Cursor**

### Option 3: Use Git Bash Instead (Recommended for Git Operations)

Cursor can use Git Bash which has Git built-in. To set this up:

1. **In Cursor:**
   - Go to **Settings** (Ctrl+,)
   - Search for **"terminal shell"**
   - Set **Terminal > Integrated > Shell: Windows**
   - Enter: `C:\Users\t.horne\AppData\Local\Programs\Git\bin\bash.exe`

2. **Or use the helper script** (see below)

## 🔐 GitHub Authentication Setup

To push to GitHub, you need authentication. Choose one method:

### Method 1: Personal Access Token (PAT) - Recommended

1. **Create a GitHub Personal Access Token:**
   - Go to: https://github.com/settings/tokens
   - Click **"Generate new token" → "Generate new token (classic)"**
   - Name: `Cursor AI Agent`
   - Expiration: Choose your preference (90 days, 1 year, etc.)
   - Scopes: Check **`repo`** (full control of private repositories)
   - Click **"Generate token"**
   - **Copy the token immediately** (you won't see it again!)

2. **Configure Git Credential Manager:**
   ```powershell
   git config --global credential.helper manager
   ```

3. **Test authentication:**
   ```powershell
   git ls-remote https://github.com/AugieDoggie2021/status-update.git
   ```
   - When prompted, enter your GitHub username
   - Use the **Personal Access Token** as the password

### Method 2: SSH Keys (More Secure, More Setup)

1. **Generate SSH key:**
   ```powershell
   ssh-keygen -t ed25519 -C "140753622+AugieDoggie2021@users.noreply.github.com"
   ```
   - Press Enter to accept default location
   - Optionally set a passphrase

2. **Add SSH key to GitHub:**
   - Copy the public key: `cat ~/.ssh/id_ed25519.pub`
   - Go to: https://github.com/settings/keys
   - Click **"New SSH key"**
   - Paste the key and save

3. **Test SSH connection:**
   ```powershell
   ssh -T git@github.com
   ```

4. **Update remote URLs to use SSH:**
   ```powershell
   git remote set-url origin git@github.com:AugieDoggie2021/status-update.git
   ```

## 📝 Testing Git Access

After setup, test in Cursor terminal:

```powershell
# Test git command
git --version

# Test in your repo
cd C:\Users\t.horne\Desktop\experiments\advisory-status-tracker
git status
```

If `git --version` works, Cursor can now run all git commands!

## 🎯 What Cursor Can Do Once Set Up

Once Git is accessible, Cursor AI can:
- ✅ Initialize repositories (`git init`)
- ✅ Stage changes (`git add`)
- ✅ Create commits (`git commit`)
- ✅ Push to GitHub (`git push`)
- ✅ Pull changes (`git pull`)
- ✅ Create branches (`git branch`, `git checkout`)
- ✅ View status (`git status`, `git log`)
- ✅ Manage remotes (`git remote add/remove`)

## 🔒 Security Notes

- **Never commit `.env.local`** - It's already in `.gitignore`
- **Personal Access Tokens** should be kept secret
- **SSH keys** are more secure for long-term use
- Cursor will only run git commands you explicitly request

## ❓ Troubleshooting

### "git: command not found"
- Solution: Use Option 2 above to add Git to PATH, then restart Cursor

### "Permission denied" when pushing
- Solution: Set up authentication (Method 1 or 2 above)

### "fatal: not a git repository"
- Solution: Run `git init` in your project directory first

---

**Ready to proceed?** After setting up authentication, just ask Cursor to sync your repo!

