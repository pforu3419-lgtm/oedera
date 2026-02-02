# แก้ SSL Alert 80 บน Render + MongoDB Atlas

ถ้ายังเจอข้อผิดพลาด **SSL alert number 80** หลัง deploy บน Render ให้ลองวิธีนี้:

## ใช้ Standard Connection String แทน mongodb+srv

### ขั้นตอน

1. เข้า **MongoDB Atlas** → ไปที่ Cluster ของคุณ
2. กด **Connect** → เลือก **Drivers**
3. เลือก **Node.js** และเวอร์ชัน driver
4. ใต้ connection string จะมีปุ่ม **"Edit"** หรือลิงก์ **"Choose your connection method"**
5. เลือก **"Standard connection string"** (ไม่ใช่ SRV)
6. คัดลอก connection string ที่ได้ (ขึ้นต้นด้วย `mongodb://` ไม่ใช่ `mongodb+srv://`)
7. ต่อท้ายด้วย `&directConnection=true` ถ้ายังไม่มี
   - ตัวอย่าง: `mongodb://cluster0.xxxxx.mongodb.net:27017/ordera?retryWrites=true&w=majority&directConnection=true`
8. ไปที่ **Render Dashboard** → Web Service → **Environment**
9. เพิ่มตัวแปร:
   - **Key:** `MONGODB_URI_STANDARD`
   - **Value:** (วาง connection string ที่คัดลอกมา โดยใส่ username และ password ให้ถูกต้อง)
10. ลบหรือ comment ตัวแปร `MONGODB_URI` ออก (หรือปล่อยไว้ก็ได้ — โปรแกรมจะใช้ `MONGODB_URI_STANDARD` ก่อน)
11. กด **Save** แล้ว **Manual Deploy** อีกครั้ง

### ตัวอย่าง Connection String

```
mongodb://username:password@cluster0.xxxxx.mongodb.net:27017/ordera?retryWrites=true&w=majority&directConnection=true
```

**หมายเหตุ:** ถ้ารหัสผ่านมีอักขระพิเศษ (@, #, :, etc.) ต้อง encode เป็น URL format ก่อน
