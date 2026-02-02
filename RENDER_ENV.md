# ตั้งค่า Environment บน Render (oedera.onrender.com)

บน Render **ไม่มีไฟล์ env.runtime** — ต้องตั้งตัวแปรใน Dashboard แทน

---

## ขั้นตอน

1. ไปที่ https://dashboard.render.com
2. เลือก **Web Service** ชื่อ **oedera** (หรือชื่อที่ deploy ไว้)
3. เมนูซ้าย → **Environment**
4. กด **Add Environment Variable** แล้วเพิ่ม:

| Key | Value | หมายเหตุ |
|-----|-------|----------|
| **JWT_SECRET** | สตริงลับอย่างน้อย 20 ตัว (เช่น `my-super-secret-jwt-key-2024`) | **จำเป็น** — ใช้เข้ารหัส session/cookie |
| **MONGODB_URI** | `mongodb+srv://user:pass@cluster.mongodb.net/ordera?retryWrites=true&w=majority` หรือ MONGODB_URI_STANDARD (ดู RENDER_MONGODB_SSL_FIX.md) | **จำเป็น** |

5. กด **Save Changes**  
   - Render จะ **redeploy** ให้เองหลัง save

---

## ตัวแปรอื่น (ถ้าใช้)

| Key | ใช้เมื่อ |
|-----|----------|
| ORDERA_MASTER_CODE | ต้องการใช้รหัสหลักจาก env สำหรับ /create-admin-codes (ไม่บังคับ ถ้าใช้จาก DB) |
| NODE_ENV | Render ตั้งเป็น `production` ให้อยู่แล้ว |
| PORT | Render ใส่ให้อัตโนมัติ |

---

## หลังแก้แล้ว

- รอ redeploy จบ (ดูที่แท็บ **Logs**)
- ลอง Login / Register ใหม่ที่ https://oedera.onrender.com
