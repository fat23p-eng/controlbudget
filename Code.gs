// ============================================================
// Code.gs — Apps Script REST API Backend
// Deploy as Web App: Execute as Me, Anyone can access
// ============================================================

const PROPS = PropertiesService.getScriptProperties();

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'dashboard';
  let result;
  try {
    switch(action) {
      case 'dashboard':  result = getDashboardData(); break;
      case 'entries':    result = getDataEntry();     break;
      case 'daily':      result = getDailyPayment();  break;
      case 'cpd':        result = getCpdPlan();       break;
      case 'config':     result = getConfig();        break;
      case 'masters':    result = { budgetTypes: getBudgetTypes(), planTypes: getPlanTypes() }; break;
      default:           result = { error: 'Unknown action: ' + action };
    }
  } catch(err) { result = { error: err.message }; }
  return jsonResponse(result);
}

function doPost(e) {
  let body, result;
  try {
    body = JSON.parse(e.postData.contents);
    const action = body.action || '';
    switch(action) {
      case 'appendDataEntry':     result = appendDataEntry(body.data);                  break;
      case 'updateDataEntry':     result = updateDataEntry(body.index, body.data);      break;
      case 'deleteDataEntry':     result = deleteDataEntry(body.index);                 break;
      case 'importDataEntry':     result = importDataEntry(body.data, body.mode);       break;
      case 'appendDailyPayment':  result = appendDailyPayment(body.data);               break;
      case 'updateDailyPayment':  result = updateDailyPayment(body.index, body.data);   break;
      case 'deleteDailyPayment':  result = deleteDailyPayment(body.index);              break;
      case 'importDailyPayment':  result = importDailyPayment(body.data, body.mode);    break;
      case 'importCpdPlan':       result = importCpdPlan(body.data);                    break;
      case 'saveConfig':          result = saveConfig(body.data);                       break;
      default:                    result = { error: 'Unknown action: ' + action };
    }
  } catch(err) { result = { error: err.message }; }
  return jsonResponse(result);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Generic sheet read ────────────────────────────────────────
function getSheetData(sheetName) {
  try {
    const ws = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!ws) return { error: 'ไม่พบ Sheet: ' + sheetName };
    const data = ws.getDataRange().getValues();
    return { headers: data[0], rows: data.slice(1), total: data.length - 1 };
  } catch(e) { return { error: e.message }; }
}

// ── Data_Entry ────────────────────────────────────────────────
function getDataEntry() {
  const d = getSheetData('Data_Entry');
  if (d.error) return d;
  return d.rows.filter(r => r.some(c => c !== '')).map(r => ({
    id: r[0]||'',
    date: r[1] ? Utilities.formatDate(new Date(r[1]),'Asia/Bangkok','yyyy-MM-dd') : '',
    year: r[2]||'', budgettype: r[3]||'', budgetId: r[4]||'',
    plan: r[5]||'', subplan: r[6]||'', activity: r[7]||'', unit: r[8]||'',
    budget: Number(r[9])||0, transfer: Number(r[10])||0,
    disbursed: Number(r[11])||0, remain: Number(r[12])||0, status: r[13]||'',
  }));
}

function appendDataEntry(rec) {
  try {
    const ws = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data_Entry');
    if (!ws) return { error: 'ไม่พบ Sheet: Data_Entry' };
    const newId = 'DE' + String(ws.getLastRow()).padStart(4,'0');
    ws.appendRow([rec.id||newId, rec.date, rec.year, rec.budgettype, rec.budgetId||'',
      rec.plan, rec.subplan||'', rec.activity, rec.unit,
      rec.budget, rec.transfer||0, rec.disbursed, rec.budget-rec.disbursed, rec.status]);
    return { success: true, id: rec.id||newId };
  } catch(e) { return { error: e.message }; }
}

function updateDataEntry(idx, rec) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data_Entry')
      .getRange(idx+2,1,1,14).setValues([[rec.id, rec.date, rec.year,
        rec.budgettype, rec.budgetId||'', rec.plan, rec.subplan||'',
        rec.activity, rec.unit, rec.budget, rec.transfer||0,
        rec.disbursed, rec.budget-rec.disbursed, rec.status]]);
    return { success: true };
  } catch(e) { return { error: e.message }; }
}

