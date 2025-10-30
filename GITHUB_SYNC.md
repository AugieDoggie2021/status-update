# Quick GitHub Sync Guide

Since Git isn't available in PowerShell, use one of these methods:

## Method 1: GitHub Desktop (Easiest)

1. Download [GitHub Desktop](https://desktop.github.com/) if you don't have it
2. Open GitHub Desktop
3. File → Add Local Repository
4. Browse to: `C:\Users\t.horne\Desktop\experiments\advisory-status-tracker`
5. Click "Publish repository"
6. Select `status-update` as the repository name
7. Click "Publish repository"

✅ Done! Your code will be synced.

## Method 2: VS Code

1. Open VS Code in the `advisory-status-tracker` folder
2. Press `Ctrl+Shift+G` (Source Control)
3. Click "Initialize Repository"
4. Click "..." (top right) → Remote → Add Remote
   - Name: `origin`
   - URL: `https://github.com/AugieDoggie2021/status-update.git`
5. Click "Stage All Changes" (+ icon)
6. Type commit message: "Initial commit: Advisory Status Tracker"
7. Click "Commit"
8. Click "..." → Push → Push to...

✅ Done!

## Method 3: Git Bash / Command Line (if Git is installed elsewhere)

```bash
cd C:\Users\t.horne\Desktop\experiments\advisory-status-tracker
git init
git remote add origin https://github.com/AugieDoggie2021/status-update.git
git add .
git commit -m "Initial commit: Advisory Status Tracker with Supabase integration"
git branch -M main
git push -u origin main
```

## Security Check ✅

Your `.gitignore` already protects:
- ✅ `.env.local` (your secrets)
- ✅ `node_modules/`
- ✅ `.next/` (build files)

**Your Supabase keys are safe** - they won't be pushed to GitHub!
