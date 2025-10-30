# Smoke tests for Advisory Status Tracker API (PowerShell)
# Usage: .\scripts\smoke-tests.ps1 [BASE_URL]
# Default BASE_URL: http://localhost:3000

param(
    [string]$BaseUrl = "http://localhost:3000"
)

$ProgramId = $env:NEXT_PUBLIC_PROGRAM_ID

if ([string]::IsNullOrEmpty($ProgramId)) {
    Write-Host "Error: NEXT_PUBLIC_PROGRAM_ID not set" -ForegroundColor Red
    exit 1
}

Write-Host "Running smoke tests against $BaseUrl" -ForegroundColor Cyan
Write-Host "Program ID: $ProgramId"
Write-Host ""

# Test 1: Dry-Run Parser
Write-Host "=== Test 1: Dry-Run Parse ===" -ForegroundColor Yellow
$body = @{
    notes = "Data Ingest slipped 2 days; now 70%. New target Fri. Modeling on track at 45%. Next milestone dimension conformance next Wed. QA blocker—need mock data by Mon (Jo). Add MEDIUM risk on vendor API throughput."
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/parse" -Method POST -Body $body -ContentType "application/json"
    if ($response.workstreams) {
        Write-Host "✅ Parse test passed" -ForegroundColor Green
        Write-Host "  Workstreams found: $($response.workstreams.Count)"
    } else {
        Write-Host "❌ Parse test failed" -ForegroundColor Red
        $response | ConvertTo-Json
        exit 1
    }
} catch {
    Write-Host "❌ Parse test failed" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
Write-Host ""

# Test 2: Apply Update
Write-Host "=== Test 2: Apply Update ===" -ForegroundColor Yellow
$body = @{
    programId = $ProgramId
    notes = "Data Ingest slipped 2 days; now 70%. New target Fri. Modeling on track at 45%. Next milestone dimension conformance next Wed. QA blocker—need mock data by Mon (Jo). Add MEDIUM risk on vendor API throughput."
    appliedBy = "Smoke Test"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/apply-update" -Method POST -Body $body -ContentType "application/json"
    if ($response.ok -eq $true) {
        Write-Host "✅ Apply update test passed" -ForegroundColor Green
        Write-Host "  Overall status: $($response.overall)"
    } else {
        Write-Host "❌ Apply update test failed" -ForegroundColor Red
        $response | ConvertTo-Json
        exit 1
    }
} catch {
    Write-Host "❌ Apply update test failed" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
Write-Host ""

# Test 3: Weekly Summary
Write-Host "=== Test 3: Explain Weekly ===" -ForegroundColor Yellow
$body = @{
    programId = $ProgramId
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/explain-weekly" -Method POST -Body $body -ContentType "application/json"
    if ($response.ok -eq $true) {
        Write-Host "✅ Weekly summary test passed" -ForegroundColor Green
        $wordCount = ($response.text -split '\s+').Count
        Write-Host "  Word count: $wordCount"
    } else {
        Write-Host "❌ Weekly summary test failed" -ForegroundColor Red
        $response | ConvertTo-Json
        exit 1
    }
} catch {
    Write-Host "❌ Weekly summary test failed" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
Write-Host ""

Write-Host "✅ All smoke tests passed!" -ForegroundColor Green