function deleteDataEntry(idx) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data_Entry').deleteRow(idx+2);
    return { success: true };
  } catch(e) { return { error: e.message }; }
}

function importDataEntry(records, mode) {
  try {
    const ws = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data_Entry');
    if (!ws) return { error: 'ไม่พบ Sheet: Data_Entry' };
    if (mode === 'replace_year' && records.length > 0) {
      const yr = String(records[0].year||'');
      for (let r = ws.getLastRow(); r >= 3; r--)
        if (String(ws.getRange(r,3).getValue()) === yr) ws.deleteRow(r);
    }
    const start = ws.getLastRow() + 1;
    const today = Utilities.formatDate(new Date(),'Asia/Bangkok','yyyy-MM-dd');
    const vals = records.map((rec,i) => {
      const b=Number(rec.budget)||0, d=Number(rec.disbursed)||0;
      return [rec.id||('DE'+String(start+i).padStart(4,'0')), rec.date||today,
        rec.year||'', rec.budgettype||'', rec.budgetId||'', rec.plan||'',
        rec.subplan||'', rec.activity||'', rec.unit||'', b, Number(rec.transfer)||0,
        d, b-d, rec.status||(d>=b&&b>0?'เบิกจ่ายแล้ว':d>0?'เบิกจ่ายบางส่วน':'ยังไม่เบิกจ่าย')];
    });
    if (vals.length) ws.getRange(start,1,vals.length,14).setValues(vals);
    return { success: true, imported: vals.length };
  } catch(e) { return { error: e.message }; }
}

// ── Daily_Payment ─────────────────────────────────────────────
function getDailyPayment() {
  const d = getSheetData('Daily_Payment');
  if (d.error) return [];
  return d.rows.filter(r=>r.some(c=>c!=='')).map((r,i) => ({
    idx: i, id: r[0]||'',
    date: r[1] ? Utilities.formatDate(new Date(r[1]),'Asia/Bangkok','yyyy-MM-dd') : '',
    activity: r[2]||'', category: r[3]||'', budgettype: r[4]||'',
    plan: r[5]||'', unit: r[6]||'', requester: r[7]||'',
    amount: Number(r[8])||0, ref: r[9]||'', status: r[10]||'', note: r[11]||'',
  }));
}

function appendDailyPayment(rec) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let ws = ss.getSheetByName('Daily_Payment');
    if (!ws) { ws = ss.insertSheet('Daily_Payment'); ws.appendRow(['PayID','วันที่','รายการ','หมวดหมู่','ประเภทงบ','แผนงาน','หน่วยงาน','ผู้เบิก','จำนวนเงิน','เลขที่อ้างอิง','สถานะ','หมายเหตุ']); }
    const id = 'DP'+String(ws.getLastRow()).padStart(4,'0');
    ws.appendRow([rec.id||id, rec.date, rec.activity, rec.category,
      rec.budgettype||'', rec.plan||'', rec.unit||'', rec.requester||'',
      rec.amount, rec.ref||'', rec.status, rec.note||'']);
    return { success: true, id: rec.id||id };
  } catch(e) { return { error: e.message }; }
}

function updateDailyPayment(idx, rec) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Daily_Payment')
      .getRange(idx+2,1,1,12).setValues([[rec.id, rec.date, rec.activity,
        rec.category, rec.budgettype||'', rec.plan||'', rec.unit||'',
        rec.requester||'', rec.amount, rec.ref||'', rec.status, rec.note||'']]);
    return { success: true };
  } catch(e) { return { error: e.message }; }
}

function deleteDailyPayment(idx) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Daily_Payment').deleteRow(idx+2);
    return { success: true };
  } catch(e) { return { error: e.message }; }
}

