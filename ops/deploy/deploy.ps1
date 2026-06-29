# ops/deploy/deploy.ps1 — Production deployment script for Windows/PowerShell
#
# Usage:
#   .\ops\deploy\deploy.ps1 [-Env production] [-SkipTests] [-Force]
#
# Requirements:
#   - Node.js 20+, npm 9+
#   - PM2: npm install -g pm2
#   - PowerShell 7+ (pwsh) recommended
#   - .env.local present

param(
    [string]$Env = "production",
    [switch]$SkipTests,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# ── Constants ─────────────────────────────────────────────────────────────────

$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir     = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$Timestamp   = Get-Date -Format "yyyyMMdd_HHmmss"
$LogDir      = Join-Path $RootDir ".deploy-logs"
$LogFile     = Join-Path $LogDir "deploy-$Timestamp.log"
$BackupPath  = Join-Path $RootDir ".next-backup-$Timestamp"

$AppName     = "eunoia"
$RequiredBranch = "main"

# ── Output helpers ────────────────────────────────────────────────────────────

function Log    { param($m) $msg = "[$(Get-Date -Format 'HH:mm:ss')] $m"; Write-Host $msg -ForegroundColor Cyan;    Add-Content $LogFile $msg }
function Ok     { param($m) $msg = "[$(Get-Date -Format 'HH:mm:ss')] + $m"; Write-Host $msg -ForegroundColor Green;  Add-Content $LogFile $msg }
function Warn   { param($m) $msg = "[$(Get-Date -Format 'HH:mm:ss')] ! $m"; Write-Host $msg -ForegroundColor Yellow; Add-Content $LogFile $msg }
function Fail   { param($m) $msg = "[$(Get-Date -Format 'HH:mm:ss')] x $m"; Write-Host $msg -ForegroundColor Red;    Add-Content $LogFile $msg }
function Header { param($m)
    $sep = "=" * 50
    Write-Host "`n$sep" -ForegroundColor Blue
    Write-Host "  $m"   -ForegroundColor Blue
    Write-Host "$sep`n" -ForegroundColor Blue
    Add-Content $LogFile "`n$sep`n  $m`n$sep"
}

# ── Setup ─────────────────────────────────────────────────────────────────────

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location $RootDir

Header "EUNOIA AI OS — PRODUCTION DEPLOY (Windows)"
Log "Timestamp:   $Timestamp"
Log "Environment: $Env"
Log "Root:        $RootDir"
Log "Log:         $LogFile"

$RollbackNeeded = $false

function Invoke-Rollback {
    if (-not $RollbackNeeded) { return }
    Header "AUTOMATIC ROLLBACK TRIGGERED"
    Fail "Restoring previous build..."

    if (Test-Path $BackupPath) {
        Remove-Item -Recurse -Force (Join-Path $RootDir ".next") -ErrorAction SilentlyContinue
        Move-Item $BackupPath (Join-Path $RootDir ".next")
        Ok "Previous build restored"
    }

    $pm2 = Get-Command pm2 -ErrorAction SilentlyContinue
    if ($pm2) {
        & pm2 reload $AppName --update-env 2>&1 | Tee-Object -Append -FilePath $LogFile
    }

    Fail "DEPLOYMENT FAILED — ROLLBACK COMPLETE"
    Fail "Log: $LogFile"
    exit 1
}

# ── Step 1: Branch verification ───────────────────────────────────────────────

Header "STEP 1 — Branch Verification"

if (-not $Force) {
    $CurrentBranch = & git rev-parse --abbrev-ref HEAD
    if ($CurrentBranch -ne $RequiredBranch) {
        Fail "Must deploy from '$RequiredBranch'. Currently on '$CurrentBranch'."
        exit 1
    }
    Ok "Branch: $CurrentBranch"

    $DirtyFiles = & git status --short
    if ($DirtyFiles) {
        Fail "Uncommitted changes detected. Commit or stash before deploying."
        $DirtyFiles | ForEach-Object { Log $_ }
        exit 1
    }
    Ok "Working tree clean"
} else {
    Warn "Branch/git checks skipped (--Force)"
}

$CommitSha = (& git rev-parse --short HEAD).Trim()
Log "Deploying commit: $CommitSha"

# ── Step 2: Environment validation ────────────────────────────────────────────

Header "STEP 2 — Environment"

$RequiredVars = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "OPENAI_API_KEY",
    "NEXT_PUBLIC_APP_URL"
)

$MissingVars = @()
foreach ($v in $RequiredVars) {
    if (-not [System.Environment]::GetEnvironmentVariable($v)) {
        $MissingVars += $v
    }
}

if ($MissingVars.Count -gt 0) {
    Warn "Missing environment variables: $($MissingVars -join ', ')"
    Warn "Ensure .env.local is present or environment variables are set."
} else {
    Ok "Required environment variables present"
}

