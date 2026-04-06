// ============================================================
// Code.gs — Apps Script REST API Backend  (Optimized)
// Deploy: Web app | Execute as: Me | Access: Anyone
// ============================================================

// Cache Spreadsheet instance — avoid repeated getActiveSpreadsheet() calls
let _ss = null;
function ss() {
  if (!_ss) _ss = SpreadsheetApp.getActiveSpreadsheet();
  return _ss;
}

// Cache sheet instances per request
const _sheets = {};
function ws(name) {
  if (!_sheets[name]) _sheets[name] = ss().getSheetByName(name);
  return _sheets[name];
}

// ── Routing ───────────────────────────────────────────────────
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'dashboard';
    return json(dispatch_get(action));
  } catch(err) {
    return json({ error: err.message });
  }
}

function doPost(e) {
  try {
    // Accept both application/json and text/plain (text/plain avoids CORS preflight)
    const raw = e.postData ? e.postData.contents : '{}';
    const body = JSON.parse(raw);
    return json(dispatch_post(body.action || '', body));
  } catch(err) {
    return json({ error: err.message });
  }
}

function dispatch_get(action) {
  switch(action) {
    case 'dashboard': return getDashboardData();
    case 'entries':   return getDataEntry();
    case 'daily':     return getDailyPayment();
    case 'cpd':       return getCpdPlan();
    case 'config':    return getConfig();
    case 'masters':   return { budgetTypes: getBudgetTypes(), planTypes: getPlanTypes() };
    default:          return { error: 'Unknown action: ' + action };
  }
}

function dispatch_post(action, body) {
  switch(action) {
    case 'appendDataEntry':    return appendDataEntry(body.data);
    case 'updateDataEntry':    return updateDataEntry(body.index, body.data);
    case 'deleteDataEntry':    return deleteDataEntry(body.index);
    case 'importDataEntry':    return importDataEntry(body.data, body.mode);
    case 'appendDailyPayment': return appendDailyPayment(body.data);
    case 'updateDailyPayment': return updateDailyPayment(body.index, body.data);
    case 'deleteDailyPayment': return deleteDailyPayment(body.index);
    case 'importDailyPayment': return importDailyPayment(body.data, body.mode);
    case 'importCpdPlan':      return importCpdPlan(body.data);
    case 'saveConfig':         return saveConfig(body.data);
    default:                   return { error: 'Unknown action: ' + action };
  }
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Fast sheet reader — read entire sheet ONCE ────────────────
function readSheet(name) {
  const sheet = ws(name);
  if (!sheet) return null;
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];
  // Read only populated rows (skip beyond last row)
  return sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

// Format date without Utilities.formatDate (much faster)
function fmtDate(v) {
  if (!v || v === '') return '';
  try {
    const d = (v instanceof Date) ? v : new Date(v);
    if (isNaN(d)) return String(v);
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return y + '-' + m + '-' + day;
  } catch(e) { return String(v); }
}

// ── Data_Entry ────────────────────────────────────────────────
function getDataEntry() {
  const rows = readSheet('Data_Entry');
  if (!rows) return { error: 'ไม่พบ Sheet: Data_Entry' };
  const result = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r[7] && !r[9]) continue; // skip empty rows (no activity + no budget)
    result.push({
      id:         String(r[0]||''),
      date:       fmtDate(r[1]),
      year:       String(r[2]||''),
      budgettype: String(r[3]||''),
      budgetId:   String(r[4]||''),
      plan:       String(r[5]||''),
      subplan:    String(r[6]||''),
      activity:   String(r[7]||''),
      unit:       String(r[8]||''),
      budget:     Number(r[9])||0,
      transfer:   Number(r[10])||0,
      disbursed:  Number(r[11])||0,
      remain:     Number(r[12])||0,
      status:     String(r[13]||''),
    });
  }
  return result;
}

function appendDataEntry(rec) {
  try {
    const sheet = ws('Data_Entry');
    if (!sheet) return { error: 'ไม่พบ Sheet: Data_Entry' };
    const newId = 'DE' + String(sheet.getLastRow()).padStart(4,'0');
    const b = Number(rec.budget)||0, d = Number(rec.disbursed)||0;
    sheet.appendRow([rec.id||newId, rec.date, rec.year,
      rec.budgettype, rec.budgetId||'', rec.plan, rec.subplan||'',
      rec.activity, rec.unit, b, Number(rec.transfer)||0, d, b-d, rec.status]);
    return { success: true, id: rec.id||newId };
  } catch(e) { return { error: e.message }; }
}

function updateDataEntry(idx, rec) {
  try {
    const b = Number(rec.budget)||0, d = Number(rec.disbursed)||0;
    ws('Data_Entry').getRange(idx+2,1,1,14).setValues([[
      rec.id, rec.date, rec.year, rec.budgettype, rec.budgetId||'',
      rec.plan, rec.subplan||'', rec.activity, rec.unit,
      b, Number(rec.transfer)||0, d, b-d, rec.status]]);
    return { success: true };
  } catch(e) { return { error: e.message }; }
}

