📊 ภาพรวม Dashboard

KPI Cards แสดงงบรวม / เบิกจ่าย / คงเหลือ พร้อม progress bar
กราฟวงกลมสัดส่วนตามประเภทงบ และกราฟแท่งเปรียบเทียบแต่ละแผนงาน
ตารางสรุปตามประเภทงบประมาณ + แผนงาน พร้อมสีแดง/เหลือง/เขียว

📋 รายละเอียดงบประมาณ

ค้นหา / Filter ตามประเภทงบ / แผนงาน / สถานะ
เรียงลำดับทุกคอลัมน์ได้ (คลิกหัวตาราง)
แก้ไขและลบรายการ + Export CSV

✏️ กรอก/แก้ไขข้อมูล

ฟอร์มเพิ่มรายการใหม่ คำนวณยอดคงเหลืออัตโนมัติ
แสดงรายการล่าสุดจาก Google Sheet แบบ Real-time

⚙️ ตั้งค่า Google Sheets

ใส่ API Key + Spreadsheet ID ก็จะดึง/บันทึกข้อมูลจาก Sheet ของคุณได้เลย
มีปุ่มทดสอบการเชื่อมต่อ

วิธีเชื่อมต่อ Google Sheet: ไปหน้า "ตั้งค่า" → วาง Spreadsheet ID 1AWkrO5G7gKjZthTKN5sipnBuRF9eDW5XuKQUT_w7mPM และสร้าง API Key ที่ Google Cloud Console → บันทึก ✅

วิธีสร้าง Google Sheets API Key
ขั้นตอนที่ 1 — เปิด Google Cloud Console
ไปที่ console.cloud.google.com แล้ว login ด้วย Google Account เดียวกับที่เป็นเจ้าของ Google Sheet

ขั้นตอนที่ 2 — สร้างหรือเลือก Project

ถ้ายังไม่มี Project → คลิก "Select a project" → "New Project" → ตั้งชื่อ → Create
ถ้ามีแล้วก็เลือก Project ที่ต้องการได้เลย


ขั้นตอนที่ 3 — เปิดใช้งาน Google Sheets API

เมนูซ้าย → APIs & Services → Library
ค้นหา "Google Sheets API"
คลิกเข้าไป → กด Enable


ขั้นตอนที่ 4 — สร้าง API Key

เมนูซ้าย → APIs & Services → Credentials
คลิก "+ Create Credentials" → เลือก "API key"
จะได้ API Key ทันที เช่น AIzaSyD... → Copy เก็บไว้


ขั้นตอนที่ 5 — จำกัดสิทธิ์ API Key (แนะนำทำเสมอ)
หลังสร้างแล้ว คลิก "Edit API key" เพื่อตั้งค่าความปลอดภัย:

Application restrictions → เลือก "HTTP referrers" แล้วใส่โดเมนเว็บของคุณ (หรือ * ชั่วคราวก็ได้)
API restrictions → เลือก "Restrict key" → ติ๊ก Google Sheets API
กด Save


ขั้นตอนที่ 6 — ตั้งค่า Google Sheet ให้อ่านได้
เปิด Google Sheet ของคุณ → คลิก Share (มุมขวาบน) → เปลี่ยนเป็น "Anyone with the link → Viewer"

⚠️ ถ้า Sheet เป็น Private อยู่ API Key จะอ่านข้อมูลไม่ได้ ต้องแชร์เป็น Public ก่อน


สรุปสิ่งที่ต้องนำไปใส่ในหน้าตั้งค่า Dashboard
ช่องค่าที่ต้องใส่Spreadsheet ID1AWkrO5G7gKjZthTKN5sipnBuRF9eDW5XuKQUT_w7mPMAPI KeyAIzaSy... (ที่ได้จากขั้นตอนที่ 4)Sheet NameData_Entry
แค่นี้ก็กดปุ่ม "ทดสอบการเชื่อมต่อ" ใน Dashboard ได้เลยครับ 🎉
💸 แท็บ "รายจ่ายรายวัน" (ใหม่ทั้งหมด)

KPI 5 ช่อง — รายจ่ายวันนี้ / เดือนนี้ / ปีนี้ / หมวดหมู่สูงสุด / รออนุมัติ
กราฟแท่ง 30 วันล่าสุด + กราฟวงกลม แยกตามหมวดหมู่
Filter — ค้นหา / ช่วงวันที่ / หมวดหมู่ / สถานะ
ฟอร์มกรอก/แก้ไข — Dropdown ครบ (หมวดหมู่, ประเภทงบ, แผนงาน, หน่วยงาน, สถานะ)
บันทึกไปยัง Google Sheet แผ่น Daily_Payment อัตโนมัติ
Export CSV และ เก็บข้อมูลไว้ใน localStorage (ไม่หายเมื่อปิด Browser)

🎯 Dashboard ปรับปรุงแสดง % ชัดเจนขึ้น

Gauge วงกลม แสดง % เบิกจ่ายภาพรวม พร้อม mini-bar แต่ละประเภทงบ
เปรียบเทียบกับ เป้า CPD ณ เดือนปัจจุบัน แบบ real-time
ตารางทุกแถวมี inline progress bar สีเขียว/เหลือง/แดงตาม %
KPI รายจ่ายรายวัน แสดงบน Dashboard หน้าหลัก + ตาราง 10 รายการล่าสุด

📋 Daily_Payment_Template.xlsx — 6 ชีต: คู่มือ + Daily_Payment (200 แถว) + Dropdown ref (Budget_Type, Plan_Type, Category, Status) พร้อม Conditional formatting สีตามสถานะ

ครบทั้ง 5 ไฟล์แล้วครับ สรุป Template ทั้งหมด:
ไฟล์Sheet หลักวัตถุประสงค์Data_Entry_Template.xlsxData_Entryนำเข้าข้อมูลการเบิกจ่ายงบประมาณรายปี (200 แถว, Dropdown ครบ, สูตรคงเหลืออัตโนมัติ)Daily_Payment_Template.xlsxDaily_Paymentบันทึกรายจ่ายรายวัน (200 แถว, หมวดหมู่ค่าใช้จ่าย, Conditional format สีสถานะ)plan_cpd_Template.xlsxplan_cpdกำหนดเป้า CPD รายเดือน 12 เดือน สูตรสะสม + ผลต่างอัตโนมัติ, Color scaleBudget_Type_Template.xlsxBudget_Typeกำหนดรหัส b01–b05 ประเภทงบประมาณPlan_Type_Template.xlsxPlan_Typeกำหนดรหัส p101–p105 ประเภทแผนงาน
ลำดับการใช้งาน: แก้ไข Budget_Type → Plan_Type ก่อน → แล้วจึงกรอก Data_Entry และ Daily_Payment → สุดท้าย plan_cpd สำหรับเป้า CPD
