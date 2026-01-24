# MongoDB Connection Troubleshooting Guide

## การตรวจสอบการเชื่อมต่อ MongoDB

### 1. ตรวจสอบ Environment Variables
เปิดเบราว์เซอร์ไปที่:
```
http://localhost:3023/api/dev/test-env
```

จะแสดงข้อมูล:
- MONGODB_URI (ถูก mask password)
- JWT_SECRET
- PORT
- NODE_ENV

### 2. ทดสอบการเชื่อมต่อ MongoDB
เปิดเบราว์เซอร์ไปที่:
```
http://localhost:3023/api/dev/test-db
```

จะแสดง:
- สถานะการเชื่อมต่อ
- จำนวน collections
- ผลการทดสอบ insert/read/delete

### 3. ปัญหาที่พบบ่อยและวิธีแก้ไข

#### ❌ Error: "MONGODB_URI is not configured"
**วิธีแก้:**
1. ตรวจสอบไฟล์ `env.runtime` ในโฟลเดอร์ root
2. ตรวจสอบว่ามีบรรทัด: `MONGODB_URI=mongodb+srv://...`
3. รีสตาร์ทเซิร์ฟเวอร์

#### ❌ Error: "ENOTFOUND" หรือ "getaddrinfo"
**สาเหตุ:** DNS resolution ล้มเหลว
**วิธีแก้:**
1. ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
2. ตรวจสอบว่า MongoDB Atlas cluster ยังทำงานอยู่
3. ลองใช้ DNS อื่น (8.8.8.8, 1.1.1.1)

#### ❌ Error: "authentication failed" หรือ "unauthorized"
**สาเหตุ:** Username/Password ผิด หรือไม่มีสิทธิ์
**วิธีแก้:**
1. ตรวจสอบ username และ password ใน MONGODB_URI
2. ตรวจสอบใน MongoDB Atlas:
   - ไปที่ Database Access
   - ตรวจสอบ user มีสิทธิ์ "Atlas admin" หรือ "Read and write to any database"
   - ลองสร้าง user ใหม่และอัพเดท URI

#### ❌ Error: "timeout"
**สาเหตุ:** Network timeout หรือ IP ไม่ได้ถูก whitelist
**วิธีแก้:**
1. ตรวจสอบการเชื่อมต่อเครือข่าย
2. ไปที่ MongoDB Atlas → Network Access
3. เพิ่ม IP address ของคุณ (หรือใช้ 0.0.0.0/0 สำหรับ development)
4. รอ 1-2 นาทีให้การเปลี่ยนแปลงมีผล

#### ❌ Error: "Database name not found in MongoDB URI"
**สาเหตุ:** URI ไม่มีชื่อ database
**วิธีแก้:**
ตรวจสอบ URI format:
```
mongodb+srv://username:password@cluster.mongodb.net/database_name?options
```
ต้องมี `/database_name` หลัง hostname

### 4. ตรวจสอบ MongoDB Atlas

1. **Cluster Status:**
   - ไปที่ MongoDB Atlas → Clusters
   - ตรวจสอบว่า cluster อยู่ในสถานะ "Running"

2. **Network Access:**
   - ไปที่ Network Access
   - เพิ่ม IP: `0.0.0.0/0` (สำหรับ development) หรือ IP เฉพาะของคุณ

3. **Database Access:**
   - ไปที่ Database Access
   - ตรวจสอบ user มีสิทธิ์ที่ถูกต้อง

### 5. ทดสอบการเชื่อมต่อด้วย MongoDB Compass

1. ดาวน์โหลด MongoDB Compass
2. ใช้ connection string จาก `env.runtime`
3. ลองเชื่อมต่อ - ถ้าเชื่อมต่อได้แสดงว่า URI ถูกต้อง

### 6. Logs ที่ควรตรวจสอบ

เมื่อรันเซิร์ฟเวอร์ ดูที่ console output:
- `[ENV] ✅ Environment file loaded from: env.runtime` - แสดงว่า env ถูกโหลด
- `[MongoDB] Connection attempt X/3...` - แสดงการพยายามเชื่อมต่อ
- `[MongoDB] ✅ Connected successfully` - แสดงว่าเชื่อมต่อสำเร็จ
- `[MongoDB] ❌ Connection failed:` - แสดงข้อผิดพลาด

### 7. การรีสตาร์ทการเชื่อมต่อ

ถ้าต้องการรีสตาร์ทการเชื่อมต่อ:
1. หยุดเซิร์ฟเวอร์ (Ctrl+C)
2. รอ 5 วินาที
3. เริ่มเซิร์ฟเวอร์ใหม่

### 8. ข้อมูลเพิ่มเติม

- MongoDB Atlas Documentation: https://docs.atlas.mongodb.com/
- MongoDB Node.js Driver: https://docs.mongodb.com/drivers/node/