function deleteDataEntry(idx) {
  try { ws('Data_Entry').deleteRow(idx+2); return { success: true }; }
  catch(e) { return { error: e.message }; }
}

function importDataEntry(records, mode) {
  try {
    const sheet = ws('Data_Entry');
    if (!sheet) return { error: 'ไม่พบ Sheet: Data_Entry' };
    if (mode === 'replace_year' && records.length > 0) {
      const yr = String(records[0].year||'');
      // Read year column only (col 3) for speed
      const lastRow = sheet.getLastRow();
      if (lastRow >= 3) {
        const yrCol = sheet.getRange(3, 3, lastRow-2, 1).getValues();
        for (let r = yrCol.length-1; r >= 0; r--)
          if (String(yrCol[r][0]) === yr) sheet.deleteRow(r+3);
      }
    }
    const start = sheet.getLastRow() + 1;
    const today = fmtDate(new Date());
    const vals = records.map((rec, i) => {
      const b = Number(rec.budget)||0, d = Number(rec.disbursed)||0;
      return [rec.id||('DE'+String(start+i).padStart(4,'0')),
        rec.date||today, rec.year||'', rec.budgettype||'', rec.budgetId||'',
        rec.plan||'', rec.subplan||'', rec.activity||'', rec.unit||'',
        b, Number(rec.transfer)||0, d, b-d,
        rec.status||(d>=b&&b>0?'เบิกจ่ายแล้ว':d>0?'เบิกจ่ายบางส่วน':'ยังไม่เบิกจ่าย')];
    });
    if (vals.length) sheet.getRange(start,1,vals.length,14).setValues(vals);
    return { success: true, imported: vals.length };
  } catch(e) { return { error: e.message }; }
}

// ── Daily_Payment ─────────────────────────────────────────────
function getDailyPayment() {
  const rows = readSheet('Daily_Payment');
  if (!rows) return [];
  const result = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r[2] && !r[8]) continue;
    result.push({
      idx:        i,
      id:         String(r[0]||''),
      date:       fmtDate(r[1]),
      activity:   String(r[2]||''),
      category:   String(r[3]||''),
      budgettype: String(r[4]||''),
      plan:       String(r[5]||''),
      unit:       String(r[6]||''),
      requester:  String(r[7]||''),
      amount:     Number(r[8])||0,
      ref:        String(r[9]||''),
      status:     String(r[10]||''),
      note:       String(r[11]||''),
    });
  }
  return result;
}

function appendDailyPayment(rec) {
  try {
    let sheet = ws('Daily_Payment');
    if (!sheet) {
      sheet = ss().insertSheet('Daily_Payment');
      sheet.appendRow(['PayID','วันที่','รายการ','หมวดหมู่','ประเภทงบ','แผนงาน','หน่วยงาน','ผู้เบิก','จำนวนเงิน','เลขที่อ้างอิง','สถานะ','หมายเหตุ']);
      _sheets['Daily_Payment'] = sheet;
    }
    const id = 'DP'+String(sheet.getLastRow()).padStart(4,'0');
    sheet.appendRow([rec.id||id, rec.date, rec.activity, rec.category,
      rec.budgettype||'', rec.plan||'', rec.unit||'', rec.requester||'',
      Number(rec.amount)||0, rec.ref||'', rec.status, rec.note||'']);
    return { success: true, id: rec.id||id };
  } catch(e) { return { error: e.message }; }
}

function updateDailyPayment(idx, rec) {
  try {
    ws('Daily_Payment').getRange(idx+2,1,1,12).setValues([[
      rec.id, rec.date, rec.activity, rec.category,
      rec.budgettype||'', rec.plan||'', rec.unit||'', rec.requester||'',
      Number(rec.amount)||0, rec.ref||'', rec.status, rec.note||'']]);
    return { success: true };
  } catch(e) { return { error: e.message }; }
}

function deleteDailyPayment(idx) {
  try { ws('Daily_Payment').deleteRow(idx+2); return { success: true }; }
  catch(e) { return { error: e.message }; }
}

