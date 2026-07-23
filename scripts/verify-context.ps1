[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$errors = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()
$facts = [ordered]@{}

function Add-ContextError([string]$message) {
    $errors.Add($message)
}

function Add-ContextWarning([string]$message) {
    $warnings.Add($message)
}

function Test-TextPattern {
    param(
        [Parameter(Mandatory)][string]$Pattern,
        [Parameter(Mandatory)][string[]]$Paths
    )

    foreach ($pathItem in $Paths) {
        if (-not (Test-Path -LiteralPath $pathItem)) {
            continue
        }
        if (Select-String -LiteralPath $pathItem -Pattern $Pattern -Quiet) {
            return $true
        }
    }
    return $false
}

$requiredFiles = @(
    'AGENTS.md',
    'docs/ai/START_HERE.md',
    'docs/ai/PROJECT_CONTEXT.md',
    'docs/ai/STATUS.md',
    'docs/ai/RISK_REGISTER.md',
    'docs/ai/HANDOFF.md',
    '.agents/skills/rocotools-context-handoff/SKILL.md',
    '.agents/skills/rocotools-context-handoff/agents/openai.yaml'
)

foreach ($requiredFile in $requiredFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot $requiredFile))) {
        Add-ContextError "缺少上下文文件: $requiredFile"
    }
}

$facts.Branch = (& git branch --show-current)
$facts.Head = (& git rev-parse HEAD)
$statusLines = @(& git status --short)
$facts.Worktree = if ($statusLines.Count -eq 0) { 'clean' } else { 'dirty' }
$facts.ChangedFiles = $statusLines

$hooksPath = (& git config --get core.hooksPath)
if ([string]::IsNullOrWhiteSpace($hooksPath)) {
    Add-ContextWarning 'Git hooks 文件可能存在，但 core.hooksPath 未启用。'
} else {
    $facts.HooksPath = $hooksPath
}

$serverRoot = Join-Path $repoRoot 'app/server'
$dbPath = Join-Path $serverRoot 'data/roco.db'
$dbModule = Join-Path $serverRoot 'node_modules/better-sqlite3'
if ((Test-Path -LiteralPath $dbPath) -and (Test-Path -LiteralPath $dbModule) -and (Get-Command node -ErrorAction SilentlyContinue)) {
    $nodeScript = @'
const Database = require("better-sqlite3");
const db = new Database("data/roco.db", { readonly: true });
const out = {
  integrity: db.pragma("integrity_check")[0].integrity_check,
  pets: db.prepare("SELECT COUNT(DISTINCT pet_id) AS c FROM pets").get().c,
  petForms: db.prepare("SELECT COUNT(*) AS c FROM pets").get().c,
  skills: db.prepare("SELECT COUNT(*) AS c FROM skills").get().c,
  elements: db.prepare("SELECT COUNT(*) AS c FROM elements").get().c,
  eggs: db.prepare("SELECT COUNT(*) AS c FROM egg_groups").get().c,
  natures: db.prepare("SELECT COUNT(*) AS c FROM natures").get().c
};
db.close();
process.stdout.write(JSON.stringify(out));
'@
    Push-Location -LiteralPath $serverRoot
    try {
        $encodedNodeScript = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($nodeScript))
        $nodeLauncher = 'eval(Buffer.from(process.argv[1],process.argv[2]).toString(process.argv[3]))'
        $nodeOutput = & node -e $nodeLauncher $encodedNodeScript 'base64' 'utf8'
        if ($LASTEXITCODE -ne 0) {
            throw "Node SQLite probe failed with exit code $LASTEXITCODE"
        }
        $dbFacts = ($nodeOutput | ConvertFrom-Json)
        $facts.Database = $dbFacts
        if ($dbFacts.integrity -ne 'ok') {
            Add-ContextError "SQLite integrity_check 失败: $($dbFacts.integrity)"
        }
    } catch {
        Add-ContextWarning "无法完成 SQLite 只读核验: $($_.Exception.Message)"
    } finally {
        Pop-Location
    }
} else {
    Add-ContextWarning '本地数据库、better-sqlite3 或 Node.js 不可用，跳过 SQLite 核验。'
}

$sourceFiles = @(
    Get-ChildItem -LiteralPath (Join-Path $repoRoot 'app/server/src') -Recurse -File -Include *.js,*.json,*.sql
    Get-ChildItem -LiteralPath (Join-Path $repoRoot 'app/client/src') -Recurse -File -Include *.js,*.vue,*.json
    Get-Item -LiteralPath (Join-Path $repoRoot 'app/server/sync_db.js')
    Get-Item -LiteralPath (Join-Path $repoRoot 'app/client/vite.config.js')
)
$doubleDbMatches = $sourceFiles | Select-String -Pattern '\.edit_db|\.online_db|getEditDbPath|getOnlineDbPath|roco_edit|roco_online'
if ($doubleDbMatches) {
    Add-ContextWarning '检测到双库相关代码；请重新核验 STATUS.md 和 RISK_REGISTER.md。'
} else {
    $facts.DualDbCode = 'not-found'
}

$authRisk = Test-TextPattern -Pattern 'roco-admin-default-secret-change-me|roco2026' -Paths @(
    (Join-Path $repoRoot 'app/server/src/middleware/authAdmin.js'),
    (Join-Path $repoRoot 'app/server/src/routes/admin/index.js')
)
if ($authRisk) {
    Add-ContextWarning 'H-01 仍可复现：代码包含默认管理凭据。'
}

$xssRisk = Test-TextPattern -Pattern 'v-html=' -Paths @(
    (Join-Path $repoRoot 'app/client/src/views/user/Home.vue'),
    (Join-Path $repoRoot 'app/client/src/views/user/Season.vue'),
    (Join-Path $repoRoot 'app/client/src/views/admin/AdminSeasons.vue')
)
if ($xssRisk) {
    Add-ContextWarning 'H-02 仍需核验：公告页面仍使用 v-html。'
}

$feedbackPublic = Test-TextPattern -Pattern 'uploads.+feedbacks|/uploads/' -Paths @(
    (Join-Path $repoRoot 'app/server/src/routes/feedbacks.js'),
    (Join-Path $repoRoot 'nginx.prod.conf'),
    (Join-Path $repoRoot 'app/client/vite.config.js')
)
if ($feedbackPublic) {
    Add-ContextWarning 'H-03 仍需核验：反馈附件仍位于公开 uploads 边界。'
}

$syncText = Get-Content -LiteralPath (Join-Path $repoRoot 'app/server/sync_db.js') -Raw -Encoding UTF8
$facts.SyncDefault = if ($syncText -match 'process\.argv\.includes\(''--full''\)') { 'safe-default-no-import' } else { 'needs-review' }

Write-Host 'RocoTools 上下文核验'
Write-Host ($facts | ConvertTo-Json -Depth 6)

if ($warnings.Count -gt 0) {
    Write-Host "`nWARNINGS"
    $warnings | ForEach-Object { Write-Host "- $_" }
}

if ($errors.Count -gt 0) {
    Write-Host "`nERRORS"
    $errors | ForEach-Object { Write-Host "- $_" }
    exit 1
}

Write-Host "`nRESULT: PASS（警告项需结合当前任务处理）"
