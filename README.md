# 📊 ระบบคุมการเบิกจ่ายงบประมาณ

Web Dashboard สำหรับติดตามการเบิกจ่ายงบประมาณ รองรับทุกสำนักงานส่งเสริมสหกรณ์

## 🚀 Demo

เปิดใช้งานผ่าน GitHub Pages: `https://[username].github.io/[repo-name]/`

---

## ⚙️ การติดตั้ง

### ขั้นตอนที่ 1 — สร้าง Google Sheet

1. อัปโหลด `Budget_Dashboard_Template.xlsx` ไปยัง Google Drive
2. เปิดด้วย Google Sheets → File → **Make a copy**
3. ตั้งชื่อตามสำนักงาน เช่น `งบประมาณ_สนส_ชลบุรี_2569`

### ขั้นตอนที่ 2 — Deploy Apps Script

1. เปิด Google Sheet → **Extensions → Apps Script**
2. วางโค้ดจากไฟล์ `Code.gs` (แทนที่โค้ดเดิม)
3. **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. คลิก **Deploy** → Copy URL

### ขั้นตอนที่ 3 — ตั้งค่า GitHub Pages

1. Fork หรือ Clone repo นี้
2. ไปที่ **Settings → Pages → Source: main / root**
3. เปิด URL: `https://[username].github.io/[repo]/`

### ขั้นตอนที่ 4 — เชื่อมต่อ

1. เปิด Dashboard → **⚙️ ตั้งค่า**
2. วาง Apps Script URL ในช่อง **Apps Script Web App URL**
3. กด **🔗 ทดสอบการเชื่อมต่อ** → กด **💾 บันทึก URL**

---

## 📁 ไฟล์ที่สำคัญ

| ไฟล์ | คำอธิบาย |
|---|---|
| `index.html` | Dashboard Web App (GitHub Pages) |
| `Code.gs` | Apps Script Backend API |
| `Budget_Dashboard_Template.xlsx` | Template Google Sheet พร้อมใช้ |

## 📋 Google Sheet Tabs ที่ต้องมี

| Tab | คำอธิบาย |
|---|---|
| `Data_Entry` | ข้อมูลการเบิกจ่ายงบประมาณ |
| `Daily_Payment` | รายจ่ายรายวัน |
| `plan_cpd` | แผนตัวชี้วัดกรม (CPD) |
| `Budget_Type` | ประเภทงบประมาณ (b01–b05) |
| `Plan_Type` | ประเภทแผนงาน (p101–p105) |

## 🔄 นำไปใช้กับสำนักงานอื่น

แต่ละสำนักงานใช้ **Google Sheet ของตัวเอง** + **Deploy Apps Script ของตัวเอง** แล้วกรอก URL ในหน้าตั้งค่า — ไฟล์ `index.html` ไฟล์เดียวใช้ร่วมกันได้ทุกสำนักงาน

---

## 🛠️ Tech Stack

- **Frontend**: HTML + CSS + JavaScript (ไม่มี framework)
- **Backend**: Google Apps Script (REST API)
- **Database**: Google Sheets
- **Hosting**: GitHub Pages (ฟรี)
- **Charts**: Chart.js
- **Excel Parser**: SheetJS (xlsx)
