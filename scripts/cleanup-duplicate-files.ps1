# Cleanup script to remove duplicate files from wrong locations
# Run this from the advisory-status-tracker directory

Write-Host "Cleaning up duplicate files..." -ForegroundColor Yellow

# Remove duplicate files from root level (outside advisory-status-tracker)
$filesToRemove = @(
    "..\app",
    "..\components",
    "..\lib",
    "..\README.md",
    "..\ROADMAP.md",
    "..\docs"
)

foreach ($file in $filesToRemove) {
    $fullPath = Join-Path $PSScriptRoot $file
    if (Test-Path $fullPath) {
        Write-Host "Removing: $fullPath" -ForegroundColor Red
        Remove-Item -Path $fullPath -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Cleanup complete!" -ForegroundColor Green

