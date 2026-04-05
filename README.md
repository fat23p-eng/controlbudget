วิธีนำไปใช้กับจังหวัดอื่น
=======
สิ่งที่ต้องทำต่อจังหวัด — 4 ขั้นตอน
1. Copy Google Sheet ต้นแบบ
เปิด Sheet ปัจจุบัน → File → Make a copy → เปลี่ยนชื่อ เช่น งบประมาณ_สนส_ชลบุรี_2569
2. ล้างข้อมูลใน Sheet ใหม่
ลบข้อมูลใน Data_Entry และ Daily_Payment ออก แต่คงหัวคอลัมน์ไว้
แก้ Budget_Type และ Plan_Type ให้ตรงกับหน่วยงานนั้น
3. Copy Apps Script
เปิด Sheet ใหม่ → Extensions → Apps Script → วาง Code.gs และ index ใหม่ → Deploy
4. ตั้งชื่อหน่วยงาน
เปิด Web App URL → หน้า ⚙️ ตั้งค่า → แก้ชื่อหน่วยงาน + ปีงบประมาณ → บันทึก
สรุปการ Deploy ต่อ 1 จังหวัด
ใช้เวลา ~10 นาที ต่อสำนักงาน
ขั้นตอนสิ่งที่ทำ1อัปโหลด Budget_Dashboard_Template.xlsx ไปยัง Google Drive2เปิดด้วย Google Sheets → File → Make a copy → ตั้งชื่อตามจังหวัด3แก้ Budget_Type / Plan_Type ตามหน่วยงาน (ถ้าต่างจากมาตรฐาน)4กรอกเป้า CPD ในแท็บ plan_cpd5Extensions → Apps Script → วาง Code.gs + สร้าง index.html วาง index_AppScript.html6Deploy → Web app → Copy URL → แจก URL ให้เจ้าหน้าที่7เปิด URL → ⚙️ ตั้งค่า → ตั้งชื่อหน่วยงาน + ปีงบประมาณ

ข้อดีของแนวทางแยก Sheet ต่างหาก
=======
สรุปการ Deploy ต่อ 1 จังหวัด
ใช้เวลา ~10 นาที ต่อสำนักงาน
ขั้นตอนสิ่งที่ทำ1อัปโหลด Budget_Dashboard_Template.xlsx ไปยัง Google Drive2เปิดด้วย Google Sheets → File → Make a copy → ตั้งชื่อตามจังหวัด3แก้ Budget_Type / Plan_Type ตามหน่วยงาน (ถ้าต่างจากมาตรฐาน) 4 กรอกเป้า CPD ในแท็บ plan_cpd5Extensions → Apps Script → วาง Code.gs + สร้าง index.html วาง index_AppScript.html6Deploy → Web app → Copy URL → แจก URL ให้เจ้าหน้าที่7เปิด URL → ⚙️ ตั้งค่า → ตั้งชื่อหน่วยงาน + ปีงบประมาณ
แต่ละสำนักงาน เป็นอิสระจากกัน — ข้อมูลไม่ปนกัน
ถ้าหน่วยงานไหนต้องการปรับแต่งพิเศษ ทำได้เองไม่กระทบหน่วยงานอื่น
ไม่มีปัญหา permission — แต่ละสำนักงานเป็น admin ของตัวเอง
ถ้าอนาคตต้องการรวมข้อมูลทุกจังหวัด สามารถทำ Option C เพิ่มเติมได้ภายหลัง
