# สคริปต์ push โปรเจกต์ขึ้น GitHub: https://github.com/pforu3419-lgtm/oedera
# วิธีใช้: เปิด PowerShell ในโฟลเดอร์โปรเจกต์ แล้วรัน
#   .\scripts\push-to-github.ps1
#
# หมายเหตุ:
# - ต้องติดตั้ง Git: https://git-scm.com/download/win
# - ตั้งค่า: git config --global user.name "ชื่อ" และ user.email "อีเมล"
# - ถ้า push ถามรหัส ใช้ Personal Access Token แทนรหัสผ่าน: https://github.com/settings/tokens

$ErrorActionPreference = "Stop"
$repo = "https://github.com/pforu3419-lgtm/oedera.git"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "ไม่พบคำสั่ง git — กรุณาติดตั้ง Git for Windows: https://git-scm.com/download/win" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path ".git")) {
  git init
  Write-Host "สร้าง git repo ใหม่แล้ว" -ForegroundColor Green
}

git remote remove origin 2>$null
git remote add origin $repo
Write-Host "ตั้ง remote = $repo" -ForegroundColor Green

git add .
$changed = git diff --cached --name-only
$hasCommit = git rev-parse HEAD 2>$null
$msg = if ($hasCommit) { "Update: Ordera POS" } else { "Initial commit: Ordera POS" }

if ($changed) {
  git commit -m $msg
  Write-Host "commit แล้ว" -ForegroundColor Green
} else {
  if (-not $hasCommit) {
    Write-Host "ไม่มีไฟล์ที่จะ commit (ตรวจสอบ .gitignore)" -ForegroundColor Red
    exit 1
  }
  Write-Host "ไม่มีการเปลี่ยน — จะ push ของเดิม" -ForegroundColor Yellow
}

git branch -M main
Write-Host "กำลัง push ไปยัง origin main ..." -ForegroundColor Cyan
git push -u origin main

Write-Host ""
Write-Host "เสร็จ: $repo" -ForegroundColor Green