function importDailyPayment(records, mode) {
  try {
    let sheet = ws('Daily_Payment');
    if (!sheet) {
      sheet = ss().insertSheet('Daily_Payment');
      sheet.appendRow(['PayID','วันที่','รายการ','หมวดหมู่','ประเภทงบ','แผนงาน','หน่วยงาน','ผู้เบิก','จำนวนเงิน','เลขที่อ้างอิง','สถานะ','หมายเหตุ']);
      _sheets['Daily_Payment'] = sheet;
    }
    if (mode==='replace_month' && records.length>0) {
      const m = String(records[0].date||'').substring(0,7);
      const lastRow = sheet.getLastRow();
      if (lastRow >= 3) {
        const dateCol = sheet.getRange(3,2,lastRow-2,1).getValues();
        for (let r=dateCol.length-1; r>=0; r--)
          if (fmtDate(dateCol[r][0]).substring(0,7)===m) sheet.deleteRow(r+3);
      }
    }
    const start = sheet.getLastRow()+1;
    const today = fmtDate(new Date());
    const vals = records.map((rec,i)=>[
      rec.id||('DP'+String(start+i).padStart(4,'0')),
      rec.date||today, rec.activity||'', rec.category||'',
      rec.budgettype||'', rec.plan||'', rec.unit||'', rec.requester||'',
      Number(rec.amount)||0, rec.ref||'',
      rec.status||'อนุมัติแล้ว', rec.note||''
    ]);
    if (vals.length) sheet.getRange(start,1,vals.length,12).setValues(vals);
    return { success: true, imported: vals.length };
  } catch(e) { return { error: e.message }; }
}

// ── Masters ───────────────────────────────────────────────────
function getBudgetTypes() {
  const rows = readSheet('Budget_Type');
  if (!rows || !rows.length) return [
    {id:'b01',name:'งบบุคลากร'},{id:'b02',name:'งบดำเนินงาน'},
    {id:'b03',name:'งบลงทุน'},{id:'b04',name:'เงินอุดหนุน'},{id:'b05',name:'งบรายจ่ายอื่น'}
  ];
  return rows.filter(r=>r[0]&&r[1]).map(r=>({id:String(r[0]),name:String(r[1])}));
}

function getPlanTypes() {
  const rows = readSheet('Plan_Type');
  if (!rows || !rows.length) return [
    {id:'p101',name:'แผนงานบุคลากรภาครัฐ'},
    {id:'p102',name:'แผนงานพื้นฐานด้านการสร้างความสามารถในการแข่งขัน'},
    {id:'p103',name:'แผนงานยุทธศาสตร์เสริมสร้างพลังทางสังคม'},
    {id:'p104',name:'แผนงานยุทธศาสตร์พัฒนาและส่งเสริมเศรษฐกิจฐานราก'},
    {id:'p105',name:'แผนงานยุทธศาสตร์การเกษตรสร้างมูลค่า'},
  ];
  return rows.filter(r=>r[0]&&r[1]).map(r=>({id:String(r[0]),name:String(r[1])}));
}

function getCpdPlan() {
  const rows = readSheet('plan_cpd');
  if (!rows) return [];
  return rows.filter(r=>r[0]).map(r=>({
    month:    String(r[0]),
    target_m: Number(r[1])||0,
    target_c: Number(r[2])||0,
    actual_m: (r[3]!==''&&r[3]!==null) ? Number(r[3]) : null,
    actual_c: (r[4]!==''&&r[4]!==null) ? Number(r[4]) : null,
    note:     String(r[7]||''),
  }));
}

function importCpdPlan(records) {
  try {
    const sheet = ws('plan_cpd');
    if (!sheet) return { error: 'ไม่พบ Sheet: plan_cpd' };
    const all = sheet.getDataRange().getValues();
    let updated = 0;
    records.forEach(rec => {
      const ri = all.findIndex((r,i) => i>0 && String(r[0]).trim()===String(rec.month).trim());
      if (ri >= 0) {
        const row = ri+1;
        if (rec.target_m !== undefined) sheet.getRange(row,2).setValue(Number(rec.target_m)||0);
        if (rec.actual_m != null)       sheet.getRange(row,4).setValue(Number(rec.actual_m));
        if (rec.note !== undefined)     sheet.getRange(row,8).setValue(rec.note||'');
        updated++;
      }
    });
    return { success: true, updated };
  } catch(e) { return { error: e.message }; }
}

// ── Config ────────────────────────────────────────────────────
function getConfig() {
  const p = PropertiesService.getScriptProperties();
  return {
    orgName: p.getProperty('orgName') || 'สำนักงานส่งเสริมสหกรณ์กรุงเทพมหานคร พื้นที่ 1',
    year:    p.getProperty('year')    || '2569',
  };
}

function saveConfig(cfg) {
  const p = PropertiesService.getScriptProperties();
  if (cfg.orgName) p.setProperty('orgName', cfg.orgName);
  if (cfg.year)    p.setProperty('year',    cfg.year);
  return { success: true };
}

// ── Dashboard — single call, read all sheets once ─────────────
function getDashboardData() {
  // Read all sheets in parallel using batch read
  const sheetNames = ['Data_Entry','Daily_Payment','plan_cpd','Budget_Type','Plan_Type'];
  const spreadsheet = ss();

  // Batch: get all sheets first (one SpreadsheetApp call)
  sheetNames.forEach(n => {
    if (!_sheets[n]) _sheets[n] = spreadsheet.getSheetByName(n);
  });

  return {
    config:      getConfig(),
    entries:     getDataEntry(),
    daily:       getDailyPayment(),
    budgetTypes: getBudgetTypes(),
    planTypes:   getPlanTypes(),
    cpd:         getCpdPlan(),
  };
}
