# Copy all files from advisory-status-tracker to the cloned status-update repo
param(
    [string]$StatusUpdatePath = ""
)

$sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetDir = $StatusUpdatePath

if ([string]::IsNullOrEmpty($targetDir)) {
    # Try common locations
    $locations = @(
        "$env:USERPROFILE\Desktop\status-update",
        "$env:USERPROFILE\Documents\status-update",
        "$env:USERPROFILE\status-update",
        ".\status-update"
    )
    
    foreach ($loc in $locations) {
        if (Test-Path $loc) {
            $targetDir = $loc
            Write-Host "Found status-update repo at: $targetDir"
            break
        }
    }
}

if ([string]::IsNullOrEmpty($targetDir) -or -not (Test-Path $targetDir)) {
    Write-Host "❌ Could not find status-update repository."
    Write-Host "Please run this script with: .\copy-to-github.ps1 -StatusUpdatePath 'C:\path\to\status-update'"
    exit 1
}

Write-Host "📦 Copying files from: $sourceDir"
Write-Host "📁 To: $targetDir"

# Exclude these files/directories
$exclude = @(
    'node_modules',
    '.next',
    '.git',
    'copy-to-github.ps1',
    '.env.local'
)

# Copy all files and folders
Get-ChildItem -Path $sourceDir -Recurse | ForEach-Object {
    $relativePath = $_.FullName.Substring($sourceDir.Length + 1)
    $shouldExclude = $false
    
    foreach ($ex in $exclude) {
        if ($relativePath -like "$ex*") {
            $shouldExclude = $true
            break
        }
    }
    
    if (-not $shouldExclude) {
        $targetPath = Join-Path $targetDir $relativePath
        $targetParent = Split-Path -Parent $targetPath
        
        if (-not (Test-Path $targetParent)) {
            New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
        }
        
        if (-not $_.PSIsContainer) {
            Copy-Item $_.FullName $targetPath -Force
            Write-Host "  ✓ $relativePath"
        }
    }
}

Write-Host "`n✅ Copy complete!"
Write-Host "Next steps:"
Write-Host "1. Open GitHub Desktop"
Write-Host "2. The changes should appear automatically"
Write-Host "3. Write a commit message"
Write-Host "4. Click 'Commit to main' and 'Push origin'"

