# Repo Sync Instructions

## Current Status
✅ `.env.local` is protected (will NOT be synced)  
⚠️ Git is not available in PowerShell  

## Recent Changes to Sync
- Fixed `risks.filter is not a function` in `components/kpis.tsx`
- Fixed `risks.map is not a function` in `components/risks-table.tsx`
- Added defensive normalization to both components

---

## Option 1: GitHub Desktop (Easiest) ⭐

1. **Open GitHub Desktop**
2. **File → Add Local Repository**
3. **Browse to:** `C:\Users\t.horne\Desktop\experiments\advisory-status-tracker`
4. **If repo exists online:**
   - Click **"Repository" → "Push"** or **"Sync"**
   - Or click **"Publish repository"** if this is the first time
5. **Commit message:** `Fix: Add defensive normalization to KPIs and risks table`
6. **Push to origin**

---

## Option 2: VS Code Source Control

1. **Open VS Code** in: `C:\Users\t.horne\Desktop\experiments\advisory-status-tracker`
2. **Press `Ctrl+Shift+G`** (opens Source Control)
3. **Click "Initialize Repository"** if you see the button (first time only)
4. **If remote exists:** Click **"..."** → **"Remote"** → **"Add Remote"**
   - Name: `origin`
   - URL: `https://github.com/AugieDoggie2021/status-update.git`
5. **Stage all changes** (click the `+` icon next to "Changes")
6. **Commit message:** `Fix: Add defensive normalization to KPIs and risks table`
7. **Click "Commit"**
8. **Click "..."** → **"Push"** → **"Push to..."**

---

## Option 3: Git Bash (if Git is installed)

Open **Git Bash** and run:

```bash
cd /c/Users/t.horne/Desktop/experiments/advisory-status-tracker
git init
git remote add origin https://github.com/AugieDoggie2021/status-update.git
git add .
git commit -m "Fix: Add defensive normalization to KPIs and risks table"
git branch -M main
git push -u origin main
```

---

## Security Check ✅

Your `.gitignore` already protects:
- ✅ `.env.local` (your Supabase keys)
- ✅ `node_modules/`
- ✅ `.next/` (build files)

**Your secrets are safe!** They will NOT be pushed to GitHub.

