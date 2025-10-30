# GitHub Repository Setup Guide

This guide will help you create a GitHub repository for the Advisory Status Tracker project and sync your code.

## Option 1: Automated Setup (Recommended)

### Prerequisites

1. **Install Git for Windows**
   - Download from: https://git-scm.com/download/win
   - During installation, make sure to select "Add Git to PATH"

2. **Install GitHub CLI**
   - Download from: https://cli.github.com/
   - After installation, run `gh auth login` to authenticate

### Run the Setup Script

Once Git and GitHub CLI are installed:

```powershell
cd advisory-status-tracker
.\setup-github-repo.ps1
```

The script will:
- Initialize a git repository (if not already done)
- Authenticate with GitHub
- Create a new repository named `advisory-status-tracker`
- Commit all files
- Push to GitHub

## Option 2: Manual Setup via Web Interface

If you prefer to create the repository manually:

### Step 1: Create Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `advisory-status-tracker`
3. Description: "A production-quality web application for tracking advisory engagement status across workstreams, risks, and actions"
4. Choose Public or Private
5. **Do NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### Step 2: Initialize Git and Push Code

After installing Git and adding it to your PATH:

```powershell
cd advisory-status-tracker

# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Advisory Status Tracker"

# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/advisory-status-tracker.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Option 3: Using GitHub Desktop

1. Install GitHub Desktop from https://desktop.github.com/
2. Open GitHub Desktop
3. File → Add Local Repository → Select the `advisory-status-tracker` folder
4. File → Options → Sign in to GitHub
5. Repository → Create Repository on GitHub
6. Commit all files and push

## Troubleshooting

### Git command not found
- Make sure Git is installed and added to your system PATH
- You may need to restart your terminal/PowerShell after installation

### Authentication Issues
- For HTTPS: GitHub will prompt for credentials. Use a Personal Access Token (not password)
- Create a token at: https://github.com/settings/tokens
- For SSH: Set up SSH keys at: https://github.com/settings/keys

### Repository already exists
- Choose a different repository name
- Or delete the existing repository on GitHub first

