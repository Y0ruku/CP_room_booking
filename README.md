# CP Room Booking

## สิ่งที่ต้องติดตั้ง

- Java JDK 17 ขึ้นไป
- Node.js และ npm
- PostgreSQL หรือบัญชี Supabase PostgreSQL

## ตั้งค่า Backend

1. เปิด PowerShell แล้วเข้าโฟลเดอร์ backend

```powershell
cd code/backend
```

2. สร้างไฟล์ `.env` จากไฟล์ตัวอย่าง

```powershell
Copy-Item .env.example .env
```

3. เปิดไฟล์ `code/backend/.env` แล้วใส่ค่าฐานข้อมูลจริง

```env
DB_URL=jdbc:postgresql://localhost:5432/cp_room_booking
DB_USERNAME=postgres
DB_PASSWORD=รหัสผ่าน PostgreSQL
JPA_DDL_AUTO=update
```

ถ้าใช้ Supabase ให้ใช้ connection string ของ Supabase Pooler เช่น:

```env
DB_URL=jdbc:postgresql://aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
DB_USERNAME=postgres.รหัสโปรเจค
DB_PASSWORD=รหัสผ่านฐานข้อมูล
JPA_DDL_AUTO=update
```

ห้าม commit ไฟล์ `.env` เพราะมีรหัสผ่านฐานข้อมูลอยู่ ให้ commit เฉพาะ `.env.example`

## รัน Backend

เปิด PowerShell หนึ่งหน้าต่าง:

```powershell
cd code/backend
./mvnw.cmd spring-boot:run
```

Backend จะทำงานที่ `http://localhost:8080`

ทดสอบการเชื่อมต่อฐานข้อมูลด้วย:

```powershell
cd code/backend
./mvnw.cmd test
```

ถ้าทดสอบสำเร็จ จะเห็น `Tests run: 1, Failures: 0, Errors: 0`

## รัน Frontend

เปิด PowerShell อีกหน้าต่าง:

```powershell
cd code/frontend
npm install
npm run dev
```

Frontend จะทำงานที่ `http://localhost:3000`

เปิดเว็บที่:

```text
http://localhost:3000
```

## คำสั่งที่ใช้บ่อย

Frontend:

```powershell
cd code/frontend
npm run lint
npm run build
```

Backend:

```powershell
cd code/backend
./mvnw.cmd test
./mvnw.cmd package
```