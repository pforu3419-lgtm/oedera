# วิธีแก้ปัญหา SSL Alert Number 80 ใน MongoDB Compass

## ปัญหา: SSL Alert Number 80

Error นี้เกิดจาก MongoDB Compass ไม่สามารถทำ SSL/TLS handshake ได้

## วิธีแก้ไข (ทำตามลำดับ)

### วิธีที่ 1: ใช้ Connection String แบบไม่มี Query Parameters

**Connection String:**
```
mongodb+srv://pforu3419_db_user:LoDVFyFWaBERGwLQ@clusterpos.mhpcwix.mongodb.net/ordera
```

**ขั้นตอน:**
1. เปิด MongoDB Compass
2. คลิก "New Connection"
3. วาง Connection String ด้านบน (ลบ `?appName=Clusterpos` ออก)
4. คลิก "Connect"

### วิธีที่ 2: กรอกข้อมูลแยกและตั้งค่า SSL/TLS อย่างถูกต้อง

1. **เปิด MongoDB Compass**
2. **คลิก "New Connection"**
3. **เลือก "Fill in connection fields individually"**
4. **กรอกข้อมูล:**
   - **Hostname:** `clusterpos.mhpcwix.mongodb.net`
   - **Port:** (เว้นว่างไว้ - MongoDB Atlas ใช้ default port)
   - **Authentication:**
     - **Username:** `pforu3419_db_user`
     - **Password:** `LoDVFyFWaBERGwLQ`
     - **Authentication Database:** `admin`
   - **SSL/TLS:**
     - ✅ **Enable SSL/TLS** (เปิดใช้งาน)
     - **SSL/TLS Certificate:** เลือก **"System CA"** หรือ **"Use system CA"**
     - ❌ **ไม่ต้องเลือก** "Allow invalid certificates"
5. **คลิก "Connect"**

### วิธีที่ 3: ลบ Connection เก่าทั้งหมดและสร้างใหม่

1. ใน MongoDB Compass → **"CONNECTIONS"** (sidebar ซ้าย)
2. **ลบ Connection เก่าทั้งหมด** ที่มีปัญหา:
   - คลิกขวาที่แต่ละ connection
   - เลือก **"Remove"** หรือ **"Delete"**
3. **สร้าง Connection ใหม่** ด้วยวิธีที่ 1 หรือ 2

### วิธีที่ 4: อัพเดท MongoDB Compass

ปัญหาอาจเกิดจากเวอร์ชันเก่า:

1. **ตรวจสอบเวอร์ชันปัจจุบัน:**
   - Help → About MongoDB Compass
2. **ดาวน์โหลดเวอร์ชันล่าสุด:**
   - ไปที่: https://www.mongodb.com/try/download/compass
   - ดาวน์โหลดและติดตั้งเวอร์ชันล่าสุด
3. **ลองเชื่อมต่อใหม่**

### วิธีที่ 5: ใช้ Connection String พร้อม SSL Options

ลองใช้ Connection String นี้:

```
mongodb+srv://pforu3419_db_user:LoDVFyFWaBERGwLQ@clusterpos.mhpcwix.mongodb.net/ordera?tls=true&tlsAllowInvalidCertificates=false
```

หรือ:

```
mongodb+srv://pforu3419_db_user:LoDVFyFWaBERGwLQ@clusterpos.mhpcwix.mongodb.net/ordera?ssl=true
```

## ตรวจสอบ MongoDB Atlas

ก่อนเชื่อมต่อ MongoDB Compass ตรวจสอบว่า:

### 1. Cluster Status
- ไปที่ https://cloud.mongodb.com/ → **"Clusters"**
- ตรวจสอบว่า Cluster อยู่ในสถานะ **"Running"** (สีเขียว)
- ถ้าหยุดทำงาน ให้คลิก **"Resume"**

### 2. Network Access
- ไปที่ MongoDB Atlas → **"Network Access"**
- ตรวจสอบว่า IP ของคุณอยู่ใน whitelist หรือไม่
- ถ้าไม่มี:
  - คลิก **"Add IP Address"**
  - เลือก **"Allow Access from Anywhere"** หรือใส่ `0.0.0.0/0`
  - คลิก **"Confirm"**
  - รอ 1-2 นาที

### 3. Database User
- ไปที่ MongoDB Atlas → **"Database Access"**
- ตรวจสอบ user `pforu3419_db_user`:
  - Status ต้องเป็น **"Active"**
  - Role ต้องมี **"Atlas admin"** หรือ **"Read and write to any database"**

## Connection Strings สำหรับทดสอบ

### Option 1: แบบง่าย (แนะนำ)
```
mongodb+srv://pforu3419_db_user:LoDVFyFWaBERGwLQ@clusterpos.mhpcwix.mongodb.net/ordera
```

### Option 2: พร้อม TLS option
```
mongodb+srv://pforu3419_db_user:LoDVFyFWaBERGwLQ@clusterpos.mhpcwix.mongodb.net/ordera?tls=true
```

### Option 3: พร้อม SSL option
```
mongodb+srv://pforu3419_db_user:LoDVFyFWaBERGwLQ@clusterpos.mhpcwix.mongodb.net/ordera?ssl=true
```

## Checklist การแก้ปัญหา

- [ ] ลบ Connection เก่าทั้งหมดใน MongoDB Compass
- [ ] ลองใช้ Connection String แบบง่าย (Option 1)
- [ ] ตั้งค่า SSL/TLS ใน Compass อย่างถูกต้อง (System CA)
- [ ] อัพเดท MongoDB Compass เป็นเวอร์ชันล่าสุด
- [ ] ตรวจสอบ MongoDB Atlas Cluster Status (ต้องเป็น "Running")
- [ ] ตรวจสอบ Network Access (เพิ่ม `0.0.0.0/0`)
- [ ] ตรวจสอบ Database User (Status = Active)

## หมายเหตุสำคัญ

- **SSL Alert 80** มักเกิดจาก TLS handshake failure ใน MongoDB Compass
- **Application ของคุณ (Node.js)** ใช้ MongoDB driver ที่จัดการ SSL/TLS อัตโนมัติ - ไม่มีปัญหา
- **MongoDB Compass** ต้องตั้งค่า SSL/TLS เอง
- ถ้า Application ทำงานได้ แต่ Compass ไม่ได้ แสดงว่าปัญหาอยู่ที่ Compass settings

## ทดสอบว่า Application ทำงานได้หรือไม่

ถ้า MongoDB Compass เชื่อมต่อไม่ได้ แต่ application ทำงานได้ แสดงว่าปัญหาอยู่ที่ Compass:

1. **รันเซิร์ฟเวอร์:**
   ```powershell
   $env:NODE_ENV="development"
   pnpm dev
   ```

2. **ทดสอบการเชื่อมต่อ:**
   - เปิดเบราว์เซอร์: `http://localhost:3023/api/dev/test-db`
   - ถ้าเห็น `"ok": true` แสดงว่า application เชื่อมต่อ MongoDB ได้

## สรุป

ปัญหานี้เป็นปัญหาของ **MongoDB Compass** ไม่ใช่โค้ด application ของคุณ

**ลองทำตามนี้:**
1. ลบ Connection เก่าทั้งหมดใน Compass
2. สร้าง Connection ใหม่ด้วย Connection String แบบง่าย: `mongodb+srv://pforu3419_db_user:LoDVFyFWaBERGwLQ@clusterpos.mhpcwix.mongodb.net/ordera`
3. ถ้าไม่ได้ ให้ใช้วิธีที่ 2 (กรอกข้อมูลแยกและตั้งค่า SSL/TLS)
