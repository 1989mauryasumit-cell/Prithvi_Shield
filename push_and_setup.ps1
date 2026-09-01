<#
push_and_setup.ps1
Run this locally from the project root to create a GitHub repo, push, and set Render secrets.

Usage: Open PowerShell as your user and run:
  cd 'd:\HACKATHON SHIV'
  .\push_and_setup.ps1

This script is interactive and requires `gh` (GitHub CLI) and `git` to be installed.
It will call `gh auth login` if you're not logged in.
#>

function Ensure-Command($cmd, $installUrl) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "'$cmd' not found. Please install: $installUrl" -ForegroundColor Yellow
        exit 1
    }
}

Ensure-Command git "https://git-scm.com/downloads"
Ensure-Command gh "https://cli.github.com/"

$repoOwner = Read-Host 'Enter your GitHub username or org'
$repoName = Read-Host 'Enter repository name (default: prithvi-shield)'
if ([string]::IsNullOrWhiteSpace($repoName)) { $repoName = 'prithvi-shield' }

if (-not (Test-Path .git)) {
    git init
    git add .
    git commit -m "Initial commit"
} else {
    Write-Host "Git repository already initialized." -ForegroundColor Cyan
}

Write-Host "Checking gh authentication..."
try {
    gh auth status -h github.com | Out-Null
} catch {
    Write-Host "Not authenticated with GitHub. Running 'gh auth login' now." -ForegroundColor Yellow
    gh auth login
}

Write-Host "Creating GitHub repo and pushing..."
gh repo create "$repoOwner/$repoName" --public --source=. --remote=origin --push

Write-Host "Optionally set Render deploy secrets now. Leave blank to skip." -ForegroundColor Cyan
$renderApiKey = Read-Host 'RENDER_API_KEY (leave blank to skip)'
if (-not [string]::IsNullOrWhiteSpace($renderApiKey)) {
    gh secret set RENDER_API_KEY --body "$renderApiKey" --repo "$repoOwner/$repoName"
    $frontendId = Read-Host 'RENDER_FRONTEND_SERVICE_ID'
    if (-not [string]::IsNullOrWhiteSpace($frontendId)) { gh secret set RENDER_FRONTEND_SERVICE_ID --body "$frontendId" --repo "$repoOwner/$repoName" }
    $backendId = Read-Host 'RENDER_BACKEND_SERVICE_ID'
    if (-not [string]::IsNullOrWhiteSpace($backendId)) { gh secret set RENDER_BACKEND_SERVICE_ID --body "$backendId" --repo "$repoOwner/$repoName" }
    $mlId = Read-Host 'RENDER_ML_SERVICE_ID'
    if (-not [string]::IsNullOrWhiteSpace($mlId)) { gh secret set RENDER_ML_SERVICE_ID --body "$mlId" --repo "$repoOwner/$repoName" }
    Write-Host "Render secrets set in GitHub Actions secrets." -ForegroundColor Green
} else {
    Write-Host "Skipping Render secrets setup." -ForegroundColor Yellow
}

Write-Host "Push complete. Visit https://github.com/$repoOwner/$repoName to view the repo." -ForegroundColor Green
