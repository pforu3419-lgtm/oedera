# แก้ปัญหา SSL/TLS Error ใน MongoDB Compass

## ปัญหา: SSL Alert Number 80

**Error Message:**
```
634624:error:10000438:SSL routines:OPENSSL_internal:TLSVI_ALERT_INTERNAL_ERROR
SSL alert number 80
```

นี่เป็นปัญหาการ handshake SSL/TLS ระหว่าง MongoDB Compass กับ MongoDB Atlas

## วิธีแก้ไข (ทำตามลำดับ)

### วิธีที่ 1: ใช้ Connection String พร้อม SSL Options (แนะนำ)

**Connection String ที่แก้ไขแล้ว:**
```
mongodb+srv://pforu3419_db_user:LoDVFyFWaBERGwLQ@clusterpos.mhpcwix.mongodb.net/ordera?tls=true&tlsAllowInvalidCertificates=false
```

**หรือลองแบบนี้:**
```
mongodb+srv://pforu3419_db_user:LoDVFyFWaBERGwLQ@clusterpos.mhpcwix.mongodb.net/ordera?ssl=true&tlsAllowInvalidCertificates=false
```

### วิธีที่ 2: ตั้งค่า SSL/TLS ใน MongoDB Compass

1. **เปิด MongoDB Compass**
2. **คลิก "New Connection"**
3. **เลือก "Fill in connection fields individually"** (ไม่ใช้ connection string)
4. **กรอกข้อมูล:**
   - **Hostname:** `clusterpos.mhpcwix.mongodb.net`
   - **Port:** (เว้นว่างไว้)
   - **Authentication:**
     - Username: `pforu3419_db_user`
     - Password: `LoDVFyFWaBERGwLQ`
     - Authentication Database: `admin`
   - **SSL/TLS:**
     - ✅ **Enable SSL/TLS** (เปิดใช้งาน)
     - **SSL/TLS Certificate:** เลือก **"System CA"** หรือ **"Use system CA"**
     - ❌ **ไม่ต้องเลือก** "Allow invalid certificates" (เว้นว่างไว้)
5. **คลิก "Connect"**

### วิธีที่ 3: ปิด SSL Validation ชั่วคราว (สำหรับทดสอบเท่านั้น)

⚠️ **Warning:** วิธีนี้ไม่ปลอดภัย ใช้เฉพาะสำหรับทดสอบเท่านั้น

1. ใน MongoDB Compass → **"Fill in connection fields individually"**
2. ตั้งค่า SSL/TLS:
   - ✅ **Enable SSL/TLS**
   - ✅ **Allow invalid certificates** (เปิดใช้งานชั่วคราว)
3. ลองเชื่อมต่อ

### วิธีที่ 4: อัพเดท MongoDB Compass

ปัญหานี้อาจเกิดจากเวอร์ชัน MongoDB Compass ที่เก่า:

1. **ตรวจสอบเวอร์ชันปัจจุบัน:**
   - Help → About MongoDB Compass
2. **ดาวน์โหลดเวอร์ชันล่าสุด:**
   - ไปที่: https://www.mongodb.com/try/download/compass
   - ดาวน์โหลดและติดตั้งเวอร์ชันล่าสุด
3. **ลองเชื่อมต่อใหม่**

### วิธีที่ 5: ใช้ Connection String แบบไม่มี SSL (ไม่แนะนำ)

ถ้าทุกวิธีไม่ได้ผล ลองใช้ connection string แบบไม่มี SSL:

```
mongodb://pforu3419_db_user:LoDVFyFWaBERGwLQ@clusterpos.mhpcwix.mongodb.net:27017/ordera?ssl=false
```

**หมายเหตุ:** MongoDB Atlas ต้องการ SSL/TLS ดังนั้นวิธีนี้อาจไม่ทำงาน

## วิธีแก้ไขเพิ่มเติม

### ตรวจสอบ Network Access

1. ไปที่ MongoDB Atlas → **"Network Access"**
2. ตรวจสอบว่า IP ของคุณถูก whitelist แล้ว
3. ถ้ายังไม่ได้ ให้เพิ่ม `0.0.0.0/0` (สำหรับ development)

### ตรวจสอบ Database User

1. ไปที่ MongoDB Atlas → **"Database Access"**
2. ตรวจสอบ user `pforu3419_db_user` มีสิทธิ์ **"Atlas admin"**
3. ตรวจสอบ password ถูกต้อง

### ตรวจสอบ Cluster Status

1. ไปที่ MongoDB Atlas → **"Clusters"**
2. ตรวจสอบว่า Cluster อยู่ในสถานะ **"Running"**

## Connection String Options สำหรับ SSL/TLS

### Option 1: ใช้ TLS (แนะนำ)
```
mongodb+srv://user:pass@host/db?tls=true
```

### Option 2: ใช้ SSL
```
mongodb+srv://user:pass@host/db?ssl=true
```

### Option 3: ปิดการตรวจสอบ Certificate (ไม่แนะนำ)
```
mongodb+srv://user:pass@host/db?tlsAllowInvalidCertificates=true
```

### Option 4: ระบุ TLS Version
```
mongodb+srv://user:pass@host/db?tls=true&tlsMinVersion=TLSv1.2
```

## ทดสอบการเชื่อมต่อผ่าน Application

ถ้า MongoDB Compass ยังเชื่อมต่อไม่ได้ แต่ application ทำงานได้ แสดงว่าปัญหาอยู่ที่ Compass:

1. **รันเซิร์ฟเวอร์:**
   ```powershell
   $env:NODE_ENV="development"
   pnpm dev
   ```

2. **ทดสอบการเชื่อมต่อ:**
   - เปิดเบราว์เซอร์: `http://localhost:3023/api/dev/test-db`
   - ถ้าเห็น `"ok": true` แสดงว่า application เชื่อมต่อได้

## Checklist การแก้ปัญหา

- [ ] ลองใช้ Connection String พร้อม SSL options
- [ ] ตั้งค่า SSL/TLS ใน Compass อย่างถูกต้อง
- [ ] อัพเดท MongoDB Compass เป็นเวอร์ชันล่าสุด
- [ ] ตรวจสอบ Network Access ใน MongoDB Atlas
- [ ] ตรวจสอบ Database User และ Password
- [ ] ทดสอบการเชื่อมต่อผ่าน Application

## หมายเหตุ

- **SSL Alert 80** มักเกิดจาก TLS handshake failure
- MongoDB Atlas ต้องการ SSL/TLS เสมอ
- MongoDB Node.js driver จัดการ SSL/TLS อัตโนมัติ
- MongoDB Compass อาจต้องตั้งค่า SSL/TLS เอง

## ข้อมูลเพิ่มเติม

- MongoDB Compass Documentation: https://www.mongodb.com/docs/compass/
- MongoDB Connection String: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB Atlas SSL/TLS: https://www.mongodb.com/docs/atlas/security/