# ── Step 3: Dependencies ──────────────────────────────────────────────────────

Header "STEP 3 — Dependencies"
Log "Running npm ci..."
& npm ci --prefer-offline 2>&1 | Tee-Object -Append -FilePath $LogFile
if ($LASTEXITCODE -ne 0) { Invoke-Rollback; exit 1 }
Ok "Dependencies installed"

# ── Step 4: Lint ──────────────────────────────────────────────────────────────

Header "STEP 4 — Lint"
& npm run lint 2>&1 | Tee-Object -Append -FilePath $LogFile
if ($LASTEXITCODE -ne 0) { Fail "Lint failed"; Invoke-Rollback; exit 1 }
Ok "Lint passed"

# ── Step 5: TypeScript ────────────────────────────────────────────────────────

Header "STEP 5 — TypeScript"
& npx tsc --noEmit 2>&1 | Tee-Object -Append -FilePath $LogFile
if ($LASTEXITCODE -ne 0) { Fail "TypeScript errors"; Invoke-Rollback; exit 1 }
Ok "TypeScript: 0 errors"

# ── Step 6: Tests ─────────────────────────────────────────────────────────────

Header "STEP 6 — Tests"
if ($SkipTests) {
    Warn "Tests SKIPPED (--SkipTests). This is unsafe for production."
} else {
    & npm test 2>&1 | Tee-Object -Append -FilePath $LogFile
    if ($LASTEXITCODE -ne 0) { Fail "Tests failed"; Invoke-Rollback; exit 1 }
    Ok "All tests passed"
}

# ── Step 7: Build ─────────────────────────────────────────────────────────────

Header "STEP 7 — Build"

$NextDir = Join-Path $RootDir ".next"
if (Test-Path $NextDir) {
    Log "Backing up previous build..."
    Copy-Item -Recurse -Force $NextDir $BackupPath
    Ok "Previous build backed up"
    $RollbackNeeded = $true
}

$env:BUILD_VERSION = $CommitSha
& npm run build 2>&1 | Tee-Object -Append -FilePath $LogFile
if ($LASTEXITCODE -ne 0) { Fail "Build failed"; Invoke-Rollback; exit 1 }
Ok "Build complete"

# ── Step 8: PM2 Restart ───────────────────────────────────────────────────────

Header "STEP 8 — PM2 Restart"

$pm2Cmd = Get-Command pm2 -ErrorAction SilentlyContinue
if ($pm2Cmd) {
    & pm2 reload $AppName --update-env 2>&1 | Tee-Object -Append -FilePath $LogFile
    if ($LASTEXITCODE -ne 0) {
        & pm2 start (Join-Path $RootDir "ecosystem.config.js") --env $Env 2>&1 | Tee-Object -Append -FilePath $LogFile
    }
    & pm2 save 2>&1 | Out-Null
    Ok "PM2 restarted"
} else {
    Warn "PM2 not found — start manually: pm2 start ecosystem.config.js --env $Env"
}

# ── Step 9: Health Check ──────────────────────────────────────────────────────

Header "STEP 9 — Health Verification"

$AppUrl = if ($env:NEXT_PUBLIC_APP_URL) { $env:NEXT_PUBLIC_APP_URL.TrimEnd('/') } else { "http://localhost:3000" }
Log "App URL: $AppUrl"

Start-Sleep -Seconds 5

$LiveOk = $false
for ($i = 1; $i -le 12; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "$AppUrl/api/live" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $LiveOk = $true; Ok "/api/live → $($r.StatusCode)"; break }
    } catch {}
    Log "Attempt $i/12 — waiting..."
    Start-Sleep -Seconds 5
}

if (-not $LiveOk) { Fail "/api/live check failed"; Invoke-Rollback; exit 1 }

$HealthOk = $false
for ($i = 1; $i -le 12; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "$AppUrl/api/health" -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
        $body = $r.Content | ConvertFrom-Json
        if ($r.StatusCode -eq 200 -and $body.healthy -eq $true) { $HealthOk = $true; Ok "/api/health → healthy"; break }
    } catch {}
    Log "Attempt $i/12 — waiting..."
    Start-Sleep -Seconds 5
}

if (-not $HealthOk) { Fail "/api/health check failed"; Invoke-Rollback; exit 1 }

# ── Success ───────────────────────────────────────────────────────────────────

if (Test-Path $BackupPath) { Remove-Item -Recurse -Force $BackupPath }
$RollbackNeeded = $false

Header "DEPLOYMENT SUCCESSFUL"
Ok "Commit:      $CommitSha"
Ok "Environment: $Env"
Ok "App URL:     $AppUrl"
Ok "Log:         $LogFile"
Write-Host "`n  Eunoia AI OS is live.`n" -ForegroundColor Green
