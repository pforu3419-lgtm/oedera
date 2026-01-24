# MongoDB Connection Strings

## Connection String สำหรับ Application (env.runtime)

```
mongodb+srv://pforu3419_db_user:LoDVFyFWaBERGwLQ@clusterpos.mhpcwix.mongodb.net/ordera?appName=Clusterpos
```

**หมายเหตุ:** ใช้ `clusterpos.mhpcwix.mongodb.net` (ไม่ใช่ shard-specific hostname)

## Connection String สำหรับ MongoDB Compass

### Option 1: แบบง่าย (แนะนำ)
```
mongodb+srv://pforu3419_db_user:LoDVFyFWaBERGwLQ@clusterpos.mhpcwix.mongodb.net/ordera
```

### Option 2: พร้อม authMechanism
```
mongodb+srv://pforu3419_db_user:LoDVFyFWaBERGwLQ@clusterpos.mhpcwix.mongodb.net/ordera?authMechanism=DEFAULT
```

## หมายเหตุสำคัญ

⚠️ **ไม่ควรใช้ shard-specific hostname** (`clusterpos-shard-00-00.mhpcwix.mongodb.net`)
- ใช้ `clusterpos.mhpcwix.mongodb.net` แทน
- MongoDB Atlas จะจัดการ shard routing อัตโนมัติ

✅ **ต้องมี database name** (`/ordera`)
- Connection string ต้องมี `/ordera` หลัง hostname

✅ **authMechanism=DEFAULT** เป็น optional
- MongoDB driver จะใช้ DEFAULT อัตโนมัติ
