# ==========================================
# KFC React Git Auto Sync Script (Smart Mode)
# ==========================================

# 💡 Change this path to your local project directory
Set-Location "D:\Ufone\Waqas PC\KFC_CMS_REA"

Write-Host "🚀 Starting KFC React Git Sync..." -ForegroundColor Yellow

# Step 1: Pull latest updates
Write-Host "`n📥 Pulling latest changes from GitHub..." -ForegroundColor Cyan
git pull origin main

# Step 2: Check for changes
Write-Host "`n🔍 Checking for uncommitted changes..." -ForegroundColor Green
$gitStatus = git status --porcelain

if (-not $gitStatus) {
    Write-Host "`n✅ No changes detected. Working tree is clean!" -ForegroundColor Green
    pause
    exit
}

# Step 3: Add and commit changes
Write-Host "`n📦 Adding all changed files..." -ForegroundColor Green
git add .

$commitMsg = "Auto-sync commit - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "`n📝 Committing changes: $commitMsg" -ForegroundColor Green
git commit -m "$commitMsg"

# Step 4: Push to GitHub
Write-Host "`n⬆️  Pushing to GitHub..." -ForegroundColor Magenta
git push origin main

# Step 5: Done
Write-Host "`n✅ Sync Complete! All changes pushed successfully." -ForegroundColor Yellow
pause
