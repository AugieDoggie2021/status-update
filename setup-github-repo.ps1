# PowerShell script to create GitHub repo and sync code
# Prerequisites: Git and GitHub CLI (gh) must be installed and in PATH

Write-Host "Setting up GitHub repository for Advisory Status Tracker..." -ForegroundColor Cyan

# Check if git is available
try {
    git --version | Out-Null
    Write-Host "✓ Git is available" -ForegroundColor Green
} catch {
    Write-Host "✗ Git is not found. Please install Git from https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}

# Check if GitHub CLI is available
try {
    gh --version | Out-Null
    Write-Host "✓ GitHub CLI (gh) is available" -ForegroundColor Green
} catch {
    Write-Host "✗ GitHub CLI is not found. Please install from https://cli.github.com/" -ForegroundColor Red
    Write-Host "  Or you can create the repo manually at https://github.com/new" -ForegroundColor Yellow
    exit 1
}

# Check if already a git repo
if (Test-Path .git) {
    Write-Host "✓ Git repository already initialized" -ForegroundColor Green
} else {
    Write-Host "Initializing git repository..." -ForegroundColor Yellow
    git init
    Write-Host "✓ Git repository initialized" -ForegroundColor Green
}

# Check authentication with GitHub
Write-Host "Checking GitHub authentication..." -ForegroundColor Yellow
try {
    gh auth status 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "You need to authenticate with GitHub. Running: gh auth login" -ForegroundColor Yellow
        gh auth login
    } else {
        Write-Host "✓ Authenticated with GitHub" -ForegroundColor Green
    }
} catch {
    Write-Host "You need to authenticate with GitHub. Running: gh auth login" -ForegroundColor Yellow
    gh auth login
}

# Set repo name
$repoName = "advisory-status-tracker"
Write-Host "`nCreating GitHub repository: $repoName" -ForegroundColor Yellow

# Check if repo already exists
$repoExists = gh repo view $repoName 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "⚠ Repository $repoName already exists on GitHub" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to use it? (y/n)"
    if ($overwrite -ne 'y') {
        $repoName = Read-Host "Enter a different repository name"
    }
} else {
    # Create the repository
    Write-Host "Creating new repository on GitHub..." -ForegroundColor Yellow
    gh repo create $repoName --public --source=. --remote=origin --push
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Repository created and pushed to GitHub" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "✗ Failed to create repository. Trying manual setup..." -ForegroundColor Red
    }
}

# If automatic creation failed, set up manually
if (-not (git remote get-url origin 2>&1)) {
    Write-Host "`nSetting up remote repository..." -ForegroundColor Yellow
    
    # Try to get GitHub username
    $username = (gh api user | ConvertFrom-Json).login
    if ($username) {
        $remoteUrl = "https://github.com/$username/$repoName.git"
        Write-Host "Adding remote: $remoteUrl" -ForegroundColor Yellow
        git remote add origin $remoteUrl
    } else {
        Write-Host "Could not determine GitHub username. Please add remote manually:" -ForegroundColor Yellow
        Write-Host "  git remote add origin https://github.com/YOUR_USERNAME/$repoName.git" -ForegroundColor Cyan
    }
}

# Stage all files
Write-Host "`nStaging all files..." -ForegroundColor Yellow
git add .

# Check if there are changes to commit
$status = git status --porcelain
if ($status) {
    Write-Host "Committing files..." -ForegroundColor Yellow
    git commit -m "Initial commit: Advisory Status Tracker"
    Write-Host "✓ Files committed" -ForegroundColor Green
} else {
    Write-Host "✓ No changes to commit" -ForegroundColor Green
}

# Push to GitHub
Write-Host "`nPushing to GitHub..." -ForegroundColor Yellow
$branch = git branch --show-current
if (-not $branch) {
    git checkout -b main
    $branch = "main"
}

git push -u origin $branch

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Successfully pushed to GitHub!" -ForegroundColor Green
    $repoUrl = "https://github.com/$((gh api user | ConvertFrom-Json).login)/$repoName"
    Write-Host "`nRepository URL: $repoUrl" -ForegroundColor Cyan
} else {
    Write-Host "✗ Failed to push. You may need to create the repository manually:" -ForegroundColor Red
    Write-Host "  1. Go to https://github.com/new" -ForegroundColor Yellow
    Write-Host "  2. Create a repository named: $repoName" -ForegroundColor Yellow
    Write-Host "  3. Then run: git push -u origin $branch" -ForegroundColor Yellow
}

