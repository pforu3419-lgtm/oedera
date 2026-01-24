# Push โปรเจกต์ขึ้น GitHub (oedera)

Repo: **https://github.com/pforu3419-lgtm/oedera**

---

## วิธีที่ 1: รันสคริปต์ (PowerShell)

```powershell
.\scripts\push-to-github.ps1
```

---

## วิธีที่ 2: คำสั่ง Git เอง

เปิด **PowerShell** หรือ **Git Bash** ในโฟลเดอร์โปรเจกต์ แล้วรันตามลำดับ:

```bash
# 1. สร้าง repo (ครั้งแรกเท่านั้น)
git init

# 2. ต่อกับ GitHub
git remote add origin https://github.com/pforu3419-lgtm/oedera.git

# 3. add + commit
git add .
git commit -m "Initial commit: Ordera POS"

# 4. ใช้สาขา main แล้ว push
git branch -M main
git push -u origin main
```

ถ้ามี `origin` อยู่แล้ว:
```bash
git remote set-url origin https://github.com/pforu3419-lgtm/oedera.git
```

---

## สิ่งที่ต้องมี

1. **ติดตั้ง Git**  
   - Windows: https://git-scm.com/download/win

2. **ตั้งค่าชื่อและอีเมล (ครั้งเดียว)**
   ```bash
   git config --global user.name "ชื่อคุณ"
   git config --global user.email "อีเมล@example.com"
   ```

3. **ตอน push ถ้าถามรหัสผ่าน**  
   ใช้ **Personal Access Token** แทนรหัสผ่าน GitHub  
   - สร้างได้ที่: https://github.com/settings/tokens  
   - ขอ scope: `repo`

---

## ไฟล์ที่ไม่ขึ้น Git (ใน .gitignore)

- `env.runtime` (รหัสผ่าน, DATABASE_URL, JWT_SECRET ฯลฯ)
- `node_modules/`
- `dist/`
- `.env*`

หลัง clone โปรเจกต์ใหม่ ต้องสร้าง `env.runtime` เอง (ใส่ DATABASE_URL, JWT_SECRET ฯลฯ ตามที่ใช้ในเครื่อง)