function importDailyPayment(records, mode) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let ws = ss.getSheetByName('Daily_Payment');
    if (!ws) { ws = ss.insertSheet('Daily_Payment'); ws.appendRow(['PayID','วันที่','รายการ','หมวดหมู่','ประเภทงบ','แผนงาน','หน่วยงาน','ผู้เบิก','จำนวนเงิน','เลขที่อ้างอิง','สถานะ','หมายเหตุ']); }
    if (mode==='replace_month' && records.length>0) {
      const m = String(records[0].date||'').substring(0,7);
      for (let r=ws.getLastRow(); r>=3; r--)
        if (String(ws.getRange(r,2).getValue()).substring(0,7)===m) ws.deleteRow(r);
    }
    const start=ws.getLastRow()+1;
    const today=Utilities.formatDate(new Date(),'Asia/Bangkok','yyyy-MM-dd');
    const vals=records.map((rec,i)=>[
      rec.id||('DP'+String(start+i).padStart(4,'0')), rec.date||today,
      rec.activity||'', rec.category||'', rec.budgettype||'', rec.plan||'',
      rec.unit||'', rec.requester||'', Number(rec.amount)||0,
      rec.ref||'', rec.status||'อนุมัติแล้ว', rec.note||''
    ]);
    if (vals.length) ws.getRange(start,1,vals.length,12).setValues(vals);
    return { success: true, imported: vals.length };
  } catch(e) { return { error: e.message }; }
}

// ── Masters & CPD ─────────────────────────────────────────────
function getBudgetTypes() {
  const d=getSheetData('Budget_Type');
  if(d.error) return [{id:'b01',name:'งบบุคลากร'},{id:'b02',name:'งบดำเนินงาน'},{id:'b03',name:'งบลงทุน'},{id:'b04',name:'เงินอุดหนุน'},{id:'b05',name:'งบรายจ่ายอื่น'}];
  return d.rows.filter(r=>r[0]&&r[1]).map(r=>({id:String(r[0]),name:String(r[1])}));
}

function getPlanTypes() {
  const d=getSheetData('Plan_Type');
  if(d.error) return [{id:'p101',name:'แผนงานบุคลากรภาครัฐ'},{id:'p102',name:'แผนงานพื้นฐานด้านการสร้างความสามารถในการแข่งขัน'},{id:'p103',name:'แผนงานยุทธศาสตร์เสริมสร้างพลังทางสังคม'},{id:'p104',name:'แผนงานยุทธศาสตร์พัฒนาและส่งเสริมเศรษฐกิจฐานราก'},{id:'p105',name:'แผนงานยุทธศาสตร์การเกษตรสร้างมูลค่า'}];
  return d.rows.filter(r=>r[0]&&r[1]).map(r=>({id:String(r[0]),name:String(r[1])}));
}

function getCpdPlan() {
  const d=getSheetData('plan_cpd');
  if(d.error) return [];
  return d.rows.filter(r=>r[0]).map(r=>({
    month:String(r[0]), target_m:Number(r[1])||0, target_c:Number(r[2])||0,
    actual_m:r[3]!==''?Number(r[3]):null, actual_c:r[4]!==''?Number(r[4]):null,
    note:String(r[7]||''),
  }));
}

function importCpdPlan(records) {
  try {
    const ws=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('plan_cpd');
    if(!ws) return {error:'ไม่พบ Sheet: plan_cpd'};
    const all=ws.getDataRange().getValues();
    let updated=0;
    records.forEach(rec=>{
      const ri=all.findIndex((r,i)=>i>0&&String(r[0]).trim()===String(rec.month).trim());
      if(ri>=0){
        if(rec.target_m!==undefined) ws.getRange(ri+1,2).setValue(Number(rec.target_m)||0);
        if(rec.actual_m!=null) ws.getRange(ri+1,4).setValue(Number(rec.actual_m));
        if(rec.note!==undefined) ws.getRange(ri+1,8).setValue(rec.note||'');
        updated++;
      }
    });
    return {success:true, updated};
  } catch(e){return{error:e.message};}
}

// ── Config ────────────────────────────────────────────────────
function getConfig() {
  const p=PropertiesService.getScriptProperties();
  return {
    orgName: p.getProperty('orgName')||'สำนักงานส่งเสริมสหกรณ์กรุงเทพมหานคร พื้นที่ 1',
    year:    p.getProperty('year')||'2569',
    apiUrl:  p.getProperty('apiUrl')||'',
  };
}

function saveConfig(cfg) {
  const p=PropertiesService.getScriptProperties();
  if(cfg.orgName) p.setProperty('orgName',cfg.orgName);
  if(cfg.year)    p.setProperty('year',cfg.year);
  return {success:true};
}

// ── Combined dashboard ────────────────────────────────────────
function getDashboardData() {
  return {
    config:      getConfig(),
    entries:     getDataEntry(),
    daily:       getDailyPayment(),
    budgetTypes: getBudgetTypes(),
    planTypes:   getPlanTypes(),
    cpd:         getCpdPlan(),
  };
}
